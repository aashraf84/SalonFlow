import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/suppliers/[id] - Get a single supplier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            branch: {
              select: { id: true, name: true, branchCode: true },
            },
            _count: {
              select: { items: true },
            },
          },
        },
        _count: {
          select: { purchaseOrders: true },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PUT /api/suppliers/[id] - Update a supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      paymentTerms,
      rating,
      notes,
      status,
    } = body

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (contactPerson !== undefined) data.contactPerson = contactPerson
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone
    if (address !== undefined) data.address = address
    if (city !== undefined) data.city = city
    if (country !== undefined) data.country = country
    if (taxId !== undefined) data.taxId = taxId
    if (paymentTerms !== undefined) data.paymentTerms = paymentTerms
    if (rating !== undefined) data.rating = rating
    if (notes !== undefined) data.notes = notes
    if (status !== undefined) data.status = status

    const supplier = await db.supplier.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/suppliers/[id] - Delete a supplier
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseOrders: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    if (existing._count.purchaseOrders > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete supplier with existing purchase orders. Mark as inactive instead.' },
        { status: 400 }
      )
    }

    await db.supplier.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
