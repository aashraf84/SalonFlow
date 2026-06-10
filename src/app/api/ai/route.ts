import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Gather business context from the database
    const [
      revenueResult,
      expenseResult,
      customerCount,
      activeMembershipCount,
      staffCount,
      appointmentCount,
      branchCount,
      topServices,
      recentInvoices,
      loyaltyAgg,
      lowStockItems,
    ] = await Promise.all([
      db.invoice.aggregate({ _sum: { totalAmount: true } }),
      db.expense.aggregate({ _sum: { amount: true } }),
      db.customer.count({ where: { status: 'active' } }),
      db.membership.count({ where: { status: 'active' } }),
      db.staff.count({ where: { status: 'active' } }),
      db.appointment.count(),
      db.branch.count({ where: { isActive: true } }),
      db.appointmentService.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),
      db.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { totalAmount: true, paymentMethod: true, createdAt: true },
      }),
      db.customer.aggregate({ _sum: { loyaltyPoints: true }, _avg: { lifetimeValue: true } }),
      db.inventoryItem.findMany({
        where: { quantity: { lte: 10 } },
        take: 5,
        include: { product: { select: { name: true, reorderLevel: true } }, branch: { select: { name: true } } },
      }),
    ])

    // Get service names for top services
    const serviceIds = topServices.map((s) => s.serviceId)
    const services = await db.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, price: true },
    })
    const serviceMap = new Map(services.map((s) => [s.id, s]))

    const totalRevenue = revenueResult._sum.totalAmount || 0
    const totalExpenses = expenseResult._sum.amount || 0
    const profit = totalRevenue - totalExpenses
    const avgLifetimeValue = loyaltyAgg._avg.lifetimeValue || 0
    const totalLoyaltyPoints = loyaltyAgg._sum.loyaltyPoints || 0

    // Build context string
    const topServicesList = topServices
      .map((s) => {
        const svc = serviceMap.get(s.serviceId)
        return svc ? `${svc.name} (PKR ${svc.price}, ${s._count.serviceId} bookings)` : null
      })
      .filter(Boolean)
      .join(', ')

    const lowStockList = lowStockItems
      .map((i) => `${i.product.name} at ${i.branch.name} (${i.quantity}/${i.product.reorderLevel})`)
      .join(', ')

    const recentRevenue = recentInvoices
      .map((i) => `PKR ${i.totalAmount} via ${i.paymentMethod}`)
      .join(', ')

    const businessContext = `
Business Summary:
- Total Revenue: PKR ${totalRevenue.toLocaleString()}
- Total Expenses: PKR ${totalExpenses.toLocaleString()}
- Net Profit: PKR ${profit.toLocaleString()}
- Active Customers: ${customerCount}
- Active Memberships: ${activeMembershipCount}
- Active Staff: ${staffCount}
- Total Appointments: ${appointmentCount}
- Active Branches: ${branchCount}
- Avg Customer Lifetime Value: PKR ${avgLifetimeValue.toLocaleString()}
- Total Loyalty Points Outstanding: ${totalLoyaltyPoints.toLocaleString()}
- Top Services: ${topServicesList || 'N/A'}
- Recent Revenue: ${recentRevenue || 'N/A'}
- Low Stock Items: ${lowStockList || 'None'}
- Profit Margin: ${totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0}%
`.trim()

    // Try to use the Z.ai LLM SDK for real AI responses
    let aiResponse: string
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: `You are SalonFlow AI, an intelligent business assistant for SalonFlow OS — a salon, spa, and beauty business operating system. You provide data-driven insights, recommendations, and answers based on real business data.

Here is the current business data:
${businessContext}

Guidelines:
- Always reference real data from the business context when answering
- Provide actionable, specific recommendations
- Format responses with markdown for readability
- Use PKR currency format for monetary values
- Be professional yet warm and helpful
- If asked about topics outside salon/spa business, gently redirect
- Provide insights on revenue, staff, customers, services, inventory, and operations
- Suggest concrete actions the business owner can take`
          },
          {
            role: 'user',
            content: message
          }
        ],
        thinking: { type: 'disabled' }
      })

      aiResponse = completion.choices[0]?.message?.content || generateFallbackResponse(message, {
        totalRevenue,
        totalExpenses,
        profit,
        customerCount,
        activeMembershipCount,
        staffCount,
        appointmentCount,
        branchCount,
        avgLifetimeValue,
        totalLoyaltyPoints,
        topServicesList,
        lowStockList,
        recentRevenue,
      })
    } catch (llmError) {
      console.warn('[AI API] LLM SDK not available, using fallback:', llmError instanceof Error ? llmError.message : 'Unknown error')
      aiResponse = generateFallbackResponse(message, {
        totalRevenue,
        totalExpenses,
        profit,
        customerCount,
        activeMembershipCount,
        staffCount,
        appointmentCount,
        branchCount,
        avgLifetimeValue,
        totalLoyaltyPoints,
        topServicesList,
        lowStockList,
        recentRevenue,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse,
        context: businessContext,
      },
    })
  } catch (error) {
    console.error('[AI API] Error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to process AI request'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// Fallback response generator when LLM SDK is unavailable
function generateFallbackResponse(
  message: string,
  data: {
    totalRevenue: number
    totalExpenses: number
    profit: number
    customerCount: number
    activeMembershipCount: number
    staffCount: number
    appointmentCount: number
    branchCount: number
    avgLifetimeValue: number
    totalLoyaltyPoints: number
    topServicesList: string
    lowStockList: string
    recentRevenue: string
  }
): string {
  const msg = message.toLowerCase()
  const formatCurrency = (n: number) => `PKR ${n.toLocaleString()}`
  const profitMargin = data.totalRevenue > 0 ? ((data.profit / data.totalRevenue) * 100).toFixed(1) : '0.0'

  if (msg.includes('revenue') || msg.includes('income') || msg.includes('sales') || msg.includes('forecast')) {
    return `📊 **Revenue Analysis & Forecast**

**Current Performance:**
- Total Revenue: ${formatCurrency(data.totalRevenue)}
- Total Expenses: ${formatCurrency(data.totalExpenses)}
- Net Profit: ${formatCurrency(data.profit)}
- Profit Margin: ${profitMargin}%

**Forecast Insights:**
Based on your current revenue trends of ${formatCurrency(data.totalRevenue)}, your salon is performing ${data.profit > 0 ? 'profitably' : 'at a loss'}. With ${data.appointmentCount} total appointments and ${data.customerCount} active customers, your average revenue per customer is approximately ${formatCurrency(data.totalRevenue / Math.max(data.customerCount, 1))}.

**Recommendations:**
1. Focus on upselling high-margin services to increase average ticket size
2. Your top services (${data.topServicesList || 'various'}) drive the most bookings — consider premium packages
3. Membership revenue from ${data.activeMembershipCount} active members provides stable recurring income
4. Target a 15-20% month-over-month growth in appointment bookings`
  }

  if (msg.includes('staff') || msg.includes('employee') || msg.includes('schedule') || msg.includes('optimization')) {
    return `👥 **Staff Optimization Report**

**Current Staff Metrics:**
- Active Staff Members: ${data.staffCount}
- Total Appointments Handled: ${data.appointmentCount}
- Appointments per Staff: ${(data.appointmentCount / Math.max(data.staffCount, 1)).toFixed(1)}

**Scheduling Recommendations:**
1. **Peak Hour Coverage**: Ensure maximum staff availability during peak hours (typically 2-5 PM on weekends)
2. **Shift Optimization**: With ${data.staffCount} staff across ${data.branchCount} branches, aim for ${Math.ceil(data.staffCount / data.branchCount)} staff per branch minimum
3. **Specialization Balance**: Distribute specialists evenly across branches based on demand
4. **Cross-Training**: Invest in cross-training to handle varied service requests

**Action Items:**
- Consider adding part-time staff for weekend peaks
- Implement a dynamic scheduling system based on booking patterns`
  }

  if (msg.includes('customer') || msg.includes('retention') || msg.includes('churn') || msg.includes('loyal')) {
    return `❤️ **Customer Retention Analysis**

**Customer Metrics:**
- Active Customers: ${data.customerCount}
- Average Lifetime Value: ${formatCurrency(data.avgLifetimeValue)}
- Active Memberships: ${data.activeMembershipCount}
- Total Loyalty Points: ${data.totalLoyaltyPoints.toLocaleString()}

**Retention Strategy:**
1. **At-Risk Customers**: Identify customers who haven't visited in 30+ days and send personalized re-engagement offers
2. **Membership Growth**: With ${data.activeMembershipCount} active members out of ${data.customerCount} customers (${((data.activeMembershipCount / Math.max(data.customerCount, 1)) * 100).toFixed(1)}% penetration), there's room to grow
3. **Loyalty Program**: Your ${data.totalLoyaltyPoints.toLocaleString()} outstanding loyalty points indicate active engagement — consider tier-based rewards
4. **Win-Back Campaigns**: Create targeted campaigns for inactive customers with special discounts`
  }

  if (msg.includes('service') || msg.includes('popular') || msg.includes('profit')) {
    return `⭐ **Service Popularity & Profitability**

**Top Performing Services:**
${data.topServicesList || 'No service data available'}

**Recommendations:**
1. **Promote High-Margin Services**: Focus marketing on your most profitable services
2. **Bundle Services**: Create packages combining popular and high-margin services
3. **Dynamic Pricing**: Consider premium pricing during peak hours
4. **Seasonal Offers**: Rotate featured services based on seasonal demand`
  }

  if (msg.includes('inventory') || msg.includes('stock') || msg.includes('reorder') || msg.includes('product')) {
    return `📦 **Inventory & Stock Management**

**Low Stock Alerts:**
${data.lowStockList || '✅ All items are above reorder levels'}

**Reorder Recommendations:**
${data.lowStockList ? '⚠️ The following items need immediate attention:\n' + data.lowStockList.split(', ').map(item => `  - ${item}`).join('\n') : '✅ No immediate reorder needed — stock levels are healthy.'}

**Best Practices:**
1. **Par Level System**: Maintain minimum stock levels based on usage patterns
2. **Bulk Ordering**: Consider bulk purchases for frequently used items
3. **Expiry Tracking**: Monitor product expiry dates to reduce waste`
  }

  // Default response
  return `🤖 **SalonFlow AI Assistant**

Here's a snapshot of your business:

**Financial Health:**
- Revenue: ${formatCurrency(data.totalRevenue)}
- Expenses: ${formatCurrency(data.totalExpenses)}
- Profit: ${formatCurrency(data.profit)} (${profitMargin}% margin)

**Business Overview:**
- ${data.customerCount} active customers
- ${data.staffCount} active staff
- ${data.appointmentCount} total appointments
- ${data.activeMembershipCount} active memberships
- ${data.branchCount} branches

I can help you with:
- 📈 Revenue forecasting and analysis
- 👥 Staff scheduling and optimization
- ❤️ Customer retention strategies
- ⭐ Service popularity insights
- 📦 Inventory management
- 🏢 Branch performance comparison

Try asking a specific question like "What's my revenue forecast?" or "Which customers are at risk?"`
}
