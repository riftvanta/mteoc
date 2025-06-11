import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get total exchanges
    const [totalExchanges] = await directDb.query<{count: string}>(
      'SELECT COUNT(*) as count FROM exchanges'
    )

    const [totalExchangesLastWeek] = await directDb.query<{count: string}>(
      'SELECT COUNT(*) as count FROM exchanges WHERE created_at <= $1',
      [lastWeek.toISOString()]
    )

    // All exchanges are considered active since schema doesn't have status field
    const activeExchangesNum = Number(totalExchanges.count || 0)
    const activeExchangesLastWeekNum = Number(totalExchangesLastWeek.count || 0)

    // Get total balance
    const [totalBalance] = await directDb.query<{sum: string | null}>(
      'SELECT SUM(balance) as sum FROM exchanges'
    )

    const [totalBalanceLastWeek] = await directDb.query<{sum: string | null}>(
      'SELECT SUM(balance) as sum FROM exchanges WHERE created_at <= $1',
      [lastWeek.toISOString()]
    )

    // Get total volume
    const [totalVolume] = await directDb.query<{sum: string | null}>(
      "SELECT SUM(amount) as sum FROM orders WHERE status != 'REJECTED'"
    )

    const [totalVolumeLastWeek] = await directDb.query<{sum: string | null}>(
      "SELECT SUM(amount) as sum FROM orders WHERE status != 'REJECTED' AND created_at <= $1",
      [lastWeek.toISOString()]
    )

    // Get total orders
    const [totalOrders] = await directDb.query<{count: string}>(
      'SELECT COUNT(*) as count FROM orders'
    )

    // Get pending orders
    const [pendingOrders] = await directDb.query<{count: string}>(
      "SELECT COUNT(*) as count FROM orders WHERE status IN ('SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING')"
    )

    // Calculate percentage changes
    const totalExchangesNum = Number(totalExchanges.count || 0)
    const totalExchangesLastWeekNum = Number(totalExchangesLastWeek.count || 0)
    const totalBalanceNum = Number(totalBalance.sum || 0)
    const totalBalanceLastWeekNum = Number(totalBalanceLastWeek.sum || 0)
    const totalVolumeNum = Number(totalVolume.sum || 0)
    const totalVolumeLastWeekNum = Number(totalVolumeLastWeek.sum || 0)
    const totalOrdersNum = Number(totalOrders.count || 0)
    const pendingOrdersNum = Number(pendingOrders.count || 0)

    const totalExchangesChange = totalExchangesLastWeekNum > 0 
      ? ((totalExchangesNum - totalExchangesLastWeekNum) / totalExchangesLastWeekNum * 100) 
      : 0

    const activeExchangesChange = activeExchangesLastWeekNum > 0 
      ? ((activeExchangesNum - activeExchangesLastWeekNum) / activeExchangesLastWeekNum * 100) 
      : 0

    const totalBalanceChange = totalBalanceLastWeekNum > 0 
      ? ((totalBalanceNum - totalBalanceLastWeekNum) / totalBalanceLastWeekNum * 100) 
      : 0

    const totalVolumeChange = totalVolumeLastWeekNum > 0 
      ? ((totalVolumeNum - totalVolumeLastWeekNum) / totalVolumeLastWeekNum * 100) 
      : 0

    const result = {
      totalExchanges: totalExchangesNum,
      totalExchangesChange: Math.round(totalExchangesChange * 100) / 100,
      activeExchanges: activeExchangesNum,
      activeExchangesChange: Math.round(activeExchangesChange * 100) / 100,
      totalBalance: totalBalanceNum,
      totalBalanceChange: Math.round(totalBalanceChange * 100) / 100,
      totalVolume: totalVolumeNum,
      totalVolumeChange: Math.round(totalVolumeChange * 100) / 100,
      totalOrders: totalOrdersNum,
      pendingOrders: pendingOrdersNum
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching exchanges stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchanges statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 