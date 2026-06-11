import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── Helper: Generate invoice number INV-YYYYMMDD-XXXX ──────────────────
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  // Find the latest invoice number for today
  const latestInvoice = await db.ownerInvoice.findFirst({
    where: { invoiceNumber: { startsWith: `INV-${datePart}-` } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  let seq = 1
  if (latestInvoice) {
    const parts = latestInvoice.invoiceNumber.split('-')
    seq = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `INV-${datePart}-${String(seq).padStart(4, '0')}`
}

// ─── GET: List all invoices ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? ''
    const clientId = searchParams.get('clientId') ?? ''

    const where: Record<string, unknown> = {}

    if (status) {
      where.paymentStatus = status
    }

    if (clientId) {
      where.clientId = clientId
    }

    const invoices = await db.ownerInvoice.findMany({
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

    return NextResponse.json({ success: true, data: invoices })
  } catch (error) {
    console.error('[Owner Invoices API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 },
    )
  }
}

// ─── POST: Create invoice ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      clientId,
      items = [],
      taxRate = 0,
      discountRate = 0,
      notes,
      terms,
      issueDate,
      dueDate,
      currency = 'PKR',
      paymentMethod,
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

    // ── Generate invoice number ─────────────────────────────────────────
    const invoiceNumber = await generateInvoiceNumber()

    // ── Set dates ───────────────────────────────────────────────────────
    const invoiceIssueDate = issueDate ? new Date(issueDate) : new Date()
    const invoiceDueDate = dueDate
      ? new Date(dueDate)
      : new Date(invoiceIssueDate.getTime() + 30 * 24 * 60 * 60 * 1000) // default 30 days

    // ── Create invoice with items ───────────────────────────────────────
    const invoice = await db.ownerInvoice.create({
      data: {
        clientId,
        invoiceNumber,
        issueDate: invoiceIssueDate,
        dueDate: invoiceDueDate,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        currency,
        paymentStatus: 'unpaid',
        paymentMethod,
        notes,
        terms,
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

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (error) {
    console.error('[Owner Invoices API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 },
    )
  }
}
