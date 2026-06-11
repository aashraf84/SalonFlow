import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/coupons/[id] - Get single coupon
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const coupon = await db.coupon.findUnique({ where: { id } })

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: coupon })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch coupon'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PUT /api/coupons/[id] - Update coupon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    // If code is being changed, check uniqueness
    if (body.code && body.code !== existing.code) {
      const codeExists = await db.coupon.findUnique({ where: { code: body.code } })
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Coupon code already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.code !== undefined) updateData.code = body.code
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.discountType !== undefined) updateData.discountType = body.discountType
    if (body.discountValue !== undefined) updateData.discountValue = parseFloat(body.discountValue)
    if (body.minPurchase !== undefined) updateData.minPurchase = parseFloat(body.minPurchase)
    if (body.maxDiscount !== undefined) updateData.maxDiscount = body.maxDiscount ? parseFloat(body.maxDiscount) : null
    if (body.usageLimit !== undefined) updateData.usageLimit = body.usageLimit ? parseInt(body.usageLimit) : null
    if (body.perCustomerLimit !== undefined) updateData.perCustomerLimit = parseInt(body.perCustomerLimit)
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate)
    if (body.status !== undefined) updateData.status = body.status

    const coupon = await db.coupon.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: coupon })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update coupon'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/coupons/[id] - Delete coupon
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    await db.coupon.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete coupon'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
