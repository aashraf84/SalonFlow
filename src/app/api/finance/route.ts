import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance - Return financial summary
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const branchId = searchParams.get('branchId')

    const invoiceWhere: Record<string, unknown> = {}
    const expenseWhere: Record<string, unknown> = {}

    // Determine current period boundaries
    const now = new Date()
    const currentTo = dateTo ? new Date(dateTo) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const currentFrom = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth() - 5, 1)

    if (dateFrom || dateTo) {
      const dateFilter = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      }
      invoiceWhere.createdAt = dateFilter
      expenseWhere.date = dateFilter
    }

    if (branchId) {
      invoiceWhere.branchId = branchId
      expenseWhere.branchId = branchId
    }

    // Total revenue (sum of invoice totalAmount)
    const revenueResult = await db.invoice.aggregate({
      where: invoiceWhere,
      _sum: { totalAmount: true },
    })
    const totalRevenue = revenueResult._sum.totalAmount || 0

    // Total expenses (sum of expense amount)
    const expenseResult = await db.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
    })
    const totalExpenses = expenseResult._sum.amount || 0

    // Expenses by category
    const expensesByCategory = await db.expense.groupBy({
      by: ['category'],
      where: expenseWhere,
      _sum: { amount: true },
    })

    const expensesByCategoryMap = expensesByCategory.map((e) => ({
      category: e.category,
      amount: e._sum.amount || 0,
    }))

    // Profit (revenue - expenses)
    const profit = totalRevenue - totalExpenses

    // Recent expenses
    const recentExpenses = await db.expense.findMany({
      where: expenseWhere,
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    // Additional stats
    const invoiceCount = await db.invoice.count({ where: invoiceWhere })
    const expenseCount = await db.expense.count({ where: expenseWhere })

    // Revenue by payment method
    const revenueByPayment = await db.invoice.groupBy({
      by: ['paymentMethod'],
      where: invoiceWhere,
      _sum: { totalAmount: true },
    })

    const revenueByPaymentMap = revenueByPayment.map((r) => ({
      paymentMethod: r.paymentMethod,
      amount: r._sum.totalAmount || 0,
    }))

    // --- Monthly Revenue for the last 6 months ---
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthlyInvoiceWhere: Record<string, unknown> = {
      createdAt: { gte: sixMonthsAgo, lte: currentTo },
    }
    const monthlyExpenseWhere: Record<string, unknown> = {
      date: { gte: sixMonthsAgo, lte: currentTo },
    }
    if (branchId) {
      monthlyInvoiceWhere.branchId = branchId
      monthlyExpenseWhere.branchId = branchId
    }

    // Fetch all invoices and expenses in the 6-month window
    const monthlyInvoices = await db.invoice.findMany({
      where: monthlyInvoiceWhere,
      select: { createdAt: true, totalAmount: true },
    })

    const monthlyExpenses = await db.expense.findMany({
      where: monthlyExpenseWhere,
      select: { date: true, amount: true },
    })

    // Build month buckets
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyRevenueMap: Record<string, { revenue: number; expenses: number }> = {}

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = monthNames[d.getMonth()]
      monthlyRevenueMap[key] = { revenue: 0, expenses: 0 }
      // Store label for later
      ;(monthlyRevenueMap[key] as { revenue: number; expenses: number; label: string }).label = label
    }

    // Aggregate invoices by month
    for (const inv of monthlyInvoices) {
      const d = new Date(inv.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyRevenueMap[key]) {
        monthlyRevenueMap[key].revenue += inv.totalAmount
      }
    }

    // Aggregate expenses by month
    for (const exp of monthlyExpenses) {
      const d = new Date(exp.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyRevenueMap[key]) {
        monthlyRevenueMap[key].expenses += exp.amount
      }
    }

    const monthlyRevenue = Object.entries(monthlyRevenueMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => ({
        month: (val as { label: string }).label,
        revenue: Math.round(val.revenue),
        expenses: Math.round(val.expenses),
      }))

    // --- Previous period revenue & expenses ---
    const durationMs = currentTo.getTime() - currentFrom.getTime()
    const prevTo = new Date(currentFrom.getTime())
    const prevFrom = new Date(currentFrom.getTime() - durationMs)

    const prevInvoiceWhere: Record<string, unknown> = {
      createdAt: { gte: prevFrom, lt: prevTo },
    }
    const prevExpenseWhere: Record<string, unknown> = {
      date: { gte: prevFrom, lt: prevTo },
    }
    if (branchId) {
      prevInvoiceWhere.branchId = branchId
      prevExpenseWhere.branchId = branchId
    }

    const prevRevenueResult = await db.invoice.aggregate({
      where: prevInvoiceWhere,
      _sum: { totalAmount: true },
    })
    const previousRevenue = prevRevenueResult._sum.totalAmount || 0

    const prevExpenseResult = await db.expense.aggregate({
      where: prevExpenseWhere,
      _sum: { amount: true },
    })
    const previousExpenses = prevExpenseResult._sum.amount || 0

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        profit,
        expensesByCategory: expensesByCategoryMap,
        recentExpenses,
        revenueByPayment: revenueByPaymentMap,
        invoiceCount,
        expenseCount,
        monthlyRevenue,
        previousRevenue,
        previousExpenses,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch financial summary'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
