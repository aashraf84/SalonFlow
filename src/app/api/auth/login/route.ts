import { NextRequest, NextResponse } from 'next/server'
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

// Simple SHA-256 password verification (avoids bcryptjs memory issues)
function verifyPassword(inputPassword: string, storedHash: string): boolean {
  // Support both bcrypt format ($2b$...) and SHA-256 format
  if (storedHash.startsWith('$2')) {
    try {
      const { compareSync } = require('bcryptjs')
      return compareSync(inputPassword, storedHash)
    } catch {
      return false
    }
  }
  // For SHA-256 hashes
  const inputHash = createHash('sha256').update(inputPassword).digest('hex')
  return inputHash === storedHash
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.systemUser.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ success: false, error: 'Account is disabled. Contact administrator.' }, { status: 403 })
    }

    const isValid = verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    // Create JWT token
    const token = await createToken({ userId: user.id, email: user.email, role: user.role })

    // Update last login (non-critical)
    try {
      await prisma.systemUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastLoginIp: req.headers.get('x-forwarded-for') || 'unknown' }
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        token,
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    const errorMsg = error?.message || String(error)
    return NextResponse.json({
      success: false,
      error: `Login failed: ${errorMsg}`,
    }, { status: 500 })
  }
}
