import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'
import { isValidStatusTransition } from '@/utils/validation'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

interface CancelOrderBody {
  action: 'approve' | 'reject'
  reason?: string // Required for rejection, optional for approval
}

async function handleCancellationRequest(orderId: string, action: 'approve' | 'reject', reason?: string) {
  console.log('Handling cancellation request:', orderId, action, reason)
  
  // Start transaction
  await directDb.query('BEGIN')
  
  try {
    // Get current order details
    const [order] = await directDb.query<{
      id: string
      order_number: string
      type: string
      status: string
      amount: string
      commission: string
      exchange_id: string
      exchange_name: string
      exchange_balance: string
      cancellation_requested: boolean
    }>(`
      SELECT 
        o."id",
        o."order_number",
        o."type",
        o."status",
        o."amount",
        o."commission",
        o."exchange_id",
        e."name" as exchange_name,
        e."balance" as exchange_balance,
        o."cancellation_requested"
      FROM "orders" o
      JOIN "exchanges" e ON o."exchange_id" = e."id"
      WHERE o."id" = $1
      FOR UPDATE
    `, [orderId])

    if (!order) {
      throw new Error('Order not found')
    }

    // Validate that cancellation was actually requested
    if (!order.cancellation_requested) {
      throw new Error('No cancellation request found for this order')
    }

    const amount = Number(order.amount)
    const commission = Number(order.commission)
    const currentBalance = Number(order.exchange_balance)

    if (action === 'approve') {
      // Validate status transition to CANCELLED
      if (!isValidStatusTransition(order.status, 'CANCELLED')) {
        throw new Error(`Cannot cancel order with status: ${order.status}`)
      }

      let newBalance = currentBalance
      let balanceRestored = false

      // For outgoing transfers, restore balance if it was deducted
      if (order.type === 'OUTGOING' && order.status === 'PROCESSING') {
        newBalance = currentBalance + amount + commission
        
        await directDb.query(`
          UPDATE "exchanges"
          SET 
            "balance" = $1,
            "updated_at" = NOW()
          WHERE "id" = $2
        `, [newBalance, order.exchange_id])

        balanceRestored = true
        console.log(`Balance restored for cancelled outgoing order ${order.order_number}: ${currentBalance} -> ${newBalance}`)
      }

      // Update order status to CANCELLED
      await directDb.query(`
        UPDATE "orders" 
        SET 
          "status" = 'CANCELLED',
          "cancellation_reason" = $1,
          "cancellation_requested" = false,
          "updated_at" = NOW()
        WHERE "id" = $2
      `, [reason || 'Cancellation approved by admin', orderId])

      await directDb.query('COMMIT')

      return {
        success: true,
        action: 'approved',
        message: `Order ${order.order_number} cancellation approved`,
        orderNumber: order.order_number,
        exchangeName: order.exchange_name,
        reason: reason || 'Cancellation approved by admin',
        balanceRestored,
        oldBalance: currentBalance,
        newBalance
      }

    } else { // action === 'reject'
      if (!reason) {
        throw new Error('Rejection reason is required')
      }

      // Clear cancellation request but keep order in current status
      await directDb.query(`
        UPDATE "orders" 
        SET 
          "cancellation_requested" = false,
          "updated_at" = NOW()
        WHERE "id" = $1
      `, [orderId])

      await directDb.query('COMMIT')

      return {
        success: true,
        action: 'rejected',
        message: `Order ${order.order_number} cancellation request rejected`,
        orderNumber: order.order_number,
        exchangeName: order.exchange_name,
        reason,
        balanceRestored: false,
        oldBalance: currentBalance,
        newBalance: currentBalance
      }
    }

  } catch (error) {
    await directDb.query('ROLLBACK')
    throw error
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orderId } = await context.params

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const body: CancelOrderBody = await request.json()

    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (body.action === 'reject' && (!body.reason || body.reason.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting cancellation' },
        { status: 400 }
      )
    }

    if (body.reason && body.reason.length > 500) {
      return NextResponse.json(
        { error: 'Reason is too long (max 500 characters)' },
        { status: 400 }
      )
    }

    const result = await handleCancellationRequest(
      orderId, 
      body.action, 
      body.reason?.trim()
    )

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache',
      }
    })

  } catch (error) {
    console.error('Cancellation handling API error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('No cancellation request found') ||
          error.message.includes('Cannot cancel order') ||
          error.message.includes('Rejection reason is required')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to handle cancellation request',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 