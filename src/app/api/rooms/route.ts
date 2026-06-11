import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/rooms - List rooms with branch relation and filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')
    const roomType = searchParams.get('roomType')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (branchId) {
      where.branchId = branchId
    }
    if (roomType) {
      where.roomType = roomType
    }
    if (status) {
      where.status = status
    }

    const [rooms, total] = await Promise.all([
      db.room.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
        },
      }),
      db.room.count({ where }),
    ])

    // Compute stats
    const allRooms = await db.room.findMany({
      select: { status: true },
    })
    const stats = {
      total: allRooms.length,
      available: allRooms.filter((r) => r.status === 'available').length,
      occupied: allRooms.filter((r) => r.status === 'occupied').length,
      maintenance: allRooms.filter((r) => r.status === 'maintenance' || r.status === 'cleaning').length,
    }

    return NextResponse.json({
      success: true,
      data: rooms,
      stats,
      pagination: { total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rooms'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { branchId, name, roomType, capacity, status, equipment } = body

    if (!branchId || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: branchId, name' },
        { status: 400 }
      )
    }

    const room = await db.room.create({
      data: {
        branchId,
        name,
        roomType: roomType || 'treatment',
        capacity: capacity ?? 1,
        status: status || 'available',
        equipment,
      },
      include: {
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: room }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create room'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/rooms - Update a room
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing room id' },
        { status: 400 }
      )
    }

    const room = await db.room.update({
      where: { id },
      data,
      include: {
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: room })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update room'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
