import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/branches/[id] - Update branch
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, address, phone, email, timezone, openTime, closeTime, isActive } = body

    const existing = await db.branch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (address !== undefined) data.address = address
    if (phone !== undefined) data.phone = phone
    if (email !== undefined) data.email = email
    if (timezone !== undefined) data.timezone = timezone
    if (openTime !== undefined) data.openTime = openTime
    if (closeTime !== undefined) data.closeTime = closeTime
    if (isActive !== undefined) data.isActive = isActive

    const branch = await db.branch.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: branch })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update branch'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/branches/[id] - Deactivate branch (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.branch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      )
    }

    const branch = await db.branch.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: branch })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate branch'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
