import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/social-media - Get all social media links
export async function GET() {
  try {
    const links = await db.socialMediaLink.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ success: true, data: links })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch social media links'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/settings/social-media - Create or update social media links
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { links } = body as { links: Array<{
      id?: string
      platform: string
      url: string
      username?: string
      isActive?: boolean
      followerCount?: number
      order?: number
    }>}

    if (!links || !Array.isArray(links)) {
      return NextResponse.json({ success: false, error: 'links array is required' }, { status: 400 })
    }

    const results = []
    for (const link of links) {
      if (link.id) {
        const updated = await db.socialMediaLink.update({
          where: { id: link.id },
          data: {
            platform: link.platform,
            url: link.url,
            username: link.username,
            isActive: link.isActive,
            followerCount: link.followerCount,
            order: link.order,
          },
        })
        results.push(updated)
      } else {
        const created = await db.socialMediaLink.create({
          data: {
            platform: link.platform,
            url: link.url,
            username: link.username,
            isActive: link.isActive ?? true,
            followerCount: link.followerCount,
            order: link.order ?? 0,
          },
        })
        results.push(created)
      }
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save social media links'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/settings/social-media - Delete a social media link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    await db.socialMediaLink.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete social media link'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
