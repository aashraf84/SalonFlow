import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/loyalty - List loyalty transactions with customer details and tier breakdown stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const customerId = searchParams.get('customerId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (customerId) {
      where.customerId = customerId
    }
    if (type) {
      where.type = type
    }

    // Fetch loyalty transactions with customer details
    const [transactions, total] = await Promise.all([
      db.loyaltyTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              loyaltyTier: true,
              loyaltyPoints: true,
            },
          },
        },
      }),
      db.loyaltyTransaction.count({ where }),
    ])

    // Tier breakdown stats
    const tierBreakdown = await db.customer.groupBy({
      by: ['loyaltyTier'],
      _count: { id: true },
      _sum: { loyaltyPoints: true, lifetimeValue: true },
    })

    const tierStats = tierBreakdown.map((t) => ({
      tier: t.loyaltyTier,
      customerCount: t._count.id,
      totalPoints: t._sum.loyaltyPoints || 0,
      totalLifetimeValue: t._sum.lifetimeValue || 0,
    }))

    // Overall loyalty stats
    const totalPointsResult = await db.loyaltyTransaction.aggregate({
      _sum: { points: true },
    })

    const earnPointsResult = await db.loyaltyTransaction.aggregate({
      where: { type: 'earn' },
      _sum: { points: true },
    })

    const redeemPointsResult = await db.loyaltyTransaction.aggregate({
      where: { type: 'redeem' },
      _sum: { points: true },
    })

    const bonusPointsResult = await db.loyaltyTransaction.aggregate({
      where: { type: 'bonus' },
      _sum: { points: true },
    })

    const loyaltyStats = {
      totalPoints: totalPointsResult._sum.points || 0,
      earnedPoints: earnPointsResult._sum.points || 0,
      redeemedPoints: redeemPointsResult._sum.points || 0,
      bonusPoints: bonusPointsResult._sum.points || 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        tierBreakdown: tierStats,
        stats: loyaltyStats,
      },
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch loyalty data'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
