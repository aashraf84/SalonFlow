import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const checks: Record<string, any> = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      HAS_JWT_SECRET: !!process.env.JWT_SECRET,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 30) + '...',
    }
  }

  // Test database connection
  try {
    await db.$queryRaw`SELECT 1 as health`
    checks.database = 'connected'
  } catch (dbError: any) {
    checks.database = `error: ${dbError.message} (${dbError.code || 'UNKNOWN'})`
  }

  // Check Prisma Client models
  const criticalModels = ['deviceActivation', 'serialKey', 'systemUser', 'branch', 'appointment']
  checks.models = {}
  for (const model of criticalModels) {
    checks.models[model] = !!(db as any)[model]
  }

  // Test serial key table access
  try {
    const count = await db.serialKey.count()
    checks.serialKeys = count
  } catch (skError: any) {
    checks.serialKeys = `error: ${skError.message}`
  }

  const isHealthy = checks.database === 'connected'
  checks.status = isHealthy ? 'healthy' : 'unhealthy'

  return NextResponse.json(checks, { status: isHealthy ? 200 : 503 })
}
