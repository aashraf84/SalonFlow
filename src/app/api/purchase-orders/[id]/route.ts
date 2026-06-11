import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/purchase-orders/[id] - Get a single purchase order with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, costPrice: true },
            },
          },
        },
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: purchaseOrder })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch purchase order'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PUT /api/purchase-orders/[id] - Update PO status or receive items
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, receivedItems, notes } = body

    const existing = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // Handle receiving items (update inventory)
    if (receivedItems && Array.isArray(receivedItems)) {
      for (const ri of receivedItems) {
        const poItem = existing.items.find(i => i.id === ri.id)
        if (!poItem) continue

        // Update the PO item's receivedQty
        await db.purchaseOrderItem.update({
          where: { id: ri.id },
          data: { receivedQty: { increment: ri.receivedQty } },
        })

        // Update or create inventory item
        const existingInventory = await db.inventoryItem.findUnique({
          where: {
            productId_branchId: {
              productId: poItem.productId,
              branchId: existing.branchId,
            },
          },
        })

        if (existingInventory) {
          await db.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: { increment: ri.receivedQty },
              lastRestocked: new Date(),
            },
          })
        } else {
          await db.inventoryItem.create({
            data: {
              productId: poItem.productId,
              branchId: existing.branchId,
              quantity: ri.receivedQty,
              lastRestocked: new Date(),
            },
          })
        }
      }

      // Check if all items are fully received
      const updatedItems = await db.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      })
      const allReceived = updatedItems.every(item => item.receivedQty >= item.quantity)
      const anyReceived = updatedItems.some(item => item.receivedQty > 0)

      let newStatus = existing.status
      if (allReceived) {
        newStatus = 'received'
      } else if (anyReceived) {
        newStatus = 'partially_received'
      }

      await db.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          receivedDate: allReceived ? new Date() : undefined,
          notes: notes !== undefined ? notes : existing.notes,
        },
      })
    } else if (status) {
      // Simple status update
      const validTransitions: Record<string, string[]> = {
        draft: ['sent', 'cancelled'],
        sent: ['confirmed', 'cancelled'],
        confirmed: ['partially_received', 'received', 'cancelled'],
        partially_received: ['received', 'cancelled'],
      }

      const allowed = validTransitions[existing.status] || []
      if (!allowed.includes(status) && status !== existing.status) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from ${existing.status} to ${status}` },
          { status: 400 }
        )
      }

      await db.purchaseOrder.update({
        where: { id },
        data: {
          status,
          notes: notes !== undefined ? notes : existing.notes,
        },
      })
    }

    // Fetch and return the updated PO
    const updated = await db.purchaseOrder.findUnique({
      where: { id },
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

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update purchase order'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/purchase-orders/[id] - Delete a purchase order (only if draft)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.purchaseOrder.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Only draft or cancelled purchase orders can be deleted' },
        { status: 400 }
      )
    }

    // Delete items first (cascade), then the PO
    await db.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } })
    await db.purchaseOrder.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete purchase order'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
