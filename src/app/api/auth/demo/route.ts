import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken } from '@/lib/jwt'
import { createHash } from 'crypto'

// SHA-256 hash for 'demo123' - lightweight alternative to bcrypt
const DEMO_PASSWORD_SHA256 = 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791'

export async function POST() {
  try {
    // Check if demo user already exists
    const existing = await db.systemUser.findUnique({
      where: { email: 'demo@salonflow.pk' }
    })

    if (existing) {
      // Update existing demo user to viewer role if they still have old admin role
      const updatedRole = existing.role === 'admin' ? 'viewer' : existing.role
      const updatedName = existing.name === 'Demo Admin' ? 'Demo Viewer' : existing.name

      // Generate a new token for the existing demo user (with updated role)
      const token = await createToken({ userId: existing.id, email: existing.email, role: updatedRole })

      try {
        await db.systemUser.update({
          where: { id: existing.id },
          data: { lastLoginAt: new Date(), role: updatedRole, name: updatedName }
        })
      } catch { /* non-critical */ }

      return NextResponse.json({
        success: true,
        data: {
          id: existing.id,
          email: existing.email,
          name: updatedName,
          role: updatedRole,
          avatar: existing.avatar,
          phone: existing.phone,
          token,
        }
      })
    }

    // Create demo user with SHA-256 password hash (no bcryptjs needed)
    const demoUser = await db.systemUser.create({
      data: {
        email: 'demo@salonflow.pk',
        password: DEMO_PASSWORD_SHA256,
        name: 'Demo Viewer',
        role: 'viewer',
        phone: '+92-300-1234567',
        isActive: true,
      }
    })

    const token = await createToken({ userId: demoUser.id, email: demoUser.email, role: demoUser.role })

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
    return NextResponse.json({ success: false, error: 'Demo login failed. Please try again.' }, { status: 500 })
  }
}
