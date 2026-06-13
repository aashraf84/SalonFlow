import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/service-areas - Get all service areas
export async function GET() {
  try {
    const areas = await db.serviceArea.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: areas })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch service areas'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/settings/service-areas - Create or update service areas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { areas } = body as { areas: Array<{
      id?: string
      name: string
      description?: string
      radius?: number
      deliveryCharge?: number
      minOrderAmount?: number
      estimatedTime?: string
      isActive?: boolean
      order?: number
    }>}

    if (!areas || !Array.isArray(areas)) {
      return NextResponse.json({ success: false, error: 'areas array is required' }, { status: 400 })
    }

    const results = []
    for (const area of areas) {
      if (area.id) {
        const updated = await db.serviceArea.update({
          where: { id: area.id },
          data: {
            name: area.name,
            description: area.description,
            radius: area.radius,
            deliveryCharge: area.deliveryCharge,
            minOrderAmount: area.minOrderAmount,
            estimatedTime: area.estimatedTime,
            isActive: area.isActive,
            order: area.order,
          },
        })
        results.push(updated)
      } else {
        const created = await db.serviceArea.create({
          data: {
            name: area.name,
            description: area.description,
            radius: area.radius ?? 10,
            deliveryCharge: area.deliveryCharge ?? 0,
            minOrderAmount: area.minOrderAmount ?? 0,
            estimatedTime: area.estimatedTime,
            isActive: area.isActive ?? true,
            order: area.order ?? 0,
          },
        })
        results.push(created)
      }
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save service areas'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/settings/service-areas - Delete a service area
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    await db.serviceArea.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete service area'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
