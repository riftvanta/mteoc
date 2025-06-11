import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'

async function getExchangeStats(exchangeId: string) {
  console.log('Getting exchange stats for:', exchangeId)
  
  // Get exchange current balance
  const [exchangeResult] = await directDb.query<{balance: string, name: string}>(
    'SELECT balance, name FROM "exchanges" WHERE id = $1',
    [exchangeId]
  )

  if (!exchangeResult) {
    throw new Error('Exchange not found')
  }

  const currentBalance = parseFloat(exchangeResult.balance) || 0

  // Calculate stats for this week vs last week
  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastWeekEnd = new Date(weekStart.getTime() - 1)

  // Total orders count
  const [totalOrdersResult] = await directDb.query<{count: string}>(
    'SELECT COUNT(*) as count FROM "orders" WHERE exchange_id = $1',
    [exchangeId]
  )
  const totalOrders = parseInt(totalOrdersResult?.count) || 0

  const [lastWeekOrdersResult] = await directDb.query<{count: string}>(
    'SELECT COUNT(*) as count FROM "orders" WHERE exchange_id = $1 AND created_at < $2',
    [exchangeId, weekStart.toISOString()]
  )
  const lastWeekOrders = parseInt(lastWeekOrdersResult?.count) || 0
  const ordersChange = lastWeekOrders > 0 ? ((totalOrders - lastWeekOrders) / lastWeekOrders) * 100 : 0

  // Pending orders count
  const [pendingOrdersResult] = await directDb.query<{count: string}>(
    `SELECT COUNT(*) as count FROM "orders" WHERE exchange_id = $1 AND status IN ('SUBMITTED', 'PENDING_REVIEW')`,
    [exchangeId]
  )
  const pendingOrders = parseInt(pendingOrdersResult?.count) || 0

  // Completed orders count
  const [completedOrdersResult] = await directDb.query<{count: string}>(
    'SELECT COUNT(*) as count FROM "orders" WHERE exchange_id = $1 AND status = $2',
    [exchangeId, 'COMPLETED']
  )
  const completedOrders = parseInt(completedOrdersResult?.count) || 0

  // This week volume
  const [thisWeekVolumeResult] = await directDb.query<{sum: string | null}>(
    'SELECT SUM(amount) as sum FROM "orders" WHERE exchange_id = $1 AND created_at >= $2 AND status = $3',
    [exchangeId, weekStart.toISOString(), 'COMPLETED']
  )
  const thisWeekVolume = parseFloat(thisWeekVolumeResult?.sum || '0') || 0

  // Last week volume for comparison
  const [lastWeekVolumeResult] = await directDb.query<{sum: string | null}>(
    'SELECT SUM(amount) as sum FROM "orders" WHERE exchange_id = $1 AND created_at >= $2 AND created_at < $3 AND status = $4',
    [exchangeId, lastWeekStart.toISOString(), lastWeekEnd.toISOString(), 'COMPLETED']
  )
  const lastWeekVolume = parseFloat(lastWeekVolumeResult?.sum || '0') || 0
  const volumeChange = lastWeekVolume > 0 ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100 : 0

  // Balance change calculation (mock for now, could be based on historical data)
  const balanceChange = 2.5 // This would need historical balance tracking

  const result = {
    currentBalance,
    balanceChange,
    totalOrders,
    ordersChange: Math.round(ordersChange * 100) / 100,
    pendingOrders,
    completedOrders,
    thisWeekVolume,
    volumeChange: Math.round(volumeChange * 100) / 100
  }

  console.log('Exchange stats calculated:', result)
  return result
}

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

    // Get exchange stats using directDb
    const stats = await getExchangeStats(exchangeId)

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Exchange stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange statistics' },
      { status: 500 }
    )
  }
} 