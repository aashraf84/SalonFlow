import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/shifts - List shifts with staff name and branch name, filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const branchId = searchParams.get('branchId')
    const staffId = searchParams.get('staffId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (branchId) where.branchId = branchId
    if (staffId) where.staffId = staffId
    if (status) where.status = status
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }

    const [shifts, total] = await Promise.all([
      db.shift.findMany({
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
              specialization: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              branchCode: true,
            },
          },
        },
      }),
      db.shift.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: shifts,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shifts'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/shifts - Create shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, branchId, date, startTime, endTime } = body

    if (!staffId || !branchId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'staffId, branchId, date, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    const shift = await db.shift.create({
      data: {
        staffId,
        branchId,
        date: new Date(date),
        startTime,
        endTime,
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
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: shift }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create shift'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
