import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'
import { isValidStatusTransition } from '@/utils/validation'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

async function approveOrder(orderId: string) {
  console.log('Approving order:', orderId)
  
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
    if (!isValidStatusTransition(order.status, 'APPROVED')) {
      throw new Error(`Cannot approve order with status: ${order.status}`)
    }

    const amount = Number(order.amount)
    const commission = Number(order.commission)
    const currentBalance = Number(order.exchange_balance)

    // For outgoing transfers, check if exchange has sufficient balance
    if (order.type === 'OUTGOING') {
      const totalRequired = amount + commission
      if (currentBalance < totalRequired) {
        throw new Error(`Insufficient balance. Required: ${totalRequired} JOD, Available: ${currentBalance} JOD`)
      }
    }

    // Update order status to APPROVED
    await directDb.query(`
      UPDATE "orders" 
      SET 
        "status" = 'APPROVED',
        "approved_at" = NOW(),
        "updated_at" = NOW()
      WHERE "id" = $1
    `, [orderId])

    // For outgoing transfers, immediately move to PROCESSING and deduct balance
    if (order.type === 'OUTGOING') {
      const newBalance = currentBalance - (amount + commission)
      
      // Deduct from exchange balance
      await directDb.query(`
        UPDATE "exchanges"
        SET 
          "balance" = $1,
          "updated_at" = NOW()
        WHERE "id" = $2
      `, [newBalance, order.exchange_id])

      // Move order to PROCESSING
      await directDb.query(`
        UPDATE "orders" 
        SET 
          "status" = 'PROCESSING',
          "updated_at" = NOW()
        WHERE "id" = $1
      `, [orderId])

      console.log(`Outgoing order ${order.order_number} approved and moved to PROCESSING. Balance updated: ${currentBalance} -> ${newBalance}`)
    } else {
      // For incoming transfers, just approve - admin will confirm amount later
      console.log(`Incoming order ${order.order_number} approved. Waiting for admin to confirm amount.`)
    }

    await directDb.query('COMMIT')

    // Return success response
    return {
      success: true,
      message: `Order ${order.order_number} approved successfully`,
      orderNumber: order.order_number,
      exchangeName: order.exchange_name,
      newStatus: order.type === 'OUTGOING' ? 'PROCESSING' : 'APPROVED',
      balanceUpdated: order.type === 'OUTGOING',
      newBalance: order.type === 'OUTGOING' ? currentBalance - (amount + commission) : currentBalance
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

    const result = await approveOrder(orderId)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache',
      }
    })

  } catch (error) {
    console.error('Order approval API error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Cannot approve order') || 
          error.message.includes('Insufficient balance')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to approve order',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 