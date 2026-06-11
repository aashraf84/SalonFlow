import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── Helper: Generate invoice number INV-YYYYMMDD-XXXX ──────────────────
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

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

// ─── GET: Get single quotation ──────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const quotation = await db.ownerQuotation.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phone: true,
            slug: true,
            address: true,
            city: true,
            country: true,
          },
        },
        items: true,
      },
    })

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: quotation })
  } catch (error) {
    console.error('[Owner Quotation API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotation' },
      { status: 500 },
    )
  }
}

// ─── PATCH: Update quotation ────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingQuotation = await db.ownerQuotation.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existingQuotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 },
      )
    }

    const {
      status,
      subject,
      notes,
      terms,
      internalNotes,
      validUntil,
      taxRate,
      discountRate,
      items,
    } = body

    const updateData: Record<string, unknown> = {}

    if (subject !== undefined) updateData.subject = subject
    if (notes !== undefined) updateData.notes = notes
    if (terms !== undefined) updateData.terms = terms
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil)

    // ── Handle status change to "converted" ─────────────────────────────
    if (status === 'converted' && existingQuotation.status !== 'converted') {
      updateData.status = 'converted'

      // Auto-create an invoice from the quotation
      const invoiceNumber = await generateInvoiceNumber()
      const invoiceDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const invoice = await db.ownerInvoice.create({
        data: {
          clientId: existingQuotation.clientId,
          invoiceNumber,
          issueDate: new Date(),
          dueDate: invoiceDueDate,
          subtotal: existingQuotation.subtotal,
          taxRate: existingQuotation.taxRate,
          taxAmount: existingQuotation.taxAmount,
          discountRate: existingQuotation.discountRate,
          discountAmount: existingQuotation.discountAmount,
          totalAmount: existingQuotation.totalAmount,
          paidAmount: 0,
          currency: existingQuotation.currency,
          paymentStatus: 'unpaid',
          notes: existingQuotation.notes,
          terms: existingQuotation.terms,
          items: {
            createMany: {
              data: existingQuotation.items.map((item) => ({
                itemType: item.itemType,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                total: item.total,
              })),
            },
          },
        },
      })

      // Link the quotation to the new invoice
      updateData.convertedInvoiceId = invoice.id
    } else if (status !== undefined) {
      updateData.status = status
    }

    // ── Recalculate if tax/discount changes ─────────────────────────────
    if (taxRate !== undefined || discountRate !== undefined) {
      const newTaxRate = taxRate ?? existingQuotation.taxRate
      const newDiscountRate = discountRate ?? existingQuotation.discountRate
      const subtotal = existingQuotation.subtotal
      const newTaxAmount = subtotal * (newTaxRate / 100)
      const newDiscountAmount = subtotal * (newDiscountRate / 100)
      const newTotalAmount = subtotal + newTaxAmount - newDiscountAmount

      updateData.taxRate = newTaxRate
      updateData.discountRate = newDiscountRate
      updateData.taxAmount = newTaxAmount
      updateData.discountAmount = newDiscountAmount
      updateData.totalAmount = newTotalAmount
    }

    // ── Update items if provided ────────────────────────────────────────
    if (items !== undefined && Array.isArray(items)) {
      await db.ownerQuotationItem.deleteMany({ where: { quotationId: id } })

      if (items.length > 0) {
        await db.ownerQuotationItem.createMany({
          data: items.map((item: { itemType: string; description: string; quantity: number; unitPrice: number; discount?: number }) => ({
            quotationId: id,
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
            total: item.quantity * item.unitPrice - (item.discount ?? 0),
          })),
        })
      }

      // Recalculate subtotal from new items
      const newSubtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number; discount?: number }) => {
        return sum + item.quantity * item.unitPrice - (item.discount ?? 0)
      }, 0)

      const currentTaxRate = (taxRate ?? existingQuotation.taxRate) as number
      const currentDiscountRate = (discountRate ?? existingQuotation.discountRate) as number
      const newTaxAmount = newSubtotal * (currentTaxRate / 100)
      const newDiscountAmount = newSubtotal * (currentDiscountRate / 100)
      const newTotalAmount = newSubtotal + newTaxAmount - newDiscountAmount

      updateData.subtotal = newSubtotal
      updateData.taxAmount = newTaxAmount
      updateData.discountAmount = newDiscountAmount
      updateData.totalAmount = newTotalAmount
    }

    const updatedQuotation = await db.ownerQuotation.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: updatedQuotation })
  } catch (error) {
    console.error('[Owner Quotation API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update quotation' },
      { status: 500 },
    )
  }
}

// ─── DELETE: Delete quotation ───────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const quotation = await db.ownerQuotation.findUnique({ where: { id } })
    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 },
      )
    }

    await db.ownerQuotationItem.deleteMany({ where: { quotationId: id } })
    await db.ownerQuotation.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      data: { message: 'Quotation deleted successfully' },
    })
  } catch (error) {
    console.error('[Owner Quotation API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete quotation' },
      { status: 500 },
    )
  }
}
