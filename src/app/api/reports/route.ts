import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format } from 'date-fns'

function getDateRange(from?: string, to?: string) {
  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const dateTo = to ? new Date(to) : new Date()
  dateTo.setHours(23, 59, 59, 999)
  dateFrom.setHours(0, 0, 0, 0)
  return { dateFrom, dateTo }
}

// 1. Revenue Report
async function getRevenueReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { in: ['paid', 'partial'] },
    },
    include: { items: true },
  })

  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
  const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0)
  const avgInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0

  const paymentMethods: Record<string, number> = {}
  invoices.forEach((i) => {
    paymentMethods[i.paymentMethod] = (paymentMethods[i.paymentMethod] || 0) + i.totalAmount
  })

  const dailyRevenue: Record<string, number> = {}
  invoices.forEach((i) => {
    const day = format(i.createdAt, 'yyyy-MM-dd')
    dailyRevenue[day] = (dailyRevenue[day] || 0) + i.totalAmount
  })

  const serviceRevenue: Record<string, { name: string; revenue: number; count: number }> = {}
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.itemType === 'service') {
        if (!serviceRevenue[item.name]) {
          serviceRevenue[item.name] = { name: item.name, revenue: 0, count: 0 }
        }
        serviceRevenue[item.name].revenue += item.total
        serviceRevenue[item.name].count += item.quantity
      }
    })
  })

  const topServices = Object.values(serviceRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const revenueByType: Record<string, number> = {}
  invoices.forEach((inv) => {
    revenueByType[inv.type] = (revenueByType[inv.type] || 0) + inv.totalAmount
  })

  return {
    summary: {
      totalRevenue,
      totalTax,
      totalDiscount,
      avgInvoiceValue,
      invoiceCount: invoices.length,
      periodStart: format(dateFrom, 'yyyy-MM-dd'),
      periodEnd: format(dateTo, 'yyyy-MM-dd'),
    },
    charts: {
      dailyRevenue: Object.entries(dailyRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({ date, amount })),
      paymentMethods: Object.entries(paymentMethods).map(([method, amount]) => ({
        method,
        amount,
      })),
      revenueByType: Object.entries(revenueByType).map(([type, amount]) => ({ type, amount })),
    },
    details: {
      topServices,
    },
  }
}

// 2. Appointment Report
async function getAppointmentReport(dateFrom: Date, dateTo: Date) {
  const appointments = await db.appointment.findMany({
    where: { date: { gte: dateFrom, lte: dateTo } },
    include: {
      staff: { select: { firstName: true, lastName: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  })

  const total = appointments.length
  const statusBreakdown: Record<string, number> = {}
  appointments.forEach((a) => {
    statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1
  })

  const hourCounts: Record<number, number> = {}
  appointments.forEach((a) => {
    const hour = parseInt(a.startTime.split(':')[0], 10)
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  const staffBookings: Record<string, { name: string; bookings: number; completed: number }> = {}
  appointments.forEach((a) => {
    const name = `${a.staff.firstName} ${a.staff.lastName}`
    if (!staffBookings[a.staffId]) {
      staffBookings[a.staffId] = { name, bookings: 0, completed: 0 }
    }
    staffBookings[a.staffId].bookings++
    if (a.status === 'completed') staffBookings[a.staffId].completed++
  })

  const dailyTrend: Record<string, { total: number; completed: number; cancelled: number }> = {}
  appointments.forEach((a) => {
    const day = format(a.date, 'yyyy-MM-dd')
    if (!dailyTrend[day]) dailyTrend[day] = { total: 0, completed: 0, cancelled: 0 }
    dailyTrend[day].total++
    if (a.status === 'completed') dailyTrend[day].completed++
    if (a.status === 'cancelled') dailyTrend[day].cancelled++
  })

  const typeBreakdown: Record<string, number> = {}
  appointments.forEach((a) => {
    typeBreakdown[a.type] = (typeBreakdown[a.type] || 0) + 1
  })

  const completedRate = total > 0 ? ((statusBreakdown['completed'] || 0) / total) * 100 : 0
  const noShowRate = total > 0 ? ((statusBreakdown['no_show'] || 0) / total) * 100 : 0
  const cancellationRate = total > 0 ? ((statusBreakdown['cancelled'] || 0) / total) * 100 : 0

  return {
    summary: {
      totalAppointments: total,
      completedRate: Math.round(completedRate * 10) / 10,
      noShowRate: Math.round(noShowRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
    },
    charts: {
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
      peakHours: Object.entries(hourCounts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hour, count]) => ({
          hour: `${hour}:00`,
          count,
        })),
      dailyTrend: Object.entries(dailyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      typeBreakdown: Object.entries(typeBreakdown).map(([type, count]) => ({ type, count })),
    },
    details: {
      staffBookings: Object.values(staffBookings).sort((a, b) => b.bookings - a.bookings),
    },
  }
}

// 3. Staff Performance Report
async function getStaffPerformanceReport(dateFrom: Date, dateTo: Date) {
  const staffMembers = await db.staff.findMany({
    where: { status: 'active' },
    include: {
      appointments: {
        where: { date: { gte: dateFrom, lte: dateTo }, status: 'completed' },
      },
      commissions: {
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
      },
    },
  })

  const feedback = await db.feedback.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo }, staffId: { not: null } },
  })

  const staffRatings: Record<string, { total: number; count: number }> = {}
  feedback.forEach((f) => {
    if (!f.staffId) return
    if (!staffRatings[f.staffId]) staffRatings[f.staffId] = { total: 0, count: 0 }
    staffRatings[f.staffId].total += f.rating
    staffRatings[f.staffId].count++
  })

  const staffMetrics = staffMembers.map((s) => {
    const appointmentsCompleted = s.appointments.length
    const totalRevenue = s.appointments.reduce((sum, a) => sum + a.totalAmount, 0)
    const commissionsEarned = s.commissions.reduce((sum, c) => sum + c.amount, 0)
    const commissionsPaid = s.commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0)
    const avgRevenuePerAppointment =
      appointmentsCompleted > 0 ? totalRevenue / appointmentsCompleted : 0
    const avgRating = staffRatings[s.id]
      ? Math.round((staffRatings[s.id].total / staffRatings[s.id].count) * 10) / 10
      : 0

    return {
      name: `${s.firstName} ${s.lastName}`,
      role: s.role,
      specialization: s.specialization || '—',
      appointmentsCompleted,
      totalRevenue,
      commissionsEarned,
      commissionsPaid,
      avgRevenuePerAppointment: Math.round(avgRevenuePerAppointment),
      commissionRate: s.commissionRate,
      avgRating,
    }
  })

  const totalRevenue = staffMetrics.reduce((s, m) => s + m.totalRevenue, 0)
  const totalCommissions = staffMetrics.reduce((s, m) => s + m.commissionsEarned, 0)
  const totalAppointments = staffMetrics.reduce((s, m) => s + m.appointmentsCompleted, 0)

  return {
    summary: {
      totalStaff: staffMembers.length,
      totalAppointments,
      totalRevenue,
      totalCommissions,
      avgRevenuePerStaff: staffMembers.length > 0 ? Math.round(totalRevenue / staffMembers.length) : 0,
    },
    charts: {
      revenueByStaff: staffMetrics
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map((m) => ({ name: m.name, revenue: m.totalRevenue })),
      appointmentsByStaff: staffMetrics
        .sort((a, b) => b.appointmentsCompleted - a.appointmentsCompleted)
        .slice(0, 10)
        .map((m) => ({ name: m.name, appointments: m.appointmentsCompleted })),
    },
    details: {
      staffMetrics,
    },
  }
}

