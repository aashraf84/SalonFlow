import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/feedback/[id] - Update feedback (respond to it)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { response, status } = body

    if (!response && !status) {
      return NextResponse.json(
        { success: false, error: 'response or status is required' },
        { status: 400 }
      )
    }

    const existing = await db.feedback.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (response) {
      data.response = response
      data.respondedAt = new Date()
    }
    if (status) {
      data.status = status
    }

    const feedback = await db.feedback.update({
      where: { id },
      data,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: feedback })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update feedback'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
