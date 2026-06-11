import { db, provisionTenantDatabase } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET: List all tenant databases ─────────────────────────────────────
export async function GET() {
  try {
    const tenants = await db.tenantDatabase.findMany({
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            slug: true,
            email: true,
            status: true,
            tenantDbStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: tenants })
  } catch (error) {
    console.error('[Owner Tenants API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant databases' },
      { status: 500 },
    )
  }
}

// ─── POST: Manually trigger tenant DB creation on Neon ────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId is required' },
        { status: 400 },
      )
    }

    const client = await db.ownerClient.findUnique({
      where: { id: clientId },
      include: { tenantDatabases: true },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 },
      )
    }

    // If tenant DB already active, return it
    const activeTenant = client.tenantDatabases.find((t) => t.status === 'active')
    if (activeTenant) {
      return NextResponse.json({
        success: true,
        data: activeTenant,
        message: 'Tenant database already exists and is active',
      })
    }

    // Update client status
    await db.ownerClient.update({
      where: { id: clientId },
      data: { tenantDbStatus: 'creating' },
    })

    // Update existing tenant record or create new
    const existingTenant = client.tenantDatabases[0]
    if (existingTenant) {
      await db.tenantDatabase.update({
        where: { id: existingTenant.id },
        data: { status: 'creating' },
      })
    }

    // Provision tenant database on Neon
    const result = await provisionTenantDatabase(clientId, client.slug)

    if (result.success) {
      // Update client status
      await db.ownerClient.update({
        where: { id: clientId },
        data: {
          tenantDbPath: result.dbName,
          tenantDbStatus: 'active',
        },
      })

      const updatedTenant = await db.tenantDatabase.findFirst({
        where: { clientId, status: 'active' },
      })

      return NextResponse.json({
        success: true,
        data: updatedTenant,
        message: `Tenant database '${result.dbName}' created on Neon PostgreSQL`,
      })
    } else {
      await db.ownerClient.update({
        where: { id: clientId },
        data: { tenantDbStatus: 'error' },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create tenant database on Neon',
          details: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error('[Owner Tenants API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger tenant database creation' },
      { status: 500 },
    )
  }
}
