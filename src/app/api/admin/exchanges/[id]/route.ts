import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get exchange details with statistics
    const exchanges = await directDb.query<{
      id: string
      username: string
      name: string
      contactEmail: string | null
      contactPhone: string | null
      balance: string
      createdAt: Date
      updatedAt: Date
      incomingCommissionType: string
      incomingCommissionValue: string
      outgoingCommissionType: string
      outgoingCommissionValue: string
      allowedIncomingBanks: string[]
      allowedOutgoingBanks: string[]
      totalOrders: number
      completedOrders: number
      pendingOrders: number
      totalVolume: string | null
      lastOrderDate: Date | null
    }>(`
      SELECT 
        u.id,
        u.username,
        e.name,
        e."contactEmail",
        e."contactPhone",
        e.balance::text as balance,
        e.created_at as "createdAt",
        e.updated_at as "updatedAt",
        e.incoming_commission_type as "incomingCommissionType",
        e.incoming_commission_value::text as "incomingCommissionValue",
        e.outgoing_commission_type as "outgoingCommissionType",
        e.outgoing_commission_value::text as "outgoingCommissionValue",
        e.allowed_incoming_banks as "allowedIncomingBanks",
        e.allowed_outgoing_banks as "allowedOutgoingBanks",
        COALESCE(stats.total_orders, 0) as "totalOrders",
        COALESCE(stats.completed_orders, 0) as "completedOrders",
        COALESCE(stats.pending_orders, 0) as "pendingOrders",
        COALESCE(stats.total_volume, 0)::text as "totalVolume",
        stats.last_order_date as "lastOrderDate"
      FROM users u
      JOIN exchanges e ON u.id = e.user_id
      LEFT JOIN (
        SELECT 
          exchange_id,
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_orders,
          COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING')) as pending_orders,
          SUM(amount) FILTER (WHERE status = 'COMPLETED') as total_volume,
          MAX(created_at) as last_order_date
        FROM orders
        WHERE exchange_id = $1
        GROUP BY exchange_id
      ) stats ON e.id = stats.exchange_id
      WHERE u.id = $1 AND u.role = 'EXCHANGE'
    `, [id])

    if (exchanges.length === 0) {
      return NextResponse.json(
        { error: 'Exchange not found' },
        { status: 404 }
      )
    }

    const exchange = exchanges[0]

    // Format data
    const formattedExchange = {
      ...exchange,
      balance: parseFloat(exchange.balance),
      incomingCommissionValue: parseFloat(exchange.incomingCommissionValue),
      outgoingCommissionValue: parseFloat(exchange.outgoingCommissionValue),
      totalVolume: parseFloat(exchange.totalVolume || '0'),
      status: 'ACTIVE', // Default status since schema doesn't have status field
      createdAt: exchange.createdAt.toISOString(),
      updatedAt: exchange.updatedAt.toISOString(),
      lastOrderDate: exchange.lastOrderDate?.toISOString() || null,
      lastLoginDate: null // Not tracked in current schema
    }

    return NextResponse.json({
      exchange: formattedExchange,
      success: true
    })

  } catch (error) {
    console.error('Error fetching exchange details:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const {
      name,
      contactEmail,
      contactPhone,
      balance,
      incomingCommissionType,
      incomingCommissionValue,
      outgoingCommissionType,
      outgoingCommissionValue,
      allowedIncomingBanks,
      allowedOutgoingBanks
    } = body

    // Check if exchange exists
    const existingExchanges = await directDb.query<{id: string}>(
      'SELECT u.id FROM users u JOIN exchanges e ON u.id = e.user_id WHERE u.id = $1 AND u.role = $2',
      [id, 'EXCHANGE']
    )

    if (existingExchanges.length === 0) {
      return NextResponse.json(
        { error: 'Exchange not found' },
        { status: 404 }
      )
    }

    // Update exchange
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      updateValues.push(name)
    }
    if (contactEmail !== undefined) {
      updateFields.push(`"contactEmail" = $${paramIndex++}`)
      updateValues.push(contactEmail)
    }
    if (contactPhone !== undefined) {
      updateFields.push(`"contactPhone" = $${paramIndex++}`)
      updateValues.push(contactPhone)
    }
    if (balance !== undefined) {
      updateFields.push(`balance = $${paramIndex++}`)
      updateValues.push(balance)
    }
    if (incomingCommissionType !== undefined) {
      updateFields.push(`incoming_commission_type = $${paramIndex++}`)
      updateValues.push(incomingCommissionType)
    }
    if (incomingCommissionValue !== undefined) {
      updateFields.push(`incoming_commission_value = $${paramIndex++}`)
      updateValues.push(incomingCommissionValue)
    }
    if (outgoingCommissionType !== undefined) {
      updateFields.push(`outgoing_commission_type = $${paramIndex++}`)
      updateValues.push(outgoingCommissionType)
    }
    if (outgoingCommissionValue !== undefined) {
      updateFields.push(`outgoing_commission_value = $${paramIndex++}`)
      updateValues.push(outgoingCommissionValue)
    }
    if (allowedIncomingBanks !== undefined) {
      updateFields.push(`allowed_incoming_banks = $${paramIndex++}`)
      updateValues.push(allowedIncomingBanks)
    }
    if (allowedOutgoingBanks !== undefined) {
      updateFields.push(`allowed_outgoing_banks = $${paramIndex++}`)
      updateValues.push(allowedOutgoingBanks)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE exchanges 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `

    const updatedExchange = await directDb.query<any>(updateQuery, updateValues)

    return NextResponse.json({
      success: true,
      exchange: updatedExchange[0]
    })

  } catch (error) {
    console.error('Error updating exchange:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update exchange',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 