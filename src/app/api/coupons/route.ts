import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/coupons - List coupons with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const status = searchParams.get('status')
    const discountType = searchParams.get('discountType')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (discountType) where.discountType = discountType
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [coupons, total] = await Promise.all([
      db.coupon.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      db.coupon.count({ where }),
    ])

    // Stats
    const activeCount = await db.coupon.count({ where: { status: 'active' } })
    const expiredCount = await db.coupon.count({ where: { status: 'expired' } })
    const disabledCount = await db.coupon.count({ where: { status: 'disabled' } })

    return NextResponse.json({
      success: true,
      data: coupons,
      stats: { total, active: activeCount, expired: expiredCount, disabled: disabledCount },
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch coupons'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/coupons - Create coupon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      code, name, description, discountType, discountValue,
      minPurchase, maxDiscount, usageLimit, perCustomerLimit,
      startDate, endDate, status,
    } = body

    if (!name || !discountType || discountValue === undefined || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'name, discountType, discountValue, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Auto-generate code if not provided
    const couponCode = code || `COUPON-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Check code uniqueness
    const existing = await db.coupon.findUnique({ where: { code: couponCode } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Coupon code already exists' },
        { status: 400 }
      )
    }

    const coupon = await db.coupon.create({
      data: {
        code: couponCode,
        name,
        description: description || null,
        discountType,
        discountValue: parseFloat(discountValue),
        minPurchase: minPurchase ? parseFloat(minPurchase) : 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit) : 1,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'active',
      },
    })

    return NextResponse.json({ success: true, data: coupon }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create coupon'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