// 4. Customer Report
async function getCustomerReport(dateFrom: Date, dateTo: Date) {
  const customers = await db.customer.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
  })

  const allCustomers = await db.customer.findMany()

  const newCustomers = customers.length
  const totalCustomers = allCustomers.length
  const returningCustomers = allCustomers.filter((c) => c.totalVisits > 1).length
  const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0

  const genderDist: Record<string, number> = {}
  allCustomers.forEach((c) => {
    const g = c.gender || 'unknown'
    genderDist[g] = (genderDist[g] || 0) + 1
  })

  const tierDist: Record<string, number> = {}
  allCustomers.forEach((c) => {
    tierDist[c.loyaltyTier] = (tierDist[c.loyaltyTier] || 0) + 1
  })

  const ltvBuckets: Record<string, number> = {
    'PKR 0-5K': 0,
    'PKR 5K-15K': 0,
    'PKR 15K-30K': 0,
    'PKR 30K-50K': 0,
    'PKR 50K+': 0,
  }
  allCustomers.forEach((c) => {
    if (c.lifetimeValue < 5000) ltvBuckets['PKR 0-5K']++
    else if (c.lifetimeValue < 15000) ltvBuckets['PKR 5K-15K']++
    else if (c.lifetimeValue < 30000) ltvBuckets['PKR 15K-30K']++
    else if (c.lifetimeValue < 50000) ltvBuckets['PKR 30K-50K']++
    else ltvBuckets['PKR 50K+']++
  })

  const totalLifetimeValue = allCustomers.reduce((s, c) => s + c.lifetimeValue, 0)
  const avgLifetimeValue = totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0

  const monthlyNew: Record<string, number> = {}
  customers.forEach((c) => {
    const month = format(c.createdAt, 'yyyy-MM')
    monthlyNew[month] = (monthlyNew[month] || 0) + 1
  })

  return {
    summary: {
      totalCustomers,
      newCustomers,
      returningCustomers,
      retentionRate: Math.round(retentionRate * 10) / 10,
      totalLifetimeValue,
      avgLifetimeValue: Math.round(avgLifetimeValue),
    },
    charts: {
      genderDistribution: Object.entries(genderDist).map(([gender, count]) => ({ gender, count })),
      tierDistribution: Object.entries(tierDist).map(([tier, count]) => ({ tier, count })),
      ltvDistribution: Object.entries(ltvBuckets).map(([range, count]) => ({ range, count })),
      monthlyNewCustomers: Object.entries(monthlyNew)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
    },
    details: {
      topCustomers: allCustomers
        .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
        .slice(0, 15)
        .map((c) => ({
          name: `${c.firstName} ${c.lastName}`,
          phone: c.phone,
          totalVisits: c.totalVisits,
          lifetimeValue: c.lifetimeValue,
          tier: c.loyaltyTier,
          points: c.loyaltyPoints,
        })),
    },
  }
}

