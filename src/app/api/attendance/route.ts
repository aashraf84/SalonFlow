import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/attendance - List attendance with staff name, today's stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const staffId = searchParams.get('staffId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (staffId) where.staffId = staffId
    if (status) where.status = status
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }

    const [records, total] = await Promise.all([
      db.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              branch: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      db.attendance.count({ where }),
    ])

    // Today's stats
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayWhere = { date: { gte: todayStart, lte: todayEnd } }
    const todayPresent = await db.attendance.count({
      where: { ...todayWhere, status: 'present' },
    })
    const todayLate = await db.attendance.count({
      where: { ...todayWhere, status: 'late' },
    })
    const todayAbsent = await db.attendance.count({
      where: { ...todayWhere, status: 'absent' },
    })
    const todayHalfDay = await db.attendance.count({
      where: { ...todayWhere, status: 'half_day' },
    })
    const todayTotal = await db.attendance.count({ where: todayWhere })

    const todayStats = {
      total: todayTotal,
      present: todayPresent,
      late: todayLate,
      absent: todayAbsent,
      halfDay: todayHalfDay,
    }

    return NextResponse.json({
      success: true,
      data: records,
      todayStats,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attendance'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/attendance - Clock in
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, branchId } = body

    if (!staffId || !branchId) {
      return NextResponse.json(
        { success: false, error: 'staffId and branchId are required' },
        { status: 400 }
      )
    }

    // Check if already clocked in today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const existingRecord = await db.attendance.findFirst({
      where: {
        staffId,
        date: { gte: todayStart, lte: todayEnd },
      },
    })

    if (existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Already clocked in today' },
        { status: 400 }
      )
    }

    const now = new Date()
    const record = await db.attendance.create({
      data: {
        staffId,
        branchId,
        date: now,
        clockIn: now,
        status: 'present',
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clock in'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/attendance - Clock out
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, clockOut } = body

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'staffId is required' },
        { status: 400 }
      )
    }

    // Find today's record
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const record = await db.attendance.findFirst({
      where: {
        staffId,
        date: { gte: todayStart, lte: todayEnd },
        clockOut: null,
      },
    })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'No active clock-in found for today' },
        { status: 404 }
      )
    }

    const clockOutTime = clockOut ? new Date(clockOut) : new Date()
    const updated = await db.attendance.update({
      where: { id: record.id },
      data: { clockOut: clockOutTime },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clock out'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
