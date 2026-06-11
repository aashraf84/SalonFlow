import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/payroll-runs - List payroll runs for a period
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const periodId = searchParams.get('periodId')
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '100')

    if (!periodId) {
      return NextResponse.json(
        { success: false, error: 'periodId is required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { periodId }
    if (staffId) where.staffId = staffId
    if (status) where.status = status

    const [runs, total] = await Promise.all([
      db.payrollRun.findMany({
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
              email: true,
              phone: true,
              commissionRate: true,
            },
          },
          period: {
            select: {
              id: true,
              periodStart: true,
              periodEnd: true,
              payDate: true,
              status: true,
            },
          },
        },
      }),
      db.payrollRun.count({ where }),
    ])

    // Compute totals
    const totalNetPay = runs.reduce((sum, run) => sum + run.netPay, 0)
    const totalBaseSalary = runs.reduce((sum, run) => sum + run.baseSalary, 0)
    const totalCommission = runs.reduce((sum, run) => sum + run.commissionEarned, 0)
    const totalTips = runs.reduce((sum, run) => sum + run.tipsEarned, 0)
    const totalOvertime = runs.reduce((sum, run) => sum + run.overtimePay, 0)
    const totalBonus = runs.reduce((sum, run) => sum + run.bonus, 0)
    const totalDeductions = runs.reduce((sum, run) => sum + run.deductions, 0)
    const totalTax = runs.reduce((sum, run) => sum + run.taxDeduction, 0)

    return NextResponse.json({
      success: true,
      data: runs,
      stats: {
        totalNetPay,
        totalBaseSalary,
        totalCommission,
        totalTips,
        totalOvertime,
        totalBonus,
        totalDeductions,
        totalTax,
        runCount: total,
      },
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payroll runs'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/payroll-runs - Create a payroll run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      periodId, staffId, baseSalary, commissionEarned, tipsEarned,
      overtimePay, bonus, deductions, taxDeduction, hoursWorked,
      overtimeHours, notes,
    } = body

    if (!periodId || !staffId) {
      return NextResponse.json(
        { success: false, error: 'periodId and staffId are required' },
        { status: 400 }
      )
    }

    // Check period exists and is open
    const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
    if (!period) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }
    if (period.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Cannot add runs to a closed payroll period' },
        { status: 400 }
      )
    }

    // Check if run already exists for this staff/period
    const existing = await db.payrollRun.findUnique({
      where: { periodId_staffId: { periodId, staffId } },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A payroll run already exists for this staff member in this period' },
        { status: 409 }
      )
    }

    const base = Number(baseSalary) || 0
    const commission = Number(commissionEarned) || 0
    const tips = Number(tipsEarned) || 0
    const overtime = Number(overtimePay) || 0
    const bonusVal = Number(bonus) || 0
    const deductionsVal = Number(deductions) || 0
    const tax = Number(taxDeduction) || 0
    const netPay = base + commission + tips + overtime + bonusVal - deductionsVal - tax

    // Update period status to processing if it's still open
    if (period.status === 'open') {
      await db.payrollPeriod.update({
        where: { id: periodId },
        data: { status: 'processing' },
      })
    }

    const run = await db.payrollRun.create({
      data: {
        periodId,
        staffId,
        baseSalary: base,
        commissionEarned: commission,
        tipsEarned: tips,
        overtimePay: overtime,
        bonus: bonusVal,
        deductions: deductionsVal,
        taxDeduction: tax,
        netPay,
        hoursWorked: Number(hoursWorked) || 0,
        overtimeHours: Number(overtimeHours) || 0,
        notes: notes || null,
        status: 'pending',
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
            phone: true,
          },
        },
        period: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            payDate: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: run }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payroll run'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
