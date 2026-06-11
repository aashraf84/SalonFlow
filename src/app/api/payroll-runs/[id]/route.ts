import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/payroll-runs/[id] - Get single payroll run
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const run = await db.payrollRun.findUnique({
      where: { id },
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
    })

    if (!run) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: run })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payroll run'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PUT /api/payroll-runs/[id] - Update payroll run (edit amounts, approve, pay)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      baseSalary, commissionEarned, tipsEarned,
      overtimePay, bonus, deductions, taxDeduction,
      hoursWorked, overtimeHours, notes, action,
    } = body

    const existing = await db.payrollRun.findUnique({
      where: { id },
      include: { period: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      )
    }

    // Handle action-based updates
    if (action === 'approve') {
      if (existing.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Only pending runs can be approved' },
          { status: 400 }
        )
      }
      const run = await db.payrollRun.update({
        where: { id },
        data: { status: 'approved' },
        include: {
          staff: { select: { id: true, firstName: true, lastName: true, role: true } },
          period: { select: { id: true, periodStart: true, periodEnd: true, payDate: true } },
        },
      })
      return NextResponse.json({ success: true, data: run })
    }

    if (action === 'pay') {
      if (existing.status !== 'approved') {
        return NextResponse.json(
          { success: false, error: 'Only approved runs can be marked as paid' },
          { status: 400 }
        )
      }
      const run = await db.payrollRun.update({
        where: { id },
        data: { status: 'paid', paidAt: new Date() },
        include: {
          staff: { select: { id: true, firstName: true, lastName: true, role: true } },
          period: { select: { id: true, periodStart: true, periodEnd: true, payDate: true } },
        },
      })
      return NextResponse.json({ success: true, data: run })
    }

    // Regular edit - check period is not closed
    if (existing.period.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit runs in a closed payroll period' },
        { status: 400 }
      )
    }

    if (existing.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a paid payroll run' },
        { status: 400 }
      )
    }

    const base = baseSalary !== undefined ? Number(baseSalary) : existing.baseSalary
    const commission = commissionEarned !== undefined ? Number(commissionEarned) : existing.commissionEarned
    const tips = tipsEarned !== undefined ? Number(tipsEarned) : existing.tipsEarned
    const overtime = overtimePay !== undefined ? Number(overtimePay) : existing.overtimePay
    const bonusVal = bonus !== undefined ? Number(bonus) : existing.bonus
    const deductionsVal = deductions !== undefined ? Number(deductions) : existing.deductions
    const tax = taxDeduction !== undefined ? Number(taxDeduction) : existing.taxDeduction
    const netPay = base + commission + tips + overtime + bonusVal - deductionsVal - tax

    const run = await db.payrollRun.update({
      where: { id },
      data: {
        baseSalary: base,
        commissionEarned: commission,
        tipsEarned: tips,
        overtimePay: overtime,
        bonus: bonusVal,
        deductions: deductionsVal,
        taxDeduction: tax,
        netPay,
        hoursWorked: hoursWorked !== undefined ? Number(hoursWorked) : existing.hoursWorked,
        overtimeHours: overtimeHours !== undefined ? Number(overtimeHours) : existing.overtimeHours,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true } },
        period: { select: { id: true, periodStart: true, periodEnd: true, payDate: true } },
      },
    })

    return NextResponse.json({ success: true, data: run })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update payroll run'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/payroll-runs/[id] - Delete a payroll run
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.payrollRun.findUnique({
      where: { id },
      include: { period: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll run not found' },
        { status: 404 }
      )
    }

    if (existing.period.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete runs from a closed payroll period' },
        { status: 400 }
      )
    }

    if (existing.status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a paid payroll run' },
        { status: 400 }
      )
    }

    await db.payrollRun.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete payroll run'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
