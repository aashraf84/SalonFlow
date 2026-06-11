import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/attendance/[id] - Update attendance record (clock out, change status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.attendance.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.clockOut !== undefined) updateData.clockOut = body.clockOut ? new Date(body.clockOut) : new Date()
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    const updated = await db.attendance.update({
      where: { id },
      data: updateData,
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
    const message = error instanceof Error ? error.message : 'Failed to update attendance'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
