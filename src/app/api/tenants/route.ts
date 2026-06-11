import { NextRequest, NextResponse } from 'next/server'
import { db, provisionTenantDatabase } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, slug } = body

    if (!clientId || !slug) {
      return NextResponse.json({ success: false, error: 'Client ID and slug are required' }, { status: 400 })
    }

    // Check if client exists
    const client = await db.ownerClient.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    // Check if tenant DB already exists and is active
    const existingDb = await db.tenantDatabase.findFirst({
      where: { clientId, status: 'active' },
    })

    if (existingDb?.connectionString) {
      return NextResponse.json({
        success: true,
        data: {
          dbName: existingDb.dbName,
          connectionString: existingDb.connectionString,
          status: existingDb.status,
          message: 'Tenant database already exists',
        },
      })
    }

    // Provision new tenant database
    const result = await provisionTenantDatabase(clientId, slug)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          dbName: result.dbName,
          connectionString: result.connectionString,
          status: 'active',
          message: 'Tenant database provisioned successfully',
        },
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Tenant provisioning error:', error)
    return NextResponse.json({ success: false, error: 'Provisioning failed' }, { status: 500 })
  }
}

// List tenant databases
export async function GET() {
  try {
    const tenants = await db.tenantDatabase.findMany({
      include: {
        client: {
          select: { id: true, businessName: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: tenants.map(t => ({
        id: t.id,
        clientId: t.clientId,
        businessName: t.client.businessName,
        slug: t.client.slug,
        dbName: t.dbName,
        status: t.status,
        dbSize: t.dbSize,
        lastMigrated: t.lastMigrated,
        errorLog: t.errorLog,
        createdAt: t.createdAt,
      })),
    })
  } catch (error) {
    console.error('List tenants error:', error)
    return NextResponse.json({ success: false, error: 'Failed to list tenants' }, { status: 500 })
  }
}
