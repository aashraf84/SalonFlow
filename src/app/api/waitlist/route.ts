import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/waitlist - List waitlist entries with customer/service info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const branchId = searchParams.get('branchId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (branchId) where.branchId = branchId

    const entries = await db.waitlist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Batch-fetch related data since there are no direct relations
    const uniqueCustomerIds = [...new Set(entries.map((e) => e.customerId).filter(Boolean))]
    const uniqueServiceIds = [...new Set(entries.filter((e) => e.serviceId).map((e) => e.serviceId!))]
    const uniqueBranchIds = [...new Set(entries.map((e) => e.branchId).filter(Boolean))]

    const [customers, services, branches] = await Promise.all([
      uniqueCustomerIds.length > 0
        ? db.customer.findMany({
            where: { id: { in: uniqueCustomerIds } },
            select: { id: true, firstName: true, lastName: true, phone: true },
          })
        : Promise.resolve([]),
      uniqueServiceIds.length > 0
        ? db.service.findMany({
            where: { id: { in: uniqueServiceIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      uniqueBranchIds.length > 0
        ? db.branch.findMany({
            where: { id: { in: uniqueBranchIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ])

    // Build lookup maps
    const customerMap = new Map(customers.map((c) => [c.id, c]))
    const serviceMap = new Map(services.map((s) => [s.id, s]))
    const branchMap = new Map(branches.map((b) => [b.id, b]))

    // Merge data into the expected frontend format
    const data = entries.map((entry) => {
      const customer = customerMap.get(entry.customerId)
      const service = entry.serviceId ? serviceMap.get(entry.serviceId) : null
      const branch = branchMap.get(entry.branchId)

      return {
        id: entry.id,
        customerId: entry.customerId,
        customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Unknown',
        customerPhone: customer?.phone || '',
        serviceId: entry.serviceId || '',
        serviceName: service?.name || '',
        preferredDate: entry.preferredDate.toISOString(),
        preferredTime: entry.preferredTime || '',
        status: entry.status,
        notes: entry.notes,
        branchId: entry.branchId,
        branchName: branch?.name || '',
        createdAt: entry.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch waitlist'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/waitlist - Create a new waitlist entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      customerPhone,
      serviceId,
      preferredDate,
      preferredTime,
      notes,
      branchId,
    } = body

    if (!customerName) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      )
    }

    if (!preferredDate) {
      return NextResponse.json(
        { success: false, error: 'Preferred date is required' },
        { status: 400 }
      )
    }

    // Find or create customer by phone (if phone provided), otherwise by name
    let customerId: string | null = null

    if (customerPhone) {
      const existingCustomer = await db.customer.findFirst({
        where: { phone: customerPhone },
      })
      if (existingCustomer) {
        customerId = existingCustomer.id
      }
    }

    // If no existing customer found, create one
    if (!customerId) {
      const nameParts = customerName.trim().split(/\s+/)
      const firstName = nameParts[0] || 'Unknown'
      const lastName = nameParts.slice(1).join(' ') || ''

      const newCustomer = await db.customer.create({
        data: {
          firstName,
          lastName,
          phone: customerPhone || '',
          email: '',
        },
      })
      customerId = newCustomer.id
    }

    // Determine branchId - use provided or find first active branch
    let resolvedBranchId = branchId
    if (!resolvedBranchId) {
      const firstBranch = await db.branch.findFirst({
        where: { isActive: true },
        select: { id: true },
      })
      resolvedBranchId = firstBranch?.id
    }

    if (!resolvedBranchId) {
      return NextResponse.json(
        { success: false, error: 'No branch available' },
        { status: 400 }
      )
    }

    const entry = await db.waitlist.create({
      data: {
        customerId,
        branchId: resolvedBranchId,
        serviceId: serviceId || null,
        preferredDate: new Date(preferredDate),
        preferredTime: preferredTime || null,
        notes: notes || null,
        status: 'waiting',
      },
    })

    // Fetch related data for the response
    const [customer, service, branch] = await Promise.all([
      db.customer.findUnique({
        where: { id: customerId },
        select: { id: true, firstName: true, lastName: true, phone: true },
      }),
      serviceId
        ? db.service.findUnique({
            where: { id: serviceId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      db.branch.findUnique({
        where: { id: resolvedBranchId },
        select: { id: true, name: true },
      }),
    ])

    const data = {
      id: entry.id,
      customerId: entry.customerId,
      customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : customerName,
      customerPhone: customer?.phone || customerPhone || '',
      serviceId: entry.serviceId || '',
      serviceName: service?.name || '',
      preferredDate: entry.preferredDate.toISOString(),
      preferredTime: entry.preferredTime || '',
      status: entry.status,
      notes: entry.notes,
      branchId: entry.branchId,
      branchName: branch?.name || '',
      createdAt: entry.createdAt.toISOString(),
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create waitlist entry'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
