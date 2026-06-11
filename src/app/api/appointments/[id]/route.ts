import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/appointments/[id] - Update appointment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const appointment = await db.appointment.update({
      where: { id },
      data: { status },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        staff: {
          select: { id: true, firstName: true, lastName: true, specialization: true },
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, price: true, duration: true },
            },
          },
        },
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: appointment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update appointment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// GET /api/appointments/[id] - Get a single appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: true,
        services: {
          include: {
            service: true,
          },
        },
        branch: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: appointment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch appointment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
