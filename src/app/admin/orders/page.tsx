'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  Check,
  X,
  Clock,
  Upload,
  Download,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  FileText,
  Calendar,
  DollarSign,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'

// Types for orders
interface Order {
  id: string
  orderNumber: string
  type: 'INCOMING' | 'OUTGOING'
  status: 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
  amount: number
  commission: number
  netAmount: number
  exchangeName: string
  exchangeId: string
  senderName?: string
  recipientName?: string
  bankName?: string
  cliqBankAliasName?: string
  cliqMobileNumber?: string
  paymentProofUrl?: string
  completionProofUrl?: string
  rejectionReason?: string
  cancellationRequested: boolean
  createdAt: string
  updatedAt: string
  approvedAt?: string
  completedAt?: string
  urgent?: boolean
  hasUnreadMessages?: boolean
}

interface OrderFilters {
  search: string
  status: string
  type: string
  exchange: string
  dateFrom: string
  dateTo: string
  urgent: boolean
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: '',
    type: '',
    exchange: '',
    dateFrom: '',
    dateTo: '',
    urgent: false
  })

  // Load orders from API
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true)
        
        // Build query parameters
        const params = new URLSearchParams()
        if (filters.search) params.append('search', filters.search)
        if (filters.status) params.append('status', filters.status)
        if (filters.type) params.append('type', filters.type)
        if (filters.exchange) params.append('exchange', filters.exchange)
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
        if (filters.dateTo) params.append('dateTo', filters.dateTo)
        if (filters.urgent) params.append('urgent', 'true')
        
        const response = await fetch(`/api/admin/orders?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders')
        }
        
        const data = await response.json()
        setOrders(data.orders || [])
      } catch (error) {
        console.error('Error loading orders:', error)
        setOrders([])
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [filters])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Check className="w-4 h-4 text-green-500" />
      case 'PENDING_REVIEW':
      case 'SUBMITTED':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'PROCESSING':
        return <RefreshCw className="w-4 h-4 text-blue-500" />
      case 'REJECTED':
        return <X className="w-4 h-4 text-red-500" />
      case 'APPROVED':
        return <Check className="w-4 h-4 text-green-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionButtons = (order: Order) => {
    const handleAction = async (action: string, orderId: string) => {
      try {
        let endpoint = ''
        let method = 'POST'
        let body: any = {}

        switch (action) {
          case 'approve':
            endpoint = `/api/admin/orders/${orderId}/approve`
            break
          case 'reject':
            const reason = prompt('Please provide a rejection reason:')
            if (!reason) return
            endpoint = `/api/admin/orders/${orderId}/reject`
            body = { reason }
            break
          case 'complete':
            endpoint = `/api/admin/orders/${orderId}/complete`
            if (order.type === 'INCOMING') {
              const actualAmount = prompt(`Confirm actual amount received (original: ${order.amount} JOD):`, order.amount.toString())
              if (actualAmount && parseFloat(actualAmount) !== order.amount) {
                body = { actualAmount: parseFloat(actualAmount) }
              }
            }
            break
          case 'upload':
            // Redirect to order detail page for file upload
            window.location.href = `/admin/orders/${orderId}`
            return
          case 'download':
            if (order.completionProofUrl) {
              window.open(order.completionProofUrl, '_blank')
            }
            return
        }

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to ${action} order`)
        }

        const result = await response.json()
        alert(`${result.message}`)
        
        // Reload the page to refresh data
        window.location.reload()
      } catch (error) {
        console.error(`Error ${action}ing order:`, error)
        alert(error instanceof Error ? error.message : `Failed to ${action} order`)
      }
    }

    switch (order.status) {
      case 'SUBMITTED':
      case 'PENDING_REVIEW':
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleAction('approve', order.id)}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Approve Order"
            >
              <Check className="w-3 h-3 mr-1" />
              Approve
            </button>
            <button
              onClick={() => handleAction('reject', order.id)}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              title="Reject Order"
            >
              <X className="w-3 h-3 mr-1" />
              Reject
            </button>
          </div>
        )
      case 'PROCESSING':
        if (order.type === 'OUTGOING') {
          return (
            <button
              onClick={() => handleAction('upload', order.id)}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Upload Completion Screenshot"
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </button>
          )
        } else {
          return (
            <button
              onClick={() => handleAction('complete', order.id)}
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Mark as Completed"
            >
              <Check className="w-3 h-3 mr-1" />
              Complete
            </button>
          )
        }
      case 'COMPLETED':
        if (order.completionProofUrl) {
          return (
            <button
              onClick={() => handleAction('download', order.id)}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              title="Download Screenshot"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </button>
          )
        }
        return null
      default:
        return null
    }
  }

  const formatJordanTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      timeZone: 'Asia/Amman',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredOrders = orders.filter(order => {
    if (filters.search && !order.orderNumber.toLowerCase().includes(filters.search.toLowerCase()) &&
        !order.exchangeName.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.status && order.status !== filters.status) return false
    if (filters.type && order.type !== filters.type) return false
    if (filters.exchange && order.exchangeId !== filters.exchange) return false
    if (filters.urgent && !order.urgent) return false
    return true
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'amount':
        comparison = a.amount - b.amount
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner 
          size="lg"
          text="Loading Orders"
          subtext="Fetching transfer orders and transaction data..."
          className="py-16"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage all transfer orders from exchange offices
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Order number or exchange..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
              >
                <option value="">All Types</option>
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.urgent}
                onChange={(e) => setFilters({...filters, urgent: e.target.checked})}
                className="rounded border-gray-300 text-jordan focus:ring-jordan"
              />
              <span className="ml-2 text-sm text-gray-700">Show only urgent orders</span>
            </label>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Orders ({sortedOrders.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {sortedOrders.filter(o => ['SUBMITTED', 'PENDING_REVIEW'].includes(o.status)).length} pending review
              </p>
            </div>
            
            {selectedOrders.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedOrders.length} selected
                </span>
                <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                  Bulk Approve
                </button>
                <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                  Bulk Reject
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-jordan focus:ring-jordan"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exchange
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-jordan focus:ring-jordan"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {order.urgent && (
                        <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                      )}
                      {order.hasUnreadMessages && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.type === 'INCOMING' ? order.senderName : order.recipientName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        order.type === 'INCOMING' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.type === 'INCOMING' ? '↓ IN' : '↑ OUT'}
                      </span>
                      {order.amount.toLocaleString()} JOD
                    </div>
                    <div className="text-sm text-gray-500">
                      Fee: {order.commission.toLocaleString()} JOD
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(order.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    {order.cancellationRequested && (
                      <div className="text-xs text-orange-600 mt-1">
                        Cancellation requested
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{order.exchangeName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatJordanTime(order.createdAt)}
                    </div>
                    {order.status !== 'SUBMITTED' && order.updatedAt !== order.createdAt && (
                      <div className="text-xs text-gray-500">
                        Updated: {formatJordanTime(order.updatedAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-jordan hover:text-jordan-dark"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {order.hasUnreadMessages && (
                        <Link
                          href={`/admin/orders/${order.id}/chat`}
                          className="text-blue-600 hover:text-blue-700"
                          title="View Messages"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                      )}
                      {getActionButtons(order)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedOrders.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {filters.search || filters.status || filters.type || filters.exchange || filters.urgent
                ? 'Try adjusting your filters to see more results.'
                : 'No orders have been submitted yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 