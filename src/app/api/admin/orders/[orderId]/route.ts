import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

async function getAdminOrderDetails(orderId: string) {
  console.log('Getting admin order details for:', orderId)
  
  // Get order details
  const [order] = await directDb.query<{
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
    cancellation_reason: string | null
    cancellation_requested: boolean
    exchange_id: string
    exchange_name: string
    exchange_username: string
    exchange_balance: string
    exchange_contact_email: string | null
    exchange_contact_phone: string | null
  }>(`
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
      o."cancellation_reason",
      o."cancellation_requested",
      o."exchange_id",
      e."name" as exchange_name,
      u."username" as exchange_username,
      e."balance" as exchange_balance,
      e."contactEmail" as exchange_contact_email,
      e."contactPhone" as exchange_contact_phone
    FROM "orders" o
    JOIN "exchanges" e ON o."exchange_id" = e."id"
    JOIN "users" u ON e."user_id" = u."id"
    WHERE o."id" = $1
  `, [orderId])

  if (!order) {
    throw new Error('Order not found')
  }

  // Get recent messages for this order
  const messages = await directDb.query<{
    id: string
    content: string
    sender_role: string
    sender_username: string
    created_at: Date
  }>(`
    SELECT 
      om."id",
      om."content",
      u."role" as sender_role,
      u."username" as sender_username,
      om."created_at"
    FROM "order_messages" om
    JOIN "users" u ON om."sender_id" = u."id"
    WHERE om."order_id" = $1
    ORDER BY om."created_at" ASC
    LIMIT 50
  `, [orderId])

  // Get exchange commission settings
  const [exchangeSettings] = await directDb.query<{
    incoming_commission_type: string
    incoming_commission_value: string
    outgoing_commission_type: string
    outgoing_commission_value: string
    allowed_incoming_banks: string[]
    allowed_outgoing_banks: string[]
  }>(`
    SELECT 
      e."incoming_commission_type",
      e."incoming_commission_value",
      e."outgoing_commission_type", 
      e."outgoing_commission_value",
      e."allowed_incoming_banks",
      e."allowed_outgoing_banks"
    FROM "exchanges" e
    WHERE e."id" = $1
  `, [order.exchange_id])

  // Transform the data
  const amount = Number(order.amount)
  const commission = Number(order.commission)
  const netAmount = Number(order.net_amount)
  const exchangeBalance = Number(order.exchange_balance)

  // Determine available actions based on status
  const canApprove = ['SUBMITTED', 'PENDING_REVIEW'].includes(order.status)
  const canReject = ['SUBMITTED', 'PENDING_REVIEW'].includes(order.status)
  const canComplete = order.status === 'PROCESSING'
  const canUploadProof = order.status === 'PROCESSING' && order.type === 'OUTGOING'
  const canHandleCancellation = order.status === 'PROCESSING' && order.cancellation_requested

  // Check if order is urgent (submitted > 2 hours ago)
  const isUrgent = order.status === 'SUBMITTED' && 
                  new Date().getTime() - new Date(order.created_at).getTime() > 2 * 60 * 60 * 1000

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
    approvedAt: order.approved_at?.toISOString(),
    completedAt: order.completed_at?.toISOString(),
    urgent: isUrgent,
    
    // Order details
    senderName: order.sender_name,
    recipientName: order.recipient_name,
    bankName: order.bank_name,
    cliqBankAliasName: order.cliq_bank_alias_name,
    cliqMobileNumber: order.cliq_mobile_number,
    paymentProofUrl: order.payment_proof_url,
    completionProofUrl: order.completion_proof_url,
    rejectionReason: order.rejection_reason,
    cancellationReason: order.cancellation_reason,
    cancellationRequested: order.cancellation_requested,
    
    // Exchange information
    exchange: {
      id: order.exchange_id,
      name: order.exchange_name,
      username: order.exchange_username,
      balance: exchangeBalance,
      contactEmail: order.exchange_contact_email,
      contactPhone: order.exchange_contact_phone,
      commissionSettings: {
        incoming: {
          type: exchangeSettings.incoming_commission_type,
          value: Number(exchangeSettings.incoming_commission_value)
        },
        outgoing: {
          type: exchangeSettings.outgoing_commission_type,
          value: Number(exchangeSettings.outgoing_commission_value)
        }
      },
      allowedBanks: {
        incoming: exchangeSettings.allowed_incoming_banks,
        outgoing: exchangeSettings.allowed_outgoing_banks
      }
    },
    
    // Available actions
    actions: {
      canApprove,
      canReject,
      canComplete,
      canUploadProof,
      canHandleCancellation
    },
    
    // Messages
    messages: messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderType: msg.sender_role,
      senderUsername: msg.sender_username,
      createdAt: msg.created_at.toISOString()
    }))
  }

  console.log('Admin order details processed for order:', orderId)
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
    const orderDetails = await getAdminOrderDetails(orderId)

    return NextResponse.json(orderDetails, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, s-maxage=60',
      }
    })

  } catch (error) {
    console.error('Admin order details API error:', error)
    
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