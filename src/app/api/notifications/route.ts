import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/notifications - List notifications with unread count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (isRead !== null && isRead !== undefined && isRead !== '') {
      where.isRead = isRead === 'true'
    }
    if (type) where.type = type

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
    ])

    const unreadCount = await db.notification.count({
      where: { isRead: false },
    })

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, message, category, actionUrl, metadata } = body

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'title and message are required' },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        type: type || 'system',
        title,
        message,
        category: category || 'info',
        actionUrl: actionUrl || null,
        metadata: metadata || null,
      },
    })

    return NextResponse.json({ success: true, data: notification }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create notification'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { markAllRead } = body

    if (!markAllRead) {
      return NextResponse.json(
        { success: false, error: 'markAllRead is required' },
        { status: 400 }
      )
    }

    await db.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true, data: { markedAllRead: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark notifications as read'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
