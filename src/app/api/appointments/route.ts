import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/appointments - List appointments with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const status = searchParams.get('status')
    const staffId = searchParams.get('staffId')
    const branchId = searchParams.get('branchId')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (staffId) {
      where.staffId = staffId
    }
    if (branchId) {
      where.branchId = branchId
    }
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      }
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              loyaltyTier: true,
            },
          },
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              specialization: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  duration: true,
                  category: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          branch: {
            select: { id: true, name: true, branchCode: true },
          },
        },
      }),
      db.appointment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch appointments'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { branchId, customerId, staffId, date, startTime, endTime, serviceIds, notes, type } = body

    if (!branchId || !customerId || !staffId || !date || !startTime || !endTime || !serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: branchId, customerId, staffId, date, startTime, endTime, serviceIds' },
        { status: 400 }
      )
    }

    // Look up services to get their prices and durations
    const services = await db.service.findMany({
      where: { id: { in: serviceIds } },
    })

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more service IDs are invalid' },
        { status: 400 }
      )
    }

    // Auto-calculate totalAmount from services
    const totalAmount = services.reduce((sum, s) => sum + s.price, 0)

    const appointment = await db.appointment.create({
      data: {
        branchId,
        customerId,
        staffId,
        date: new Date(date),
        startTime,
        endTime,
        totalAmount,
        notes,
        type: type || 'booking',
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            staffId,
            price: s.price,
            duration: s.duration,
          })),
        },
      },
      include: {
        customer: true,
        staff: true,
        services: {
          include: {
            service: true,
          },
        },
        branch: true,
      },
    })

    return NextResponse.json({ success: true, data: appointment }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create appointment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
