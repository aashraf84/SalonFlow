import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/branches - List all branches with staff count and room count
export async function GET() {
  try {
    const branches = await db.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            staff: { where: { status: 'active' } },
            rooms: true,
          },
        },
      },
    })

    const result = branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      branchCode: branch.branchCode,
      timezone: branch.timezone,
      openTime: branch.openTime,
      closeTime: branch.closeTime,
      isActive: branch.isActive,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      staffCount: branch._count.staff,
      roomCount: branch._count.rooms,
    }))

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch branches'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/branches - Create branch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, phone, email, branchCode, timezone, openTime, closeTime } = body

    if (!name || !branchCode) {
      return NextResponse.json(
        { success: false, error: 'name and branchCode are required' },
        { status: 400 }
      )
    }

    // Check unique branchCode
    const existing = await db.branch.findUnique({ where: { branchCode } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'branchCode already exists' },
        { status: 409 }
      )
    }

    const branch = await db.branch.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        branchCode,
        timezone: timezone || 'Asia/Karachi',
        openTime: openTime || '09:00',
        closeTime: closeTime || '21:00',
      },
    })

    return NextResponse.json({ success: true, data: branch }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create branch'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
