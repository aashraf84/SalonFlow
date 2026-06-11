import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import crypto from 'crypto'

// ─── Helper: Generate serial key SF-XXXX-XXXX-XXXX-XXXX ──────────────────
function generateSerialKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segment = () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  return `SF-${segment()}-${segment()}-${segment()}-${segment()}`
}

// ─── GET: List all clients ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''
    const purchaseType = searchParams.get('purchaseType') ?? ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { email: { contains: search } },
        { contactPerson: { contains: search } },
        { slug: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (purchaseType) {
      where.purchaseType = purchaseType
    }

    const clients = await db.ownerClient.findMany({
      where,
      include: {
        modules: true,
        serialKeys: true,
        _count: { select: { subscriptions: true, users: true, invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: clients })
  } catch (error) {
    console.error('[Owner Clients API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 },
    )
  }
}

// ─── POST: Create client with full provisioning ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      companyName,
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      website,
      logoUrl,
      industry,
      businessType,
      taxId,
      registrationNo,
      purchaseType = 'subscription',
      planName,
      billingCycle,
      currency = 'PKR',
      // Modules: array of { moduleKey, moduleName }
      modules = [],
      // Subscription details (if purchaseType is subscription)
      subscriptionPrice,
      subscriptionStartDate,
      subscriptionEndDate,
      subscriptionBillingCycle,
      // Default admin user
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
    } = body

    // ── Validate required fields ────────────────────────────────────────
    if (!companyName || !contactPerson || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'companyName, contactPerson, email, and phone are required' },
        { status: 400 },
      )
    }

    // ── Check for duplicate email ───────────────────────────────────────
    const existingClient = await db.ownerClient.findUnique({ where: { email } })
    if (existingClient) {
      return NextResponse.json(
        { success: false, error: 'A client with this email already exists' },
        { status: 409 },
      )
    }

    // ── Generate slug ───────────────────────────────────────────────────
    let slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Ensure slug is unique
    let slugCounter = 1
    let finalSlug = slug
    while (await db.ownerClient.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${slugCounter}`
      slugCounter++
    }

    // ── Create client record ────────────────────────────────────────────
    const client = await db.ownerClient.create({
      data: {
        companyName,
        slug: finalSlug,
        contactPerson,
        email,
        phone,
        address,
        city,
        state,
        country: country || 'Pakistan',
        postalCode,
        website,
        logoUrl,
        industry: industry || 'Beauty & Salon',
        businessType,
        taxId,
        registrationNo,
        purchaseType,
        status: 'active',
        planName,
        billingCycle,
        currency,
        tenantDbStatus: 'pending',
      },
    })

    // ── Create modules ──────────────────────────────────────────────────
    if (modules.length > 0) {
      await db.ownerClientModule.createMany({
        data: modules.map((m: { moduleKey: string; moduleName: string }) => ({
          clientId: client.id,
          moduleKey: m.moduleKey,
          moduleName: m.moduleName,
          isActive: true,
        })),
      })
    }

    // ── Create subscription (if purchaseType is subscription) ───────────
    if (purchaseType === 'subscription') {
      const startDate = subscriptionStartDate ? new Date(subscriptionStartDate) : new Date()
      const endDate = subscriptionEndDate
        ? new Date(subscriptionEndDate)
        : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // default 30 days

      await db.ownerClientSubscription.create({
        data: {
          clientId: client.id,
          planName: planName || 'Starter',
          price: subscriptionPrice ?? 0,
          billingCycle: subscriptionBillingCycle || billingCycle || 'monthly',
          startDate,
          endDate,
          status: 'active',
          autoRenew: true,
          nextBillingDate: endDate,
        },
      })
    }

    // ── Create default admin user ───────────────────────────────────────
    await db.ownerClientUser.create({
      data: {
        clientId: client.id,
        name: adminName || contactPerson,
        email: adminEmail || email,
        phone: adminPhone || phone,
        role: 'admin',
        password: adminPassword || null,
        status: 'active',
      },
    })

    // ── Generate and assign serial key ──────────────────────────────────
    const serialKey = generateSerialKey()
    await db.serialKey.create({
      data: {
        clientId: client.id,
        key: serialKey,
        type: purchaseType === 'subscription' ? 'subscription' : 'one_time',
        status: 'assigned',
        maxDevices: 1,
        validFrom: new Date(),
        validUntil: purchaseType === 'subscription'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : null,
      },
    })

    // ── Create TenantDatabase record ────────────────────────────────────
    const tenantDbPath = `/home/z/my-project/db/tenants/${finalSlug}.db`

    const tenantDb = await db.tenantDatabase.create({
      data: {
        clientId: client.id,
        dbPath: tenantDbPath,
        status: 'pending',
      },
    })

    // ── Auto-create tenant database ─────────────────────────────────────
    try {
      // Update status to creating
      await db.ownerClient.update({
        where: { id: client.id },
        data: { tenantDbStatus: 'creating' },
      })
      await db.tenantDatabase.update({
        where: { id: tenantDb.id },
        data: { status: 'creating' },
      })

      // Run prisma db push with tenant URL
      execSync('npx prisma db push --skip-generate', {
        env: {
          ...process.env,
          DATABASE_URL: `file:${tenantDbPath}`,
        },
        cwd: '/home/z/my-project',
        stdio: 'pipe',
        timeout: 60000,
      })

      // Update status to active
      await db.ownerClient.update({
        where: { id: client.id },
        data: {
          tenantDbPath,
          tenantDbStatus: 'active',
        },
      })
      await db.tenantDatabase.update({
        where: { id: tenantDb.id },
        data: {
          status: 'active',
          lastMigrated: new Date(),
        },
      })
    } catch (tenantError) {
      console.error('[Owner Clients API] Tenant DB creation failed:', tenantError)
      // Set status to error but don't fail the whole request
      await db.ownerClient.update({
        where: { id: client.id },
        data: {
          tenantDbPath,
          tenantDbStatus: 'error',
        },
      })
      await db.tenantDatabase.update({
        where: { id: tenantDb.id },
        data: {
          status: 'error',
          errorLog: tenantError instanceof Error ? tenantError.message : String(tenantError),
        },
      })
    }

    // ── Return created client with all relations ────────────────────────
    const fullClient = await db.ownerClient.findUnique({
      where: { id: client.id },
      include: {
        modules: true,
        serialKeys: true,
        subscriptions: true,
        users: true,
        tenantDatabases: true,
        _count: { select: { invoices: true, quotations: true } },
      },
    })

    return NextResponse.json({ success: true, data: fullClient }, { status: 201 })
  } catch (error) {
    console.error('[Owner Clients API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 },
    )
  }
}
