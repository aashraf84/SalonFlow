import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/feedback - List feedback with customer and staff name, filters, average rating
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const rating = searchParams.get('rating')
    const status = searchParams.get('status')
    const staffId = searchParams.get('staffId')

    const where: Record<string, unknown> = {}

    if (rating) where.rating = parseInt(rating)
    if (status) where.status = status
    if (staffId) where.staffId = staffId

    const [feedback, total] = await Promise.all([
      db.feedback.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
      db.feedback.count({ where }),
    ])

    // Average rating
    const avgResult = await db.feedback.aggregate({
      where,
      _avg: { rating: true },
      _count: { id: true },
    })

    // Rating distribution
    const ratingDistribution: Record<number, number> = {}
    for (let i = 1; i <= 5; i++) {
      const count = await db.feedback.count({
        where: { ...where, rating: i },
      })
      ratingDistribution[i] = count
    }

    const stats = {
      averageRating: avgResult._avg.rating || 0,
      totalReviews: avgResult._count.id,
      ratingDistribution,
    }

    return NextResponse.json({
      success: true,
      data: feedback,
      stats,
      pagination: { skip, take, total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch feedback'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/feedback - Create feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, rating, comment, tags, appointmentId, staffId } = body

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const feedback = await db.feedback.create({
      data: {
        customerId,
        rating,
        comment: comment || null,
        tags: tags || null,
        appointmentId: appointmentId || null,
        staffId: staffId || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: feedback }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create feedback'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
