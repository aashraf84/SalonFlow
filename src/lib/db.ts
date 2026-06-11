import { PrismaClient } from '@prisma/client'

// ─── Main Database (Owner/System) ─────────────────────────────────────────────
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ─── Tenant Database Pool ─────────────────────────────────────────────────────
const tenantPool = new Map<string, PrismaClient>()

/**
 * Get a PrismaClient for a specific tenant database.
 * Uses connection pooling - reuses existing clients.
 */
export function getTenantDb(connectionString: string): PrismaClient {
  const existing = tenantPool.get(connectionString)
  if (existing) return existing

  const client = new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: ['query'],
  })

  tenantPool.set(connectionString, client)
  return client
}

/**
 * Get tenant database connection string from the main database.
 * Looks up the TenantDatabase record by clientId.
 */
export async function getTenantConnectionString(clientId: string): Promise<string | null> {
  const tenantDb = await db.tenantDatabase.findFirst({
    where: { clientId, status: 'active' },
    select: { connectionString: true },
  })
  return tenantDb?.connectionString || null
}

/**
 * Get a PrismaClient for a tenant by clientId.
 * First looks up the connection string, then returns a pooled client.
 */
export async function getTenantClient(clientId: string): Promise<PrismaClient | null> {
  const connectionString = await getTenantConnectionString(clientId)
  if (!connectionString) return null
  return getTenantDb(connectionString)
}

/**
 * Build a Neon PostgreSQL connection string for a tenant database.
 */
export function buildTenantConnectionString(dbName: string): string {
  const host = process.env.NEON_HOST
  if (!host) {
    throw new Error('NEON_HOST environment variable is required for tenant database provisioning')
  }
  const user = process.env.NEON_USER || 'neondb_owner'
  const password = process.env.NEON_PASSWORD
  if (!password) {
    throw new Error('NEON_PASSWORD environment variable is required for tenant database provisioning')
  }
  return `postgresql://${user}:${password}@${host}/${dbName}?sslmode=require`
}

/**
 * Generate a safe database name from a business name/slug.
 * Neon database names must be valid PostgreSQL identifiers.
 */
export function generateTenantDbName(slug: string): string {
  return `tenant_${slug.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 50)}`
}

/**
 * Create a new tenant database on Neon PostgreSQL.
 * Connects to the default 'neondb' and runs CREATE DATABASE.
 */
export async function createTenantDatabase(dbName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Use the main connection URL but connect to the default database
    // We need to use raw SQL via a direct connection
    const mainUrl = process.env.DATABASE_URL!
    
    // We'll use pg directly for CREATE DATABASE since Prisma can't do it
    // through its usual query interface (DDL statements can't run in transactions)
    const { Client } = await import('pg')
    
    const client = new Client({
      connectionString: mainUrl,
      ssl: { rejectUnauthorized: false },
    })

    await client.connect()

    // Check if database already exists
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    )

    if (res.rows.length > 0) {
      await client.end()
      return { success: true } // Already exists
    }

    // Create the database
    await client.query(`CREATE DATABASE "${dbName}"`)
    await client.end()

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Create tenant DB error:', message)
    return { success: false, error: message }
  }
}

/**
 * Push the Prisma schema to a newly created tenant database.
 * Runs prisma db push with the tenant's connection URL.
 */
export async function pushSchemaToTenantDb(connectionString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { execSync } = await import('child_process')
    
    // Set the DATABASE_URL temporarily and run prisma db push
    const env = {
      ...process.env,
      DATABASE_URL: connectionString,
    }
    
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      env,
      stdio: 'pipe',
      timeout: 120000,
    })
    
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Push schema to tenant DB error:', message)
    return { success: false, error: message }
  }
}

/**
 * Full tenant database provisioning pipeline:
 * 1. Generate DB name from slug
 * 2. Create database on Neon
 * 3. Push schema to the new database
 * 4. Register in the main database
 */
export async function provisionTenantDatabase(
  clientId: string,
  slug: string
): Promise<{ success: boolean; connectionString?: string; dbName?: string; error?: string }> {
  const dbName = generateTenantDbName(slug)
  
  // Step 1: Create the database on Neon
  const createResult = await createTenantDatabase(dbName)
  if (!createResult.success) {
    return { success: false, error: `Failed to create database: ${createResult.error}` }
  }

  // Step 2: Build connection string
  const connectionString = buildTenantConnectionString(dbName)

  // Step 3: Push schema to the new tenant database
  const pushResult = await pushSchemaToTenantDb(connectionString)
  if (!pushResult.success) {
    // Update TenantDatabase with error
    await db.tenantDatabase.upsert({
      where: { id: `${clientId}_db` },
      create: {
        id: `${clientId}_db`,
        clientId,
        dbName,
        connectionString,
        status: 'error',
        errorLog: pushResult.error,
      },
      update: {
        dbName,
        connectionString,
        status: 'error',
        errorLog: pushResult.error,
      },
    })
    return { success: false, error: `Failed to push schema: ${pushResult.error}` }
  }

  // Step 4: Register/update in main database
  await db.tenantDatabase.upsert({
    where: { id: `${clientId}_db` },
    create: {
      id: `${clientId}_db`,
      clientId,
      dbName,
      connectionString,
      status: 'active',
      lastMigrated: new Date(),
    },
    update: {
      dbName,
      connectionString,
      status: 'active',
      lastMigrated: new Date(),
      errorLog: null,
    },
  })

  return { success: true, connectionString, dbName }
}
