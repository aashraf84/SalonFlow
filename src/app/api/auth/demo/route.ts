import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createToken } from '@/lib/jwt'
import { createHash } from 'crypto'

// Create a fresh PrismaClient directly to avoid stale cached instances
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// SHA-256 hash for 'demo123'
const DEMO_PASSWORD_SHA256 = 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791'

export async function POST() {
  try {
    // Check if demo user already exists
    const existing = await prisma.systemUser.findUnique({
      where: { email: 'demo@salonflow.pk' }
    })

    if (existing) {
      const updatedRole = existing.role === 'admin' ? 'viewer' : existing.role
      const updatedName = existing.name === 'Demo Admin' ? 'Demo Viewer' : existing.name

      const token = await createToken({ userId: existing.id, email: existing.email, role: updatedRole })

      try {
        await prisma.systemUser.update({
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

    // Create demo user with SHA-256 password hash
    const demoUser = await prisma.systemUser.create({
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
  } catch (error: any) {
    console.error('Demo login error:', error)
    const errorMsg = error?.message || String(error)
    return NextResponse.json({
      success: false,
      error: `Demo login failed: ${errorMsg}`,
    }, { status: 500 })
  }
}
