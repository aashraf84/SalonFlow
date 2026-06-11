import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { deviceId, serialKey, deviceName, browserInfo } = body

    if (!deviceId || !serialKey) {
      return NextResponse.json({ success: false, error: 'Device ID and Serial Key are required' }, { status: 400 })
    }

    // Check if device is already activated
    const existingActivation = await db.deviceActivation.findUnique({
      where: { deviceId }
    })

    if (existingActivation && existingActivation.status === 'active') {
      // Check if activation has expired
      if (existingActivation.expiresAt && new Date() > existingActivation.expiresAt) {
        await db.deviceActivation.update({
          where: { id: existingActivation.id },
          data: { status: 'expired' }
        })
        // Fall through to re-activation logic below
      } else {
        return NextResponse.json({
          success: true,
          data: { message: 'Device already activated', deviceId: existingActivation.deviceId },
        })
      }
    }

    // Validate serial key against SerialKey table
    const keyRecord = await db.serialKey.findUnique({
      where: { key: serialKey }
    })

    if (!keyRecord) {
      return NextResponse.json({ success: false, error: 'Invalid serial key. Please check and try again.' }, { status: 404 })
    }

    if (keyRecord.status === 'revoked') {
      return NextResponse.json({ success: false, error: 'Serial key has been revoked.' }, { status: 403 })
    }

    // Check if key has expired based on validUntil date
    if (keyRecord.validUntil && new Date() > keyRecord.validUntil) {
      await db.serialKey.update({
        where: { id: keyRecord.id },
        data: { status: 'expired' }
      })
      return NextResponse.json({ success: false, error: 'Serial key has expired.' }, { status: 403 })
    }

    if (keyRecord.activeDevices >= keyRecord.maxDevices) {
      return NextResponse.json({ success: false, error: `Maximum device activations reached for this key (${keyRecord.maxDevices} device(s) allowed).` }, { status: 403 })
    }

    // Activate or re-activate the device
    if (existingActivation) {
      // Re-activate: update existing record instead of creating new one (avoids unique constraint violation)
      const activation = await db.deviceActivation.update({
        where: { id: existingActivation.id },
        data: {
          serialKey,
          deviceName: deviceName || existingActivation.deviceName || 'Unknown Device',
          browserInfo: browserInfo || req.headers.get('user-agent') || existingActivation.browserInfo || 'unknown',
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          status: 'active',
          activatedAt: new Date(),
          revokedAt: null,
          expiresAt: keyRecord.validUntil,
        }
      })

      // Increment activation count on the serial key
      await db.serialKey.update({
        where: { key: serialKey },
        data: {
          activeDevices: { increment: 1 },
          status: 'activated',
          activatedAt: new Date(),
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          activationId: activation.id,
          deviceId: activation.deviceId,
          message: 'Device re-activated successfully!',
        }
      })
    }

    // New activation
    const activation = await db.deviceActivation.create({
      data: {
        deviceId,
        serialKey,
        deviceName: deviceName || 'Unknown Device',
        browserInfo: browserInfo || req.headers.get('user-agent') || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        status: 'active',
        expiresAt: keyRecord.validUntil,
      }
    })

    // Increment activation count on the serial key
    await db.serialKey.update({
      where: { key: serialKey },
      data: {
        activeDevices: { increment: 1 },
        status: 'activated',
        activatedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        activationId: activation.id,
        deviceId: activation.deviceId,
        message: 'Device activated successfully!',
      }
    })
  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json({ success: false, error: 'Activation failed. Please try again.' }, { status: 500 })
  }
}

// Check if device is activated
export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'Device ID is required' }, { status: 400 })
    }

    const activation = await db.deviceActivation.findUnique({
      where: { deviceId }
    })

    if (!activation || activation.status !== 'active') {
      return NextResponse.json({ success: false, data: { activated: false } })
    }

    // Check if activation has expired
    if (activation.expiresAt && new Date() > activation.expiresAt) {
      await db.deviceActivation.update({
        where: { id: activation.id },
        data: { status: 'expired' }
      })
      return NextResponse.json({ success: false, data: { activated: false, reason: 'expired' } })
    }

    return NextResponse.json({
      success: true,
      data: { activated: true, activatedAt: activation.activatedAt }
    })
  } catch (error) {
    console.error('Check error:', error)
    return NextResponse.json({ success: false, error: 'Check failed' }, { status: 500 })
  }
}
