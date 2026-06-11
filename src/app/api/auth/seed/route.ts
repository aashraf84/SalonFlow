import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, role, phone } = body

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Email, password, and name are required' }, { status: 400 })
    }

    // Check if user already exists
    const existing = await db.systemUser.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'User already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await db.systemUser.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: role || 'admin',
        phone,
        isActive: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Seed user error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 })
  }
}

// Seed demo data (demo user + demo serial keys)
export async function GET() {
  try {
    // Create demo user
    const existingUser = await db.systemUser.findUnique({ where: { email: 'demo@salonflow.pk' } })
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('demo123', 10)
      await db.systemUser.create({
        data: {
          email: 'demo@salonflow.pk',
          password: hashedPassword,
          name: 'Demo Admin',
          role: 'admin',
          phone: '+92-300-1234567',
          isActive: true,
        }
      })
    }

    // Create demo serial key (upsert to avoid unique constraint errors)
    await db.serialKey.upsert({
      where: { key: 'SALON-DEMO-2024-ACTIVATION' },
      update: { maxDevices: 999, status: 'available' },
      create: {
        key: 'SALON-DEMO-2024-ACTIVATION',
        type: 'one_time',
        maxDevices: 999,
        activeDevices: 0,
        status: 'available',
      }
    })

    // Create a real serial key for testing (with high maxDevices for owner use)
    await db.serialKey.upsert({
      where: { key: 'SALONFLOW-PRO-2024-LICENSE' },
      update: { maxDevices: 10, status: 'available' },
      create: {
        key: 'SALONFLOW-PRO-2024-LICENSE',
        type: 'subscription',
        maxDevices: 10,
        activeDevices: 0,
        status: 'available',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    })

    // Create owner-style serial key for testing (SF-XXXX format)
    await db.serialKey.upsert({
      where: { key: 'SF-DEMO-2024-OWNER-ACTIV' },
      update: { maxDevices: 50, status: 'available' },
      create: {
        key: 'SF-DEMO-2024-OWNER-ACTIV',
        type: 'subscription',
        maxDevices: 50,
        activeDevices: 0,
        status: 'available',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ success: false, error: 'Seed failed' }, { status: 500 })
  }
}
