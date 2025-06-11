import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

export async function GET(request: NextRequest) {
  try {
    // Get dashboard stats using direct database
    const stats = await directDb.getDashboardStats()
    
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