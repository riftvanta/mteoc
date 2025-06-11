import { Pool, PoolConfig } from 'pg'

// For Supabase connections, we need to disable TLS certificate verification
// due to self-signed certificates in their certificate chain
if (process.env.POSTGRES_URL_NON_POOLING?.includes('supabase.com') || 
    process.env.POSTGRES_PRISMA_URL?.includes('supabase.com') ||
    process.env.DATABASE_URL?.includes('supabase.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

// Create a direct PostgreSQL connection pool that bypasses Prisma entirely
// Use the non-pooling URL first, then fall back to the pooled URL
const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                         process.env.POSTGRES_PRISMA_URL || 
                         process.env.DATABASE_URL

if (!connectionString) {
  console.warn('No database connection string found. Available env vars:', {
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    DATABASE_URL: !!process.env.DATABASE_URL
  })
}

const poolConfig: PoolConfig = {
  connectionString,
  // SSL configuration for Supabase (disabled for localhost)
  ssl: connectionString?.includes('localhost') ? false : {
    rejectUnauthorized: false
  },
  max: 3, // Keep pool small to avoid connection issues
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Disable prepared statements completely
  statement_timeout: 30000,
}

const pool = new Pool(poolConfig)

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

// Export direct database operations that completely bypass Prisma
export const directDb = {
  async query<T>(text: string, params?: any[]): Promise<T[]> {
    console.log('Executing query:', text.substring(0, 100), params ? `with ${params.length} params` : 'no params')
    
    const client = await pool.connect()
    try {
      const result = await client.query(text, params)
      console.log('Query successful, returned', result.rows.length, 'rows')
      return result.rows as T[]
    } catch (error) {
      console.error('Query failed:', error)
      throw error
    } finally {
      client.release()
    }
  },

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing database connection...')
      const result = await this.query<{test: number}>('SELECT 1 as test')
      console.log('Connection test successful:', result)
      return result.length > 0 && result[0].test === 1
    } catch (error) {
      console.error('Direct DB connection test failed:', error)
      return false
    }
  },

  // Dashboard-specific queries
  async getDashboardStats() {
    console.log('Getting dashboard stats...')
    
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfLastWeek = new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate())

    // Execute all queries sequentially to avoid any conflicts
    const [totalOrders] = await this.query<{count: string}>('SELECT COUNT(*) as count FROM "orders"')
    
    const [totalOrdersLastWeek] = await this.query<{count: string}>(
      'SELECT COUNT(*) as count FROM "orders" WHERE "created_at" <= $1',
      [startOfLastWeek.toISOString()]
    )

    const [pendingOrders] = await this.query<{count: string}>(
      `SELECT COUNT(*) as count FROM "orders" WHERE "status" IN ('SUBMITTED', 'PENDING_REVIEW')`
    )

    const [pendingOrdersLastWeek] = await this.query<{count: string}>(
      `SELECT COUNT(*) as count FROM "orders" WHERE "status" IN ('SUBMITTED', 'PENDING_REVIEW') AND "created_at" <= $1`,
      [startOfLastWeek.toISOString()]
    )

    const [completedOrders] = await this.query<{count: string}>(
      `SELECT COUNT(*) as count FROM "orders" WHERE "status" = 'COMPLETED'`
    )

    const [completedOrdersLastWeek] = await this.query<{count: string}>(
      `SELECT COUNT(*) as count FROM "orders" WHERE "status" = 'COMPLETED' AND "completed_at" <= $1`,
      [startOfLastWeek.toISOString()]
    )

    const [totalExchanges] = await this.query<{count: string}>('SELECT COUNT(*) as count FROM "exchanges"')

    const [totalExchangesLastWeek] = await this.query<{count: string}>(
      'SELECT COUNT(*) as count FROM "exchanges" WHERE "created_at" <= $1',
      [startOfLastWeek.toISOString()]
    )

    const [todayVolume] = await this.query<{sum: string | null}>(
      `SELECT SUM("amount") as sum FROM "orders" WHERE "created_at" >= $1 AND "created_at" < $2 AND "status" != 'REJECTED'`,
      [startOfToday.toISOString(), endOfToday.toISOString()]
    )

    const [lastWeekVolume] = await this.query<{sum: string | null}>(
      `SELECT SUM("amount") as sum FROM "orders" WHERE "created_at" >= $1 AND "created_at" < $2 AND "status" != 'REJECTED'`,
      [startOfLastWeek.toISOString(), startOfToday.toISOString()]
    )

    const [totalVolume] = await this.query<{sum: string | null}>(
      `SELECT SUM("amount") as sum FROM "orders" WHERE "status" != 'REJECTED'`
    )

    const avgProcessingTimeRows = await this.query<{approved_at: Date, completed_at: Date}>(
      `SELECT "approved_at", "completed_at" FROM "orders" WHERE "status" = 'COMPLETED' AND "approved_at" IS NOT NULL AND "completed_at" IS NOT NULL ORDER BY "completed_at" DESC LIMIT 100`
    )

    // Calculate average processing time
    let avgTime = 0
    if (avgProcessingTimeRows.length > 0) {
      const totalTime = avgProcessingTimeRows.reduce((acc, order) => {
        if (order.approved_at && order.completed_at) {
          const diff = new Date(order.completed_at).getTime() - new Date(order.approved_at).getTime()
          return acc + diff
        }
        return acc
      }, 0)
      avgTime = totalTime / avgProcessingTimeRows.length / (1000 * 60 * 60) // Convert to hours
    }

    // Calculate percentage changes
    const totalOrdersNum = Number(totalOrders.count || 0)
    const totalOrdersLastWeekNum = Number(totalOrdersLastWeek.count || 0)
    const pendingOrdersNum = Number(pendingOrders.count || 0)
    const pendingOrdersLastWeekNum = Number(pendingOrdersLastWeek.count || 0)
    const completedOrdersNum = Number(completedOrders.count || 0)
    const completedOrdersLastWeekNum = Number(completedOrdersLastWeek.count || 0)
    const totalExchangesNum = Number(totalExchanges.count || 0)
    const totalExchangesLastWeekNum = Number(totalExchangesLastWeek.count || 0)
    const todayVolumeNum = Number(todayVolume.sum || 0)
    const lastWeekVolumeNum = Number(lastWeekVolume.sum || 0)
    const totalVolumeNum = Number(totalVolume.sum || 0)

    const totalOrdersChange = totalOrdersLastWeekNum > 0 
      ? ((totalOrdersNum - totalOrdersLastWeekNum) / totalOrdersLastWeekNum * 100) 
      : 0

    const pendingOrdersChange = pendingOrdersLastWeekNum > 0 
      ? ((pendingOrdersNum - pendingOrdersLastWeekNum) / pendingOrdersLastWeekNum * 100) 
      : 0

    const completedOrdersChange = completedOrdersLastWeekNum > 0 
      ? ((completedOrdersNum - completedOrdersLastWeekNum) / completedOrdersLastWeekNum * 100) 
      : 0

    const exchangesChange = totalExchangesLastWeekNum > 0 
      ? ((totalExchangesNum - totalExchangesLastWeekNum) / totalExchangesLastWeekNum * 100) 
      : 0

    const volumeChange = lastWeekVolumeNum > 0
      ? ((todayVolumeNum - lastWeekVolumeNum) / lastWeekVolumeNum * 100)
      : 0

    // Determine system health
    let systemHealth: 'good' | 'warning' | 'critical' = 'good'
    if (pendingOrdersNum > 50 || avgTime > 24) {
      systemHealth = 'warning'
    }
    if (pendingOrdersNum > 100 || avgTime > 48) {
      systemHealth = 'critical'
    }

    const result = {
      totalOrders: totalOrdersNum,
      totalOrdersChange: Math.round(totalOrdersChange * 100) / 100,
      pendingOrders: pendingOrdersNum,
      pendingOrdersChange: Math.round(pendingOrdersChange * 100) / 100,
      completedOrders: completedOrdersNum,
      completedOrdersChange: Math.round(completedOrdersChange * 100) / 100,
      totalExchanges: totalExchangesNum,
      exchangesChange: Math.round(exchangesChange * 100) / 100,
      totalVolume: totalVolumeNum,
      todayVolume: todayVolumeNum,
      volumeChange: Math.round(volumeChange * 100) / 100,
      avgProcessingTime: Math.round(avgTime * 100) / 100,
      systemHealth
    }

    console.log('Dashboard stats calculated:', result)
    return result
  },

  async getRecentOrders(limit: number = 5) {
    console.log('Getting recent orders, limit:', limit)
    
    const recentOrders = await this.query<{
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
    }>(`
      SELECT 
        o."id",
        o."order_number",
        o."type",
        o."status",
        o."amount",
        e."name" as exchange_name,
        e."id" as exchange_id,
        o."created_at",
        o."sender_name",
        o."recipient_name",
        o."bank_name"
      FROM "orders" o
      JOIN "exchanges" e ON o."exchange_id" = e."id"
      ORDER BY o."created_at" DESC
      LIMIT $1
    `, [limit])

    // Get message counts if we have orders
    let messageCountMap: Record<string, number> = {}
    if (recentOrders.length > 0) {
      const orderIds = recentOrders.map(order => order.id)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const messageCounts = await this.query<{
        order_id: string
        message_count: string
      }>(`
        SELECT 
          "order_id",
          COUNT(*) as message_count
        FROM "order_messages"
        WHERE "order_id" = ANY($1)
          AND "created_at" >= $2
        GROUP BY "order_id"
      `, [orderIds, yesterday.toISOString()])

      messageCountMap = messageCounts.reduce((acc, item) => {
        acc[item.order_id] = Number(item.message_count)
        return acc
      }, {} as Record<string, number>)
    }

    // Transform the data
    const result = recentOrders.map(order => ({
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
      hasUnreadMessages: (messageCountMap[order.id] || 0) > 0,
      senderName: order.sender_name,
      recipientName: order.recipient_name,
      bankName: order.bank_name
    }))

    console.log('Recent orders processed:', result.length, 'orders')
    return result
  }
}

// Cleanup pool on process exit
process.on('beforeExit', () => {
  console.log('Closing database connection pool...')
  pool.end()
}) 