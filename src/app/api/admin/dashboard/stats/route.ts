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

    // Get dashboard stats using optimized database with caching
    const stats = await optimizedDb.getDashboardStats()
    
    // Add performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const perfStats = optimizedDb.getPerformanceStats()
      console.log('Dashboard stats performance:', perfStats)
    }
    
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=60',
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 