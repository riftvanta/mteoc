import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

interface OrderFilters {
  search?: string
  status?: string
  type?: string
  exchange?: string
  dateFrom?: string
  dateTo?: string
  urgent?: string
}

async function getAdminOrders(filters: OrderFilters = {}, limit: number = 50, offset: number = 0) {
  console.log('Getting admin orders with filters:', filters)
  
  // Build dynamic WHERE clause
  const whereConditions: string[] = []
  const queryParams: (string | number)[] = []
  let paramIndex = 1

  // Search filter (order number or exchange name)
  if (filters.search) {
    whereConditions.push(`(o."order_number" ILIKE $${paramIndex} OR e."name" ILIKE $${paramIndex + 1})`)
    queryParams.push(`%${filters.search}%`, `%${filters.search}%`)
    paramIndex += 2
  }

  // Status filter
  if (filters.status) {
    whereConditions.push(`o."status" = $${paramIndex}`)
    queryParams.push(filters.status)
    paramIndex++
  }

  // Type filter
  if (filters.type) {
    whereConditions.push(`o."type" = $${paramIndex}`)
    queryParams.push(filters.type)
    paramIndex++
  }

  // Exchange filter
  if (filters.exchange) {
    whereConditions.push(`o."exchange_id" = $${paramIndex}`)
    queryParams.push(filters.exchange)
    paramIndex++
  }

  // Date range filters
  if (filters.dateFrom) {
    whereConditions.push(`o."created_at" >= $${paramIndex}`)
    queryParams.push(filters.dateFrom)
    paramIndex++
  }

  if (filters.dateTo) {
    whereConditions.push(`o."created_at" <= $${paramIndex}`)
    queryParams.push(filters.dateTo)
    paramIndex++
  }

  // Urgent filter (orders older than 2 hours in submitted status)
  if (filters.urgent === 'true') {
    const urgentCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    whereConditions.push(`(o."status" = 'SUBMITTED' AND o."created_at" < $${paramIndex})`)
    queryParams.push(urgentCutoff.toISOString())
    paramIndex++
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

  // Get orders with pagination
  const ordersQuery = `
    SELECT 
      o."id",
      o."order_number",
      o."type",
      o."status",
      o."amount",
      o."commission",
      o."net_amount",
      o."created_at",
      o."updated_at",
      o."approved_at",
      o."completed_at",
      o."sender_name",
      o."recipient_name",
      o."bank_name",
      o."cliq_bank_alias_name",
      o."cliq_mobile_number",
      o."payment_proof_url",
      o."completion_proof_url",
      o."rejection_reason",
      o."cancellation_requested",
      o."exchange_id",
      e."name" as exchange_name
    FROM "orders" o
    JOIN "exchanges" e ON o."exchange_id" = e."id"
    ${whereClause}
    ORDER BY o."created_at" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `

  queryParams.push(limit, offset)

  const orders = await directDb.query<{
    id: string
    order_number: string
    type: string
    status: string
    amount: string
    commission: string
    net_amount: string
    created_at: Date
    updated_at: Date
    approved_at: Date | null
    completed_at: Date | null
    sender_name: string | null
    recipient_name: string | null
    bank_name: string | null
    cliq_bank_alias_name: string | null
    cliq_mobile_number: string | null
    payment_proof_url: string | null
    completion_proof_url: string | null
    rejection_reason: string | null
    cancellation_requested: boolean
    exchange_id: string
    exchange_name: string
  }>(ordersQuery, queryParams)

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM "orders" o
    JOIN "exchanges" e ON o."exchange_id" = e."id"
    ${whereClause}
  `
  
  const countParams = queryParams.slice(0, -2) // Remove limit and offset
  const [{ total }] = await directDb.query<{ total: string }>(countQuery, countParams)

  // Get message counts for unread indicators if we have orders
  let messageCountMap: Record<string, number> = {}
  if (orders.length > 0) {
    const orderIds = orders.map(order => order.id)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const messageCounts = await directDb.query<{
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
  const result = orders.map(order => {
    const amount = Number(order.amount)
    const commission = Number(order.commission)
    const netAmount = Number(order.net_amount)

    // Check if order is urgent (submitted > 2 hours ago)
    const isUrgent = order.status === 'SUBMITTED' && 
                    new Date().getTime() - new Date(order.created_at).getTime() > 2 * 60 * 60 * 1000

    return {
      id: order.id,
      orderNumber: order.order_number,
      type: order.type as 'INCOMING' | 'OUTGOING',
      status: order.status,
      amount,
      commission,
      netAmount,
      exchangeName: order.exchange_name,
      exchangeId: order.exchange_id,
      senderName: order.sender_name,
      recipientName: order.recipient_name,
      bankName: order.bank_name,
      cliqBankAliasName: order.cliq_bank_alias_name,
      cliqMobileNumber: order.cliq_mobile_number,
      paymentProofUrl: order.payment_proof_url,
      completionProofUrl: order.completion_proof_url,
      rejectionReason: order.rejection_reason,
      cancellationRequested: order.cancellation_requested,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      approvedAt: order.approved_at?.toISOString(),
      completedAt: order.completed_at?.toISOString(),
      urgent: isUrgent,
      hasUnreadMessages: (messageCountMap[order.id] || 0) > 0
    }
  })

  console.log('Admin orders processed:', result.length, 'orders, total:', total)
  
  return {
    orders: result,
    total: Number(total),
    limit,
    offset,
    hasMore: Number(total) > offset + limit
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract filters
    const filters: OrderFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      exchange: searchParams.get('exchange') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      urgent: searchParams.get('urgent') || undefined,
    }

    // Extract pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Cap at 100
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const offset = (page - 1) * limit

    // Get admin orders
    const result = await getAdminOrders(filters, limit, offset)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30',
      }
    })

  } catch (error) {
    console.error('Admin orders API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch admin orders',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 