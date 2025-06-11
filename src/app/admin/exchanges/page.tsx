'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Trash2,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'

// Types for exchanges
interface Exchange {
  id: string
  name: string
  username: string
  contactEmail?: string
  contactPhone?: string
  balance: number
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  
  // Commission settings
  incomingCommissionType: 'FIXED' | 'PERCENTAGE'
  incomingCommissionValue: number
  outgoingCommissionType: 'FIXED' | 'PERCENTAGE'
  outgoingCommissionValue: number
  
  // Banking configuration
  allowedIncomingBanks: string[]
  allowedOutgoingBanks: string[]
  
  // Statistics
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  totalVolume: number
  lastOrderDate?: string
  lastLoginDate?: string
}

interface ExchangeFilters {
  search: string
  status: string
  balanceRange: string
  sortBy: 'name' | 'balance' | 'orders' | 'volume' | 'created'
  sortOrder: 'asc' | 'desc'
}

export default function AdminExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([])
  const [filters, setFilters] = useState<ExchangeFilters>({
    search: '',
    status: '',
    balanceRange: '',
    sortBy: 'created',
    sortOrder: 'desc'
  })

  // Mock data - will be replaced with real API calls
  useEffect(() => {
    const loadExchanges = async () => {
      setTimeout(() => {
        setExchanges([
          {
            id: 'exc1',
            name: 'Jordan Exchange Co.',
            username: 'jordan_exchange',
            contactEmail: 'info@jordanexchange.jo',
            contactPhone: '+962796123456',
            balance: 15750.50,
            status: 'ACTIVE',
            createdAt: '2024-12-01T10:00:00Z',
            updatedAt: '2025-01-15T14:30:00Z',
            incomingCommissionType: 'PERCENTAGE',
            incomingCommissionValue: 2.0,
            outgoingCommissionType: 'FIXED',
            outgoingCommissionValue: 25.0,
            allowedIncomingBanks: ['Arab Bank', 'Jordan Ahli Bank', 'Zain Cash'],
            allowedOutgoingBanks: ['Arab Bank', 'Bank of Jordan'],
            totalOrders: 145,
            completedOrders: 138,
            pendingOrders: 7,
            totalVolume: 85640.75,
            lastOrderDate: '2025-01-15T10:30:00Z',
            lastLoginDate: '2025-01-15T09:15:00Z'
          },
          {
            id: 'exc2',
            name: 'Amman Currency Exchange',
            username: 'amman_currency',
            contactEmail: 'contact@ammancurrency.jo',
            contactPhone: '+962777987654',
            balance: -2340.25,
            status: 'ACTIVE',
            createdAt: '2024-11-15T08:00:00Z',
            updatedAt: '2025-01-15T13:45:00Z',
            incomingCommissionType: 'FIXED',
            incomingCommissionValue: 15.0,
            outgoingCommissionType: 'PERCENTAGE',
            outgoingCommissionValue: 1.5,
            allowedIncomingBanks: ['Cairo Amman Bank', 'Jordan Islamic Bank'],
            allowedOutgoingBanks: ['Cairo Amman Bank', 'Orange Money'],
            totalOrders: 89,
            completedOrders: 82,
            pendingOrders: 3,
            totalVolume: 67890.20,
            lastOrderDate: '2025-01-15T09:45:00Z',
            lastLoginDate: '2025-01-15T08:30:00Z'
          },
          {
            id: 'exc3',
            name: 'Capital Exchange',
            username: 'capital_exchange',
            contactEmail: 'admin@capitalex.jo',
            contactPhone: '+962798765432',
            balance: 8920.00,
            status: 'ACTIVE',
            createdAt: '2024-10-10T12:00:00Z',
            updatedAt: '2025-01-15T16:20:00Z',
            incomingCommissionType: 'PERCENTAGE',
            incomingCommissionValue: 1.8,
            outgoingCommissionType: 'PERCENTAGE',
            outgoingCommissionValue: 2.2,
            allowedIncomingBanks: ['Bank of Jordan', 'UWallet', 'DInarak'],
            allowedOutgoingBanks: ['Bank of Jordan', 'Arab Bank'],
            totalOrders: 203,
            completedOrders: 195,
            pendingOrders: 8,
            totalVolume: 125430.80,
            lastOrderDate: '2025-01-15T08:20:00Z',
            lastLoginDate: '2025-01-14T19:45:00Z'
          },
          {
            id: 'exc4',
            name: 'Downtown Exchange',
            username: 'downtown_ex',
            contactEmail: 'info@downtownex.jo',
            contactPhone: '+962785123456',
            balance: 450.75,
            status: 'INACTIVE',
            createdAt: '2024-09-20T15:30:00Z',
            updatedAt: '2025-01-10T11:00:00Z',
            incomingCommissionType: 'FIXED',
            incomingCommissionValue: 20.0,
            outgoingCommissionType: 'FIXED',
            outgoingCommissionValue: 30.0,
            allowedIncomingBanks: ['Zain Cash', 'Orange Money'],
            allowedOutgoingBanks: ['Jordan Ahli Bank'],
            totalOrders: 56,
            completedOrders: 52,
            pendingOrders: 4,
            totalVolume: 23450.60,
            lastOrderDate: '2025-01-10T10:15:00Z',
            lastLoginDate: '2025-01-08T14:20:00Z'
          },
          {
            id: 'exc5',
            name: 'City Exchange',
            username: 'city_exchange',
            contactEmail: 'support@cityex.jo',
            contactPhone: '+962776543210',
            balance: 0.00,
            status: 'SUSPENDED',
            createdAt: '2024-08-05T09:00:00Z',
            updatedAt: '2025-01-05T10:30:00Z',
            incomingCommissionType: 'PERCENTAGE',
            incomingCommissionValue: 2.5,
            outgoingCommissionType: 'PERCENTAGE',
            outgoingCommissionValue: 2.8,
            allowedIncomingBanks: ['Arab Bank'],
            allowedOutgoingBanks: ['Arab Bank'],
            totalOrders: 12,
            completedOrders: 8,
            pendingOrders: 4,
            totalVolume: 8920.40,
            lastOrderDate: '2025-01-02T15:45:00Z',
            lastLoginDate: '2025-01-02T15:30:00Z'
          }
        ])
        setIsLoading(false)
      }, 1000)
    }

    loadExchanges()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'INACTIVE':
        return <XCircle className="w-4 h-4 text-gray-500" />
      case 'SUSPENDED':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600'
    if (balance < 0) return 'text-red-600'
    return 'text-gray-600'
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

  const formatCommission = (type: 'FIXED' | 'PERCENTAGE', value: number) => {
    return type === 'FIXED' ? `${value} JOD` : `${value}%`
  }

  // Filter and sort exchanges
  const filteredExchanges = exchanges.filter(exchange => {
    if (filters.search && !exchange.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !exchange.username.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.status && exchange.status !== filters.status) return false
    
    if (filters.balanceRange) {
      switch (filters.balanceRange) {
        case 'positive':
          if (exchange.balance <= 0) return false
          break
        case 'negative':
          if (exchange.balance >= 0) return false
          break
        case 'zero':
          if (exchange.balance !== 0) return false
          break
      }
    }
    
    return true
  })

  const sortedExchanges = [...filteredExchanges].sort((a, b) => {
    let comparison = 0
    switch (filters.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'balance':
        comparison = a.balance - b.balance
        break
      case 'orders':
        comparison = a.totalOrders - b.totalOrders
        break
      case 'volume':
        comparison = a.totalVolume - b.totalVolume
        break
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
    }
    return filters.sortOrder === 'asc' ? comparison : -comparison
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner 
          size="lg"
          text="Loading Exchange Offices"
          subtext="Fetching exchange office data and configurations..."
          className="py-16"
        />
      </div>
    )
  }

  // Calculate summary statistics
  const totalExchanges = exchanges.length
  const activeExchanges = exchanges.filter(e => e.status === 'ACTIVE').length
  const totalBalance = exchanges.reduce((sum, e) => sum + e.balance, 0)
  const totalVolume = exchanges.reduce((sum, e) => sum + e.totalVolume, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exchange Offices</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage exchange office accounts and configurations
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
          
          <Link
            href="/admin/exchanges/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-jordan hover:bg-jordan-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exchange Office
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Exchanges</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalExchanges}</p>
              <p className="text-sm text-gray-500 mt-1">{activeExchanges} active</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className={`text-2xl font-bold mt-1 ${getBalanceColor(totalBalance)}`}>
                {totalBalance.toLocaleString()} JOD
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {exchanges.filter(e => e.balance > 0).length} positive
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalVolume.toLocaleString()} JOD
              </p>
              <p className="text-sm text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {exchanges.reduce((sum, e) => sum + e.totalOrders, 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {exchanges.reduce((sum, e) => sum + e.pendingOrders, 0)} pending
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
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
                  placeholder="Exchange name or username..."
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
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
              <select
                value={filters.balanceRange}
                onChange={(e) => setFilters({...filters, balanceRange: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
              >
                <option value="">All Balances</option>
                <option value="positive">Positive Balance</option>
                <option value="negative">Negative Balance</option>
                <option value="zero">Zero Balance</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="flex space-x-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
                >
                  <option value="created">Date Created</option>
                  <option value="name">Name</option>
                  <option value="balance">Balance</option>
                  <option value="orders">Orders</option>
                  <option value="volume">Volume</option>
                </select>
                <button
                  onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchanges Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Exchange Offices ({sortedExchanges.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {sortedExchanges.filter(e => e.status === 'ACTIVE').length} active, {' '}
                {sortedExchanges.filter(e => e.pendingOrders > 0).length} with pending orders
              </p>
            </div>
            
            {selectedExchanges.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedExchanges.length} selected
                </span>
                <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                  Activate
                </button>
                <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                  Deactivate
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
                  Exchange Office
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders & Volume
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedExchanges.map((exchange) => (
                <tr key={exchange.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-jordan focus:ring-jordan"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-jordan rounded-lg flex items-center justify-center mr-4">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {exchange.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{exchange.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {exchange.contactEmail && (
                        <div className="flex items-center mb-1">
                          <Mail className="w-3 h-3 text-gray-400 mr-1" />
                          {exchange.contactEmail}
                        </div>
                      )}
                      {exchange.contactPhone && (
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 text-gray-400 mr-1" />
                          {exchange.contactPhone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getBalanceColor(exchange.balance)}`}>
                      {exchange.balance.toLocaleString()} JOD
                    </div>
                    <div className="text-xs text-gray-500">
                      In: {formatCommission(exchange.incomingCommissionType, exchange.incomingCommissionValue)} | 
                      Out: {formatCommission(exchange.outgoingCommissionType, exchange.outgoingCommissionValue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {exchange.totalOrders.toLocaleString()} orders
                    </div>
                    <div className="text-sm text-gray-500">
                      {exchange.totalVolume.toLocaleString()} JOD volume
                    </div>
                    {exchange.pendingOrders > 0 && (
                      <div className="text-xs text-orange-600">
                        {exchange.pendingOrders} pending
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(exchange.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(exchange.status)}`}>
                        {exchange.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {exchange.lastOrderDate ? formatJordanTime(exchange.lastOrderDate) : 'No orders'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Login: {exchange.lastLoginDate ? formatJordanTime(exchange.lastLoginDate) : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/admin/exchanges/${exchange.id}`}
                        className="text-jordan hover:text-jordan-dark p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/exchanges/${exchange.id}/edit`}
                        className="text-blue-600 hover:text-blue-700 p-1 rounded"
                        title="Edit Exchange"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        className="text-gray-400 hover:text-gray-600 p-1 rounded"
                        title="More Actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedExchanges.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exchange offices found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status || filters.balanceRange
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first exchange office account.'
              }
            </p>
            <Link
              href="/admin/exchanges/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-jordan hover:bg-jordan-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Exchange Office
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 