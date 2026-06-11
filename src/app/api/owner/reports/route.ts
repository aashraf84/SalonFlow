import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET: Generate reports ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'revenue'

    switch (type) {
      case 'revenue':
        return await getRevenueReport()
      case 'clients':
        return await getClientsReport()
      case 'subscriptions':
        return await getSubscriptionsReport()
      case 'serial_keys':
        return await getSerialKeysReport()
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type. Use: revenue, clients, subscriptions, serial_keys' },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('[Owner Reports API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 },
    )
  }
}

// ─── Revenue Report ─────────────────────────────────────────────────────
async function getRevenueReport() {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  // Monthly revenue data
  const invoices = await db.ownerInvoice.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: {
      createdAt: true,
      totalAmount: true,
      paidAmount: true,
      paymentStatus: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const monthMap = new Map<string, { paid: number; unpaid: number; total: number }>()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { paid: 0, unpaid: 0, total: 0 })
  }

  for (const inv of invoices) {
    const d = new Date(inv.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = monthMap.get(key)
    if (existing) {
      existing.total += inv.totalAmount
      if (inv.paymentStatus === 'paid') {
        existing.paid += inv.totalAmount
      } else {
        existing.unpaid += inv.totalAmount
      }
    }
  }

  const monthlyData = [...monthMap.entries()].map(([month, data]) => ({
    month,
    ...data,
  }))

  // Overall stats
  const [
    totalPaidAgg,
    totalUnpaidAgg,
    totalOverdueAgg,
    paidCount,
    unpaidCount,
    overdueCount,
  ] = await Promise.all([
    db.ownerInvoice.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: 'paid' },
    }),
    db.ownerInvoice.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: { in: ['unpaid', 'partial'] } },
    }),
    db.ownerInvoice.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: 'overdue' },
    }),
    db.ownerInvoice.count({ where: { paymentStatus: 'paid' } }),
    db.ownerInvoice.count({ where: { paymentStatus: { in: ['unpaid', 'partial'] } } }),
    db.ownerInvoice.count({ where: { paymentStatus: 'overdue' } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      type: 'revenue',
      summary: {
        totalPaid: totalPaidAgg._sum.totalAmount ?? 0,
        totalUnpaid: totalUnpaidAgg._sum.totalAmount ?? 0,
        totalOverdue: totalOverdueAgg._sum.totalAmount ?? 0,
        paidInvoices: paidCount,
        unpaidInvoices: unpaidCount,
        overdueInvoices: overdueCount,
      },
      monthly: monthlyData,
    },
  })
}

// ─── Clients Report ─────────────────────────────────────────────────────
async function getClientsReport() {
  const now = new Date()

  // Client growth: last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const clients = await db.ownerClient.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, status: true, purchaseType: true, planName: true },
    orderBy: { createdAt: 'asc' },
  })

  // Monthly growth
  const growthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    growthMap.set(key, 0)
  }

  for (const client of clients) {
    const d = new Date(client.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = growthMap.get(key)
    if (existing !== undefined) {
      growthMap.set(key, existing + 1)
    }
  }

  const monthlyGrowth = [...growthMap.entries()].map(([month, count]) => ({
    month,
    newClients: count,
  }))

  // Distribution by status
  const statusGroups = await db.ownerClient.groupBy({
    by: ['status'],
    _count: { status: true },
  })

  // Distribution by plan
  const planGroups = await db.ownerClient.groupBy({
    by: ['planName'],
    _count: { planName: true },
  })

  // Distribution by purchase type
  const typeGroups = await db.ownerClient.groupBy({
    by: ['purchaseType'],
    _count: { purchaseType: true },
  })

  // Total clients
  const totalClients = await db.ownerClient.count()

  return NextResponse.json({
    success: true,
    data: {
      type: 'clients',
      summary: {
        totalClients,
      },
      monthlyGrowth,
      byStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count.status,
      })),
      byPlan: planGroups.map((g) => ({
        plan: g.planName ?? 'No Plan',
        count: g._count.planName,
      })),
      byPurchaseType: typeGroups.map((g) => ({
        purchaseType: g.purchaseType,
        count: g._count.purchaseType,
      })),
    },
  })
}

// ─── Subscriptions Report ───────────────────────────────────────────────
async function getSubscriptionsReport() {
  // Active vs expired/cancelled
  const [
    activeCount,
    expiredCount,
    cancelledCount,
    pausedCount,
    trialCount,
    totalCount,
  ] = await Promise.all([
    db.ownerClientSubscription.count({ where: { status: 'active' } }),
    db.ownerClientSubscription.count({ where: { status: 'expired' } }),
    db.ownerClientSubscription.count({ where: { status: 'cancelled' } }),
    db.ownerClientSubscription.count({ where: { status: 'paused' } }),
    db.ownerClientSubscription.count({ where: { status: 'trial' } }),
    db.ownerClientSubscription.count(),
  ])

  // Revenue by billing cycle
  const subscriptions = await db.ownerClientSubscription.findMany({
    where: { status: 'active' },
    select: { billingCycle: true, price: true },
  })

  const cycleMap = new Map<string, { count: number; revenue: number }>()
  for (const sub of subscriptions) {
    const existing = cycleMap.get(sub.billingCycle)
    if (existing) {
      existing.count += 1
      existing.revenue += sub.price
    } else {
      cycleMap.set(sub.billingCycle, { count: 1, revenue: sub.price })
    }
  }

  const revenueByCycle = [...cycleMap.entries()].map(([cycle, data]) => ({
    billingCycle: cycle,
    ...data,
  }))

  return NextResponse.json({
    success: true,
    data: {
      type: 'subscriptions',
      summary: {
        total: totalCount,
        active: activeCount,
        expired: expiredCount,
        cancelled: cancelledCount,
        paused: pausedCount,
        trial: trialCount,
      },
      revenueByCycle,
    },
  })
}

// ─── Serial Keys Report ─────────────────────────────────────────────────
async function getSerialKeysReport() {
  const [
    availableCount,
    assignedCount,
    activatedCount,
    expiredCount,
    revokedCount,
    totalCount,
  ] = await Promise.all([
    db.serialKey.count({ where: { status: 'available' } }),
    db.serialKey.count({ where: { status: 'assigned' } }),
    db.serialKey.count({ where: { status: 'activated' } }),
    db.serialKey.count({ where: { status: 'expired' } }),
    db.serialKey.count({ where: { status: 'revoked' } }),
    db.serialKey.count(),
  ])

  // Keys by type
  const typeGroups = await db.serialKey.groupBy({
    by: ['type'],
    _count: { type: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      type: 'serial_keys',
      summary: {
        total: totalCount,
        available: availableCount,
        assigned: assignedCount,
        activated: activatedCount,
        expired: expiredCount,
        revoked: revokedCount,
        utilizationRate: totalCount > 0
          ? ((assignedCount + activatedCount) / totalCount * 100).toFixed(1)
          : '0',
      },
      byType: typeGroups.map((g) => ({
        type: g.type,
        count: g._count.type,
      })),
    },
  })
}
