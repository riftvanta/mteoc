import { NextResponse } from 'next/server'
import { optimizedDb } from '@/lib/optimized-db'

export async function GET() {
  try {
    // Test database connection
    const isDbHealthy = await optimizedDb.testConnection()
    
    // Get performance metrics
    const performanceStats = optimizedDb.getPerformanceStats()
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: {
        connected: isDbHealthy,
        status: isDbHealthy ? 'healthy' : 'unhealthy'
      },
      performance: {
        totalQueries: performanceStats.totalQueries,
        cachedQueries: performanceStats.cachedQueries,
        cacheHitRate: `${performanceStats.cacheHitRate.toFixed(1)}%`,
        averageDuration: `${performanceStats.averageDuration}ms`,
        slowQueries: performanceStats.slowQueries
      },
      cache: {
        type: process.env.REDIS_URL ? 'Redis' : 'Memory',
        redisConnected: !!process.env.REDIS_URL
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    }

    // Return unhealthy status if database is down
    if (!isDbHealthy) {
      return NextResponse.json(
        { ...healthData, status: 'unhealthy' },
        { status: 503 }
      )
    }

    return NextResponse.json(healthData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
        environment: process.env.NODE_ENV
      },
      { status: 503 }
    )
  }
} 