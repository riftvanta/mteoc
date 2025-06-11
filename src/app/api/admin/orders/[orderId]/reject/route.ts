import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'
import { isValidStatusTransition } from '@/utils/validation'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

interface RejectOrderBody {
  reason: string
}

async function rejectOrder(orderId: string, reason: string) {
  console.log('Rejecting order:', orderId, 'with reason:', reason)
  
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
        e."balance" as exchange_balance
      FROM "orders" o
      JOIN "exchanges" e ON o."exchange_id" = e."id"
      WHERE o."id" = $1
      FOR UPDATE
    `, [orderId])

    if (!order) {
      throw new Error('Order not found')
    }

    // Validate status transition
    if (!isValidStatusTransition(order.status, 'REJECTED')) {
      throw new Error(`Cannot reject order with status: ${order.status}`)
    }

    const amount = Number(order.amount)
    const commission = Number(order.commission)
    const currentBalance = Number(order.exchange_balance)

    // Update order status to REJECTED with reason
    await directDb.query(`
      UPDATE "orders" 
      SET 
        "status" = 'REJECTED',
        "rejection_reason" = $1,
        "updated_at" = NOW()
      WHERE "id" = $2
    `, [reason, orderId])

    // For outgoing transfers, restore balance if it was already deducted
    // This would happen if the order was approved first then later rejected
    let balanceRestored = false
    let newBalance = currentBalance

    if (order.type === 'OUTGOING' && order.status === 'PROCESSING') {
      // Restore the balance that was deducted during approval
      newBalance = currentBalance + amount + commission
      
      await directDb.query(`
        UPDATE "exchanges"
        SET 
          "balance" = $1,
          "updated_at" = NOW()
        WHERE "id" = $2
      `, [newBalance, order.exchange_id])

      balanceRestored = true
      console.log(`Balance restored for outgoing order ${order.order_number}: ${currentBalance} -> ${newBalance}`)
    }

    await directDb.query('COMMIT')

    // Return success response
    return {
      success: true,
      message: `Order ${order.order_number} rejected successfully`,
      orderNumber: order.order_number,
      exchangeName: order.exchange_name,
      reason,
      balanceRestored,
      newBalance: balanceRestored ? newBalance : currentBalance
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

    const body: RejectOrderBody = await request.json()

    if (!body.reason || body.reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    if (body.reason.length > 500) {
      return NextResponse.json(
        { error: 'Rejection reason is too long (max 500 characters)' },
        { status: 400 }
      )
    }

    const result = await rejectOrder(orderId, body.reason.trim())

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache',
      }
    })

  } catch (error) {
    console.error('Order rejection API error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Cannot reject order')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to reject order',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 