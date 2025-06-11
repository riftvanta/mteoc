import { NextRequest, NextResponse } from 'next/server'
import { optimizedDb } from '@/lib/optimized-db'

export async function GET(request: NextRequest) {
  try {
    // Test connection first with cached health check
    const isConnected = await optimizedDb.testConnection()
    if (!isConnected) {
      return NextResponse.json(
        { 
          error: 'Database connection unavailable',
          details: 'Unable to connect to database'
        },
        { status: 503 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20) // Cap at 20 for performance

    // Get recent orders using optimized database with caching
    const orders = await optimizedDb.getRecentOrders(limit)

    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const perfStats = optimizedDb.getPerformanceStats()
      console.log('Recent orders performance:', perfStats)
    }

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