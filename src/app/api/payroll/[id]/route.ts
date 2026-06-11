import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/payroll/[id] - Get single payroll period with runs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const period = await db.payrollPeriod.findUnique({
      where: { id },
      include: {
        payrollRuns: {
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
          },
          orderBy: { staff: { firstName: 'asc' } },
        },
      },
    })

    if (!period) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    const staffCount = period.payrollRuns.length
    const totalNetPay = period.payrollRuns.reduce((sum, run) => sum + run.netPay, 0)
    const totalBaseSalary = period.payrollRuns.reduce((sum, run) => sum + run.baseSalary, 0)
    const totalCommission = period.payrollRuns.reduce((sum, run) => sum + run.commissionEarned, 0)
    const totalTips = period.payrollRuns.reduce((sum, run) => sum + run.tipsEarned, 0)
    const totalOvertime = period.payrollRuns.reduce((sum, run) => sum + run.overtimePay, 0)
    const totalBonus = period.payrollRuns.reduce((sum, run) => sum + run.bonus, 0)
    const totalDeductions = period.payrollRuns.reduce((sum, run) => sum + run.deductions, 0)
    const totalTax = period.payrollRuns.reduce((sum, run) => sum + run.taxDeduction, 0)

    return NextResponse.json({
      success: true,
      data: {
        ...period,
        staffCount,
        totalNetPay,
        totalBaseSalary,
        totalCommission,
        totalTips,
        totalOvertime,
        totalBonus,
        totalDeductions,
        totalTax,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payroll period'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PUT /api/payroll/[id] - Update payroll period (close/processing)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const existing = await db.payrollPeriod.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Validate status transitions
    if (status === 'closed' && existing.status === 'open') {
      // Check if all runs are approved before closing
      const pendingRuns = await db.payrollRun.count({
        where: { periodId: id, status: 'pending' },
      })
      if (pendingRuns > 0) {
        return NextResponse.json(
          { success: false, error: `Cannot close period: ${pendingRuns} payroll run(s) are still pending approval` },
          { status: 400 }
        )
      }
    }

    const period = await db.payrollPeriod.update({
      where: { id },
      data: { status: status || existing.status },
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
    })

    return NextResponse.json({ success: true, data: period })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update payroll period'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/payroll/[id] - Delete payroll period
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.payrollPeriod.findUnique({
      where: { id },
      include: { payrollRuns: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Delete all runs first
    await db.payrollRun.deleteMany({ where: { periodId: id } })
    await db.payrollPeriod.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete payroll period'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
