import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    const user = await db.systemUser.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ success: false, error: 'Account is disabled. Contact administrator.' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    // Create JWT token
    const token = await createToken({ userId: user.id, email: user.email, role: user.role })

    // Update last login
    await db.systemUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: req.headers.get('x-forwarded-for') || 'unknown' }
    })

    // Create session record
    await db.userSession.create({
      data: {
        userId: user.id,
        token,
        deviceInfo: req.headers.get('user-agent') || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })

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
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 })
  }
}
