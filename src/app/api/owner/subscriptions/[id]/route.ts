import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── PATCH: Update subscription ─────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.ownerClientSubscription.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 },
      )
    }

    const {
      planName,
      price,
      billingCycle,
      startDate,
      endDate,
      status,
      autoRenew,
      nextBillingDate,
      cancelledAt,
      notes,
    } = body

    const updateData: Record<string, unknown> = {}

    if (planName !== undefined) updateData.planName = planName
    if (price !== undefined) updateData.price = price
    if (billingCycle !== undefined) updateData.billingCycle = billingCycle
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (autoRenew !== undefined) updateData.autoRenew = autoRenew
    if (nextBillingDate !== undefined) updateData.nextBillingDate = new Date(nextBillingDate)
    if (notes !== undefined) updateData.notes = notes

    if (status !== undefined) {
      updateData.status = status

      // If cancelling, set cancelledAt
      if (status === 'cancelled' && !existing.cancelledAt) {
        updateData.cancelledAt = cancelledAt ? new Date(cancelledAt) : new Date()
        updateData.autoRenew = false
      }

      // If pausing, disable auto-renew
      if (status === 'paused') {
        updateData.autoRenew = false
      }

      // If reactivating
      if (status === 'active' && existing.status !== 'active') {
        updateData.autoRenew = true
        updateData.cancelledAt = null
      }
    }

    const updated = await db.ownerClientSubscription.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            slug: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[Owner Subscription API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update subscription' },
      { status: 500 },
    )
  }
}

// ─── DELETE: Delete subscription ────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.ownerClientSubscription.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 },
      )
    }

    await db.ownerClientSubscription.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      data: { message: 'Subscription deleted successfully' },
    })
  } catch (error) {
    console.error('[Owner Subscription API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete subscription' },
      { status: 500 },
    )
  }
}
