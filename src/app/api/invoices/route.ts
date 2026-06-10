import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices - List invoices with items, customer, branch relations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const paymentStatus = searchParams.get('paymentStatus')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const branchId = searchParams.get('branchId')
    const customerId = searchParams.get('customerId')

    const where: Record<string, unknown> = {}

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }
    if (branchId) {
      where.branchId = branchId
    }
    if (customerId) {
      where.customerId = customerId
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      }
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              loyaltyTier: true,
            },
          },
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
          items: true,
        },
      }),
      db.invoice.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/invoices - Create a new invoice with items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      branchId,
      customerId,
      type,
      subtotal,
      tax,
      discount,
      totalAmount,
      paymentMethod,
      paymentStatus,
      notes,
      items,
    } = body

    if (!branchId || totalAmount === undefined || totalAmount === null || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: branchId, totalAmount, items' },
        { status: 400 }
      )
    }

    // Generate a unique invoice number
    const invoiceCount = await db.invoice.count()
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`

    const invoice = await db.invoice.create({
      data: {
        branchId,
        customerId: customerId || null,
        invoiceNumber,
        type: type || 'service',
        subtotal: subtotal ? parseFloat(String(subtotal)) : parseFloat(String(totalAmount)),
        tax: tax ? parseFloat(String(tax)) : 0,
        discount: discount ? parseFloat(String(discount)) : 0,
        totalAmount: parseFloat(String(totalAmount)),
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: paymentStatus || 'paid',
        notes,
        items: {
          create: items.map((item: { itemType: string; itemId?: string; name: string; quantity?: number; unitPrice: number; discount?: number; total: number; staffId?: string }) => ({
            itemType: item.itemType,
            itemId: item.itemId || null,
            name: item.name,
            quantity: item.quantity || 1,
            unitPrice: parseFloat(String(item.unitPrice)),
            discount: item.discount ? parseFloat(String(item.discount)) : 0,
            total: parseFloat(String(item.total)),
            staffId: item.staffId || null,
          })),
        },
      },
      include: {
        customer: true,
        branch: true,
        items: true,
      },
    })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
