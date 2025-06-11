import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'
import { isValidStatusTransition } from '@/utils/validation'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

interface CompleteOrderBody {
  actualAmount?: number // For incoming transfers - admin confirms actual amount received
}

async function completeOrder(orderId: string, actualAmount?: number) {
  console.log('Completing order:', orderId, 'with actual amount:', actualAmount)
  
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
    if (!isValidStatusTransition(order.status, 'COMPLETED')) {
      throw new Error(`Cannot complete order with status: ${order.status}`)
    }

    const originalAmount = Number(order.amount)
    const commission = Number(order.commission)
    const currentBalance = Number(order.exchange_balance)

    let finalAmount = originalAmount
    let amountChanged = false
    let newBalance = currentBalance

    // For incoming transfers, handle actual amount confirmation
    if (order.type === 'INCOMING') {
      if (actualAmount !== undefined) {
        if (actualAmount <= 0) {
          throw new Error('Actual amount must be greater than 0')
        }
        
        finalAmount = actualAmount
        amountChanged = actualAmount !== originalAmount
        
        // Update order with actual amount if changed
        if (amountChanged) {
          await directDb.query(`
            UPDATE "orders" 
            SET 
              "amount" = $1,
              "net_amount" = $2,
              "updated_at" = NOW()
            WHERE "id" = $3
          `, [finalAmount, finalAmount - commission, orderId])
        }
      }
      
      // Credit the exchange balance (actual amount - commission)
      const creditAmount = finalAmount - commission
      newBalance = currentBalance + creditAmount
      
      await directDb.query(`
        UPDATE "exchanges"
        SET 
          "balance" = $1,
          "updated_at" = NOW()
        WHERE "id" = $2
      `, [newBalance, order.exchange_id])

      console.log(`Credited ${creditAmount} JOD to exchange balance: ${currentBalance} -> ${newBalance}`)
    }

    // Mark order as completed
    await directDb.query(`
      UPDATE "orders" 
      SET 
        "status" = 'COMPLETED',
        "completed_at" = NOW(),
        "updated_at" = NOW()
      WHERE "id" = $1
    `, [orderId])

    await directDb.query('COMMIT')

    // Return success response
    return {
      success: true,
      message: `Order ${order.order_number} completed successfully`,
      orderNumber: order.order_number,
      exchangeName: order.exchange_name,
      type: order.type,
      originalAmount,
      finalAmount,
      amountChanged,
      commission,
      balanceUpdated: order.type === 'INCOMING',
      oldBalance: currentBalance,
      newBalance,
      creditAmount: order.type === 'INCOMING' ? finalAmount - commission : null
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

    const body: CompleteOrderBody = await request.json().catch(() => ({}))
    
    // Validate actual amount if provided
    if (body.actualAmount !== undefined) {
      if (typeof body.actualAmount !== 'number' || body.actualAmount <= 0) {
        return NextResponse.json(
          { error: 'Actual amount must be a positive number' },
          { status: 400 }
        )
      }
      
      if (body.actualAmount > 1000000) {
        return NextResponse.json(
          { error: 'Actual amount is too large' },
          { status: 400 }
        )
      }
    }

    const result = await completeOrder(orderId, body.actualAmount)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache',
      }
    })

  } catch (error) {
    console.error('Order completion API error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Cannot complete order') ||
          error.message.includes('Actual amount must be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to complete order',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 