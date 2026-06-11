import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── PATCH: Update user ─────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.ownerClientUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    const { name, email, phone, role, password, status } = body

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (password !== undefined) updateData.password = password
    if (status !== undefined) updateData.status = status

    // If email is changing, check for duplicate within the same client
    if (email !== undefined && email !== existing.email) {
      const duplicate = await db.ownerClientUser.findUnique({
        where: {
          clientId_email: { clientId: existing.clientId, email },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'A user with this email already exists for this client' },
          { status: 409 },
        )
      }
      updateData.email = email
    }

    const updated = await db.ownerClientUser.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            slug: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[Owner User API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 },
    )
  }
}

// ─── DELETE: Delete user ────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.ownerClientUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    await db.ownerClientUser.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' },
    })
  } catch (error) {
    console.error('[Owner User API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 },
    )
  }
}