// 5. Inventory Report
async function getInventoryReport(dateFrom: Date, dateTo: Date) {
  const inventoryItems = await db.inventoryItem.findMany({
    include: {
      product: {
        include: { category: true },
      },
      branch: { select: { name: true } },
    },
  })

  void dateFrom
  void dateTo

  const lowStockItems = inventoryItems.filter(
    (i) => i.quantity <= i.product.reorderLevel
  )

  const totalItems = inventoryItems.length
  const totalQuantity = inventoryItems.reduce((s, i) => s + i.quantity, 0)
  const totalValue = inventoryItems.reduce(
    (s, i) => s + i.quantity * i.product.costPrice,
    0
  )
  const totalSellingValue = inventoryItems.reduce(
    (s, i) => s + i.quantity * i.product.sellingPrice,
    0
  )

  const categoryBreakdown: Record<string, { quantity: number; value: number }> = {}
  inventoryItems.forEach((i) => {
    const cat = i.product.category?.name || 'Uncategorized'
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { quantity: 0, value: 0 }
    categoryBreakdown[cat].quantity += i.quantity
    categoryBreakdown[cat].value += i.quantity * i.product.costPrice
  })

  const branchBreakdown: Record<string, { items: number; quantity: number; value: number }> = {}
  inventoryItems.forEach((i) => {
    const branch = i.branch.name
    if (!branchBreakdown[branch]) branchBreakdown[branch] = { items: 0, quantity: 0, value: 0 }
    branchBreakdown[branch].items++
    branchBreakdown[branch].quantity += i.quantity
    branchBreakdown[branch].value += i.quantity * i.product.costPrice
  })

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const expiringSoon = inventoryItems.filter(
    (i) => i.expiryDate && i.expiryDate <= thirtyDaysFromNow
  )

  return {
    summary: {
      totalProducts: totalItems,
      totalQuantity,
      totalValue,
      totalSellingValue,
      lowStockCount: lowStockItems.length,
      expiringSoonCount: expiringSoon.length,
      potentialProfit: totalSellingValue - totalValue,
    },
    charts: {
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        quantity: data.quantity,
        value: data.value,
      })),
      branchBreakdown: Object.entries(branchBreakdown).map(([branch, data]) => ({
        branch,
        items: data.items,
        quantity: data.quantity,
        value: data.value,
      })),
      stockLevels: inventoryItems
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 15)
        .map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          reorderLevel: i.product.reorderLevel,
        })),
    },
    details: {
      lowStockItems: lowStockItems.map((i) => ({
        name: i.product.name,
        sku: i.product.sku,
        branch: i.branch.name,
        quantity: i.quantity,
        reorderLevel: i.product.reorderLevel,
        category: i.product.category?.name || '—',
      })),
      expiringSoon: expiringSoon.map((i) => ({
        name: i.product.name,
        branch: i.branch.name,
        quantity: i.quantity,
        expiryDate: i.expiryDate ? format(i.expiryDate, 'yyyy-MM-dd') : '—',
      })),
    },
  }
}

// 6. Financial Report (P&L)
async function getFinancialReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    include: { items: true },
  })

  const expenses = await db.expense.findMany({
    where: { date: { gte: dateFrom, lte: dateTo } },
  })

  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalSubtotal = invoices.reduce((s, i) => s + i.subtotal, 0)
  const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
  const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const expenseCategories: Record<string, number> = {}
  expenses.forEach((e) => {
    expenseCategories[e.category] = (expenseCategories[e.category] || 0) + e.amount
  })

  const revenueByType: Record<string, number> = {}
  invoices.forEach((inv) => {
    revenueByType[inv.type] = (revenueByType[inv.type] || 0) + inv.totalAmount
  })

  const monthlyPL: Record<string, { revenue: number; expenses: number; profit: number }> = {}
  invoices.forEach((i) => {
    const month = format(i.createdAt, 'yyyy-MM')
    if (!monthlyPL[month]) monthlyPL[month] = { revenue: 0, expenses: 0, profit: 0 }
    monthlyPL[month].revenue += i.totalAmount
  })
  expenses.forEach((e) => {
    const month = format(e.date, 'yyyy-MM')
    if (!monthlyPL[month]) monthlyPL[month] = { revenue: 0, expenses: 0, profit: 0 }
    monthlyPL[month].expenses += e.amount
  })
  Object.values(monthlyPL).forEach((m) => {
    m.profit = m.revenue - m.expenses
  })

  const itemRevenue: Record<string, { type: string; revenue: number; count: number }> = {}
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (!itemRevenue[item.name]) {
        itemRevenue[item.name] = { type: item.itemType, revenue: 0, count: 0 }
      }
      itemRevenue[item.name].revenue += item.total
      itemRevenue[item.name].count += item.quantity
    })
  })

  return {
    summary: {
      totalRevenue,
      totalSubtotal,
      totalTax,
      totalDiscount,
      totalExpenses,
      grossProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      invoiceCount: invoices.length,
    },
    charts: {
      monthlyPL: Object.entries(monthlyPL)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
      expenseCategories: Object.entries(expenseCategories).map(([category, amount]) => ({
        category,
        amount,
      })),
      revenueByType: Object.entries(revenueByType).map(([type, amount]) => ({ type, amount })),
    },
    details: {
      topRevenueItems: Object.entries(itemRevenue)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data })),
      recentExpenses: expenses
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10)
        .map((e) => ({
          category: e.category,
          description: e.description || '—',
          amount: e.amount,
          date: format(e.date, 'yyyy-MM-dd'),
        })),
    },
  }
}

