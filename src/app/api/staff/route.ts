import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/staff - List staff with branch relation, role filter, and commission totals
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const role = searchParams.get('role')
    const branchId = searchParams.get('branchId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (role) {
      where.role = role
    }
    if (branchId) {
      where.branchId = branchId
    }
    if (status) {
      where.status = status
    }

    const [staff, total] = await Promise.all([
      db.staff.findMany({
        where,
        skip,
        take,
        orderBy: { firstName: 'asc' },
        include: {
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
          commissions: {
            select: {
              id: true,
              amount: true,
              type: true,
              status: true,
              period: true,
              createdAt: true,
            },
          },
        },
      }),
      db.staff.count({ where }),
    ])

    // Calculate commission totals per staff
    const staffWithTotals = staff.map((s) => {
      const totalCommission = s.commissions.reduce((sum, c) => sum + c.amount, 0)
      const pendingCommission = s.commissions
        .filter((c) => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0)
      const paidCommission = s.commissions
        .filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0)

      return {
        ...s,
        commissionTotals: {
          total: totalCommission,
          pending: pendingCommission,
          paid: paidCommission,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: staffWithTotals,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch staff'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/staff - Create a new staff member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      branchId,
      firstName,
      lastName,
      email,
      phone,
      role,
      specialization,
      hireDate,
      status,
      commissionRate,
      avatar,
      bio,
    } = body

    if (!branchId || !firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: branchId, firstName, lastName, email' },
        { status: 400 }
      )
    }

    const staff = await db.staff.create({
      data: {
        branchId,
        firstName,
        lastName,
        email,
        phone,
        role: role || 'stylist',
        specialization,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        status: status || 'active',
        commissionRate: commissionRate !== undefined ? parseFloat(String(commissionRate)) : 0.10,
        avatar,
        bio,
      },
      include: {
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: staff }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create staff member'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
