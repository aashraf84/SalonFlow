import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/tips/[id] - Update tip (mark as paid, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.tip.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tip not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod

    const updated = await db.tip.update({
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
    const message = error instanceof Error ? error.message : 'Failed to update tip'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/tips/[id] - Delete tip
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.tip.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tip not found' },
        { status: 404 }
      )
    }

    await db.tip.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete tip'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