// 7. Loyalty Report
async function getLoyaltyReport(dateFrom: Date, dateTo: Date) {
  const transactions = await db.loyaltyTransaction.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    include: { customer: { select: { firstName: true, lastName: true, loyaltyTier: true } } },
  })

  const totalPointsEarned = transactions
    .filter((t) => ['earn', 'bonus', 'referral', 'birthday'].includes(t.type))
    .reduce((s, t) => s + t.points, 0)

  const totalPointsRedeemed = transactions
    .filter((t) => t.type === 'redeem')
    .reduce((s, t) => s + Math.abs(t.points), 0)

  const typeBreakdown: Record<string, { count: number; points: number }> = {}
  transactions.forEach((t) => {
    if (!typeBreakdown[t.type]) typeBreakdown[t.type] = { count: 0, points: 0 }
    typeBreakdown[t.type].count++
    typeBreakdown[t.type].points += Math.abs(t.points)
  })

  const allCustomers = await db.customer.findMany()
  const tierDist: Record<string, number> = {}
  let totalPointsInCirculation = 0
  allCustomers.forEach((c) => {
    tierDist[c.loyaltyTier] = (tierDist[c.loyaltyTier] || 0) + 1
    totalPointsInCirculation += c.loyaltyPoints
  })

  const dailyPoints: Record<string, { earned: number; redeemed: number }> = {}
  transactions.forEach((t) => {
    const day = format(t.createdAt, 'yyyy-MM-dd')
    if (!dailyPoints[day]) dailyPoints[day] = { earned: 0, redeemed: 0 }
    if (t.type === 'redeem') {
      dailyPoints[day].redeemed += Math.abs(t.points)
    } else {
      dailyPoints[day].earned += t.points
    }
  })

  const redemptionRate = totalPointsEarned > 0 ? (totalPointsRedeemed / totalPointsEarned) * 100 : 0

  return {
    summary: {
      totalTransactions: transactions.length,
      totalPointsEarned,
      totalPointsRedeemed,
      totalPointsInCirculation,
      redemptionRate: Math.round(redemptionRate * 10) / 10,
      activeMembers: allCustomers.filter((c) => c.loyaltyPoints > 0).length,
    },
    charts: {
      typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
        type,
        count: data.count,
        points: data.points,
      })),
      tierDistribution: Object.entries(tierDist).map(([tier, count]) => ({ tier, count })),
      dailyPointsActivity: Object.entries(dailyPoints)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
    },
    details: {
      recentTransactions: transactions.slice(0, 20).map((t) => ({
        customer: `${t.customer.firstName} ${t.customer.lastName}`,
        type: t.type,
        points: t.points,
        description: t.description || '—',
        date: format(t.createdAt, 'yyyy-MM-dd HH:mm'),
        tier: t.customer.loyaltyTier,
      })),
    },
  }
}

// 8. Membership Report
async function getMembershipReport(dateFrom: Date, dateTo: Date) {
  const memberships = await db.membership.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      plan: true,
    },
  })

  const allMemberships = await db.membership.findMany({
    include: { plan: true, customer: { select: { firstName: true, lastName: true } } },
  })

  const activeMemberships = allMemberships.filter((m) => m.status === 'active').length
  const expiredMemberships = allMemberships.filter((m) => m.status === 'expired').length
  const cancelledMemberships = allMemberships.filter((m) => m.status === 'cancelled').length

  const membershipRevenue = allMemberships
    .filter((m) => m.status === 'active' || m.status === 'expired')
    .reduce((s, m) => s + m.plan.price, 0)

  const planDist: Record<string, { count: number; revenue: number }> = {}
  allMemberships.forEach((m) => {
    const planName = m.plan.name
    if (!planDist[planName]) planDist[planName] = { count: 0, revenue: 0 }
    planDist[planName].count++
    planDist[planName].revenue += m.plan.price
  })

  const statusBreakdown: Record<string, number> = {}
  allMemberships.forEach((m) => {
    statusBreakdown[m.status] = (statusBreakdown[m.status] || 0) + 1
  })

  const autoRenewCount = allMemberships.filter((m) => m.autoRenew).length
  const autoRenewRate = allMemberships.length > 0 ? (autoRenewCount / allMemberships.length) * 100 : 0
  const churnRate = allMemberships.length > 0 ? (cancelledMemberships / allMemberships.length) * 100 : 0

  return {
    summary: {
      totalMemberships: allMemberships.length,
      activeMemberships,
      expiredMemberships,
      cancelledMemberships,
      membershipRevenue,
      autoRenewRate: Math.round(autoRenewRate * 10) / 10,
      churnRate: Math.round(churnRate * 10) / 10,
      newInPeriod: memberships.length,
    },
    charts: {
      planDistribution: Object.entries(planDist).map(([plan, data]) => ({
        plan,
        count: data.count,
        revenue: data.revenue,
      })),
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
    },
    details: {
      activeMembers: allMemberships
        .filter((m) => m.status === 'active')
        .slice(0, 15)
        .map((m) => ({
          customer: `${m.customer.firstName} ${m.customer.lastName}`,
          plan: m.plan.name,
          startDate: format(m.startDate, 'yyyy-MM-dd'),
          endDate: format(m.endDate, 'yyyy-MM-dd'),
          autoRenew: m.autoRenew ? 'Yes' : 'No',
          price: m.plan.price,
        })),
    },
  }
}

