import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Combined init endpoint: seeds data + checks activation in ONE request
// NOTE: Does NOT create users - use /api/auth/demo or /api/auth/seed for that
// This avoids the bcryptjs import which can cause memory issues
export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get('deviceId') || ''

    // ─── Step 1: Seed serial keys only (lightweight, no bcryptjs needed) ────
    try {
      // Create demo serial key (upsert to avoid unique constraint errors)
      await db.serialKey.upsert({
        where: { key: 'SALON-DEMO-2024-ACTIVATION' },
        update: { maxDevices: 999, status: 'available' },
        create: {
          key: 'SALON-DEMO-2024-ACTIVATION',
          type: 'one_time',
          maxDevices: 999,
          activeDevices: 0,
          status: 'available',
        }
      })

      // Create pro serial key
      await db.serialKey.upsert({
        where: { key: 'SALONFLOW-PRO-2024-LICENSE' },
        update: { maxDevices: 10, status: 'available' },
        create: {
          key: 'SALONFLOW-PRO-2024-LICENSE',
          type: 'subscription',
          maxDevices: 10,
          activeDevices: 0,
          status: 'available',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }
      })

      // Create owner serial key
      await db.serialKey.upsert({
        where: { key: 'SF-DEMO-2024-OWNER-ACTIV' },
        update: { maxDevices: 50, status: 'available' },
        create: {
          key: 'SF-DEMO-2024-OWNER-ACTIV',
          type: 'subscription',
          maxDevices: 50,
          activeDevices: 0,
          status: 'available',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }
      })
    } catch (seedError) {
      console.error('Seed error (non-fatal):', seedError)
    }

    // ─── Step 2: Check activation status ───────────────────────────────────
    let activated = false

    if (deviceId) {
      try {
        const activation = await db.deviceActivation.findUnique({
          where: { deviceId }
        })

        if (activation && activation.status === 'active') {
          if (activation.expiresAt && new Date() > activation.expiresAt) {
            await db.deviceActivation.update({
              where: { id: activation.id },
              data: { status: 'expired' }
            })
            activated = false
          } else {
            activated = true
          }
        }
      } catch (activationError) {
        console.error('Activation check error (non-fatal):', activationError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        seeded: true,
        activated,
      }
    })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ success: false, error: 'Initialization failed' }, { status: 500 })
  }
}
