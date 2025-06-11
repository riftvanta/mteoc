import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

async function getExchangeOrderDetails(orderId: string) {
  console.log('Getting exchange order details for:', orderId)
  
  // Get order details
  const [order] = await directDb.query<{
    id: string
    order_number: string
    type: string
    status: string
    amount: string
    commission: string
    created_at: Date
    updated_at: Date
    sender_name: string | null
    recipient_name: string | null
    bank_name: string | null
    cliq_bank_alias_name: string | null
    cliq_bank_alias_mobile: string | null
    payment_proof_url: string | null
    completion_proof_url: string | null
    rejection_reason: string | null
    exchange_id: string
    exchange_name: string
  }>(`
    SELECT 
      o."id",
      o."order_number",
      o."type",
      o."status",
      o."amount",
      o."commission",
      o."created_at",
      o."updated_at",
      o."sender_name",
      o."recipient_name",
      o."bank_name",
      o."cliq_bank_alias_name",
      o."cliq_bank_alias_mobile",
      o."payment_proof_url",
      o."completion_proof_url",
      o."rejection_reason",
      o."exchange_id",
      e."name" as exchange_name
    FROM "orders" o
    JOIN "exchanges" e ON o."exchange_id" = e."id"
    WHERE o."id" = $1
  `, [orderId])

  if (!order) {
    throw new Error('Order not found')
  }

  // Get recent messages for this order
  const messages = await directDb.query<{
    id: string
    content: string
    sender_type: string
    created_at: Date
  }>(`
    SELECT 
      "id",
      "content",
      "sender_type",
      "created_at"
    FROM "order_messages"
    WHERE "order_id" = $1
    ORDER BY "created_at" DESC
    LIMIT 20
  `, [orderId])

  // Transform the data
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

  const result = {
    id: order.id,
    orderNumber: order.order_number,
    type: order.type as 'INCOMING' | 'OUTGOING',
    status: order.status,
    amount,
    commission,
    netAmount,
    createdAt: order.created_at.toISOString(),
    updatedAt: order.updated_at.toISOString(),
    canEdit,
    canCancel,
    canDownload,
    senderName: order.sender_name,
    recipientName: order.recipient_name,
    bankName: order.bank_name,
    cliqBankAliasName: order.cliq_bank_alias_name,
    cliqBankAliasMobile: order.cliq_bank_alias_mobile,
    paymentProofUrl: order.payment_proof_url,
    completionProofUrl: order.completion_proof_url,
    rejectionReason: order.rejection_reason,
    exchangeId: order.exchange_id,
    exchangeName: order.exchange_name,
    messages: messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderType: msg.sender_type,
      createdAt: msg.created_at.toISOString()
    }))
  }

  console.log('Exchange order details processed for order:', orderId)
  return result
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orderId } = await context.params

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get order details
    const orderDetails = await getExchangeOrderDetails(orderId)

    return NextResponse.json(orderDetails, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, s-maxage=60',
      }
    })

  } catch (error) {
    console.error('Exchange order details API error:', error)
    
    if (error instanceof Error && error.message === 'Order not found') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch order details',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 