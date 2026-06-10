import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance - Return financial summary
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const branchId = searchParams.get('branchId')

    const invoiceWhere: Record<string, unknown> = {}
    const expenseWhere: Record<string, unknown> = {}

    if (dateFrom || dateTo) {
      const dateFilter = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      }
      invoiceWhere.createdAt = dateFilter
      expenseWhere.date = dateFilter
    }

    if (branchId) {
      invoiceWhere.branchId = branchId
      expenseWhere.branchId = branchId
    }

    // Total revenue (sum of invoice totalAmount)
    const revenueResult = await db.invoice.aggregate({
      where: invoiceWhere,
      _sum: { totalAmount: true },
    })
    const totalRevenue = revenueResult._sum.totalAmount || 0

    // Total expenses (sum of expense amount)
    const expenseResult = await db.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
    })
    const totalExpenses = expenseResult._sum.amount || 0

    // Expenses by category
    const expensesByCategory = await db.expense.groupBy({
      by: ['category'],
      where: expenseWhere,
      _sum: { amount: true },
    })

    const expensesByCategoryMap = expensesByCategory.map((e) => ({
      category: e.category,
      amount: e._sum.amount || 0,
    }))

    // Profit (revenue - expenses)
    const profit = totalRevenue - totalExpenses

    // Recent expenses
    const recentExpenses = await db.expense.findMany({
      where: expenseWhere,
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    // Additional stats
    const invoiceCount = await db.invoice.count({ where: invoiceWhere })
    const expenseCount = await db.expense.count({ where: expenseWhere })

    // Revenue by payment method
    const revenueByPayment = await db.invoice.groupBy({
      by: ['paymentMethod'],
      where: invoiceWhere,
      _sum: { totalAmount: true },
    })

    const revenueByPaymentMap = revenueByPayment.map((r) => ({
      paymentMethod: r.paymentMethod,
      amount: r._sum.totalAmount || 0,
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        profit,
        expensesByCategory: expensesByCategoryMap,
        recentExpenses,
        revenueByPayment: revenueByPaymentMap,
        invoiceCount,
        expenseCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch financial summary'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
