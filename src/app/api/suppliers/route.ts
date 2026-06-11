import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/suppliers - List all suppliers with search and filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    const suppliers = await db.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: suppliers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch suppliers'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      paymentTerms,
      rating,
      notes,
      status,
    } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const supplier = await db.supplier.create({
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        city,
        country: country || 'Pakistan',
        taxId,
        paymentTerms: paymentTerms || 'net_30',
        rating: rating ?? 5,
        notes,
        status: status || 'active',
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: supplier }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
