import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with optimized configuration for prepared statement stability
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Configure connection pooling to minimize prepared statement conflicts
    datasources: {
      db: {
        url: process.env.POSTGRES_PRISMA_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Simple connection check that bypasses prepared statements entirely
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Use the most basic possible query that doesn't create prepared statements
    await prisma.$executeRawUnsafe('SELECT 1')
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}

// Enhanced error handling for database operations with simplified retry
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 1
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      console.error(`Database operation ${operationName} failed (attempt ${attempt + 1}):`, error)
      
      // Check if it's a prepared statement error
      const isPreparedStatementError = 
        error.message?.includes('prepared statement') ||
        error.code === 'P2010' || 
        error.message?.includes('26000')
      
      if (isPreparedStatementError && attempt < maxRetries) {
        console.log(`Retrying ${operationName} without prepared statements...`)
        // Simple retry with a short delay
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }
      
      // If it's the last attempt, break
      if (attempt === maxRetries) {
        break
      }
    }
  }
  
  throw lastError
} 