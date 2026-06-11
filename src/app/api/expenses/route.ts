import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/expenses - List expenses with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const branchId = searchParams.get('branchId')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (branchId) where.branchId = branchId
    if (category) where.category = category

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.date = dateFilter
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              branchCode: true,
            },
          },
        },
      }),
      db.expense.count({ where }),
    ])

    // Category totals
    const totalResult = await db.expense.aggregate({
      where,
      _sum: { amount: true },
    })

    return NextResponse.json({
      success: true,
      data: expenses,
      stats: {
        totalAmount: totalResult._sum.amount || 0,
      },
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/expenses - Create expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { branchId, category, amount, description, date, paidBy, receipt } = body

    if (!branchId || !category || !amount || !date) {
      return NextResponse.json(
        { success: false, error: 'branchId, category, amount, and date are required' },
        { status: 400 }
      )
    }

    const expense = await db.expense.create({
      data: {
        branchId,
        category,
        amount,
        description: description || null,
        date: new Date(date),
        paidBy: paidBy || null,
        receipt: receipt || null,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: expense }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
