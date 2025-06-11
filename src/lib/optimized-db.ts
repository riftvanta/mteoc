/**
 * Optimized database client with connection pooling, caching, and performance monitoring
 * Combines the best of Prisma and direct SQL for optimal performance
 */

import { Pool, PoolConfig, QueryResult } from 'pg'
import { PrismaClient } from '@prisma/client'
import { cacheManager, cacheKeys, cacheTags } from './cache'
import { measureAsync } from './performance'

// For Supabase connections, we need to disable TLS certificate verification
// due to self-signed certificates in their certificate chain
const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                         process.env.POSTGRES_PRISMA_URL || 
                         process.env.DATABASE_URL

if (connectionString?.includes('supabase.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  console.log('SSL certificate verification disabled for Supabase connection')
}

// Database configuration optimized for performance
const getDatabaseConfig = (): PoolConfig => {
  if (!connectionString) {
    throw new Error('No database connection string found')
  }

  const isSupabase = connectionString.includes('supabase.com')
  const isLocalhost = connectionString.includes('localhost')

  return {
    connectionString,
    // Optimized connection pool settings
    max: process.env.NODE_ENV === 'production' ? 10 : 5,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    
    // Enhanced SSL configuration for different environments
    ssl: isLocalhost ? false : {
      rejectUnauthorized: false, // Always false for hosted databases
      ca: undefined, // Don't specify CA for flexibility
      checkServerIdentity: () => undefined, // Disable server identity check
    },
    
    // Connection optimization
    application_name: 'financial-transfer-app',
  }
}

// Global optimized pool instance
let globalPool: Pool | null = null

const getPool = (): Pool => {
  if (!globalPool) {
    globalPool = new Pool(getDatabaseConfig())
    
    // Enhanced error handling
    globalPool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
    
    globalPool.on('connect', (client) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('New database client connected')
      }
    })
    
    globalPool.on('remove', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Database client removed from pool')
      }
    })
  }
  
  return globalPool
}

// Optimized Prisma client with better configuration
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const optimizedPrisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.POSTGRES_PRISMA_URL,
    },
  },
  // Performance optimizations
  errorFormat: 'minimal',
  // Connection pooling configuration
  transactionOptions: {
    timeout: 30000,
    isolationLevel: 'ReadCommitted',
  },
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = optimizedPrisma
}

