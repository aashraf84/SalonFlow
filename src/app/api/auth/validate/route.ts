import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 })
    }

    const user = await db.systemUser.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, email: true, name: true, role: true, avatar: true, phone: true, isActive: true
      }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'User not found or inactive' }, { status: 401 })
    }

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
    console.error('Validate error:', error)
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 500 })
  }
}
