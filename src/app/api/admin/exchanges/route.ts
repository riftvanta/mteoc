import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

export async function GET(request: NextRequest) {
  try {
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
        GROUP BY exchange_id
      ) stats ON e.id = stats.exchange_id
      WHERE u.role = 'EXCHANGE'
      ORDER BY e.created_at DESC
    `)

    // Format data
    const formattedExchanges = exchanges.map(exchange => ({
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
    }))

    return NextResponse.json({
      exchanges: formattedExchanges,
      success: true
    })

  } catch (error) {
    console.error('Error fetching exchanges:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchanges',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      username, 
      password, 
      name, 
      contactEmail, 
      contactPhone, 
      initialBalance = 0,
      incomingCommissionType = 'PERCENTAGE',
      incomingCommissionValue = 2.0,
      outgoingCommissionType = 'PERCENTAGE',
      outgoingCommissionValue = 2.0,
      allowedIncomingBanks = [],
      allowedOutgoingBanks = []
    } = body

    // Validate required fields
    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, and name are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUser = await directDb.query<{id: string}>(
      'SELECT id FROM users WHERE username = $1',
      [username]
    )

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Start transaction
    await directDb.query('BEGIN')

    try {
      // Create user
      const userResult = await directDb.query<{id: string}>(`
        INSERT INTO users (username, password, role, created_at, updated_at)
        VALUES ($1, $2, 'EXCHANGE', NOW(), NOW())
        RETURNING id
      `, [username, hashedPassword])

      const userId = userResult[0].id

      // Create exchange
      const exchangeResult = await directDb.query<any>(`
        INSERT INTO exchanges (
          user_id, name, "contactEmail", "contactPhone", balance,
          incoming_commission_type, incoming_commission_value,
          outgoing_commission_type, outgoing_commission_value,
          allowed_incoming_banks, allowed_outgoing_banks,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `, [
        userId, name, contactEmail, contactPhone, initialBalance,
        incomingCommissionType, incomingCommissionValue,
        outgoingCommissionType, outgoingCommissionValue,
        allowedIncomingBanks, allowedOutgoingBanks
      ])

      await directDb.query('COMMIT')

      return NextResponse.json({
        success: true,
        exchange: {
          id: userId,
          username,
          ...exchangeResult[0],
          allowedIncomingBanks,
          allowedOutgoingBanks
        }
      })

    } catch (error) {
      await directDb.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error creating exchange:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create exchange',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 