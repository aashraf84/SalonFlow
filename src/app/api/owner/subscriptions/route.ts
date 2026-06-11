import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET: List all subscriptions ────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? ''
    const clientId = searchParams.get('clientId') ?? ''

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (clientId) {
      where.clientId = clientId
    }

    const subscriptions = await db.ownerClientSubscription.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            slug: true,
            status: true,
            purchaseType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: subscriptions })
  } catch (error) {
    console.error('[Owner Subscriptions API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriptions' },
      { status: 500 },
    )
  }
}

// ─── POST: Create subscription ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      clientId,
      planName,
      price,
      billingCycle,
      startDate,
      endDate,
      autoRenew = true,
      nextBillingDate,
      notes,
    } = body

    // ── Validate ────────────────────────────────────────────────────────
    if (!clientId || !planName || price === undefined || !billingCycle || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'clientId, planName, price, billingCycle, startDate, and endDate are required' },
        { status: 400 },
      )
    }

    const client = await db.ownerClient.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 },
      )
    }

    const subscription = await db.ownerClientSubscription.create({
      data: {
        clientId,
        planName,
        price,
        billingCycle,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'active',
        autoRenew,
        nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : new Date(endDate),
        notes,
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: subscription }, { status: 201 })
  } catch (error) {
    console.error('[Owner Subscriptions API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 },
    )
  }
}
