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

// ─── Helper: round to 2 decimals ──────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── Helper: build product cost map ───────────────────────────────────────────
async function buildProductCostMap(productItemIds: string[]): Promise<Record<string, number>> {
  if (productItemIds.length === 0) return {}
  const uniqueIds = [...new Set(productItemIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}
  const products = await db.product.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, costPrice: true },
  })
  const map: Record<string, number> = {}
  for (const p of products) {
    map[p.id] = p.costPrice
  }
  return map
}

// ─── Helper: build service category map ────────────────────────────────────────
async function buildServiceCategoryMap(): Promise<Record<string, string>> {
  const categories = await db.serviceCategory.findMany({
    include: { services: { select: { name: true } } },
  })
  const map: Record<string, string> = {}
  for (const cat of categories) {
    for (const svc of cat.services) {
      map[svc.name] = cat.name
    }
  }
  return map
}

// ─── Helper: build product category map ────────────────────────────────────────
async function buildProductCategoryMap(): Promise<Record<string, string>> {
  const categories = await db.productCategory.findMany({
    include: { products: { select: { name: true } } },
  })
  const map: Record<string, string> = {}
  for (const cat of categories) {
    for (const prod of cat.products) {
      map[prod.name] = cat.name
    }
  }
  return map
}

// ─── 16. Item-wise Sales Report ──────────────────────────────────────────────
async function getSalesItemReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { not: 'refunded' },
    },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)

  // Aggregate by item name + type
  const itemAgg: Record<string, { name: string; type: string; qty: number; revenue: number; discount: number }> = {}
  for (const item of allItems) {
    const key = `${item.name}|||${item.itemType}`
    if (!itemAgg[key]) {
      itemAgg[key] = { name: item.name, type: item.itemType, qty: 0, revenue: 0, discount: 0 }
    }
    itemAgg[key].qty += item.quantity
    itemAgg[key].revenue += item.total
    itemAgg[key].discount += item.discount || 0
  }

  const serviceCategoryMap = await buildServiceCategoryMap()
  const productCategoryMap = await buildProductCategoryMap()

  const itemReport = Object.values(itemAgg)
    .map((item) => {
      const category = item.type === 'service'
        ? (serviceCategoryMap[item.name] || 'Uncategorized')
        : (productCategoryMap[item.name] || 'Uncategorized')
      const avgPrice = item.qty > 0 ? round2(item.revenue / item.qty) : 0
      const totalRevenue = round2(allItems.reduce((s, i) => s + i.total, 0))
      const pctOfTotal = totalRevenue > 0 ? round2((item.revenue / totalRevenue) * 100) : 0
      return {
        name: item.name,
        type: item.type,
        category,
        qtySold: item.qty,
        revenue: round2(item.revenue),
        avgPrice,
        discount: round2(item.discount),
        pctOfTotal,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = round2(allItems.reduce((s, i) => s + i.total, 0))
  const totalItems = allItems.reduce((s, i) => s + i.quantity, 0)
  const serviceItems = allItems.filter((i) => i.itemType === 'service')
  const productItems = allItems.filter((i) => i.itemType === 'product')
  const serviceRevenue = round2(serviceItems.reduce((s, i) => s + i.total, 0))
  const productRevenue = round2(productItems.reduce((s, i) => s + i.total, 0))

  // Top 20 items by revenue
  const top20Items = itemReport.slice(0, 20)

  // Revenue by type pie
  const revenueByType = [
    { type: 'Service', revenue: serviceRevenue },
    { type: 'Product', revenue: productRevenue },
  ]

  return {
    summary: {
      totalRevenue,
      totalItemsSold: totalItems,
      uniqueItems: itemReport.length,
      serviceRevenue,
      productRevenue,
      avgItemPrice: totalItems > 0 ? round2(totalRevenue / totalItems) : 0,
    },
    charts: {
      top20Items: top20Items.map((i) => ({ name: i.name.length > 20 ? i.name.slice(0, 20) + '…' : i.name, revenue: i.revenue, qtySold: i.qtySold })),
      revenueByType,
      itemsByType: [
        { type: 'Service', count: serviceItems.length },
        { type: 'Product', count: productItems.length },
      ],
    },
    details: {
      items: itemReport,
      topPerformers: top20Items.slice(0, 10),
    },
  }
}

// ─── 17. Category Sales Report ───────────────────────────────────────────────
async function getSalesCategoryReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { not: 'refunded' },
    },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)
  const serviceItems = allItems.filter((i) => i.itemType === 'service')
  const productItems = allItems.filter((i) => i.itemType === 'product')

  const serviceRevenue = round2(serviceItems.reduce((s, i) => s + i.total, 0))
  const productRevenue = round2(productItems.reduce((s, i) => s + i.total, 0))
  const totalRevenue = round2(serviceRevenue + productRevenue)

  // Service categories
  const serviceCategoryMap = await buildServiceCategoryMap()
  const svcCatAgg: Record<string, { categoryName: string; revenue: number; qty: number; count: number }> = {}
  for (const item of serviceItems) {
    const cat = serviceCategoryMap[item.name] || 'Uncategorized'
    if (!svcCatAgg[cat]) svcCatAgg[cat] = { categoryName: cat, revenue: 0, qty: 0, count: 0 }
    svcCatAgg[cat].revenue += item.total
    svcCatAgg[cat].qty += item.quantity
    svcCatAgg[cat].count++
  }
  const serviceCategoryReport = Object.values(svcCatAgg)
    .map((c) => ({
      ...c,
      revenue: round2(c.revenue),
      percentage: serviceRevenue > 0 ? round2((c.revenue / serviceRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Product categories
  const productCategoryMap = await buildProductCategoryMap()
  const prodCatAgg: Record<string, { categoryName: string; revenue: number; qty: number; count: number }> = {}
  const productCostMap = await buildProductCostMap(productItems.map((i) => i.itemId).filter(Boolean) as string[])
  const prodCatCOGS: Record<string, number> = {}
  for (const item of productItems) {
    const cat = productCategoryMap[item.name] || 'Uncategorized'
    if (!prodCatAgg[cat]) { prodCatAgg[cat] = { categoryName: cat, revenue: 0, qty: 0, count: 0 }; prodCatCOGS[cat] = 0 }
    prodCatAgg[cat].revenue += item.total
    prodCatAgg[cat].qty += item.quantity
    prodCatAgg[cat].count++
    const costPrice = productCostMap[item.itemId ?? ''] ?? 0
    prodCatCOGS[cat] += costPrice * item.quantity
  }
  const productCategoryReport = Object.values(prodCatAgg)
    .map((c) => {
      const cogs = round2(prodCatCOGS[c.categoryName] || 0)
      const gp = round2(c.revenue - cogs)
      return {
        ...c,
        revenue: round2(c.revenue),
        cogs,
        grossProfit: gp,
        margin: c.revenue > 0 ? round2((gp / c.revenue) * 100) : 0,
        percentage: productRevenue > 0 ? round2((c.revenue / productRevenue) * 100) : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // Combined view
  const allCategories = new Set([...serviceCategoryReport.map((c) => c.categoryName), ...productCategoryReport.map((c) => c.categoryName)])
  const combinedView = Array.from(allCategories).map((cat) => {
    const svc = serviceCategoryReport.find((c) => c.categoryName === cat)
    const prod = productCategoryReport.find((c) => c.categoryName === cat)
    const total = (svc?.revenue || 0) + (prod?.revenue || 0)
    return {
      categoryName: cat,
      serviceRevenue: round2(svc?.revenue || 0),
      productRevenue: round2(prod?.revenue || 0),
      totalRevenue: round2(total),
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)

  return {
    summary: {
      totalRevenue,
      serviceRevenue,
      productRevenue,
      serviceCategories: serviceCategoryReport.length,
      productCategories: productCategoryReport.length,
      servicePercentage: totalRevenue > 0 ? round2((serviceRevenue / totalRevenue) * 100) : 0,
    },
    charts: {
      serviceCategoryRevenue: serviceCategoryReport.map((c) => ({ name: c.categoryName, revenue: c.revenue })),
      productCategoryRevenue: productCategoryReport.map((c) => ({ name: c.categoryName, revenue: c.revenue })),
      combinedComparison: combinedView.map((c) => ({
        name: c.categoryName,
        serviceRevenue: c.serviceRevenue,
        productRevenue: c.productRevenue,
        totalRevenue: c.totalRevenue,
      })),
    },
    details: {
      serviceCategories: serviceCategoryReport,
      productCategories: productCategoryReport,
      combinedView,
    },
  }
}

// ─── 18. Gross Profit Report ─────────────────────────────────────────────────
async function getGrossProfitReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { not: 'refunded' },
    },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)
  const serviceRevenue = round2(allItems.filter((i) => i.itemType === 'service').reduce((s, i) => s + i.total, 0))
  const productRevenue = round2(allItems.filter((i) => i.itemType === 'product').reduce((s, i) => s + i.total, 0))
  const membershipRevenue = round2(allItems.filter((i) => i.itemType === 'membership').reduce((s, i) => s + i.total, 0))
  const totalRevenue = round2(allItems.reduce((s, i) => s + i.total, 0))

  // Product COGS
  const productItems = allItems.filter((i) => i.itemType === 'product')
  const productCostMap = await buildProductCostMap(productItems.map((i) => i.itemId).filter(Boolean) as string[])
  const totalCOGS = round2(productItems.reduce((sum, item) => {
    const costPrice = productCostMap[item.itemId ?? ''] ?? 0
    return sum + costPrice * item.quantity
  }, 0))

  const grossProfit = round2(totalRevenue - totalCOGS)
  const grossProfitMargin = totalRevenue > 0 ? round2((grossProfit / totalRevenue) * 100) : 0

  // GP by category
  const serviceCategoryMap = await buildServiceCategoryMap()
  const productCategoryMap = await buildProductCategoryMap()
  const catAgg: Record<string, { categoryName: string; revenue: number; cogs: number }> = {}
  for (const item of allItems) {
    const cat = item.itemType === 'service'
      ? (serviceCategoryMap[item.name] || 'Uncategorized')
      : (productCategoryMap[item.name] || 'Uncategorized')
    if (!catAgg[cat]) catAgg[cat] = { categoryName: cat, revenue: 0, cogs: 0 }
    catAgg[cat].revenue += item.total
    if (item.itemType === 'product') {
      const costPrice = productCostMap[item.itemId ?? ''] ?? 0
      catAgg[cat].cogs += costPrice * item.quantity
    }
  }
  const gpByCategory = Object.values(catAgg)
    .map((c) => {
      const gp = round2(c.revenue - c.cogs)
      return {
        categoryName: c.categoryName,
        revenue: round2(c.revenue),
        cogs: round2(c.cogs),
        grossProfit: gp,
        margin: c.revenue > 0 ? round2((gp / c.revenue) * 100) : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // Monthly GP trend
  const monthlyGP: Record<string, { month: string; revenue: number; cogs: number; grossProfit: number }> = {}
  for (const inv of invoices) {
    const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
    if (!monthlyGP[monthKey]) monthlyGP[monthKey] = { month: monthKey, revenue: 0, cogs: 0, grossProfit: 0 }
    monthlyGP[monthKey].revenue += inv.totalAmount
    for (const item of inv.items) {
      if (item.itemType === 'product') {
        const costPrice = productCostMap[item.itemId ?? ''] ?? 0
        monthlyGP[monthKey].cogs += costPrice * item.quantity
      }
    }
  }
  const monthlyGPTrend = Object.values(monthlyGP)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      revenue: round2(m.revenue),
      cogs: round2(m.cogs),
      grossProfit: round2(m.revenue - m.cogs),
    }))

  return {
    summary: {
      totalRevenue,
      totalCOGS,
      grossProfit,
      grossProfitMargin,
      serviceRevenue,
      productRevenue,
      membershipRevenue,
    },
    charts: {
      revenueVsCOGS: monthlyGPTrend.map((m) => ({ month: m.month, revenue: m.revenue, cogs: m.cogs, grossProfit: m.grossProfit })),
      gpByCategory: gpByCategory.map((c) => ({ name: c.categoryName, revenue: c.revenue, cogs: c.cogs, grossProfit: c.grossProfit })),
      marginByCategory: gpByCategory.map((c) => ({ name: c.categoryName, margin: c.margin })),
    },
    details: {
      gpByCategory,
      monthlyGPTrend,
    },
  }
}

// ─── 19. Cost Analysis Report ─────────────────────────────────────────────────
async function getCostAnalysisReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { not: 'refunded' },
    },
    include: { items: true },
  })

  const productItems = invoices.flatMap((inv) => inv.items).filter((i) => i.itemType === 'product')
  const productCostMap = await buildProductCostMap(productItems.map((i) => i.itemId).filter(Boolean) as string[])
  const productCategoryMap = await buildProductCategoryMap()

  const totalCOGS = round2(productItems.reduce((sum, item) => {
    const costPrice = productCostMap[item.itemId ?? ''] ?? 0
    return sum + costPrice * item.quantity
  }, 0))
  const totalProductRevenue = round2(productItems.reduce((s, i) => s + i.total, 0))

  // COGS by category
  const catAgg: Record<string, { categoryName: string; totalCost: number; totalRevenue: number; qty: number }> = {}
  for (const item of productItems) {
    const cat = productCategoryMap[item.name] || 'Uncategorized'
    if (!catAgg[cat]) catAgg[cat] = { categoryName: cat, totalCost: 0, totalRevenue: 0, qty: 0 }
    const costPrice = productCostMap[item.itemId ?? ''] ?? 0
    catAgg[cat].totalCost += costPrice * item.quantity
    catAgg[cat].totalRevenue += item.total
    catAgg[cat].qty += item.quantity
  }
  const cogsByCategory = Object.values(catAgg)
    .map((c) => {
      const gp = round2(c.totalRevenue - c.totalCost)
      const markup = c.totalCost > 0 ? round2(((c.totalRevenue - c.totalCost) / c.totalCost) * 100) : 0
      return {
        categoryName: c.categoryName,
        totalCost: round2(c.totalCost),
        totalRevenue: round2(c.totalRevenue),
        qty: c.qty,
        grossProfit: gp,
        margin: c.totalRevenue > 0 ? round2((gp / c.totalRevenue) * 100) : 0,
        markup,
      }
    })
    .sort((a, b) => b.totalCost - a.totalCost)

  // Cost vs selling price comparison
  const costVsPrice: Record<string, { name: string; sku: string; costPrice: number; sellingPrice: number; qtySold: number }> = {}
  const products = await db.product.findMany({ select: { id: true, name: true, sku: true, costPrice: true, sellingPrice: true } })
  const productDetailMap: Record<string, { name: string; sku: string; costPrice: number; sellingPrice: number }> = {}
  for (const p of products) {
    productDetailMap[p.id] = { name: p.name, sku: p.sku, costPrice: p.costPrice, sellingPrice: p.sellingPrice }
  }
  for (const item of productItems) {
    const detail = productDetailMap[item.itemId ?? '']
    if (!detail) continue
    if (!costVsPrice[item.itemId!]) {
      costVsPrice[item.itemId!] = { name: detail.name, sku: detail.sku, costPrice: detail.costPrice, sellingPrice: detail.sellingPrice, qtySold: 0 }
    }
    costVsPrice[item.itemId!].qtySold += item.quantity
  }
  const costVsPriceReport = Object.values(costVsPrice)
    .map((c) => ({
      ...c,
      totalCost: round2(c.costPrice * c.qtySold),
      totalRevenue: round2(c.sellingPrice * c.qtySold),
      margin: c.sellingPrice > 0 ? round2(((c.sellingPrice - c.costPrice) / c.sellingPrice) * 100) : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Fixed costs from expenses
  const fixedExpenseResult = await db.expense.aggregate({
    where: {
      date: { gte: dateFrom, lte: dateTo },
      category: { in: ['rent', 'utilities', 'payroll', 'maintenance'] },
    },
    _sum: { amount: true },
  })
  const totalFixedCosts = round2(fixedExpenseResult._sum.amount ?? 0)
  const totalVariableCost = round2(Object.values(catAgg).reduce((s, c) => s + c.totalCost, 0))
  const contributionMargin = totalProductRevenue > 0 ? round2(((totalProductRevenue - totalVariableCost) / totalProductRevenue) * 100) : 0

  // Monthly cost trend
  const monthlyCost: Record<string, { month: string; cost: number; revenue: number }> = {}
  for (const item of productItems) {
    const monthKey = format(new Date(item.createdAt), 'yyyy-MM')
    if (!monthlyCost[monthKey]) monthlyCost[monthKey] = { month: monthKey, cost: 0, revenue: 0 }
    const costPrice = productCostMap[item.itemId ?? ''] ?? 0
    monthlyCost[monthKey].cost += costPrice * item.quantity
    monthlyCost[monthKey].revenue += item.total
  }
  const monthlyCostTrend = Object.values(monthlyCost)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, cost: round2(m.cost), revenue: round2(m.revenue) }))

  return {
    summary: {
      totalCOGS,
      totalProductRevenue,
      totalFixedCosts,
      totalVariableCost,
      contributionMargin,
    },
    charts: {
      cogsByCategory: cogsByCategory.map((c) => ({ name: c.categoryName, totalCost: c.totalCost, totalRevenue: c.totalRevenue })),
      monthlyCostTrend,
      markupByCategory: cogsByCategory.map((c) => ({ name: c.categoryName, markup: c.markup, totalCost: c.totalCost, totalRevenue: c.totalRevenue })),
    },
    details: {
      cogsByCategory,
      costVsPrice: costVsPriceReport,
    },
  }
}

// ─── 20. Retail Product Sales Report ─────────────────────────────────────────
async function getProductSalesReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { not: 'refunded' },
    },
    include: { items: true },
  })

  const allItems = invoices.flatMap((inv) => inv.items)
  const productItems = allItems.filter((i) => i.itemType === 'product')
  const serviceItems = allItems.filter((i) => i.itemType === 'service')

  const products = await db.product.findMany({
    include: { category: { select: { id: true, name: true } } },
  })
  const productDetailMap: Record<string, { name: string; sku: string; brand: string | null; costPrice: number; sellingPrice: number; categoryName: string }> = {}
  for (const prod of products) {
    productDetailMap[prod.id] = {
      name: prod.name, sku: prod.sku, brand: prod.brand,
      costPrice: prod.costPrice, sellingPrice: prod.sellingPrice, categoryName: prod.category.name,
    }
  }

  // Build retail items
  const retailItems = productItems.map((item) => {
    const detail = productDetailMap[item.itemId ?? '']
    const costPrice = detail?.costPrice ?? 0
    const totalCost = costPrice * item.quantity
    const grossMargin = round2(item.total - totalCost)
    const marginPercent = item.total > 0 ? round2((grossMargin / item.total) * 100) : 0
    return {
      name: item.name, sku: detail?.sku ?? 'N/A', brand: detail?.brand ?? 'N/A',
      category: detail?.categoryName ?? 'Uncategorized', qtySold: item.quantity,
      unitPrice: round2(item.unitPrice), totalRevenue: round2(item.total),
      costPrice: round2(costPrice), totalCost: round2(totalCost),
      grossMargin, marginPercent,
    }
  })

  // Aggregate by product name
  const productAgg: Record<string, { name: string; sku: string; brand: string; category: string; qtySold: number; totalRevenue: number; totalCost: number }> = {}
  for (const item of retailItems) {
    if (!productAgg[item.name]) {
      productAgg[item.name] = { name: item.name, sku: item.sku, brand: item.brand, category: item.category, qtySold: 0, totalRevenue: 0, totalCost: 0 }
    }
    productAgg[item.name].qtySold += item.qtySold
    productAgg[item.name].totalRevenue += item.totalRevenue
    productAgg[item.name].totalCost += item.totalCost
  }

  const productSummary = Object.values(productAgg)
    .map((p) => {
      const gm = round2(p.totalRevenue - p.totalCost)
      return { ...p, totalRevenue: round2(p.totalRevenue), totalCost: round2(p.totalCost), grossMargin: gm, marginPercent: p.totalRevenue > 0 ? round2((gm / p.totalRevenue) * 100) : 0 }
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Brand & category aggregations
  const brandAgg: Record<string, { brand: string; qtySold: number; revenue: number }> = {}
  for (const item of retailItems) {
    const brand = item.brand || 'Unbranded'
    if (!brandAgg[brand]) brandAgg[brand] = { brand, qtySold: 0, revenue: 0 }
    brandAgg[brand].qtySold += item.qtySold
    brandAgg[brand].revenue += item.totalRevenue
  }
  const salesByBrand = Object.values(brandAgg).map((b) => ({ ...b, revenue: round2(b.revenue) })).sort((a, b) => b.revenue - a.revenue)

  const catAgg: Record<string, { category: string; qtySold: number; revenue: number }> = {}
  for (const item of retailItems) {
    if (!catAgg[item.category]) catAgg[item.category] = { category: item.category, qtySold: 0, revenue: 0 }
    catAgg[item.category].qtySold += item.qtySold
    catAgg[item.category].revenue += item.totalRevenue
  }
  const salesByCategory = Object.values(catAgg).map((c) => ({ ...c, revenue: round2(c.revenue) })).sort((a, b) => b.revenue - a.revenue)

  const topPerformers = productSummary.slice(0, 10)
  const slowMoving = [...productSummary].sort((a, b) => a.qtySold - b.qtySold).slice(0, 10)

  const retailRevenue = round2(productItems.reduce((s, i) => s + i.total, 0))
  const serviceRevenue = round2(serviceItems.reduce((s, i) => s + i.total, 0))
  const combinedRevenue = round2(retailRevenue + serviceRevenue)

  return {
    summary: {
      totalRetailRevenue: retailRevenue,
      totalServiceRevenue: serviceRevenue,
      combinedRevenue,
      retailPercentage: combinedRevenue > 0 ? round2((retailRevenue / combinedRevenue) * 100) : 0,
      totalProductsSold: productItems.reduce((s, i) => s + i.quantity, 0),
      uniqueProducts: productSummary.length,
      avgRetailMargin: productSummary.length > 0 ? round2(productSummary.reduce((s, p) => s + p.marginPercent, 0) / productSummary.length) : 0,
    },
    charts: {
      salesByBrand,
      salesByCategory,
      retailVsService: [
        { type: 'Retail', revenue: retailRevenue },
        { type: 'Service', revenue: serviceRevenue },
      ],
      topPerformers: topPerformers.slice(0, 10).map((p) => ({ name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name, revenue: p.totalRevenue, qtySold: p.qtySold })),
    },
    details: {
      products: productSummary,
      topPerformers,
      slowMoving,
    },
  }
}

// ─── 21. Salesperson Report ──────────────────────────────────────────────────
async function getSalespersonReport(dateFrom: Date, dateTo: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      paymentStatus: { not: 'refunded' },
    },
    include: { items: true, branch: { select: { id: true, name: true } } },
  })

  const staffMembers = await db.staff.findMany({
    select: {
      id: true, firstName: true, lastName: true, email: true, role: true,
      specialization: true, commissionRate: true, branchId: true,
      branch: { select: { id: true, name: true } },
    },
  })
  const staffMap: Record<string, { firstName: string; lastName: string; email: string; role: string; specialization: string | null; commissionRate: number; branchName: string }> = {}
  for (const s of staffMembers) {
    staffMap[s.id] = { firstName: s.firstName, lastName: s.lastName, email: s.email, role: s.role, specialization: s.specialization, commissionRate: s.commissionRate, branchName: s.branch.name }
  }

  // Aggregate by staffId
  const staffAgg: Record<string, { staffId: string; totalSales: number; totalItemsSold: number; serviceSales: number; productSales: number; membershipSales: number; salesCount: number; monthlySales: Record<string, number> }> = {}
  const invoiceCustomerMap: Record<string, string | null> = {}
  for (const inv of invoices) { invoiceCustomerMap[inv.id] = inv.customerId }

  for (const inv of invoices) {
    for (const item of inv.items) {
      if (!item.staffId) continue
      if (!staffAgg[item.staffId]) {
        staffAgg[item.staffId] = { staffId: item.staffId, totalSales: 0, totalItemsSold: 0, serviceSales: 0, productSales: 0, membershipSales: 0, salesCount: 0, monthlySales: {} }
      }
      const agg = staffAgg[item.staffId]
      agg.totalSales += item.total
      agg.totalItemsSold += item.quantity
      agg.salesCount++
      if (item.itemType === 'service') agg.serviceSales += item.total
      else if (item.itemType === 'product') agg.productSales += item.total
      else if (item.itemType === 'membership') agg.membershipSales += item.total
      const monthKey = format(new Date(inv.createdAt), 'yyyy-MM')
      agg.monthlySales[monthKey] = (agg.monthlySales[monthKey] ?? 0) + item.total
    }
  }

  const salespersonReport = Object.values(staffAgg)
    .map((agg) => {
      const staff = staffMap[agg.staffId]
      const name = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown Staff'
      const avgSaleValue = agg.salesCount > 0 ? round2(agg.totalSales / agg.salesCount) : 0
      const commissionEligible = round2(agg.totalSales * (staff?.commissionRate ?? 0))
      return {
        staffId: agg.staffId, name, email: staff?.email ?? 'N/A', role: staff?.role ?? 'N/A',
        specialization: staff?.specialization ?? null,
        totalSales: round2(agg.totalSales), totalItemsSold: agg.totalItemsSold,
        avgSaleValue, serviceSales: round2(agg.serviceSales), productSales: round2(agg.productSales),
        membershipSales: round2(agg.membershipSales),
        commissionRate: staff?.commissionRate ?? 0, commissionEligible,
        branchName: staff?.branchName ?? 'N/A',
      }
    })
    .sort((a, b) => b.totalSales - a.totalSales)

  const topPerformers = salespersonReport.slice(0, 10)

  // Monthly trend for top 5
  const top5Ids = topPerformers.slice(0, 5).map((s) => s.staffId)
  const monthlySalesTrend: Record<string, Record<string, number>> = {}
  for (const agg of Object.values(staffAgg)) {
    if (!top5Ids.includes(agg.staffId)) continue
    const staff = staffMap[agg.staffId]
    const name = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown'
    for (const [month, sales] of Object.entries(agg.monthlySales)) {
      if (!monthlySalesTrend[month]) monthlySalesTrend[month] = {}
      monthlySalesTrend[month][name] = round2(sales)
    }
  }

  // Unattributed sales
  const unattributedItems = invoices.flatMap((inv) => inv.items).filter((i) => !i.staffId)
  const unattributedSales = round2(unattributedItems.reduce((s, i) => s + i.total, 0))

  return {
    summary: {
      totalSalespeople: salespersonReport.length,
      totalAttributedSales: round2(salespersonReport.reduce((s, sp) => s + sp.totalSales, 0)),
      totalCommissionEligible: round2(salespersonReport.reduce((s, sp) => s + sp.commissionEligible, 0)),
      unattributedSales,
      unattributedItems: unattributedItems.length,
      avgSalesPerPerson: salespersonReport.length > 0 ? round2(salespersonReport.reduce((s, sp) => s + sp.totalSales, 0) / salespersonReport.length) : 0,
    },
    charts: {
      topPerformersChart: topPerformers.map((s) => ({ name: s.name, totalSales: s.totalSales, serviceSales: s.serviceSales, productSales: s.productSales })),
      monthlySalesTrend: Object.entries(monthlySalesTrend).sort(([a], [b]) => a.localeCompare(b)).map(([month, salesByPerson]) => ({ month, ...salesByPerson })),
      salesTypeDistribution: salespersonReport.map((s) => ({ name: s.name, service: s.serviceSales, product: s.productSales, membership: s.membershipSales })),
    },
    details: {
      salespeople: salespersonReport,
      topPerformers,
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
      case 'sales_item':
        data = await getSalesItemReport(dateFrom, dateTo)
        break
      case 'sales_category':
        data = await getSalesCategoryReport(dateFrom, dateTo)
        break
      case 'gross_profit':
        data = await getGrossProfitReport(dateFrom, dateTo)
        break
      case 'cost_analysis':
        data = await getCostAnalysisReport(dateFrom, dateTo)
        break
      case 'product_sales':
        data = await getProductSalesReport(dateFrom, dateTo)
        break
      case 'salesperson':
        data = await getSalespersonReport(dateFrom, dateTo)
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
