import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/services - List service categories with their services and service count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const categories = await db.serviceCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        services: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            serviceAddons: {
              where: { isActive: true },
            },
          },
        },
        _count: {
          select: { services: includeInactive ? {} : { where: { isActive: true } } },
        },
      },
    })

    // Add serviceCount to each category
    const result = categories.map((cat) => ({
      ...cat,
      serviceCount: cat._count.services,
    }))

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch services'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/services - Create a new service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId, name, description, duration, price, isActive, isPackage, requirements, afterCare } = body

    if (!categoryId || !name || !duration || price === undefined || price === null) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: categoryId, name, duration, price' },
        { status: 400 }
      )
    }

    const service = await db.service.create({
      data: {
        categoryId,
        name,
        description,
        duration,
        price: parseFloat(String(price)),
        isActive: isActive ?? true,
        isPackage: isPackage ?? false,
        requirements,
        afterCare,
      },
      include: {
        category: true,
        serviceAddons: true,
      },
    })

    return NextResponse.json({ success: true, data: service }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create service'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/services - Update a service
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing service id' },
        { status: 400 }
      )
    }

    if (data.price !== undefined) {
      data.price = parseFloat(String(data.price))
    }
    if (data.duration !== undefined) {
      data.duration = parseInt(String(data.duration))
    }

    const service = await db.service.update({
      where: { id },
      data,
      include: {
        category: true,
        serviceAddons: true,
      },
    })

    return NextResponse.json({ success: true, data: service })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update service'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
