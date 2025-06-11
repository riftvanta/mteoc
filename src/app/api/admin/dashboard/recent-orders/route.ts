import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20) // Cap at 20 for performance

    // Get recent orders using direct database
    const orders = await directDb.getRecentOrders(limit)

    return NextResponse.json({
      orders,
      total: orders.length,
      limit
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, s-maxage=30',
      }
    })

  } catch (error) {
    console.error('Error fetching recent orders:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch recent orders',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 