import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/gift-cards/[id] - Single gift card with transactions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const giftCard = await db.giftCard.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!giftCard) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const totalRedeemed = giftCard.transactions
      .filter((t) => t.type === 'redeem')
      .reduce((sum, t) => sum + t.amount, 0)
    const totalToppedUp = giftCard.transactions
      .filter((t) => t.type === 'topup')
      .reduce((sum, t) => sum + t.amount, 0)

    return NextResponse.json({
      success: true,
      data: {
        ...giftCard,
        totalRedeemed,
        totalToppedUp,
        transactionCount: giftCard.transactions.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch gift card'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/gift-cards/[id] - Update gift card status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      )
    }

    const existing = await db.giftCard.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const giftCard = await db.giftCard.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, data: giftCard })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update gift card'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/gift-cards/[id] - Cancel gift card (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.giftCard.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const giftCard = await db.giftCard.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true, data: giftCard })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel gift card'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
