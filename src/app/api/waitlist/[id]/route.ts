import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/waitlist/[id] - Update waitlist entry status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const validStatuses = ['waiting', 'notified', 'booked', 'cancelled']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status is required (waiting, notified, booked, cancelled)' },
        { status: 400 }
      )
    }

    const existing = await db.waitlist.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    const updated = await db.waitlist.update({
      where: { id },
      data: { status },
    })

    // Fetch related data for the response
    const [customer, service, branch] = await Promise.all([
      db.customer.findUnique({
        where: { id: updated.customerId },
        select: { id: true, firstName: true, lastName: true, phone: true },
      }),
      updated.serviceId
        ? db.service.findUnique({
            where: { id: updated.serviceId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      db.branch.findUnique({
        where: { id: updated.branchId },
        select: { id: true, name: true },
      }),
    ])

    const data = {
      id: updated.id,
      customerId: updated.customerId,
      customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Unknown',
      customerPhone: customer?.phone || '',
      serviceId: updated.serviceId || '',
      serviceName: service?.name || '',
      preferredDate: updated.preferredDate.toISOString(),
      preferredTime: updated.preferredTime || '',
      status: updated.status,
      notes: updated.notes,
      branchId: updated.branchId,
      branchName: branch?.name || '',
      createdAt: updated.createdAt.toISOString(),
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update waitlist entry'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
