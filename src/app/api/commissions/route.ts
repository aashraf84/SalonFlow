import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/commissions - List commissions with staff name, filters, totals
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const period = searchParams.get('period')

    const where: Record<string, unknown> = {}

    if (staffId) where.staffId = staffId
    if (status) where.status = status
    if (period) where.period = period

    const [commissions, total] = await Promise.all([
      db.commission.findMany({
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
              commissionRate: true,
            },
          },
        },
      }),
      db.commission.count({ where }),
    ])

    // Totals
    const totalResult = await db.commission.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    })

    const pendingResult = await db.commission.aggregate({
      where: { ...where, status: 'pending' },
      _sum: { amount: true },
    })

    const paidResult = await db.commission.aggregate({
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
      data: commissions,
      stats,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch commissions'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/commissions - Create commission entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, amount, type, appointmentId, period } = body

    if (!staffId || !amount || !type || !period) {
      return NextResponse.json(
        { success: false, error: 'staffId, amount, type, and period are required' },
        { status: 400 }
      )
    }

    const commission = await db.commission.create({
      data: {
        staffId,
        amount,
        type,
        appointmentId: appointmentId || null,
        period,
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
      },
    })

    return NextResponse.json({ success: true, data: commission }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create commission'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
