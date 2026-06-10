import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/commissions/[id] - Mark as paid
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.commission.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Commission not found' },
        { status: 404 }
      )
    }

    const commission = await db.commission.update({
      where: { id },
      data: { status: 'paid' },
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

    return NextResponse.json({ success: true, data: commission })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update commission'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
