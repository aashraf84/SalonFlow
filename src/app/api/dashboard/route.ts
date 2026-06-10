import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// ─── Timezone Helpers (Asia/Karachi = UTC+5) ────────────────────────────────

const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000

/** Returns a Date whose internal UTC values represent Karachi wall-clock time */
function karachiNow(): Date {
  return new Date(Date.now() + KARACHI_OFFSET_MS)
}

/** Format a Date (interpreted in Karachi wall-clock) as YYYY-MM-DD */
function fmtDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format as YYYY-MM */
function fmtMonth(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Convert a Karachi wall-clock date string (YYYY-MM-DD) to the **UTC** Date
 * that represents midnight in Karachi.
 * e.g. "2024-01-15" → 2024-01-14T19:00:00.000Z  (because Karachi = UTC+5)
 */
function karachiMidnightToUTC(dateStr: string): Date {
  return new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - KARACHI_OFFSET_MS)
}

/**
 * Convert a Karachi wall-clock date string to the **UTC** Date that represents
 * the last instant of that day in Karachi (23:59:59.999).
 */
function karachiEndOfDayToUTC(dateStr: string): Date {
  return new Date(new Date(`${dateStr}T23:59:59.999Z`).getTime() - KARACHI_OFFSET_MS)
}

/**
 * Given an ISO datetime string stored in the DB (UTC), return the Karachi
 * wall-clock date string (YYYY-MM-DD) it falls on.
 */
function utcToKarachiDateStr(utcIso: Date | string): string {
  const d = new Date(utcIso)
  return fmtDate(new Date(d.getTime() + KARACHI_OFFSET_MS))
}

/**
 * Given an ISO datetime string stored in the DB (UTC), return the Karachi
 * wall-clock month string (YYYY-MM) it falls on.
 */
function utcToKarachiMonthStr(utcIso: Date | string): string {
  const d = new Date(utcIso)
  return fmtMonth(new Date(d.getTime() + KARACHI_OFFSET_MS))
}

// ─── Helper: generate last N date strings (inclusive of today) ──────────────

function lastNDays(n: number, now: Date): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime())
    d.setUTCDate(d.getUTCDate() - i)
    days.push(fmtDate(d))
  }
  return days
}

function lastNMonths(n: number, now: Date): string[] {
  const months: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime())
    d.setUTCMonth(d.getUTCMonth() - i)
    months.push(fmtMonth(d))
  }
  return months
}

