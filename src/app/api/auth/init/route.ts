import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Create a fresh PrismaClient directly to avoid stale cached instances
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get('deviceId') || ''

    // ─── Step 1: Seed serial keys (lightweight, no bcryptjs needed) ────
    try {
      await prisma.serialKey.upsert({
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

      await prisma.serialKey.upsert({
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

      await prisma.serialKey.upsert({
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
        const activation = await prisma.deviceActivation.findUnique({
          where: { deviceId }
        })

        if (activation && activation.status === 'active') {
          if (activation.expiresAt && new Date() > activation.expiresAt) {
            await prisma.deviceActivation.update({
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
  } catch (error: any) {
    console.error('Init error:', error)
    const errorMsg = error?.message || String(error)
    return NextResponse.json({
      success: false,
      error: `Initialization failed: ${errorMsg}`,
    }, { status: 500 })
  }
}
