import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/marketing/[id] - Update a campaign (e.g. send, change status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const campaign = await db.marketingCampaign.findUnique({ where: { id } })
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const updated = await db.marketingCampaign.update({
      where: { id },
      data: {
        status: body.status,
        sentAt: body.status === 'sent' ? new Date() : undefined,
      },
      include: {
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update campaign'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
