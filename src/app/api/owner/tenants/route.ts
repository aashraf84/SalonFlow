import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

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

// ─── POST: Manually trigger tenant DB creation ──────────────────────────
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

    // Build tenant DB path
    const tenantDbPath = `/home/z/my-project/db/tenants/${client.slug}.db`

    // Create or update TenantDatabase record
    let tenantDb = client.tenantDatabases[0]
    if (tenantDb) {
      await db.tenantDatabase.update({
        where: { id: tenantDb.id },
        data: { status: 'creating' },
      })
    } else {
      tenantDb = await db.tenantDatabase.create({
        data: {
          clientId: client.id,
          dbPath: tenantDbPath,
          status: 'creating',
        },
      })
    }

    // Update client status
    await db.ownerClient.update({
      where: { id: clientId },
      data: { tenantDbStatus: 'creating' },
    })

    // Try to create the tenant database
    try {
      execSync('npx prisma db push --skip-generate', {
        env: {
          ...process.env,
          DATABASE_URL: `file:${tenantDbPath}`,
        },
        cwd: '/home/z/my-project',
        stdio: 'pipe',
        timeout: 60000,
      })

      // Update records to active
      const updatedTenant = await db.tenantDatabase.update({
        where: { id: tenantDb.id },
        data: {
          status: 'active',
          lastMigrated: new Date(),
          errorLog: null,
        },
      })

      await db.ownerClient.update({
        where: { id: clientId },
        data: {
          tenantDbPath,
          tenantDbStatus: 'active',
        },
      })

      return NextResponse.json({
        success: true,
        data: updatedTenant,
        message: 'Tenant database created successfully',
      })
    } catch (tenantError) {
      console.error('[Owner Tenants API] Tenant DB creation failed:', tenantError)

      await db.tenantDatabase.update({
        where: { id: tenantDb.id },
        data: {
          status: 'error',
          errorLog: tenantError instanceof Error ? tenantError.message : String(tenantError),
        },
      })

      await db.ownerClient.update({
        where: { id: clientId },
        data: {
          tenantDbPath,
          tenantDbStatus: 'error',
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create tenant database',
          details: tenantError instanceof Error ? tenantError.message : String(tenantError),
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
