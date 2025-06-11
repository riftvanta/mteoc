'use client'

import React, { useState, useMemo } from 'react'
import { 
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  X,
  Download,
  Share2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { useExchangeOrders, usePrefetchExchangeOrderDetails } from '@/hooks/useExchangeQueries'
import { useAuth } from '@/hooks/useAuth'
import { formatJordanTime } from '@/utils/timezone'

type OrderStatus = 'ALL' | 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
type OrderType = 'ALL' | 'INCOMING' | 'OUTGOING'
type SortField = 'created_at' | 'amount' | 'status' | 'order_number'
type SortDirection = 'asc' | 'desc'

interface FilterState {
  search: string
  status: OrderStatus
  type: OrderType
  dateFrom: string
  dateTo: string
}

interface SortState {
  field: SortField
  direction: SortDirection
}

export default function ExchangeOrdersPage() {
  const { exchangeName } = useAuth()
  const { data: orders = [], isLoading, isError, error, isRefetching, refetch } = useExchangeOrders()
  const prefetchOrderDetails = usePrefetchExchangeOrderDetails()

  // Filters and search state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'ALL',
    type: 'ALL',
    dateFrom: '',
    dateTo: ''
  })

  // Sort state
  const [sort, setSort] = useState<SortState>({
    field: 'created_at',
    direction: 'desc'
  })

  // Show filters panel
  const [showFilters, setShowFilters] = useState(false)

  // Prefetch order details on hover
  const handleOrderHover = (orderId: string) => {
    prefetchOrderDetails(orderId)
  }

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.senderName?.toLowerCase().includes(searchLower) ||
        order.recipientName?.toLowerCase().includes(searchLower) ||
        order.bankName?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(order => order.status === filters.status)
    }

    // Apply type filter
    if (filters.type !== 'ALL') {
      filtered = filtered.filter(order => order.type === filters.type)
    }

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(order => new Date(order.createdAt) >= fromDate)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(order => new Date(order.createdAt) <= toDate)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sort.field) {
        case 'created_at':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'order_number':
          aValue = a.orderNumber
          bValue = b.orderNumber
          break
        default:
          return 0
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [orders, filters, sort])

  // Status icon helper
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

  // Status badge class helper
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

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'ALL',
      type: 'ALL',
      dateFrom: '',
      dateTo: ''
    })
  }

  // Handle sort change
  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner 
          size="lg"
          text="Loading Your Orders"
          subtext="Please wait while we fetch your order history"
          className="py-16"
        />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-medium">Error Loading Orders</h3>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            My Orders
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            View and manage all your transfer orders
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2.5 border rounded-lg font-medium transition-colors ${
                showFilters || filters.status !== 'ALL' || filters.type !== 'ALL' || filters.dateFrom || filters.dateTo
                  ? 'border-jordan bg-jordan text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </button>

            <Link
              href="/exchange/orders/new"
              className="inline-flex items-center px-4 py-2.5 bg-jordan text-white rounded-lg font-medium hover:bg-jordan-dark transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Link>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as OrderStatus }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as OrderType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
              >
                <option value="ALL">All Types</option>
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Results header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedOrders.length} of {orders.length} orders
            </p>
          </div>
        </div>

        {filteredAndSortedOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <AlertTriangle className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">
              {orders.length === 0 
                ? "You haven't created any orders yet."
                : "No orders match your current filters."
              }
            </p>
            {orders.length === 0 ? (
              <Link
                href="/exchange/orders/new"
                className="inline-flex items-center px-4 py-2 bg-jordan text-white rounded-lg font-medium hover:bg-jordan-dark transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Order
              </Link>
            ) : (
              <button
                onClick={clearFilters}
                className="text-jordan hover:text-jordan-dark font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-gray-200">
              {filteredAndSortedOrders.map((order, index) => (
                <div 
                  key={order.id} 
                  className="p-4 hover:bg-gray-50 transition-colors"
                  onTouchStart={() => handleOrderHover(order.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      {order.hasUnreadMessages && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0" />
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
                        <button className="text-jordan hover:text-jordan-dark p-1">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <Link 
                        href={`/exchange/orders/${order.id}`}
                        className="text-jordan hover:text-jordan-dark p-1"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
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
                    <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2">
                      {order.type === 'INCOMING' ? `From: ${order.senderName}` : `To: ${order.recipientName}`}
                    </div>
                  )}

                  {/* Quick Actions */}
                  {(order.canEdit || order.canCancel) && (
                    <div className="flex space-x-2">
                      {order.canEdit && (
                        <Link
                          href={`/exchange/orders/${order.id}/edit`}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                        >
                          Edit
                        </Link>
                      )}
                      {order.canCancel && (
                        <button className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors">
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('order_number')}
                    >
                      <div className="flex items-center">
                        Order
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center">
                        Amount
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Created
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedOrders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 transition-colors"
                      onMouseEnter={() => handleOrderHover(order.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.hasUnreadMessages && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            {(order.senderName || order.recipientName) && (
                              <div className="text-xs text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatJordanTime(order.createdAt, 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {order.canEdit && (
                            <Link
                              href={`/exchange/orders/${order.id}/edit`}
                              className="text-gray-600 hover:text-jordan transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>
                          )}
                          {order.canDownload && (
                            <button className="text-jordan hover:text-jordan-dark transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <Link 
                            href={`/exchange/orders/${order.id}`}
                            className="text-jordan hover:text-jordan-dark transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 