// ─── Main GET Handler ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const kn = karachiNow()
    const todayStr = fmtDate(kn)
    const monthStartStr = `${kn.getUTCFullYear()}-${String(kn.getUTCMonth() + 1).padStart(2, '0')}-01`

    // ── Boundary dates for queries ──────────────────────────────────────────

    // "date" field on Appointment is date-only → compare as date strings
    const todayDateStart = new Date(`${todayStr}T00:00:00.000Z`)
    const tomorrowDateStart = new Date(todayDateStart.getTime() + 24 * 60 * 60 * 1000)
    const monthDateStart = new Date(`${monthStartStr}T00:00:00.000Z`)

    // "createdAt" fields carry full timestamps → convert Karachi wall-clock
    // boundaries to their UTC equivalents for correct filtering
    const todayStartUTC = karachiMidnightToUTC(todayStr)
    const todayEndUTC = karachiEndOfDayToUTC(todayStr)
    const monthStartUTC = karachiMidnightToUTC(monthStartStr)

    // Last 7 days (including today) for appointment trends
    const sevenDaysAgoStr = lastNDays(7, kn)[0]
    const sevenDaysAgoDateStart = new Date(`${sevenDaysAgoStr}T00:00:00.000Z`)
    const sevenDaysAgoUTC = karachiMidnightToUTC(sevenDaysAgoStr)

    // Last 6 months for revenue trend
    const sixMonthsAgoStr = lastNMonths(6, kn)[0]
    const sixMonthsAgoDateStart = new Date(`${sixMonthsAgoStr}-01T00:00:00.000Z`)
    const sixMonthsAgoUTC = karachiMidnightToUTC(`${sixMonthsAgoStr}-01`)

    // ── Parallel queries ────────────────────────────────────────────────────

    const [
      todayApptCount,
      todayCompletedCount,
      todayInvoices,
      monthInvoices,
      monthApptCount,
      monthNewCustCount,
      activeCustCount,
      activeMemberships,
      loyaltyAgg,
      lifetimeValAgg,
      totalStaffCount,
      staffByRoleRaw,
      last7Appts,
      last7Invoices,
      serviceInvItems,
      recentAppts,
      topSvcGroups,
      branches,
      branchInvGroups,
      branchApptGroups,
      allInventoryItems,
      tierGroups,
      last6Invoices,
      allServices,
    ] = await Promise.all([
      // 1a – Today's appointments count
      db.appointment.count({
        where: { date: { gte: todayDateStart, lt: tomorrowDateStart } },
      }),

      // 1b – Today's completed appointments
      db.appointment.count({
        where: {
          date: { gte: todayDateStart, lt: tomorrowDateStart },
          status: 'completed',
        },
      }),

      // 1c – Today's invoices (revenue)
      db.invoice.findMany({
        where: { createdAt: { gte: todayStartUTC, lte: todayEndUTC } },
        select: { totalAmount: true },
      }),

      // 2a – This month's invoices
      db.invoice.findMany({
        where: { createdAt: { gte: monthStartUTC } },
        select: { totalAmount: true, createdAt: true },
      }),

      // 2b – This month's appointments count
      db.appointment.count({
        where: { date: { gte: monthDateStart } },
      }),

      // 2c – This month's new customers
      db.customer.count({
        where: { createdAt: { gte: monthStartUTC } },
      }),

      // 3a – Active customers count
      db.customer.count({ where: { status: 'active' } }),

      // 3b – Active memberships (with plan price)
      db.membership.findMany({
        where: { status: 'active' },
        include: { plan: { select: { price: true } } },
      }),

      // 3c – Total loyalty points
      db.customer.aggregate({ _sum: { loyaltyPoints: true } }),

      // 3d – Average lifetime value
      db.customer.aggregate({ _avg: { lifetimeValue: true } }),

      // 4a – Total staff count
      db.staff.count(),

      // 4b – Staff by role
      db.staff.groupBy({
        by: ['role'],
        _count: { role: true },
      }),

      // 5a – Last 7 days appointments (for trend count)
      db.appointment.findMany({
        where: { date: { gte: sevenDaysAgoDateStart } },
        select: { date: true, totalAmount: true },
      }),

      // 5b – Last 7 days invoices (for trend revenue)
      db.invoice.findMany({
        where: { createdAt: { gte: sevenDaysAgoUTC } },
        select: { createdAt: true, totalAmount: true },
      }),

      // 6 – Invoice items of type "service" (for revenue by category)
      db.invoiceItem.findMany({
        where: { itemType: 'service' },
        select: { itemId: true, total: true },
      }),

      // 7 – Recent appointments with customer & staff info
      db.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          staff: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),

      // 8 – Top 5 most booked services (by AppointmentService count)
      db.appointmentService.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),

      // 9a – Branches (active)
      db.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),

      // 9b – Revenue per branch (from invoices)
      db.invoice.groupBy({
        by: ['branchId'],
        _sum: { totalAmount: true },
      }),

      // 9c – Appointment count per branch
      db.appointment.groupBy({
        by: ['branchId'],
        _count: { id: true },
      }),

      // 10 – All inventory items with product & branch (filter in JS)
      db.inventoryItem.findMany({
        include: {
          product: { select: { name: true, sku: true, reorderLevel: true } },
          branch: { select: { name: true } },
        },
      }),

      // 11 – Loyalty tier breakdown
      db.customer.groupBy({
        by: ['loyaltyTier'],
        _count: { loyaltyTier: true },
      }),

      // 12 – Last 6 months invoices (for revenue trend)
      db.invoice.findMany({
        where: { createdAt: { gte: sixMonthsAgoUTC } },
        select: { createdAt: true, totalAmount: true },
      }),

      // Prefetch all services with categories (for metrics 6 & 8)
      db.service.findMany({
        include: { category: { select: { id: true, name: true } } },
      }),
    ])

    // ── Build lookup maps ───────────────────────────────────────────────────

    const serviceMap = new Map(allServices.map((s) => [s.id, s]))

    // ── 1. todayStats ───────────────────────────────────────────────────────

    const todayRevenue = todayInvoices.reduce((s, i) => s + i.totalAmount, 0)

    const todayStats = {
      appointmentsCount: todayApptCount,
      revenue: todayRevenue,
      completedAppointments: todayCompletedCount,
    }

    // ── 2. monthlyStats ────────────────────────────────────────────────────

    const monthRevenue = monthInvoices.reduce((s, i) => s + i.totalAmount, 0)

    const monthlyStats = {
      revenue: monthRevenue,
      appointmentsCount: monthApptCount,
      newCustomers: monthNewCustCount,
    }

    // ── 3. customerMetrics ──────────────────────────────────────────────────

    const membershipRevenue = activeMemberships.reduce(
      (s, m) => s + m.plan.price,
      0,
    )

    const customerMetrics = {
      totalActive: activeCustCount,
      membershipRevenue,
      totalLoyaltyPoints: loyaltyAgg._sum.loyaltyPoints ?? 0,
      averageLifetimeValue: lifetimeValAgg._avg.lifetimeValue ?? 0,
    }

    // ── 4. staffMetrics ─────────────────────────────────────────────────────

    const staffMetrics = {
      total: totalStaffCount,
      byRole: staffByRoleRaw.reduce<Record<string, number>>((acc, item) => {
        acc[item.role] = item._count.role
        return acc
      }, {}),
    }

    // ── 5. appointmentTrends ────────────────────────────────────────────────

    const trendDates = lastNDays(7, kn)

    const apptCountByDate = new Map<string, number>()
    for (const a of last7Appts) {
      const ds = fmtDate(new Date(a.date.getTime() + KARACHI_OFFSET_MS))
      apptCountByDate.set(ds, (apptCountByDate.get(ds) ?? 0) + 1)
    }

    const revByDate = new Map<string, number>()
    for (const inv of last7Invoices) {
      const ds = utcToKarachiDateStr(inv.createdAt)
      revByDate.set(ds, (revByDate.get(ds) ?? 0) + inv.totalAmount)
    }

    const appointmentTrends = trendDates.map((date) => ({
      date,
      count: apptCountByDate.get(date) ?? 0,
      revenue: revByDate.get(date) ?? 0,
    }))

    // ── 6. revenueByService ─────────────────────────────────────────────────

    const catRevenue = new Map<string, number>()
    for (const item of serviceInvItems) {
      if (!item.itemId) continue
      const svc = serviceMap.get(item.itemId)
      const catName = svc?.category?.name ?? 'Unknown'
      catRevenue.set(catName, (catRevenue.get(catName) ?? 0) + item.total)
    }

    const revenueByService = [...catRevenue.entries()]
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // ── 7. recentAppointments ───────────────────────────────────────────────

    const recentAppointments = recentAppts.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      type: a.type,
      totalAmount: a.totalAmount,
      notes: a.notes,
      customer: a.customer
        ? {
            id: a.customer.id,
            firstName: a.customer.firstName,
            lastName: a.customer.lastName,
            phone: a.customer.phone,
          }
        : null,
      staff: {
        id: a.staff.id,
        firstName: a.staff.firstName,
        lastName: a.staff.lastName,
        role: a.staff.role,
      },
    }))

    // ── 8. topServices ──────────────────────────────────────────────────────

    const topServices = topSvcGroups.map((g) => {
      const svc = serviceMap.get(g.serviceId)
      return {
        serviceId: g.serviceId,
        name: svc?.name ?? 'Unknown',
        price: svc?.price ?? 0,
        duration: svc?.duration ?? 0,
        category: svc?.category?.name ?? 'Unknown',
        bookingCount: g._count.serviceId,
      }
    })

    // ── 9. branchPerformance ────────────────────────────────────────────────

    const branchMap = new Map(branches.map((b) => [b.id, b.name]))
    const branchRevMap = new Map(
      branchInvGroups.map((g) => [g.branchId, g._sum.totalAmount ?? 0]),
    )
    const branchApptMap = new Map(
      branchApptGroups.map((g) => [g.branchId, g._count.id]),
    )

    const branchPerformance = branches.map((b) => ({
      branchId: b.id,
      branchName: b.name,
      revenue: branchRevMap.get(b.id) ?? 0,
      appointmentsCount: branchApptMap.get(b.id) ?? 0,
    }))

    // ── 10. inventoryAlerts ─────────────────────────────────────────────────

    const inventoryAlerts = allInventoryItems
      .filter((item) => item.quantity <= item.product.reorderLevel)
      .map((item) => ({
        id: item.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        reorderLevel: item.product.reorderLevel,
        branchName: item.branch.name,
      }))

    // ── 11. loyaltyTierBreakdown ────────────────────────────────────────────

    const allTiers = ['silver', 'gold', 'platinum', 'vip'] as const
    const tierMap = new Map(tierGroups.map((t) => [t.loyaltyTier, t._count.loyaltyTier]))

    const loyaltyTierBreakdown: Record<string, number> = {}
    for (const tier of allTiers) {
      loyaltyTierBreakdown[tier] = tierMap.get(tier) ?? 0
    }

    // ── 12. monthlyRevenueTrend ─────────────────────────────────────────────

    const monthKeys = lastNMonths(6, kn)

    const revByMonth = new Map<string, number>()
    for (const inv of last6Invoices) {
      const m = utcToKarachiMonthStr(inv.createdAt)
      revByMonth.set(m, (revByMonth.get(m) ?? 0) + inv.totalAmount)
    }

    const monthlyRevenueTrend = monthKeys.map((month) => ({
      month,
      revenue: revByMonth.get(month) ?? 0,
    }))

    // ── Assemble response ───────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      data: {
        todayStats,
        monthlyStats,
        customerMetrics,
        staffMetrics,
        appointmentTrends,
        revenueByService,
        recentAppointments,
        topServices,
        branchPerformance,
        inventoryAlerts,
        loyaltyTierBreakdown,
        monthlyRevenueTrend,
      },
    })
  } catch (error) {
    console.error('[Dashboard API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 },
    )
  }
}
