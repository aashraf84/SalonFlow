import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET: Get single client with all relations ──────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const client = await db.ownerClient.findUnique({
      where: { id },
      include: {
        modules: true,
        serialKeys: true,
        subscriptions: true,
        users: true,
        invoices: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
        tenantDatabases: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error('[Owner Client API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client' },
      { status: 500 },
    )
  }
}

// ─── PATCH: Update client ───────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
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
      purchaseType,
      status,
      planName,
      billingCycle,
      currency,
      // Modules: if provided, replace all existing modules
      modules,
    } = body

    // ── Check client exists ─────────────────────────────────────────────
    const existingClient = await db.ownerClient.findUnique({ where: { id } })
    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 },
      )
    }

    // ── If email is being changed, check for duplicate ──────────────────
    if (email && email !== existingClient.email) {
      const duplicateEmail = await db.ownerClient.findUnique({ where: { email } })
      if (duplicateEmail) {
        return NextResponse.json(
          { success: false, error: 'A client with this email already exists' },
          { status: 409 },
        )
      }
    }

    // ── Build update data ───────────────────────────────────────────────
    const updateData: Record<string, unknown> = {}
    const fields = {
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
      purchaseType,
      status,
      planName,
      billingCycle,
      currency,
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value
      }
    }

    // ── Update slug if companyName changed ──────────────────────────────
    if (companyName && companyName !== existingClient.companyName) {
      let slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      let slugCounter = 1
      let finalSlug = slug
      while (
        (await db.ownerClient.findFirst({
          where: { slug: finalSlug, NOT: { id } },
        }))
      ) {
        finalSlug = `${slug}-${slugCounter}`
        slugCounter++
      }
      updateData.slug = finalSlug
    }

    // ── Update client record ────────────────────────────────────────────
    const updatedClient = await db.ownerClient.update({
      where: { id },
      data: updateData,
    })

    // ── Update modules if provided ──────────────────────────────────────
    if (modules !== undefined && Array.isArray(modules)) {
      // Delete existing modules
      await db.ownerClientModule.deleteMany({ where: { clientId: id } })

      // Create new modules
      if (modules.length > 0) {
        await db.ownerClientModule.createMany({
          data: modules.map((m: { moduleKey: string; moduleName: string }) => ({
            clientId: id,
            moduleKey: m.moduleKey,
            moduleName: m.moduleName,
            isActive: true,
          })),
        })
      }
    }

    // ── Return updated client with relations ────────────────────────────
    const fullClient = await db.ownerClient.findUnique({
      where: { id },
      include: {
        modules: true,
        serialKeys: true,
        subscriptions: true,
        users: true,
        tenantDatabases: true,
        _count: { select: { invoices: true, quotations: true } },
      },
    })

    return NextResponse.json({ success: true, data: fullClient })
  } catch (error) {
    console.error('[Owner Client API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 },
    )
  }
}

// ─── DELETE: Delete client and all related data ─────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const client = await db.ownerClient.findUnique({ where: { id } })
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 },
      )
    }

    // Cascade deletes will handle related records (modules, users, etc.)
    // But we need to handle non-cascaded relations manually
    await db.$transaction([
      db.ownerInvoiceItem.deleteMany({
        where: { invoice: { clientId: id } },
      }),
      db.ownerInvoice.deleteMany({ where: { clientId: id } }),
      db.ownerQuotationItem.deleteMany({
        where: { quotation: { clientId: id } },
      }),
      db.ownerQuotation.deleteMany({ where: { clientId: id } }),
      db.ownerClientSubscription.deleteMany({ where: { clientId: id } }),
      db.serialKey.deleteMany({ where: { clientId: id } }),
      db.tenantDatabase.deleteMany({ where: { clientId: id } }),
      db.ownerClientModule.deleteMany({ where: { clientId: id } }),
      db.ownerClientUser.deleteMany({ where: { clientId: id } }),
      db.ownerClient.delete({ where: { id } }),
    ])

    return NextResponse.json({
      success: true,
      data: { message: 'Client deleted successfully' },
    })
  } catch (error) {
    console.error('[Owner Client API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 },
    )
  }
}