// 9. Payroll Summary
async function getPayrollReport(dateFrom: Date, dateTo: Date) {
  const payrollRuns = await db.payrollRun.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    include: {
      staff: { select: { firstName: true, lastName: true, role: true, commissionRate: true } },
    },
  })

  const totalPayroll = payrollRuns.reduce((s, p) => s + p.netPay, 0)
  const totalBaseSalary = payrollRuns.reduce((s, p) => s + p.baseSalary, 0)
  const totalCommissions = payrollRuns.reduce((s, p) => s + p.commissionEarned, 0)
  const totalTips = payrollRuns.reduce((s, p) => s + p.tipsEarned, 0)
  const totalOvertime = payrollRuns.reduce((s, p) => s + p.overtimePay, 0)
  const totalBonuses = payrollRuns.reduce((s, p) => s + p.bonus, 0)
  const totalDeductions = payrollRuns.reduce((s, p) => s + p.deductions, 0)
  const totalTaxDeductions = payrollRuns.reduce((s, p) => s + p.taxDeduction, 0)
  const totalHours = payrollRuns.reduce((s, p) => s + p.hoursWorked, 0)

  const staffBreakdown = payrollRuns.map((p) => ({
    name: `${p.staff.firstName} ${p.staff.lastName}`,
    role: p.staff.role,
    baseSalary: p.baseSalary,
    commissionEarned: p.commissionEarned,
    tipsEarned: p.tipsEarned,
    overtimePay: p.overtimePay,
    bonus: p.bonus,
    deductions: p.deductions,
    taxDeduction: p.taxDeduction,
    netPay: p.netPay,
    hoursWorked: p.hoursWorked,
    status: p.status,
  }))

  const commissionRatio = totalBaseSalary > 0 ? (totalCommissions / totalBaseSalary) * 100 : 0

  const statusBreakdown: Record<string, number> = {}
  payrollRuns.forEach((p) => {
    statusBreakdown[p.status] = (statusBreakdown[p.status] || 0) + 1
  })

  return {
    summary: {
      totalPayroll,
      totalBaseSalary,
      totalCommissions,
      totalTips,
      totalOvertime,
      totalBonuses,
      totalDeductions,
      totalTaxDeductions,
      totalHours,
      staffCount: payrollRuns.length,
      commissionRatio: Math.round(commissionRatio * 10) / 10,
      avgPayPerStaff: payrollRuns.length > 0 ? Math.round(totalPayroll / payrollRuns.length) : 0,
    },
    charts: {
      staffCostBreakdown: staffBreakdown
        .sort((a, b) => b.netPay - a.netPay)
        .slice(0, 10)
        .map((s) => ({
          name: s.name,
          salary: s.baseSalary,
          commission: s.commissionEarned,
          tips: s.tipsEarned,
          other: s.overtimePay + s.bonus,
        })),
      payrollComponents: [
        { component: 'Base Salary', amount: totalBaseSalary },
        { component: 'Commissions', amount: totalCommissions },
        { component: 'Tips', amount: totalTips },
        { component: 'Overtime', amount: totalOvertime },
        { component: 'Bonuses', amount: totalBonuses },
      ],
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
    },
    details: {
      staffBreakdown,
    },
  }
}

// 10. Tax Report
async function getTaxReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    include: { items: true },
  })

  const expenses = await db.expense.findMany({
    where: { date: { gte: dateFrom, lte: dateTo } },
  })

  const taxConfigs = await db.taxConfig.findMany({ where: { isActive: true } })

  const totalTaxCollected = invoices.reduce((s, i) => s + i.tax, 0)
  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const effectiveTaxRate = totalRevenue > 0 ? (totalTaxCollected / totalRevenue) * 100 : 0

  const taxByType: Record<string, number> = {}
  invoices.forEach((i) => {
    taxByType[i.type] = (taxByType[i.type] || 0) + i.tax
  })

  const taxByPayment: Record<string, number> = {}
  invoices.forEach((i) => {
    taxByPayment[i.paymentMethod] = (taxByPayment[i.paymentMethod] || 0) + i.tax
  })

  const monthlyTax: Record<string, { revenue: number; tax: number; expenses: number }> = {}
  invoices.forEach((i) => {
    const month = format(i.createdAt, 'yyyy-MM')
    if (!monthlyTax[month]) monthlyTax[month] = { revenue: 0, tax: 0, expenses: 0 }
    monthlyTax[month].revenue += i.totalAmount
    monthlyTax[month].tax += i.tax
  })
  expenses.forEach((e) => {
    const month = format(e.date, 'yyyy-MM')
    if (!monthlyTax[month]) monthlyTax[month] = { revenue: 0, tax: 0, expenses: 0 }
    monthlyTax[month].expenses += e.amount
  })

  const taxByItemCategory: Record<string, { revenue: number; tax: number }> = {}
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (!taxByItemCategory[item.itemType]) {
        taxByItemCategory[item.itemType] = { revenue: 0, tax: 0 }
      }
      taxByItemCategory[item.itemType].revenue += item.total
      if (inv.subtotal > 0) {
        const proportion = item.total / inv.subtotal
        taxByItemCategory[item.itemType].tax += inv.tax * proportion
      }
    })
  })

  return {
    summary: {
      totalTaxCollected,
      totalRevenue,
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      invoiceCount: invoices.length,
      taxableInvoices: invoices.filter((i) => i.tax > 0).length,
    },
    charts: {
      monthlyTax: Object.entries(monthlyTax)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
      taxByType: Object.entries(taxByType).map(([type, tax]) => ({ type, tax })),
      taxByItemCategory: Object.entries(taxByItemCategory).map(([category, data]) => ({
        category,
        ...data,
      })),
    },
    details: {
      taxConfigs: taxConfigs.map((t) => ({
        name: t.name,
        rate: t.rate,
        type: t.type,
        appliesTo: t.appliesTo,
      })),
    },
  }
}

