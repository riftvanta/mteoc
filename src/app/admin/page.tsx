'use client'

import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { useDashboardData, usePrefetchOrderDetails } from '@/hooks/useOptimizedQueries'

// Interfaces for type safety
interface DashboardStats {
  totalOrders: number
  totalOrdersChange: number
  pendingOrders: number
  pendingOrdersChange: number
  completedOrders: number
  completedOrdersChange: number
  totalExchanges: number
  exchangesChange: number
  totalVolume: number
  todayVolume: number
  volumeChange: number
  avgProcessingTime: number
  systemHealth: 'good' | 'warning' | 'critical'
}

interface RecentOrder {
  id: string
  orderNumber: string
  type: 'INCOMING' | 'OUTGOING'
  status: string
  amount: number
  exchangeName: string
  exchangeId: string
  createdAt: string
  urgent?: boolean
  hasUnreadMessages?: boolean
  senderName?: string
  recipientName?: string
  bankName?: string
}

// Clean Loading Component for Dashboard
function DashboardContentLoading() {
  return (
    <div className="space-y-6">
      <LoadingSpinner 
        size="lg"
        text="Loading Admin Dashboard"
        subtext="Please wait while we prepare your administrative interface"
        className="py-16"
      />
    </div>
  )
}

export default function AdminDashboard() {
  // Use optimized hooks for data fetching
  const { stats, orders, isLoading, isError, error, isRefetching, refetch } = useDashboardData()
  const prefetchOrderDetails = usePrefetchOrderDetails()

  // Handle prefetching on hover for better UX
  const handleOrderHover = (orderId: string) => {
    prefetchOrderDetails(orderId)
  }

  const statCards = React.useMemo(() => {
    if (!stats) return []
    
    return [
      {
        title: 'Total Orders',
        value: stats.totalOrders.toLocaleString(),
        change: `${stats.totalOrdersChange >= 0 ? '+' : ''}${stats.totalOrdersChange.toFixed(1)}%`,
        changeType: stats.totalOrdersChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: FileText,
        color: 'blue'
      },
      {
        title: 'Pending Review',
        value: stats.pendingOrders.toString(),
        change: `${stats.pendingOrdersChange >= 0 ? '+' : ''}${stats.pendingOrdersChange.toFixed(1)}%`,
        changeType: stats.pendingOrdersChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: Clock,
        color: 'yellow'
      },
      {
        title: 'Active Exchanges',
        value: stats.totalExchanges.toString(),
        change: `${stats.exchangesChange >= 0 ? '+' : ''}${stats.exchangesChange.toFixed(1)}%`,
        changeType: stats.exchangesChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: Users,
        color: 'green'
      },
      {
        title: 'Today\'s Volume',
        value: `${stats.todayVolume.toLocaleString()} JOD`,
        change: `${stats.volumeChange >= 0 ? '+' : ''}${stats.volumeChange.toFixed(1)}%`,
        changeType: stats.volumeChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: DollarSign,
        color: 'purple'
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

  // Show enhanced loading state
  if (isLoading) {
    return <DashboardContentLoading />
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
            onClick={refetch}
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
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-1 sm:px-0">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 leading-relaxed">
            Welcome back! Here's what's happening with your transfer system today.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button 
            onClick={refetch}
            disabled={isRefetching}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2.5 sm:py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <Link
            href="/admin/orders"
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 sm:py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-jordan hover:bg-jordan-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan transition-colors duration-200"
          >
            View All Orders
            <ArrowUpRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>

      {/* Stats Cards - Optimized for Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div 
              key={index} 
              className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] animate-slide-up min-h-[140px] sm:min-h-[160px]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between h-full">
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <p className="text-sm sm:text-base font-medium text-gray-600 mb-2 leading-tight">
                    {card.title}
                  </p>
                  
                  {/* Value */}
                  <p className="text-2xl sm:text-3xl lg:text-2xl font-bold text-gray-900 mb-3 leading-none break-words">
                    {card.value}
                  </p>
                  
                  {/* Change Indicator */}
                  <div className="flex items-center justify-start">
                    <div className="flex items-center">
                      {card.changeType === 'positive' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 mr-1.5 flex-shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 mr-1.5 flex-shrink-0" />
                      )}
                      <span className={`text-sm sm:text-base font-semibold ${
                        card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.change}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500 ml-1.5 hidden sm:inline">
                      vs last week
                    </span>
                    <span className="text-xs text-gray-500 ml-1.5 sm:hidden">
                      vs last week
                    </span>
                  </div>
                </div>
                
                {/* Icon */}
                <div className={`p-2.5 sm:p-3 rounded-xl bg-${card.color}-100 flex-shrink-0 ml-3`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${card.color}-600`} />
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
              <p className="text-sm text-gray-600 mt-1">Latest transfer requests requiring attention</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-sm text-jordan hover:text-jordan-dark font-medium flex items-center transition-colors duration-200 self-start sm:self-auto"
            >
              View all
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="overflow-hidden">
          {/* Mobile Card View (visible on small screens) */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {orders.map((order: RecentOrder, index: number) => (
                <div 
                  key={order.id} 
                  className="p-4 hover:bg-gray-50 transition-colors duration-150 animate-fade-in-row"
                  style={{ animationDelay: `${(index + 5) * 100}ms` }}
                  onTouchStart={() => handleOrderHover(order.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      {order.urgent && (
                        <AlertTriangle className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                      )}
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
                    <Link 
                      href={`/admin/orders/${order.id}`}
                      className="text-jordan hover:text-jordan-dark transition-colors duration-150 p-1"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(order.status)}
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{order.exchangeName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {(order.senderName || order.recipientName) && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      {order.type === 'INCOMING' ? `From: ${order.senderName}` : `To: ${order.recipientName}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Table View (hidden on small screens) */}
          <div className="hidden sm:block overflow-x-auto">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exchange
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order: RecentOrder, index: number) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50 transition-colors duration-150 animate-fade-in-row"
                    style={{ animationDelay: `${(index + 5) * 100}ms` }}
                    onMouseEnter={() => handleOrderHover(order.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {order.urgent && (
                          <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                        )}
                        {order.hasUnreadMessages && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" title="Has unread messages" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.exchangeName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          href={`/admin/orders/${order.id}`}
                          className="text-jordan hover:text-jordan-dark transition-colors duration-150"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="text-gray-400 hover:text-gray-600 transition-colors duration-150">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 animate-slide-up" style={{ animationDelay: '600ms' }}>
        <Link
          href="/admin/exchanges/new"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors duration-200 flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Add Exchange Office</h3>
              <p className="text-sm text-gray-600 mt-0.5">Create new exchange account</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/analytics"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200 flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">View Analytics</h3>
              <p className="text-sm text-gray-600 mt-0.5">System performance & insights</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors duration-200 flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">System Settings</h3>
              <p className="text-sm text-gray-600 mt-0.5">Configure banks & commissions</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
} 