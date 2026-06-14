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

// POST /api/loyalty - Award or redeem loyalty points
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, type, points, description, referenceId } = body

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      )
    }

    if (!type || !['earn', 'redeem', 'bonus', 'referral', 'birthday'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be one of: earn, redeem, bonus, referral, birthday' },
        { status: 400 }
      )
    }

    if (!points || points <= 0) {
      return NextResponse.json(
        { success: false, error: 'points must be greater than 0' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // For redeem, check if customer has enough points
    if (type === 'redeem' && customer.loyaltyPoints < points) {
      return NextResponse.json(
        { success: false, error: `Insufficient points. Customer has ${customer.loyaltyPoints} points.` },
        { status: 400 }
      )
    }

    // Use transaction for data integrity - create transaction, update points, and tier upgrade are atomic
    const pointsDelta = type === 'redeem' ? -points : points

    const result = await db.$transaction(async (tx) => {
      // Create loyalty transaction
      const transaction = await tx.loyaltyTransaction.create({
        data: {
          customerId,
          type,
          points,
          description: description || null,
          referenceId: referenceId || null,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              loyaltyTier: true,
              loyaltyPoints: true,
            },
          },
        },
      })

      // Update customer loyalty points
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: pointsDelta } },
      })

      // Determine tier upgrade
      const newPoints = updatedCustomer.loyaltyPoints
      let newTier = customer.loyaltyTier
      if (newPoints >= 10000) newTier = 'vip'
      else if (newPoints >= 5000) newTier = 'platinum'
      else if (newPoints >= 2000) newTier = 'gold'
      else newTier = 'silver'

      if (newTier !== customer.loyaltyTier) {
        await tx.customer.update({
          where: { id: customerId },
          data: { loyaltyTier: newTier },
        })
      }

      return {
        transaction,
        previousPoints: customer.loyaltyPoints,
        newPoints: updatedCustomer.loyaltyPoints,
        tierUpgraded: newTier !== customer.loyaltyTier,
        newTier: newTier !== customer.loyaltyTier ? newTier : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process loyalty transaction'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
