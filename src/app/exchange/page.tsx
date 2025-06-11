'use client'

import React from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Clock, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Download,
  Share2,
  Edit3,
  X
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { useExchangeDashboardData } from '@/hooks/useExchangeQueries'
import { useAuth } from '@/hooks/useAuth'
import { formatJordanTime } from '@/utils/timezone'

// Interfaces for type safety
interface ExchangeStats {
  currentBalance: number
  balanceChange: number
  totalOrders: number
  ordersChange: number
  pendingOrders: number
  completedOrders: number
  thisWeekVolume: number
  volumeChange: number
}

interface ExchangeOrder {
  id: string
  orderNumber: string
  type: 'INCOMING' | 'OUTGOING'
  status: string
  amount: number
  commission: number
  netAmount: number
  createdAt: string
  canEdit: boolean
  canCancel: boolean
  canDownload: boolean
  hasUnreadMessages?: boolean
  senderName?: string
  recipientName?: string
  bankName?: string
  paymentProofUrl?: string
  completionProofUrl?: string
}

// Clean Loading Component for Exchange Dashboard
function ExchangeDashboardLoading() {
  return (
    <div className="space-y-6">
      <LoadingSpinner 
        size="lg"
        text="Loading Your Dashboard"
        subtext="Please wait while we prepare your exchange interface"
        className="py-16"
      />
    </div>
  )
}

