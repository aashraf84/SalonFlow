import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/jwt'

export async function POST() {
  try {
    // Check if demo user already exists
    const existing = await db.systemUser.findUnique({
      where: { email: 'demo@salonflow.pk' }
    })

    if (existing) {
      // Generate a new token for the existing demo user
      const token = await createToken({ userId: existing.id, email: existing.email, role: existing.role })

      await db.systemUser.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date() }
      })

      return NextResponse.json({
        success: true,
        data: {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
          avatar: existing.avatar,
          phone: existing.phone,
          token,
        }
      })
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 10)
    const demoUser = await db.systemUser.create({
      data: {
        email: 'demo@salonflow.pk',
        password: hashedPassword,
        name: 'Demo Admin',
        role: 'admin',
        phone: '+92-300-1234567',
        isActive: true,
      }
    })

    const token = await createToken({ userId: demoUser.id, email: demoUser.email, role: demoUser.role })

    // Create session
    await db.userSession.create({
      data: {
        userId: demoUser.id,
        token,
        deviceInfo: 'Demo Session',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        avatar: demoUser.avatar,
        phone: demoUser.phone,
        token,
      }
    })
  } catch (error) {
    console.error('Demo login error:', error)
    return NextResponse.json({ success: false, error: 'Demo login failed' }, { status: 500 })
  }
}
