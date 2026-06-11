import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── Helper: Generate quotation number QT-YYYYMMDD-XXXX ─────────────────
async function generateQuotationNumber(): Promise<string> {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  const latestQuotation = await db.ownerQuotation.findFirst({
    where: { quotationNumber: { startsWith: `QT-${datePart}-` } },
    orderBy: { quotationNumber: 'desc' },
    select: { quotationNumber: true },
  })

  let seq = 1
  if (latestQuotation) {
    const parts = latestQuotation.quotationNumber.split('-')
    seq = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `QT-${datePart}-${String(seq).padStart(4, '0')}`
}

// ─── GET: List all quotations ───────────────────────────────────────────
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

    const quotations = await db.ownerQuotation.findMany({
      where,
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
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: quotations })
  } catch (error) {
    console.error('[Owner Quotations API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotations' },
      { status: 500 },
    )
  }
}

// ─── POST: Create quotation ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      clientId,
      subject,
      items = [],
      taxRate = 0,
      discountRate = 0,
      notes,
      terms,
      validUntil,
      internalNotes,
      currency = 'PKR',
    } = body

    // ── Validate ────────────────────────────────────────────────────────
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId is required' },
        { status: 400 },
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
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

    // ── Calculate amounts ───────────────────────────────────────────────
    const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number; discount?: number }) => {
      const itemTotal = item.quantity * item.unitPrice - (item.discount ?? 0)
      return sum + itemTotal
    }, 0)

    const taxAmount = subtotal * (taxRate / 100)
    const discountAmount = subtotal * (discountRate / 100)
    const totalAmount = subtotal + taxAmount - discountAmount

    // ── Generate quotation number ───────────────────────────────────────
    const quotationNumber = await generateQuotationNumber()

    // ── Set validUntil (default: 30 days from now) ─────────────────────
    const quotationValidUntil = validUntil
      ? new Date(validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // ── Create quotation with items ─────────────────────────────────────
    const quotation = await db.ownerQuotation.create({
      data: {
        clientId,
        quotationNumber,
        subject,
        validUntil: quotationValidUntil,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        totalAmount,
        currency,
        status: 'draft',
        notes,
        terms,
        internalNotes,
        items: {
          createMany: {
            data: items.map((item: { itemType: string; description: string; quantity: number; unitPrice: number; discount?: number }) => ({
              itemType: item.itemType,
              description: item.description,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice,
              discount: item.discount ?? 0,
              total: item.quantity * item.unitPrice - (item.discount ?? 0),
            })),
          },
        },
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
        items: true,
      },
    })

    return NextResponse.json({ success: true, data: quotation }, { status: 201 })
  } catch (error) {
    console.error('[Owner Quotations API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create quotation' },
      { status: 500 },
    )
  }
}
