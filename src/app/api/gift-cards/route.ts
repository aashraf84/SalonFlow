import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SF-${segment()}-${segment()}`
}

// GET /api/gift-cards - List gift cards with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { recipientName: { contains: search } },
        { recipientEmail: { contains: search } },
      ]
    }

    const [giftCards, total] = await Promise.all([
      db.giftCard.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { transactions: true } },
          transactions: {
            select: { amount: true, type: true },
          },
        },
      }),
      db.giftCard.count({ where }),
    ])

    const enriched = giftCards.map((gc) => {
      const totalRedeemed = gc.transactions
        .filter((t) => t.type === 'redeem')
        .reduce((sum, t) => sum + t.amount, 0)
      const totalToppedUp = gc.transactions
        .filter((t) => t.type === 'topup')
        .reduce((sum, t) => sum + t.amount, 0)
      return {
        id: gc.id,
        code: gc.code,
        initialBalance: gc.initialBalance,
        remainingBalance: gc.remainingBalance,
        purchasedBy: gc.purchasedBy,
        recipientName: gc.recipientName,
        recipientEmail: gc.recipientEmail,
        recipientPhone: gc.recipientPhone,
        message: gc.message,
        status: gc.status,
        purchasedAt: gc.purchasedAt,
        expiresAt: gc.expiresAt,
        createdAt: gc.createdAt,
        updatedAt: gc.updatedAt,
        transactionCount: gc._count.transactions,
        totalRedeemed,
        totalToppedUp,
      }
    })

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch gift cards'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/gift-cards - Create gift card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initialBalance, purchasedBy, recipientName, recipientEmail, recipientPhone, message, expiresAt } = body

    if (!initialBalance || initialBalance <= 0) {
      return NextResponse.json(
        { success: false, error: 'initialBalance must be greater than 0' },
        { status: 400 }
      )
    }

    // Generate unique code
    let code = generateGiftCardCode()
    let exists = await db.giftCard.findUnique({ where: { code } })
    while (exists) {
      code = generateGiftCardCode()
      exists = await db.giftCard.findUnique({ where: { code } })
    }

    // Use transaction for data integrity - gift card + initial purchase transaction are atomic
    const giftCard = await db.$transaction(async (tx) => {
      const card = await tx.giftCard.create({
        data: {
          code,
          initialBalance,
          remainingBalance: initialBalance,
          purchasedBy: purchasedBy || null,
          recipientName: recipientName || null,
          recipientEmail: recipientEmail || null,
          recipientPhone: recipientPhone || null,
          message: message || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      })

      // Create initial purchase transaction
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: card.id,
          type: 'purchase',
          amount: initialBalance,
          description: 'Initial gift card purchase',
        },
      })

      return card
    })

    return NextResponse.json({ success: true, data: giftCard }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create gift card'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
