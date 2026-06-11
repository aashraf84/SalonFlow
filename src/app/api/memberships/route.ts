import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/memberships - List membership plans with member count, and active memberships
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'plans' or 'memberships'
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')

    if (type === 'memberships') {
      // List active memberships with customer and plan details
      const status = searchParams.get('status')
      const where: Record<string, unknown> = {}
      if (status) {
        where.status = status
      }

      const [memberships, total] = await Promise.all([
        db.membership.findMany({
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
              },
            },
            plan: true,
          },
        }),
        db.membership.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data: memberships,
        pagination: { skip, take, total },
      })
    }

    // Default: List membership plans with member count
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const plans = await db.membershipPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: { memberships: { where: { status: 'active' } } },
        },
      },
    })

    const result = plans.map((plan) => ({
      ...plan,
      memberCount: plan._count.memberships,
    }))

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch memberships'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/memberships - Create a new membership plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      price,
      duration,
      discount,
      freeServices,
      priorityBooking,
      loyaltyBonus,
      isActive,
    } = body

    if (!name || price === undefined || price === null || !duration) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, price, duration' },
        { status: 400 }
      )
    }

    const plan = await db.membershipPlan.create({
      data: {
        name,
        description,
        price: parseFloat(String(price)),
        duration,
        discount: discount ? parseFloat(String(discount)) : 0,
        freeServices: freeServices || 0,
        priorityBooking: priorityBooking ?? false,
        loyaltyBonus: loyaltyBonus || 0,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create membership plan'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