// Database indexes optimization function
export const ensureOptimalIndexes = async (): Promise<void> => {
  const pool = getPool()
  
  const indexQueries = [
    // Orders performance indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created_at 
     ON orders(status, created_at DESC) WHERE status IN ('SUBMITTED', 'PENDING_REVIEW')`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_exchange_status 
     ON orders(exchange_id, status, created_at DESC)`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_completed_at 
     ON orders(completed_at DESC) WHERE status = 'COMPLETED'`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_amount 
     ON orders(amount) WHERE status != 'REJECTED'`,
    
    // Order messages performance indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_messages_order_created 
     ON order_messages(order_id, created_at DESC)`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_messages_recent 
     ON order_messages(created_at DESC) WHERE created_at >= NOW() - INTERVAL '24 hours'`,
    
    // Exchanges performance indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exchanges_user_id 
     ON exchanges(user_id)`,
    
    // Users performance indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_role 
     ON users(username, role)`,
    
    // Composite indexes for analytics
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_analytics 
     ON orders(created_at, status, amount) WHERE status != 'REJECTED'`,
  ]
  
  for (const query of indexQueries) {
    try {
      await pool.query(query)
      console.log('Index created successfully:', query.split('idx_')[1]?.split(' ')[0])
    } catch (error: any) {
      // Ignore if index already exists
      if (!error.message?.includes('already exists')) {
        console.warn('Failed to create index:', error.message)
      }
    }
  }
}

// Query performance monitoring
class QueryMonitor {
  private static queries: Array<{
    query: string
    duration: number
    timestamp: number
    cached: boolean
  }> = []
  
  static record(query: string, duration: number, cached: boolean = false) {
    this.queries.push({
      query: query.substring(0, 100),
      duration,
      timestamp: Date.now(),
      cached
    })
    
    // Keep only last 100 queries
    if (this.queries.length > 100) {
      this.queries.shift()
    }
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000 && !cached) {
      console.warn(`Slow query detected (${duration}ms):`, query.substring(0, 100))
    }
  }
  
  static getStats() {
    const total = this.queries.length
    const cached = this.queries.filter(q => q.cached).length
    const avgDuration = this.queries.reduce((sum, q) => sum + q.duration, 0) / total || 0
    const slowQueries = this.queries.filter(q => q.duration > 1000 && !q.cached).length
    
    return {
      totalQueries: total,
      cachedQueries: cached,
      cacheHitRate: total > 0 ? (cached / total) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      slowQueries,
      slowQueryRate: total > 0 ? (slowQueries / total) * 100 : 0
    }
  }
  
  static reset() {
    this.queries = []
  }
}

// Optimized database operations with caching
export class OptimizedDatabase {
  private pool: Pool
  
  constructor() {
    this.pool = getPool()
  }
  
  /**
   * Execute cached query with performance monitoring
   */
  async cachedQuery<T = any>(
    query: string,
    params: any[] = [],
    cacheKey?: string,
    ttl: number = 300
  ): Promise<T[]> {
    // Generate cache key if not provided
    const key = cacheKey || `query:${Buffer.from(query + JSON.stringify(params)).toString('base64').substring(0, 50)}`
    
    // Try cache first
    const cached = await cacheManager.get<T[]>(key)
    if (cached) {
      QueryMonitor.record(query, 0, true)
      return cached
    }
    
    // Execute query with performance monitoring
    const start = performance.now()
    const client = await this.pool.connect()
    try {
      const result = await client.query(query, params)
      const duration = performance.now() - start
      QueryMonitor.record(query, duration)
      
      // Cache result
      await cacheManager.set(key, result.rows, { ttl, tags: [cacheTags.DASHBOARD] })
      
      return result.rows as T[]
    } finally {
      client.release()
    }
  }
  
  /**
   * Get dashboard statistics with optimized queries and caching
   */
  async getDashboardStats() {
    return cacheManager.cached(
      async () => {
        const today = new Date()
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        // Execute optimized parallel queries
        const [
          totalOrdersResult,
          totalOrdersLastWeekResult,
          pendingOrdersResult,
          pendingOrdersLastWeekResult,
          completedOrdersResult,
          completedOrdersLastWeekResult,
          totalExchangesResult,
          totalExchangesLastWeekResult,
          todayVolumeResult,
          lastWeekVolumeResult,
          totalVolumeResult,
          avgProcessingTimeResult
        ] = await Promise.all([
          this.cachedQuery<{count: string}>('SELECT COUNT(*) as count FROM orders', [], 'stats:total_orders', 180),
          this.cachedQuery<{count: string}>('SELECT COUNT(*) as count FROM orders WHERE created_at <= $1', [lastWeek.toISOString()], 'stats:total_orders_last_week', 300),
          this.cachedQuery<{count: string}>(`SELECT COUNT(*) as count FROM orders WHERE status IN ('SUBMITTED', 'PENDING_REVIEW')`, [], 'stats:pending_orders', 60),
          this.cachedQuery<{count: string}>(`SELECT COUNT(*) as count FROM orders WHERE status IN ('SUBMITTED', 'PENDING_REVIEW') AND created_at <= $1`, [lastWeek.toISOString()], 'stats:pending_orders_last_week', 300),
          this.cachedQuery<{count: string}>(`SELECT COUNT(*) as count FROM orders WHERE status = 'COMPLETED'`, [], 'stats:completed_orders', 180),
          this.cachedQuery<{count: string}>(`SELECT COUNT(*) as count FROM orders WHERE status = 'COMPLETED' AND completed_at <= $1`, [lastWeek.toISOString()], 'stats:completed_orders_last_week', 300),
          this.cachedQuery<{count: string}>('SELECT COUNT(*) as count FROM exchanges', [], 'stats:total_exchanges', 600),
          this.cachedQuery<{count: string}>('SELECT COUNT(*) as count FROM exchanges WHERE created_at <= $1', [lastWeek.toISOString()], 'stats:total_exchanges_last_week', 600),
          this.cachedQuery<{sum: string}>(`SELECT COALESCE(SUM(amount), 0) as sum FROM orders WHERE created_at >= $1 AND status != 'REJECTED'`, [startOfToday.toISOString()], 'stats:today_volume', 300),
          this.cachedQuery<{sum: string}>(`SELECT COALESCE(SUM(amount), 0) as sum FROM orders WHERE created_at >= $1 AND created_at < $2 AND status != 'REJECTED'`, [lastWeek.toISOString(), startOfToday.toISOString()], 'stats:last_week_volume', 600),
          this.cachedQuery<{sum: string}>(`SELECT COALESCE(SUM(amount), 0) as sum FROM orders WHERE status != 'REJECTED'`, [], 'stats:total_volume', 300),
          this.cachedQuery<{approved_at: Date, completed_at: Date}>(`SELECT approved_at, completed_at FROM orders WHERE status = 'COMPLETED' AND approved_at IS NOT NULL AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 100`, [], 'stats:avg_processing_time', 600)
        ])
        
        // Calculate average processing time
        let avgTime = 0
        if (avgProcessingTimeResult.length > 0) {
          const totalTime = avgProcessingTimeResult.reduce((acc, order) => {
            if (order.approved_at && order.completed_at) {
              const diff = new Date(order.completed_at).getTime() - new Date(order.approved_at).getTime()
              return acc + diff
            }
            return acc
          }, 0)
          avgTime = totalTime / avgProcessingTimeResult.length / (1000 * 60 * 60) // Convert to hours
        }
        
        // Calculate metrics
        const metrics = {
          totalOrders: Number(totalOrdersResult[0]?.count || 0),
          totalOrdersLastWeek: Number(totalOrdersLastWeekResult[0]?.count || 0),
          pendingOrders: Number(pendingOrdersResult[0]?.count || 0),
          pendingOrdersLastWeek: Number(pendingOrdersLastWeekResult[0]?.count || 0),
          completedOrders: Number(completedOrdersResult[0]?.count || 0),
          completedOrdersLastWeek: Number(completedOrdersLastWeekResult[0]?.count || 0),
          totalExchanges: Number(totalExchangesResult[0]?.count || 0),
          totalExchangesLastWeek: Number(totalExchangesLastWeekResult[0]?.count || 0),
          todayVolume: Number(todayVolumeResult[0]?.sum || 0),
          lastWeekVolume: Number(lastWeekVolumeResult[0]?.sum || 0),
          totalVolume: Number(totalVolumeResult[0]?.sum || 0),
          avgProcessingTime: Math.round(avgTime * 100) / 100
        }
        
        // Calculate percentage changes
        const calculateChange = (current: number, previous: number) => 
          previous > 0 ? Math.round(((current - previous) / previous * 100) * 100) / 100 : 0
        
        return {
          totalOrders: metrics.totalOrders,
          totalOrdersChange: calculateChange(metrics.totalOrders, metrics.totalOrdersLastWeek),
          pendingOrders: metrics.pendingOrders,
          pendingOrdersChange: calculateChange(metrics.pendingOrders, metrics.pendingOrdersLastWeek),
          completedOrders: metrics.completedOrders,
          completedOrdersChange: calculateChange(metrics.completedOrders, metrics.completedOrdersLastWeek),
          totalExchanges: metrics.totalExchanges,
          exchangesChange: calculateChange(metrics.totalExchanges, metrics.totalExchangesLastWeek),
          totalVolume: metrics.totalVolume,
          todayVolume: metrics.todayVolume,
          volumeChange: calculateChange(metrics.todayVolume, metrics.lastWeekVolume),
          avgProcessingTime: metrics.avgProcessingTime,
          systemHealth: metrics.pendingOrders > 100 || metrics.avgProcessingTime > 48 ? 'critical' : 
                       metrics.pendingOrders > 50 || metrics.avgProcessingTime > 24 ? 'warning' : 'good'
        }
      },
      [cacheKeys.dashboardStats()],
      { ttl: 120, tags: [cacheTags.DASHBOARD, cacheTags.ORDERS] }
    )
  }
  
  /**
   * Get recent orders with optimized query and caching
   */
  async getRecentOrders(limit: number = 5) {
    return cacheManager.cached(
      async () => {
        // Optimized single query with JOINs
        const recentOrders = await this.cachedQuery<{
          id: string
          order_number: string
          type: string
          status: string
          amount: string
          exchange_name: string
          exchange_id: string
          created_at: Date
          sender_name: string | null
          recipient_name: string | null
          bank_name: string | null
          message_count: string
        }>(`
          SELECT 
            o.id,
            o.order_number,
            o.type,
            o.status,
            o.amount,
            e.name as exchange_name,
            e.id as exchange_id,
            o.created_at,
            o.sender_name,
            o.recipient_name,
            o.bank_name,
            COALESCE(msg.message_count, 0) as message_count
          FROM orders o
          JOIN exchanges e ON o.exchange_id = e.id
          LEFT JOIN (
            SELECT 
              order_id,
              COUNT(*) as message_count
            FROM order_messages
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY order_id
          ) msg ON o.id = msg.order_id
          ORDER BY o.created_at DESC
          LIMIT $1
        `, [limit], `recent_orders_${limit}`, 60)
        
        // Transform the data
        return recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.order_number,
          type: order.type,
          status: order.status,
          amount: Number(order.amount),
          exchangeName: order.exchange_name,
          exchangeId: order.exchange_id,
          createdAt: order.created_at.toISOString(),
          urgent: order.status === 'SUBMITTED' && 
                  new Date().getTime() - new Date(order.created_at).getTime() > 2 * 60 * 60 * 1000,
          hasUnreadMessages: Number(order.message_count) > 0,
          senderName: order.sender_name,
          recipientName: order.recipient_name,
          bankName: order.bank_name
        }))
      },
      [cacheKeys.recentOrders(limit)],
      { ttl: 60, tags: [cacheTags.ORDERS, cacheTags.DASHBOARD] }
    )
  }
  
  /**
   * Test database connection with health check
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.cachedQuery<{test: number}>('SELECT 1 as test', [], 'health_check', 30)
      return result.length > 0 && result[0].test === 1
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  }
  
  /**
   * Get query performance statistics
   */
  getPerformanceStats() {
    return QueryMonitor.getStats()
  }
  
  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (globalPool) {
      await globalPool.end()
      globalPool = null
    }
    await optimizedPrisma.$disconnect()
  }
}

// Global optimized database instance
export const optimizedDb = new OptimizedDatabase()

// Initialize database indexes on startup (but not during build)
if (process.env.NODE_ENV !== 'test' && process.env.NEXT_PHASE !== 'phase-production-build') {
  ensureOptimalIndexes().catch(console.warn)
}

// Cleanup on process exit
process.on('beforeExit', () => {
  optimizedDb.close().catch(console.error)
})

export { QueryMonitor } 