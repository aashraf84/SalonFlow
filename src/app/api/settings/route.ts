import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings - Get all settings grouped by category
export async function GET() {
  try {
    const settings = await db.salonSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    // Group by category
    const grouped: Record<string, Record<string, string>> = {}
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {}
      }
      grouped[setting.category][setting.key] = setting.value
    }

    return NextResponse.json({
      success: true,
      data: {
        settings,
        grouped,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/settings - Upsert single setting or bulk save
// Single: { key, value, category }
// Bulk: { general: {...}, business: {...}, notifications: {...}, security: {...} }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if it's a bulk save (has category objects like general, business, etc.)
    const isBulk = typeof body === 'object' && !body.key && (
      body.general || body.business || body.notifications || body.security
    )

    if (isBulk) {
      // Bulk save: iterate over each category and its keys
      const upserts: Promise<unknown>[] = []
      for (const [category, values] of Object.entries(body)) {
        if (typeof values !== 'object' || values === null) continue
        for (const [key, value] of Object.entries(values)) {
          const strValue = String(value)
          const prefixedKey = `${category}_${key}`
          upserts.push(
            db.salonSetting.upsert({
              where: { key: prefixedKey },
              update: { value: strValue, category },
              create: { key: prefixedKey, value: strValue, category },
            })
          )
        }
      }
      await Promise.all(upserts)
      return NextResponse.json({ success: true, data: { upserted: upserts.length } }, { status: 201 })
    }

    // Single save
    const { key, value, category } = body

    if (!key || value === undefined || !category) {
      return NextResponse.json(
        { success: false, error: 'key, value, and category are required' },
        { status: 400 }
      )
    }

    const setting = await db.salonSetting.upsert({
      where: { key },
      update: { value, category },
      create: { key, value, category },
    })

    return NextResponse.json({ success: true, data: setting }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upsert setting'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
