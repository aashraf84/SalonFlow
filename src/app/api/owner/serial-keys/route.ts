import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ─── Helper: Generate serial key SF-XXXX-XXXX-XXXX-XXXX ──────────────────
function generateSerialKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segment = () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  return `SF-${segment()}-${segment()}-${segment()}-${segment()}`
}

// ─── GET: List all serial keys ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? ''
    const search = searchParams.get('search') ?? ''

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { key: { contains: search } },
        { client: { companyName: { contains: search } } },
        { client: { email: { contains: search } } },
      ]
    }

    const serialKeys = await db.serialKey.findMany({
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

    return NextResponse.json({ success: true, data: serialKeys })
  } catch (error) {
    console.error('[Owner Serial Keys API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch serial keys' },
      { status: 500 },
    )
  }
}

// ─── POST: Generate new serial key(s) ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { count = 1, type = 'subscription', clientId } = body

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: 'Count must be between 1 and 100' },
        { status: 400 },
      )
    }

    // Validate client exists if provided
    if (clientId) {
      const client = await db.ownerClient.findUnique({ where: { id: clientId } })
      if (!client) {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 },
        )
      }
    }

    // Generate keys ensuring uniqueness
    const createdKeys = []

    for (let i = 0; i < count; i++) {
      let key = generateSerialKey()
      // Ensure uniqueness
      while (await db.serialKey.findUnique({ where: { key } })) {
        key = generateSerialKey()
      }

      const serialKey = await db.serialKey.create({
        data: {
          clientId: clientId || null,
          key,
          type,
          status: clientId ? 'assigned' : 'available',
          maxDevices: 1,
          validFrom: clientId ? new Date() : undefined,
          validUntil: clientId
            ? type === 'subscription'
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              : null
            : undefined,
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

      createdKeys.push(serialKey)
    }

    return NextResponse.json(
      { success: true, data: count === 1 ? createdKeys[0] : createdKeys },
      { status: 201 },
    )
  } catch (error) {
    console.error('[Owner Serial Keys API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate serial keys' },
      { status: 500 },
    )
  }
}
