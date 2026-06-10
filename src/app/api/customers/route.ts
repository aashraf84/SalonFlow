import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers - List customers with search, filter, and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const search = searchParams.get('search')
    const loyaltyTier = searchParams.get('loyaltyTier')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    if (loyaltyTier) {
      where.loyaltyTier = loyaltyTier
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            where: { status: 'active' },
            include: {
              plan: true,
            },
          },
        },
      }),
      db.customer.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch customers'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      address,
      city,
      notes,
      skinType,
      hairType,
      preferences,
      loyaltyTier,
      referredBy,
    } = body

    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: firstName, lastName, phone' },
        { status: 400 }
      )
    }

    const customer = await db.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address,
        city,
        notes,
        skinType,
        hairType,
        preferences,
        loyaltyTier: loyaltyTier || 'silver',
        referredBy,
      },
      include: {
        memberships: {
          include: { plan: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: customer }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create customer'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
