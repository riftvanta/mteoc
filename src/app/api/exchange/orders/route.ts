import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'
import { generateOrderId } from '@/utils/order-id'
import { calculateCommission, calculateOutgoingNetAmount, calculateIncomingNetAmount } from '@/utils/financial'
import { jordanianMobileSchema, amountSchema } from '@/utils/validation'

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

async function createOrder(data: {
  exchangeId: string
  type: 'INCOMING' | 'OUTGOING'
  amount: number
  senderName?: string
  recipientName?: string
  bankName?: string
  cliqBankAliasName?: string
  cliqMobileNumber?: string
  paymentProofUrl?: string
}) {
  console.log('Creating new order for exchange:', data.exchangeId, 'type:', data.type)

  // Start transaction
  await directDb.query('BEGIN')

  try {
    // Get exchange details and commission settings
    const [exchange] = await directDb.query<{
      id: string
      name: string
      balance: string
      incomingCommissionType: string
      incomingCommissionValue: string
      outgoingCommissionType: string
      outgoingCommissionValue: string
      allowedIncomingBanks: string[]
      allowedOutgoingBanks: string[]
    }>(`
      SELECT 
        e.id,
        e.name,
        e.balance::text as balance,
        e.incoming_commission_type as "incomingCommissionType",
        e.incoming_commission_value::text as "incomingCommissionValue",
        e.outgoing_commission_type as "outgoingCommissionType",
        e.outgoing_commission_value::text as "outgoingCommissionValue",
        e.allowed_incoming_banks as "allowedIncomingBanks",
        e.allowed_outgoing_banks as "allowedOutgoingBanks"
      FROM exchanges e
      WHERE e.id = $1
    `, [data.exchangeId])

    if (!exchange) {
      throw new Error('Exchange not found')
    }

    // Validate bank selection
    const allowedBanks = data.type === 'INCOMING' 
      ? exchange.allowedIncomingBanks 
      : exchange.allowedOutgoingBanks

    if (data.bankName && !allowedBanks.includes(data.bankName)) {
      throw new Error(`Bank '${data.bankName}' is not allowed for ${data.type.toLowerCase()} transfers`)
    }

    // Calculate commission
    const commissionConfig = data.type === 'INCOMING' 
      ? { type: exchange.incomingCommissionType as 'FIXED' | 'PERCENTAGE', value: parseFloat(exchange.incomingCommissionValue) }
      : { type: exchange.outgoingCommissionType as 'FIXED' | 'PERCENTAGE', value: parseFloat(exchange.outgoingCommissionValue) }

    const commission = calculateCommission(data.amount, commissionConfig)
    const commissionValue = commission.toNumber()

    // Calculate net amount
    const netAmount = data.type === 'INCOMING'
      ? calculateIncomingNetAmount(data.amount, commissionValue)
      : calculateOutgoingNetAmount(data.amount, commissionValue)

    const netAmountValue = netAmount.toNumber()

    // For outgoing transfers, check if balance is sufficient and update it
    let newBalance = parseFloat(exchange.balance)
    if (data.type === 'OUTGOING') {
      const totalDeduction = data.amount + commissionValue
      newBalance = newBalance - totalDeduction
      
      // Update exchange balance
      await directDb.query(`
        UPDATE exchanges 
        SET balance = $1, updated_at = NOW()
        WHERE id = $2
      `, [newBalance, data.exchangeId])
    }

    // Generate order ID and unique record ID
    const orderNumber = await generateOrderId()
    const recordId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Create order
    const [order] = await directDb.query<{
      id: string
      order_number: string
      type: string
      status: string
      amount: string
      commission: string
      net_amount: string
      created_at: Date
    }>(`
      INSERT INTO orders (
        id, order_number, exchange_id, type, status, amount, commission, net_amount,
        sender_name, recipient_name, bank_name, 
        cliq_bank_alias_name, cliq_mobile_number, payment_proof_url,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'SUBMITTED', $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING id, order_number, type, status, amount::text, commission::text, net_amount::text, created_at
    `, [
      recordId,
      orderNumber,
      data.exchangeId,
      data.type,
      data.amount,
      commissionValue,
      netAmountValue,
      data.senderName || null,
      data.recipientName || null,
      data.bankName || null,
      data.cliqBankAliasName || null,
      data.cliqMobileNumber || null,
      data.paymentProofUrl || null
    ])

    await directDb.query('COMMIT')

    // Return formatted order data
    const result = {
      id: order.id,
      orderNumber: order.order_number,
      type: order.type as 'INCOMING' | 'OUTGOING',
      status: order.status,
      amount: parseFloat(order.amount),
      commission: parseFloat(order.commission),
      netAmount: parseFloat(order.net_amount),
      createdAt: order.created_at.toISOString(),
      newBalance: newBalance,
      canEdit: true, // New orders can be edited
      canCancel: true, // New orders can be cancelled
      canDownload: false, // Cannot download until completed
      hasUnreadMessages: false,
      senderName: data.senderName,
      recipientName: data.recipientName,
      bankName: data.bankName,
      cliqBankAliasName: data.cliqBankAliasName,
      cliqMobileNumber: data.cliqMobileNumber,
      paymentProofUrl: data.paymentProofUrl
    }

    console.log('Order created successfully:', order.id, 'balance updated to:', newBalance)
    return result

  } catch (error) {
    await directDb.query('ROLLBACK')
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      exchangeId,
      type,
      amount,
      senderName,
      recipientName,
      bankName,
      cliqBankAliasName,
      cliqMobileNumber,
      paymentProofUrl
    } = body

    // Validate required fields
    if (!exchangeId || !type || !amount) {
      return NextResponse.json(
        { error: 'Exchange ID, type, and amount are required' },
        { status: 400 }
      )
    }

    // Validate order type
    if (!['INCOMING', 'OUTGOING'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid order type. Must be INCOMING or OUTGOING' },
        { status: 400 }
      )
    }

    // Validate amount
    const amountValidation = amountSchema.safeParse(amount.toString())
    if (!amountValidation.success) {
      return NextResponse.json(
        { error: 'Invalid amount: ' + amountValidation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Type-specific validation
    if (type === 'OUTGOING') {
      // Validate required fields for outgoing transfers
      if (!cliqBankAliasName || !cliqMobileNumber) {
        return NextResponse.json(
          { error: 'CliQ bank alias name and mobile number are required for outgoing transfers' },
          { status: 400 }
        )
      }

      // Validate Jordanian mobile number
      const mobileValidation = jordanianMobileSchema.safeParse(cliqMobileNumber)
      if (!mobileValidation.success) {
        return NextResponse.json(
          { error: 'Invalid Jordanian mobile number format' },
          { status: 400 }
        )
      }
    }

    if (type === 'INCOMING') {
      // For incoming transfers, payment proof will be handled by file upload separately
      if (!bankName) {
        return NextResponse.json(
          { error: 'Bank name is required for incoming transfers' },
          { status: 400 }
        )
      }
    }

    // Create the order
    const newOrder = await createOrder({
      exchangeId,
      type,
      amount: parseFloat(amount),
      senderName,
      recipientName,
      bankName,
      cliqBankAliasName,
      cliqMobileNumber,
      paymentProofUrl
    })

    return NextResponse.json(newOrder, {
      status: 201,
      headers: {
        'Cache-Control': 'no-cache',
      }
    })

  } catch (error) {
    console.error('Order creation API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 