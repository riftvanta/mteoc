import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exchangeId = searchParams.get('exchangeId')

    if (!exchangeId) {
      return NextResponse.json(
        { error: 'Exchange ID is required' },
        { status: 400 }
      )
    }

    // Get exchange settings for the specific exchange
    const exchanges = await directDb.query<{
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
    `, [exchangeId])

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
    }

    return NextResponse.json({
      exchange: formattedExchange,
      success: true
    })

  } catch (error) {
    console.error('Error fetching exchange settings:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 