// 11. Daily Closeout Report
async function getDailyCloseoutReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { in: ['paid', 'partial'] },
    },
    include: { items: true },
  })

  const expenses = await db.expense.findMany({
    where: { date: { gte: dateFrom, lte: dateTo } },
  })

  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
  const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0)
  const netCashPosition = totalRevenue - totalExpenses

  const paymentMethodBreakdown: Record<string, number> = {}
  invoices.forEach((i) => {
    paymentMethodBreakdown[i.paymentMethod] = (paymentMethodBreakdown[i.paymentMethod] || 0) + i.totalAmount
  })

  const dailySummary: Record<string, { revenue: number; expenses: number; tax: number; discount: number; invoices: number; net: number }> = {}
  invoices.forEach((i) => {
    const day = format(i.createdAt, 'yyyy-MM-dd')
    if (!dailySummary[day]) dailySummary[day] = { revenue: 0, expenses: 0, tax: 0, discount: 0, invoices: 0, net: 0 }
    dailySummary[day].revenue += i.totalAmount
    dailySummary[day].tax += i.tax
    dailySummary[day].discount += i.discount
    dailySummary[day].invoices++
  })
  expenses.forEach((e) => {
    const day = format(e.date, 'yyyy-MM-dd')
    if (!dailySummary[day]) dailySummary[day] = { revenue: 0, expenses: 0, tax: 0, discount: 0, invoices: 0, net: 0 }
    dailySummary[day].expenses += e.amount
  })
  Object.values(dailySummary).forEach((d) => { d.net = d.revenue - d.expenses })

  const expenseBreakdown: Record<string, number> = {}
  expenses.forEach((e) => {
    expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount
  })

  const openingBalance = 0 // Placeholder - would need a cash register model
  const closingBalance = openingBalance + netCashPosition

  return {
    summary: {
      totalRevenue,
      totalExpenses,
      totalTax,
      totalDiscount,
      netCashPosition,
      openingBalance,
      closingBalance,
      totalTransactions: invoices.length,
    },
    charts: {
      dailySummary: Object.entries(dailySummary)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      paymentMethodBreakdown: Object.entries(paymentMethodBreakdown).map(([method, amount]) => ({
        method,
        amount,
      })),
      expenseBreakdown: Object.entries(expenseBreakdown).map(([category, amount]) => ({
        category,
        amount,
      })),
    },
    details: {
      dailyTransactions: Object.entries(dailySummary)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      expenseDetails: expenses
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 20)
        .map((e) => ({
          category: e.category,
          description: e.description || '—',
          amount: e.amount,
          date: format(e.date, 'yyyy-MM-dd'),
        })),
    },
  }
}

