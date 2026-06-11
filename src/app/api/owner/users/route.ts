import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET: List all client users ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId') ?? ''
    const role = searchParams.get('role') ?? ''
    const status = searchParams.get('status') ?? ''

    const where: Record<string, unknown> = {}

    if (clientId) {
      where.clientId = clientId
    }

    if (role) {
      where.role = role
    }

    if (status) {
      where.status = status
    }

    const users = await db.ownerClientUser.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('[Owner Users API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 },
    )
  }
}

// ─── POST: Create user for a client ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { clientId, name, email, phone, role = 'admin', password, status = 'active' } = body

    // ── Validate ────────────────────────────────────────────────────────
    if (!clientId || !name || !email) {
      return NextResponse.json(
        { success: false, error: 'clientId, name, and email are required' },
        { status: 400 },
      )
    }

    const client = await db.ownerClient.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 },
      )
    }

    // Check for duplicate email within the same client
    const existingUser = await db.ownerClientUser.findUnique({
      where: { clientId_email: { clientId, email } },
    })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists for this client' },
        { status: 409 },
      )
    }

    const user = await db.ownerClientUser.create({
      data: {
        clientId,
        name,
        email,
        phone,
        role,
        password,
        status,
      },
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

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    console.error('[Owner Users API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 },
    )
  }
}
