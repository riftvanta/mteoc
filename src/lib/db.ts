import { PrismaClient } from '@prisma/client'
import { Pool, PoolConfig } from 'pg'

/**
 * Unified Database Service
 * Provides both Prisma ORM and raw SQL capabilities with optimized connection pooling
 */

// Global Prisma client with optimized configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.POSTGRES_PRISMA_URL,
    },
  },
  errorFormat: 'minimal',
  transactionOptions: {
    timeout: 30000,
    isolationLevel: 'ReadCommitted',
  },
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Connection pool for raw SQL queries
let globalPool: Pool | null = null

const createPool = (): Pool => {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                          process.env.POSTGRES_PRISMA_URL || 
                          process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('No database connection string found')
  }

  const isLocalhost = connectionString.includes('localhost')
  const isSupabase = connectionString.includes('supabase.com')

  const config: PoolConfig = {
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 10 : 5,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isLocalhost ? false : {
      rejectUnauthorized: false,
    },
    application_name: 'financial-transfer-app',
  }

  // Disable SSL verification for Supabase
  if (isSupabase) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

  return new Pool(config)
}

export const getPool = (): Pool => {
  if (!globalPool) {
    globalPool = createPool()
    
    globalPool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
    
    globalPool.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('New database client connected')
      }
    })
  }
  
  return globalPool
}

/**
 * Database health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe('SELECT 1')
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}

/**
 * Enhanced error handling for database operations
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 2
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      console.error(`Database operation ${operationName} failed (attempt ${attempt + 1}):`, error)
      
      // Don't retry on validation errors or authentication errors
      if (error.code === 'P2002' || // Unique constraint
          error.code === 'P2025' || // Record not found
          error.message?.includes('Invalid or expired')) {
        break
      }
      
      // Retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(500 * Math.pow(2, attempt), 3000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }
  
  throw lastError
}

/**
 * Execute raw SQL with proper error handling
 */
export async function executeRawSQL<T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    const result = await client.query(query, params)
    return result.rows
  } finally {
    client.release()
  }
}

/**
 * Transaction wrapper for complex operations
 */
export async function withTransaction<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback, {
    timeout: 30000,
    isolationLevel: 'ReadCommitted',
  })
}

/**
 * Graceful shutdown
 */
export async function closeDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    if (globalPool) {
      await globalPool.end()
      globalPool = null
    }
  } catch (error) {
    console.error('Error closing database connections:', error)
  }
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    closeDatabase().catch(console.error)
  })
  
  process.on('SIGINT', () => {
    closeDatabase().then(() => process.exit(0)).catch(() => process.exit(1))
  })
  
  process.on('SIGTERM', () => {
    closeDatabase().then(() => process.exit(0)).catch(() => process.exit(1))
  })
} 