export default function ExchangeDashboard() {
  const { exchangeName, exchangeId } = useAuth()
  const { stats, orders, isLoading, isError, error, isRefetching, refetch } = useExchangeDashboardData()

  // All hooks must be called before any conditional returns
  const statCards = React.useMemo(() => {
    if (!stats) return []
    
    return [
      {
        title: 'Current Balance',
        value: `${stats.currentBalance.toLocaleString()} JOD`,
        change: `${stats.balanceChange >= 0 ? '+' : ''}${stats.balanceChange.toFixed(1)}%`,
        changeType: stats.balanceChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: DollarSign,
        color: 'purple',
        highlight: true
      },
      {
        title: 'Total Orders',
        value: stats.totalOrders.toString(),
        change: `${stats.ordersChange >= 0 ? '+' : ''}${stats.ordersChange.toFixed(1)}%`,
        changeType: stats.ordersChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: FileText,
        color: 'blue'
      },
      {
        title: 'Pending Orders',
        value: stats.pendingOrders.toString(),
        change: 'Needs attention',
        changeType: 'neutral' as const,
        icon: Clock,
        color: 'yellow'
      },
      {
        title: 'This Week Volume',
        value: `${stats.thisWeekVolume.toLocaleString()} JOD`,
        change: `${stats.volumeChange >= 0 ? '+' : ''}${stats.volumeChange.toFixed(1)}%`,
        changeType: stats.volumeChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: TrendingUp,
        color: 'green'
      }
    ]
  }, [stats])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'PENDING_REVIEW':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'PROCESSING':
        return <RefreshCw className="w-4 h-4 text-blue-500" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDownloadScreenshot = async (orderId: string) => {
    // TODO: Implement screenshot download
    console.log('Download screenshot for order:', orderId)
  }

  const handleShareToWhatsApp = async (orderId: string) => {
    // TODO: Implement WhatsApp sharing
    console.log('Share to WhatsApp for order:', orderId)
  }

  // Show enhanced loading state
  if (isLoading) {
    return <ExchangeDashboardLoading />
  }

  // Show error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-medium">Error Loading Dashboard</h3>
            <p className="text-sm mt-2">{error?.message || 'An unexpected error occurred'}</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
          >
            {isRefetching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                Retrying...
              </>
            ) : (
              'Try Again'
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            Welcome back, {exchangeName}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 leading-relaxed">
            Here's an overview of your financial transfer activities
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2.5 sm:py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <Link
            href="/exchange/orders/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 sm:py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-jordan hover:bg-jordan-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Link>
        </div>
      </div>

      {/* Stats Cards - 2 Column Layout */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div 
              key={index} 
              className={`bg-white rounded-xl border border-gray-200 p-3 sm:p-5 lg:p-6 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] animate-slide-up min-h-[120px] sm:min-h-[140px] lg:min-h-[160px] ${
                card.highlight ? 'ring-2 ring-jordan ring-opacity-20' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col h-full">
                {/* Title and Icon */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 leading-tight">
                    {card.title}
                  </p>
                  <div className={`p-1.5 sm:p-2.5 rounded-lg bg-${card.color}-100 flex-shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${card.color}-600`} />
                  </div>
                </div>
                
                {/* Value */}
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 leading-none break-words">
                  {card.value}
                </p>
                
                {/* Change Indicator */}
                <div className="flex items-center justify-start mt-auto">
                  <div className="flex items-center">
                    {card.changeType === 'positive' && (
                      <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1 flex-shrink-0" />
                    )}
                    {card.changeType === 'negative' && (
                      <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mr-1 flex-shrink-0" />
                    )}
                    <span className={`text-xs sm:text-sm font-semibold ${
                      card.changeType === 'positive' ? 'text-green-600' : 
                      card.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {card.change}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Orders - Mobile Optimized */}
      <div className="bg-white rounded-xl border border-gray-200 animate-slide-up overflow-hidden" style={{ animationDelay: '400ms' }}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-medium text-gray-900">Recent Orders</h2>
              <p className="text-sm text-gray-600 mt-1">Your latest transfer requests and their status</p>
            </div>
            <Link
              href="/exchange/orders"
              className="text-sm text-jordan hover:text-jordan-dark font-medium flex items-center transition-colors duration-200 self-start sm:self-auto"
            >
              View all
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="overflow-hidden">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {orders.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {orders.map((order: ExchangeOrder, index: number) => (
                  <div 
                    key={order.id} 
                    className="p-4 hover:bg-gray-50 transition-colors duration-150 animate-fade-in-row"
                    style={{ animationDelay: `${(index + 5) * 100}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1">
                        {order.hasUnreadMessages && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0" title="Has unread messages" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {order.orderNumber}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.type === 'INCOMING' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {order.type === 'INCOMING' ? '↓ In' : '↑ Out'}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {order.amount.toLocaleString()} JOD
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {order.canDownload && (
                          <button
                            onClick={() => handleDownloadScreenshot(order.id)}
                            className="text-jordan hover:text-jordan-dark transition-colors duration-150 p-1"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <Link 
                          href={`/exchange/orders/${order.id}`}
                          className="text-jordan hover:text-jordan-dark transition-colors duration-150 p-1"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-900">
                          Net: {order.netAmount.toLocaleString()} JOD
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatJordanTime(order.createdAt, 'dd/MM HH:mm')}
                        </div>
                      </div>
                    </div>
                    
                    {(order.senderName || order.recipientName) && (
                      <div className="mb-3 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                        {order.type === 'INCOMING' ? `From: ${order.senderName}` : `To: ${order.recipientName}`}
                      </div>
                    )}

                    {/* Quick Actions */}
                    {(order.canEdit || order.canCancel) && (
                      <div className="flex space-x-2">
                        {order.canEdit && (
                          <Link
                            href={`/exchange/orders/${order.id}/edit`}
                            className="flex items-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </Link>
                        )}
                        {order.canCancel && (
                          <button className="flex items-center text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors">
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-4">Start by creating your first transfer order</p>
                <Link
                  href="/exchange/orders/new"
                  className="inline-flex items-center px-4 py-2 bg-jordan text-white rounded-lg hover:bg-jordan-dark transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Order
                </Link>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            {orders.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order: ExchangeOrder, index: number) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 transition-colors duration-150 animate-fade-in-row"
                      style={{ animationDelay: `${(index + 5) * 100}ms` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.hasUnreadMessages && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" title="Has unread messages" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatJordanTime(order.createdAt, 'dd/MM/yyyy HH:mm')}
                            </div>
                            {(order.senderName || order.recipientName) && (
                              <div className="text-xs text-gray-400">
                                {order.type === 'INCOMING' ? order.senderName : order.recipientName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.type === 'INCOMING' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {order.type === 'INCOMING' ? '↓ Incoming' : '↑ Outgoing'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.amount.toLocaleString()} JOD
                        </div>
                        <div className="text-sm text-gray-500">
                          Net: {order.netAmount.toLocaleString()} JOD
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(order.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {order.canDownload && (
                            <button
                              onClick={() => handleDownloadScreenshot(order.id)}
                              className="text-jordan hover:text-jordan-dark transition-colors duration-150"
                              title="Download screenshot"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <Link 
                            href={`/exchange/orders/${order.id}`}
                            className="text-jordan hover:text-jordan-dark transition-colors duration-150"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-6">Start by creating your first transfer order</p>
                <Link
                  href="/exchange/orders/new"
                  className="inline-flex items-center px-6 py-3 bg-jordan text-white rounded-lg hover:bg-jordan-dark transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Order
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-slide-up" style={{ animationDelay: '600ms' }}>
        <Link
          href="/exchange/orders/new?type=incoming"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors duration-200 flex-shrink-0">
              <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Incoming Transfer</h3>
              <p className="text-sm text-gray-600 mt-0.5">Submit received payment proof</p>
            </div>
          </div>
        </Link>

        <Link
          href="/exchange/orders/new?type=outgoing"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200 flex-shrink-0">
              <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Outgoing Transfer</h3>
              <p className="text-sm text-gray-600 mt-0.5">Request payment to CliQ</p>
            </div>
          </div>
        </Link>

        <Link
          href="/exchange/orders"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02] sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors duration-200 flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Order History</h3>
              <p className="text-sm text-gray-600 mt-0.5">View all your transfers</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
} 