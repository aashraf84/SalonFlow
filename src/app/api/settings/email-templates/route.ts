import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/email-templates - Get all email templates
export async function GET() {
  try {
    const templates = await db.emailTemplate.findMany({
      orderBy: { type: 'asc' },
    })
    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch email templates'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/settings/email-templates - Create or update email template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { template } = body as {
      template: {
        id?: string
        name: string
        subject: string
        body: string
        type: string
        variables?: string
        isActive?: boolean
      }
    }

    if (!template || !template.name || !template.subject || !template.body || !template.type) {
      return NextResponse.json({ success: false, error: 'name, subject, body, and type are required' }, { status: 400 })
    }

    let result
    if (template.id) {
      result = await db.emailTemplate.update({
        where: { id: template.id },
        data: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          type: template.type,
          variables: template.variables,
          isActive: template.isActive,
        },
      })
    } else {
      result = await db.emailTemplate.create({
        data: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          type: template.type,
          variables: template.variables,
          isActive: template.isActive ?? true,
        },
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save email template'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/settings/email-templates - Delete an email template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    await db.emailTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete email template'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
