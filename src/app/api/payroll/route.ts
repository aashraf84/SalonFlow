import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/payroll - List payroll periods with runs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [periods, total] = await Promise.all([
      db.payrollPeriod.findMany({
        where,
        skip,
        take,
        orderBy: { periodStart: 'desc' },
        include: {
          payrollRuns: {
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
          },
        },
      }),
      db.payrollPeriod.count({ where }),
    ])

    // Compute summary for each period
    const periodsWithSummary = periods.map((period) => {
      const staffCount = period.payrollRuns.length
      const totalNetPay = period.payrollRuns.reduce((sum, run) => sum + run.netPay, 0)
      return {
        ...period,
        staffCount,
        totalNetPay,
      }
    })

    return NextResponse.json({
      success: true,
      data: periodsWithSummary,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payroll periods'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/payroll - Create a new payroll period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { periodStart, periodEnd, payDate } = body

    if (!periodStart || !periodEnd || !payDate) {
      return NextResponse.json(
        { success: false, error: 'periodStart, periodEnd, and payDate are required' },
        { status: 400 }
      )
    }

    // Check for overlapping period
    const overlapping = await db.payrollPeriod.findFirst({
      where: {
        OR: [
          {
            periodStart: { lte: new Date(periodEnd) },
            periodEnd: { gte: new Date(periodStart) },
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { success: false, error: 'A payroll period already exists that overlaps with the specified dates' },
        { status: 409 }
      )
    }

    const period = await db.payrollPeriod.create({
      data: {
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        payDate: new Date(payDate),
        status: 'open',
      },
      include: {
        payrollRuns: true,
      },
    })

    return NextResponse.json({ success: true, data: period }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payroll period'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
