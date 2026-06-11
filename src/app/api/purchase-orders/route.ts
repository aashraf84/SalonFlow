import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/purchase-orders - List all purchase orders
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')
    const branchId = searchParams.get('branchId')

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (supplierId) where.supplierId = supplierId
    if (branchId) where.branchId = branchId

    const purchaseOrders = await db.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: {
          select: { id: true, name: true, contactPerson: true, status: true },
        },
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
        _count: {
          select: { items: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: purchaseOrders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch purchase orders'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/purchase-orders - Create a new purchase order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      supplierId,
      branchId,
      expectedDate,
      notes,
      items,
      taxAmount,
      shippingCost,
    } = body

    if (!supplierId || !branchId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplierId, branchId, and at least one item' },
        { status: 400 }
      )
    }

    // Generate PO number
    const poCount = await db.purchaseOrder.count()
    const poNumber = `PO-${String(poCount + 1).padStart(5, '0')}`

    // Calculate totals from items
    const subtotal = items.reduce((sum: number, item: { quantity: number; unitCost: number }) => sum + item.quantity * item.unitCost, 0)
    const tax = taxAmount || 0
    const shipping = shippingCost || 0
    const totalAmount = subtotal + tax + shipping

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        branchId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        taxAmount: tax,
        shippingCost: shipping,
        totalAmount,
        notes,
        items: {
          create: items.map((item: { productId: string; quantity: number; unitCost: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            total: item.quantity * item.unitCost,
          })),
        },
      },
      include: {
        supplier: {
          select: { id: true, name: true, contactPerson: true },
        },
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: purchaseOrder }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create purchase order'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
