import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/branches - List all branches with staff count and room count
export async function GET() {
  try {
    const branches = await db.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            staff: { where: { status: 'active' } },
            rooms: true,
          },
        },
      },
    })

    const result = branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      branchCode: branch.branchCode,
      timezone: branch.timezone,
      openTime: branch.openTime,
      closeTime: branch.closeTime,
      isActive: branch.isActive,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      staffCount: branch._count.staff,
      roomCount: branch._count.rooms,
    }))

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch branches'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
