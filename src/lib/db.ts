import { PrismaClient } from '@prisma/client'

// ─── Main Database (Owner/System) ─────────────────────────────────────────────
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create PrismaClient with connection pooling for Neon PostgreSQL
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ─── Runtime sanity check ────────────────────────────────────────────────────
// Verify critical models exist on the Prisma Client
const _requiredModels = ['deviceActivation', 'serialKey', 'systemUser'] as const
for (const model of _requiredModels) {
  if (!(model in db)) {
    console.error(`❌ Prisma Client is missing model: ${model}. Available: ${Object.keys(db).filter(k => !k.startsWith('_') && !k.startsWith('$') && typeof (db as any)[k] === 'object').join(', ')}`)
  }
}

/**
 * Graceful shutdown - disconnect Prisma when process exits
 */
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}

// ─── Tenant Database Helpers (stub for build compatibility) ──────────────────
export async function provisionTenantDatabase(
  _clientId: string,
  _slug: string
): Promise<{ success: boolean; connectionString?: string; dbName?: string; error?: string }> {
  return { success: false, error: 'Tenant provisioning is not available in this environment' }
}

export function getTenantDb(_connectionString: string): PrismaClient {
  return db
}

export async function getTenantConnectionString(_clientId: string): Promise<string | null> {
  return null
}

export async function getTenantClient(_clientId: string): Promise<PrismaClient | null> {
  return null
}

export function buildTenantConnectionString(_dbName: string): string {
  return ''
}

export function generateTenantDbName(_slug: string): string {
  return ''
}

export async function createTenantDatabase(_dbName: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Not available' }
}

export async function pushSchemaToTenantDb(_connectionString: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Not available' }
}
