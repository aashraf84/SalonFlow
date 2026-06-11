import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory - List inventory items with product and branch relations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const lowStock = searchParams.get('lowStock') === 'true'
    const branchId = searchParams.get('branchId')
    const productId = searchParams.get('productId')

    const where: Record<string, unknown> = {}

    if (branchId) {
      where.branchId = branchId
    }
    if (productId) {
      where.productId = productId
    }
    if (lowStock) {
      // Filter items where quantity <= product's reorderLevel
      // SQLite doesn't support field-level comparison in where, so we filter in-memory
      const allItems = await db.inventoryItem.findMany({
        where: { branchId: branchId || undefined },
        include: {
          product: {
            include: {
              category: {
                select: { id: true, name: true },
              },
            },
          },
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      const filtered = allItems.filter((item) => item.quantity <= item.product.reorderLevel)
      const total = filtered.length
      const paged = filtered.slice(skip, skip + take)

      return NextResponse.json({
        success: true,
        data: paged,
        pagination: { skip, take, total },
      })
    }

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: {
            include: {
              category: {
                select: { id: true, name: true },
              },
            },
          },
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
        },
      }),
      db.inventoryItem.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/inventory - Update inventory quantity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, quantity, operation, batchNumber, expiryDate } = body

    if (!id || quantity === undefined || quantity === null) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, quantity' },
        { status: 400 }
      )
    }

    // operation: 'set' (absolute), 'add' (increment), 'subtract' (decrement)
    const op = operation || 'set'

    if (op === 'set') {
      const item = await db.inventoryItem.update({
        where: { id },
        data: {
          quantity: parseInt(String(quantity)),
          batchNumber: batchNumber || undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          lastRestocked: new Date(),
        },
        include: {
          product: {
            include: { category: true },
          },
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
        },
      })

      return NextResponse.json({ success: true, data: item })
    }

    // For add/subtract, we need to get the current value first
    const currentItem = await db.inventoryItem.findUnique({
      where: { id },
    })

    if (!currentItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    const newQuantity =
      op === 'add'
        ? currentItem.quantity + parseInt(String(quantity))
        : Math.max(0, currentItem.quantity - parseInt(String(quantity)))

    const item = await db.inventoryItem.update({
      where: { id },
      data: {
        quantity: newQuantity,
        batchNumber: batchNumber || undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        lastRestocked: op === 'add' ? new Date() : undefined,
      },
      include: {
        product: {
          include: { category: true },
        },
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update inventory'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
