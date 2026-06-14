import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/tips - List tips with staff name, filters, totals
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (staffId) where.staffId = staffId
    if (status) where.status = status

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {}
      if (startDate) createdAt.gte = new Date(startDate)
      if (endDate) createdAt.lte = new Date(endDate)
      where.createdAt = createdAt
    }

    const [tips, total] = await Promise.all([
      db.tip.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      db.tip.count({ where }),
    ])

    // Totals
    const totalResult = await db.tip.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    })

    const pendingResult = await db.tip.aggregate({
      where: { ...where, status: 'pending' },
      _sum: { amount: true },
    })

    const paidResult = await db.tip.aggregate({
      where: { ...where, status: 'paid' },
      _sum: { amount: true },
    })

    const stats = {
      totalAmount: totalResult._sum.amount || 0,
      totalCount: totalResult._count.id,
      pendingAmount: pendingResult._sum.amount || 0,
      paidAmount: paidResult._sum.amount || 0,
    }

    return NextResponse.json({
      success: true,
      data: tips,
      stats,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tips'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/tips - Create tip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, amount, paymentMethod, invoiceId, customerId } = body

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'staffId is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'amount must be greater than 0' },
        { status: 400 }
      )
    }

    const tip = await db.tip.create({
      data: {
        staffId,
        amount,
        paymentMethod: paymentMethod || 'cash',
        invoiceId: invoiceId || null,
        customerId: customerId || null,
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: tip }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tip'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
