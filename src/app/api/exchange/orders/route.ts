import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

async function getExchangeOrders(exchangeId: string, limit?: number) {
  console.log('Getting exchange orders for:', exchangeId, 'limit:', limit)
  
  // Build query with optional limit
  let query = `
    SELECT 
      o."id",
      o."order_number",
      o."type",
      o."status",
      o."amount",
      o."commission",
      o."created_at",
      o."sender_name",
      o."recipient_name",
      o."bank_name",
      o."payment_proof_url",
      o."completion_proof_url"
    FROM "orders" o
    WHERE o."exchange_id" = $1
    ORDER BY o."created_at" DESC
  `
  
  const params = [exchangeId]
  if (limit) {
    query += ` LIMIT $2`
    params.push(limit.toString())
  }

  const orders = await directDb.query<{
    id: string
    order_number: string
    type: string
    status: string
    amount: string
    commission: string
    created_at: Date
    sender_name: string | null
    recipient_name: string | null
    bank_name: string | null
    payment_proof_url: string | null
    completion_proof_url: string | null
  }>(query, params)

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

  // Transform the data and calculate permissions
  const result = orders.map(order => {
    const amount = Number(order.amount)
    const commission = Number(order.commission)
    const netAmount = order.type === 'INCOMING' 
      ? amount - commission 
      : amount + commission

    // Determine permissions based on status
    const canEdit = ['SUBMITTED', 'PENDING_REVIEW'].includes(order.status)
    const canCancel = ['SUBMITTED', 'PENDING_REVIEW', 'PROCESSING'].includes(order.status)
    const canDownload = order.status === 'COMPLETED' && 
                       order.type === 'OUTGOING' && 
                       !!order.completion_proof_url

    return {
      id: order.id,
      orderNumber: order.order_number,
      type: order.type as 'INCOMING' | 'OUTGOING',
      status: order.status,
      amount,
      commission,
      netAmount,
      createdAt: order.created_at.toISOString(),
      canEdit,
      canCancel,
      canDownload,
      hasUnreadMessages: (messageCountMap[order.id] || 0) > 0,
      senderName: order.sender_name,
      recipientName: order.recipient_name,
      bankName: order.bank_name,
      paymentProofUrl: order.payment_proof_url,
      completionProofUrl: order.completion_proof_url
    }
  })

  console.log('Exchange orders processed:', result.length, 'orders')
  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exchangeId = searchParams.get('exchangeId')
    const limitParam = searchParams.get('limit')

    if (!exchangeId) {
      return NextResponse.json(
        { error: 'Exchange ID is required' },
        { status: 400 }
      )
    }

    const limit = limitParam ? parseInt(limitParam) : undefined

    // Get exchange orders
    const orders = await getExchangeOrders(exchangeId, limit)

    return NextResponse.json(orders, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30',
      }
    })

  } catch (error) {
    console.error('Exchange orders API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange orders',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 