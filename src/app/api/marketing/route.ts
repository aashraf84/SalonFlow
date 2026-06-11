import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/marketing - List marketing campaigns with status filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const status = searchParams.get('status')
    const branchId = searchParams.get('branchId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (branchId) {
      where.branchId = branchId
    }
    if (type) {
      where.type = type
    }

    const [campaigns, total] = await Promise.all([
      db.marketingCampaign.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
        },
      }),
      db.marketingCampaign.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch marketing campaigns'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/marketing - Create a new marketing campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      branchId,
      name,
      type,
      channel,
      subject,
      content,
      targetAudience,
      status,
      scheduledAt,
    } = body

    if (!branchId || !name || !type || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: branchId, name, type, content' },
        { status: 400 }
      )
    }

    const campaign = await db.marketingCampaign.create({
      data: {
        branchId,
        name,
        type,
        channel: channel || type,
        subject,
        content,
        targetAudience,
        status: status || 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
      include: {
        branch: {
          select: { id: true, name: true, branchCode: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: campaign }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create marketing campaign'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
