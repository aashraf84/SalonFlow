import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── PATCH: Update serial key ───────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingKey = await db.serialKey.findUnique({ where: { id } })
    if (!existingKey) {
      return NextResponse.json(
        { success: false, error: 'Serial key not found' },
        { status: 404 },
      )
    }

    const {
      clientId,
      status,
      maxDevices,
      validFrom,
      validUntil,
      notes,
      type,
      activeDevices,
    } = body

    const updateData: Record<string, unknown> = {}

    if (clientId !== undefined) {
      // If assigning to a client
      if (clientId) {
        const client = await db.ownerClient.findUnique({ where: { id: clientId } })
        if (!client) {
          return NextResponse.json(
            { success: false, error: 'Client not found' },
            { status: 404 },
          )
        }
        updateData.clientId = clientId
        // Auto-set status to assigned if it was available
        if (existingKey.status === 'available') {
          updateData.status = 'assigned'
        }
      } else {
        // Unassign from client
        updateData.clientId = null
        updateData.status = 'available'
        updateData.activeDevices = 0
      }
    }

    if (status !== undefined) {
      updateData.status = status
      // Set timestamps based on status
      if (status === 'activated' && !existingKey.activatedAt) {
        updateData.activatedAt = new Date()
      }
      if (status === 'revoked' && !existingKey.revokedAt) {
        updateData.revokedAt = new Date()
      }
    }

    if (maxDevices !== undefined) updateData.maxDevices = maxDevices
    if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null
    if (notes !== undefined) updateData.notes = notes
    if (type !== undefined) updateData.type = type
    if (activeDevices !== undefined) updateData.activeDevices = activeDevices

    const updatedKey = await db.serialKey.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updatedKey })
  } catch (error) {
    console.error('[Owner Serial Key API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update serial key' },
      { status: 500 },
    )
  }
}

// ─── DELETE: Delete serial key ──────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existingKey = await db.serialKey.findUnique({ where: { id } })
    if (!existingKey) {
      return NextResponse.json(
        { success: false, error: 'Serial key not found' },
        { status: 404 },
      )
    }

    await db.serialKey.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      data: { message: 'Serial key deleted successfully' },
    })
  } catch (error) {
    console.error('[Owner Serial Key API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete serial key' },
      { status: 500 },
    )
  }
}
