import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET: Get single invoice ────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const invoice = await db.ownerInvoice.findUnique({
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

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error('[Owner Invoice API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 },
    )
  }
}

// ─── PATCH: Update invoice ──────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingInvoice = await db.ownerInvoice.findUnique({ where: { id } })
    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 },
      )
    }

    const {
      paymentStatus,
      paymentMethod,
      paymentRef,
      paidAmount,
      notes,
      terms,
      items,
      taxRate,
      discountRate,
      dueDate,
    } = body

    const updateData: Record<string, unknown> = {}

    // ── Handle payment status changes ───────────────────────────────────
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus

      if (paymentStatus === 'paid') {
        updateData.paidAmount = existingInvoice.totalAmount
        updateData.paidAt = new Date()
        if (paymentMethod) updateData.paymentMethod = paymentMethod
        if (paymentRef) updateData.paymentRef = paymentRef
      } else if (paymentStatus === 'partial') {
        updateData.paidAmount = paidAmount ?? existingInvoice.paidAmount
        if (paymentMethod) updateData.paymentMethod = paymentMethod
        if (paymentRef) updateData.paymentRef = paymentRef
      } else if (paymentStatus === 'cancelled') {
        updateData.paidAmount = 0
      }
    } else {
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod
      if (paymentRef !== undefined) updateData.paymentRef = paymentRef
      if (paidAmount !== undefined) {
        updateData.paidAmount = paidAmount
        // Auto-update payment status based on paid amount
        if (paidAmount >= existingInvoice.totalAmount) {
          updateData.paymentStatus = 'paid'
          updateData.paidAt = new Date()
        } else if (paidAmount > 0) {
          updateData.paymentStatus = 'partial'
        }
      }
    }

    if (notes !== undefined) updateData.notes = notes
    if (terms !== undefined) updateData.terms = terms
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)

    // ── Recalculate if tax/discount changes ─────────────────────────────
    if (taxRate !== undefined || discountRate !== undefined) {
      const newTaxRate = taxRate ?? existingInvoice.taxRate
      const newDiscountRate = discountRate ?? existingInvoice.discountRate
      const subtotal = existingInvoice.subtotal
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
      // Delete existing items and recreate
      await db.ownerInvoiceItem.deleteMany({ where: { invoiceId: id } })

      if (items.length > 0) {
        await db.ownerInvoiceItem.createMany({
          data: items.map((item: { itemType: string; description: string; quantity: number; unitPrice: number; discount?: number }) => ({
            invoiceId: id,
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

      const currentTaxRate = (taxRate ?? existingInvoice.taxRate) as number
      const currentDiscountRate = (discountRate ?? existingInvoice.discountRate) as number
      const newTaxAmount = newSubtotal * (currentTaxRate / 100)
      const newDiscountAmount = newSubtotal * (currentDiscountRate / 100)
      const newTotalAmount = newSubtotal + newTaxAmount - newDiscountAmount

      updateData.subtotal = newSubtotal
      updateData.taxAmount = newTaxAmount
      updateData.discountAmount = newDiscountAmount
      updateData.totalAmount = newTotalAmount
    }

    const updatedInvoice = await db.ownerInvoice.update({
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

    return NextResponse.json({ success: true, data: updatedInvoice })
  } catch (error) {
    console.error('[Owner Invoice API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 },
    )
  }
}

// ─── DELETE: Delete invoice ─────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const invoice = await db.ownerInvoice.findUnique({ where: { id } })
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 },
      )
    }

    await db.ownerInvoiceItem.deleteMany({ where: { invoiceId: id } })
    await db.ownerInvoice.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      data: { message: 'Invoice deleted successfully' },
    })
  } catch (error) {
    console.error('[Owner Invoice API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete invoice' },
      { status: 500 },
    )
  }
}
