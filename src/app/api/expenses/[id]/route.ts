import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/expenses/[id] - Update expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { category, amount, description, date, paidBy, receipt } = body

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (category !== undefined) data.category = category
    if (amount !== undefined) data.amount = amount
    if (description !== undefined) data.description = description
    if (date !== undefined) data.date = new Date(date)
    if (paidBy !== undefined) data.paidBy = paidBy
    if (receipt !== undefined) data.receipt = receipt

    const expense = await db.expense.update({
      where: { id },
      data,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: expense })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      )
    }

    await db.expense.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