// 12. No-Show & Cancellation Report
async function getNoShowReport(dateFrom: Date, dateTo: Date) {
  const appointments = await db.appointment.findMany({
    where: { date: { gte: dateFrom, lte: dateTo } },
    include: {
      customer: { select: { firstName: true, lastName: true, phone: true } },
      staff: { select: { firstName: true, lastName: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  })

  const total = appointments.length
  const noShows = appointments.filter((a) => a.status === 'no_show')
  const cancelled = appointments.filter((a) => a.status === 'cancelled')
  const completed = appointments.filter((a) => a.status === 'completed')

  const noShowRate = total > 0 ? (noShows.length / total) * 100 : 0
  const cancellationRate = total > 0 ? (cancelled.length / total) * 100 : 0

  const dailyNoShows: Record<string, { total: number; noShows: number; cancelled: number }> = {}
  appointments.forEach((a) => {
    const day = format(a.date, 'yyyy-MM-dd')
    if (!dailyNoShows[day]) dailyNoShows[day] = { total: 0, noShows: 0, cancelled: 0 }
    dailyNoShows[day].total++
    if (a.status === 'no_show') dailyNoShows[day].noShows++
    if (a.status === 'cancelled') dailyNoShows[day].cancelled++
  })

  const repeatOffenders: Record<string, { name: string; phone: string; noShows: number; cancellations: number }> = {}
  noShows.forEach((a) => {
    if (!repeatOffenders[a.customerId]) {
      repeatOffenders[a.customerId] = { name: `${a.customer.firstName} ${a.customer.lastName}`, phone: a.customer.phone, noShows: 0, cancellations: 0 }
    }
    repeatOffenders[a.customerId].noShows++
  })
  cancelled.forEach((a) => {
    if (!repeatOffenders[a.customerId]) {
      repeatOffenders[a.customerId] = { name: `${a.customer.firstName} ${a.customer.lastName}`, phone: a.customer.phone, noShows: 0, cancellations: 0 }
    }
    repeatOffenders[a.customerId].cancellations++
  })

  const hourPatterns: Record<string, { total: number; noShows: number }> = {}
  appointments.forEach((a) => {
    const hour = parseInt(a.startTime.split(':')[0], 10)
    const key = `${hour}:00`
    if (!hourPatterns[key]) hourPatterns[key] = { total: 0, noShows: 0 }
    hourPatterns[key].total++
    if (a.status === 'no_show') hourPatterns[key].noShows++
  })

  const staffNoShows: Record<string, { name: string; noShows: number; cancelled: number }> = {}
  appointments.forEach((a) => {
    if (!staffNoShows[a.staffId]) {
      staffNoShows[a.staffId] = { name: `${a.staff.firstName} ${a.staff.lastName}`, noShows: 0, cancelled: 0 }
    }
    if (a.status === 'no_show') staffNoShows[a.staffId].noShows++
    if (a.status === 'cancelled') staffNoShows[a.staffId].cancelled++
  })

  const revenueLost = noShows.reduce((s, a) => s + a.totalAmount, 0) + cancelled.reduce((s, a) => s + a.totalAmount, 0)

  return {
    summary: {
      totalAppointments: total,
      noShows: noShows.length,
      cancellations: cancelled.length,
      completed: completed.length,
      noShowRate: Math.round(noShowRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      revenueLost,
    },
    charts: {
      dailyTrend: Object.entries(dailyNoShows)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      hourPatterns: Object.entries(hourPatterns)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, data]) => ({ hour, ...data })),
    },
    details: {
      repeatOffenders: Object.values(repeatOffenders)
        .filter((r) => r.noShows + r.cancellations >= 2)
        .sort((a, b) => (b.noShows + b.cancellations) - (a.noShows + a.cancellations))
        .slice(0, 15),
      staffImpact: Object.values(staffNoShows)
        .sort((a, b) => (b.noShows + b.cancelled) - (a.noShows + a.cancelled)),
    },
  }
}

// 13. Service Popularity Report
async function getServicePopularityReport(dateFrom: Date, dateTo: Date) {
  const appointmentServices = await db.appointmentService.findMany({
    where: {
      appointment: { date: { gte: dateFrom, lte: dateTo }, status: 'completed' },
    },
    include: {
      service: { include: { category: { select: { name: true } } } },
      appointment: { select: { date: true } },
    },
  })

  const serviceStats: Record<string, { name: string; category: string; bookings: number; revenue: number }> = {}
  appointmentServices.forEach((as) => {
    if (!serviceStats[as.serviceId]) {
      serviceStats[as.serviceId] = {
        name: as.service.name,
        category: as.service.category?.name || 'Uncategorized',
        bookings: 0,
        revenue: 0,
      }
    }
    serviceStats[as.serviceId].bookings++
    serviceStats[as.serviceId].revenue += as.price
  })

  const categoryStats: Record<string, { bookings: number; revenue: number }> = {}
  Object.values(serviceStats).forEach((s) => {
    if (!categoryStats[s.category]) categoryStats[s.category] = { bookings: 0, revenue: 0 }
    categoryStats[s.category].bookings += s.bookings
    categoryStats[s.category].revenue += s.revenue
  })

  const monthlyTrend: Record<string, { month: string; bookings: number; revenue: number }> = {}
  appointmentServices.forEach((as) => {
    const month = format(as.appointment.date, 'yyyy-MM')
    if (!monthlyTrend[month]) monthlyTrend[month] = { month, bookings: 0, revenue: 0 }
    monthlyTrend[month].bookings++
    monthlyTrend[month].revenue += as.price
  })

  const totalBookings = appointmentServices.length
  const totalRevenue = appointmentServices.reduce((s, as) => s + as.price, 0)

  return {
    summary: {
      totalServices: Object.keys(serviceStats).length,
      totalBookings,
      totalRevenue,
      avgBookingValue: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
    },
    charts: {
      topByBookings: Object.values(serviceStats)
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 10)
        .map((s) => ({ name: s.name, bookings: s.bookings })),
      topByRevenue: Object.values(serviceStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((s) => ({ name: s.name, revenue: s.revenue })),
      categoryBreakdown: Object.entries(categoryStats).map(([category, data]) => ({
        category,
        ...data,
      })),
      monthlyTrend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)),
    },
    details: {
      serviceRankings: Object.values(serviceStats)
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 20),
    },
  }
}

// 14. Discount Analysis Report
async function getDiscountReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      discount: { gt: 0 },
    },
    include: { items: true },
  })

  const allInvoices = await db.invoice.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
  })

  const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0)
  const totalRevenue = allInvoices.reduce((s, i) => s + i.totalAmount, 0)
  const grossRevenue = allInvoices.reduce((s, i) => s + i.subtotal, 0)
  const discountRate = grossRevenue > 0 ? (totalDiscount / grossRevenue) * 100 : 0

  const discountByType: Record<string, { count: number; totalDiscount: number; totalRevenue: number }> = {}
  invoices.forEach((i) => {
    const type = i.type || 'unknown'
    if (!discountByType[type]) discountByType[type] = { count: 0, totalDiscount: 0, totalRevenue: 0 }
    discountByType[type].count++
    discountByType[type].totalDiscount += i.discount
    discountByType[type].totalRevenue += i.totalAmount
  })

  const discountByStaff: Record<string, { name: string; count: number; totalDiscount: number }> = {}
  invoices.forEach((i) => {
    i.items.forEach((item) => {
      if (item.discount > 0 && item.staffId) {
        if (!discountByStaff[item.staffId]) discountByStaff[item.staffId] = { name: `Staff-${item.staffId.slice(0, 6)}`, count: 0, totalDiscount: 0 }
        discountByStaff[item.staffId].count++
        discountByStaff[item.staffId].totalDiscount += item.discount
      }
    })
  })

  const dailyDiscount: Record<string, { discount: number; revenue: number }> = {}
  allInvoices.forEach((i) => {
    const day = format(i.createdAt, 'yyyy-MM-dd')
    if (!dailyDiscount[day]) dailyDiscount[day] = { discount: 0, revenue: 0 }
    dailyDiscount[day].revenue += i.totalAmount
    dailyDiscount[day].discount += i.discount
  })

  return {
    summary: {
      totalDiscount,
      totalRevenue,
      grossRevenue,
      discountRate: Math.round(discountRate * 10) / 10,
      invoicesWithDiscount: invoices.length,
      totalInvoices: allInvoices.length,
      avgDiscountPerInvoice: invoices.length > 0 ? Math.round(totalDiscount / invoices.length) : 0,
      revenueImpact: totalDiscount,
    },
    charts: {
      discountByType: Object.entries(discountByType).map(([type, data]) => ({ type, ...data })),
      dailyDiscount: Object.entries(dailyDiscount)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
    },
    details: {
      discountByStaff: Object.values(discountByStaff)
        .sort((a, b) => b.totalDiscount - a.totalDiscount)
        .slice(0, 15),
      recentDiscounts: invoices
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 20)
        .map((i) => ({
          invoiceNumber: i.invoiceNumber,
          type: i.type,
          subtotal: i.subtotal,
          discount: i.discount,
          totalAmount: i.totalAmount,
          date: format(i.createdAt, 'yyyy-MM-dd HH:mm'),
        })),
    },
  }
}

