import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/memberships/[id] - Update a membership (e.g. cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const membership = await db.membership.findUnique({ where: { id } })
    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Membership not found' },
        { status: 404 }
      )
    }

    const updated = await db.membership.update({
      where: { id },
      data: {
        status: body.status,
        autoRenew: body.autoRenew,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            loyaltyTier: true,
          },
        },
        plan: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update membership'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/memberships/[id] - Create a new membership subscription
// Actually we handle subscribe at the collection level, but this route can be used too
