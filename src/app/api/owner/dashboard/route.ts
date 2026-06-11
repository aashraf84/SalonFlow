import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()

    // ── Client stats ──────────────────────────────────────────────────────
    const [
      activeClients,
      trialClients,
      suspendedClients,
      cancelledClients,
      totalClients,
    ] = await Promise.all([
      db.ownerClient.count({ where: { status: 'active' } }),
      db.ownerClient.count({ where: { status: 'trial' } }),
      db.ownerClient.count({ where: { status: 'suspended' } }),
      db.ownerClient.count({ where: { status: 'cancelled' } }),
      db.ownerClient.count(),
    ])

    // ── Revenue: sum of paid invoices ─────────────────────────────────────
    const paidInvoicesAgg = await db.ownerInvoice.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: 'paid' },
    })
    const totalRevenue = paidInvoicesAgg._sum.totalAmount ?? 0

    // ── Pending invoices amount ───────────────────────────────────────────
    const pendingInvoicesAgg = await db.ownerInvoice.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: { in: ['unpaid', 'partial', 'overdue'] } },
    })
    const pendingAmount = pendingInvoicesAgg._sum.totalAmount ?? 0

    // ── Active subscriptions ──────────────────────────────────────────────
    const activeSubscriptions = await db.ownerClientSubscription.count({
      where: { status: 'active' },
    })

    // ── Serial key stats ──────────────────────────────────────────────────
    const [availableKeys, assignedKeys, activatedKeys] = await Promise.all([
      db.serialKey.count({ where: { status: 'available' } }),
      db.serialKey.count({ where: { status: 'assigned' } }),
      db.serialKey.count({ where: { status: 'activated' } }),
    ])

    // ── Recent clients (last 5) ───────────────────────────────────────────
    const recentClients = await db.ownerClient.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        modules: { where: { isActive: true } },
        _count: { select: { subscriptions: true, serialKeys: true } },
      },
    })

    // ── Revenue by month (last 6 months) ──────────────────────────────────
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const invoicesLast6 = await db.ownerInvoice.findMany({
      where: {
        paymentStatus: 'paid',
        paidAt: { gte: sixMonthsAgo },
      },
      select: { paidAt: true, totalAmount: true },
    })

    const monthMap = new Map<string, number>()
    for (const inv of invoicesLast6) {
      if (!inv.paidAt) continue
      const d = new Date(inv.paidAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, (monthMap.get(key) ?? 0) + inv.totalAmount)
    }

    // Generate last 6 month keys
    const revenueByMonth: { month: string; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      revenueByMonth.push({ month: key, revenue: monthMap.get(key) ?? 0 })
    }

    // ── Clients by plan distribution ──────────────────────────────────────
    const clientsByPlanRaw = await db.ownerClient.groupBy({
      by: ['planName'],
      _count: { planName: true },
    })
    const clientsByPlan = clientsByPlanRaw.map((g) => ({
      plan: g.planName ?? 'No Plan',
      count: g._count.planName,
    }))

    return NextResponse.json({
      success: true,
      data: {
        clients: {
          total: totalClients,
          active: activeClients,
          trial: trialClients,
          suspended: suspendedClients,
          cancelled: cancelledClients,
        },
        revenue: {
          total: totalRevenue,
          pending: pendingAmount,
        },
        subscriptions: {
          active: activeSubscriptions,
        },
        serialKeys: {
          available: availableKeys,
          assigned: assignedKeys,
          activated: activatedKeys,
        },
        recentClients,
        revenueByMonth,
        clientsByPlan,
      },
    })
  } catch (error) {
    console.error('[Owner Dashboard API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch owner dashboard data' },
      { status: 500 },
    )
  }
}