// 15. Hourly Sales Report
async function getHourlySalesReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { in: ['paid', 'partial'] },
    },
    include: { items: true },
  })

  const hourlyRevenue: Record<number, { hour: number; revenue: number; transactions: number; avgTransaction: number }> = {}
  for (let h = 0; h < 24; h++) {
    hourlyRevenue[h] = { hour: h, revenue: 0, transactions: 0, avgTransaction: 0 }
  }

  invoices.forEach((i) => {
    const hour = i.createdAt.getHours()
    hourlyRevenue[hour].revenue += i.totalAmount
    hourlyRevenue[hour].transactions++
  })

  Object.values(hourlyRevenue).forEach((h) => {
    h.avgTransaction = h.transactions > 0 ? Math.round(h.revenue / h.transactions) : 0
  })

  const hourlyServiceRevenue: Record<number, Record<string, number>> = {}
  invoices.forEach((i) => {
    const hour = i.createdAt.getHours()
    if (!hourlyServiceRevenue[hour]) hourlyServiceRevenue[hour] = {}
    i.items.forEach((item) => {
      if (item.itemType === 'service') {
        hourlyServiceRevenue[hour][item.name] = (hourlyServiceRevenue[hour][item.name] || 0) + item.total
      }
    })
  })

  const peakHour = Object.values(hourlyRevenue).reduce((max, h) => h.revenue > max.revenue ? h : max, hourlyRevenue[0])
  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const peakHourRevenueShare = totalRevenue > 0 ? (peakHour.revenue / totalRevenue) * 100 : 0

  const paymentByHour: Record<number, Record<string, number>> = {}
  invoices.forEach((i) => {
    const hour = i.createdAt.getHours()
    if (!paymentByHour[hour]) paymentByHour[hour] = {}
    paymentByHour[hour][i.paymentMethod] = (paymentByHour[hour][i.paymentMethod] || 0) + i.totalAmount
  })

  return {
    summary: {
      totalRevenue,
      totalTransactions: invoices.length,
      peakHour: `${peakHour.hour}:00`,
      peakHourRevenue: peakHour.revenue,
      peakHourTransactions: peakHour.transactions,
      peakHourRevenueShare: Math.round(peakHourRevenueShare * 10) / 10,
      avgTransactionValue: invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0,
    },
    charts: {
      hourlyRevenue: Object.values(hourlyRevenue)
        .filter((h) => h.revenue > 0 || h.transactions > 0)
        .map((h) => ({ hour: `${h.hour}:00`, revenue: h.revenue, transactions: h.transactions })),
      hourlyAvgTransaction: Object.values(hourlyRevenue)
        .filter((h) => h.avgTransaction > 0)
        .map((h) => ({ hour: `${h.hour}:00`, avgTransaction: h.avgTransaction })),
    },
    details: {
      hourlyBreakdown: Object.values(hourlyRevenue)
        .filter((h) => h.revenue > 0 || h.transactions > 0)
        .map((h) => ({
          hour: `${h.hour}:00`,
          revenue: h.revenue,
          transactions: h.transactions,
          avgTransaction: h.avgTransaction,
        })),
      topServicesByPeakHour: Object.entries(hourlyServiceRevenue[peakHour.hour] || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, revenue]) => ({ name, revenue })),
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'revenue'
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const { dateFrom, dateTo } = getDateRange(from, to)

    let data: unknown

    switch (type) {
      case 'revenue':
        data = await getRevenueReport(dateFrom, dateTo)
        break
      case 'appointments':
        data = await getAppointmentReport(dateFrom, dateTo)
        break
      case 'staff':
        data = await getStaffPerformanceReport(dateFrom, dateTo)
        break
      case 'customers':
        data = await getCustomerReport(dateFrom, dateTo)
        break
      case 'inventory':
        data = await getInventoryReport(dateFrom, dateTo)
        break
      case 'financial':
        data = await getFinancialReport(dateFrom, dateTo)
        break
      case 'loyalty':
        data = await getLoyaltyReport(dateFrom, dateTo)
        break
      case 'membership':
        data = await getMembershipReport(dateFrom, dateTo)
        break
      case 'payroll':
        data = await getPayrollReport(dateFrom, dateTo)
        break
      case 'tax':
        data = await getTaxReport(dateFrom, dateTo)
        break
      case 'daily_closeout':
        data = await getDailyCloseoutReport(dateFrom, dateTo)
        break
      case 'noshow':
        data = await getNoShowReport(dateFrom, dateTo)
        break
      case 'service_popularity':
        data = await getServicePopularityReport(dateFrom, dateTo)
        break
      case 'discount':
        data = await getDiscountReport(dateFrom, dateTo)
        break
      case 'hourly_sales':
        data = await getHourlySalesReport(dateFrom, dateTo)
        break
      default:
        return NextResponse.json(
          { success: false, error: `Unknown report type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
