'use client'

import React, { useState, useMemo } from 'react'
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
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { useExchangesData, usePrefetchExchangeDetails } from '@/hooks/useOptimizedQueries'

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
  balanceRange: string
  sortBy: 'name' | 'balance' | 'orders' | 'volume' | 'created'
  sortOrder: 'asc' | 'desc'
}

interface ExchangeStats {
  totalExchanges: number
  totalExchangesChange: number
  activeExchanges: number
  activeExchangesChange: number
  totalBalance: number
  totalBalanceChange: number
  totalVolume: number
  totalVolumeChange: number
  totalOrders: number
  pendingOrders: number
}

// Clean Loading Component for Exchanges
function ExchangesContentLoading() {
  return (
    <div className="space-y-6">
      <LoadingSpinner 
        size="lg"
        text="Loading Exchange Offices"
        subtext="Please wait while we fetch exchange office data and configurations"
        className="py-16"
      />
    </div>
  )
}

export default function AdminExchangesPage() {
  // Use optimized hooks for data fetching
  const { exchanges, stats, isLoading, isError, error, isRefetching, refetch } = useExchangesData()
  const prefetchExchangeDetails = usePrefetchExchangeDetails()

  const [showFilters, setShowFilters] = useState(false)
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([])
  const [filters, setFilters] = useState<ExchangeFilters>({
    search: '',
    balanceRange: '',
    sortBy: 'created',
    sortOrder: 'desc'
  })

  // Handle prefetching on hover for better UX
  const handleExchangeHover = (exchangeId: string) => {
    prefetchExchangeDetails(exchangeId)
  }

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

  // Filter and sort exchanges with useMemo for performance
  const { filteredExchanges, sortedExchanges } = useMemo(() => {
    const filtered = exchanges.filter((exchange: Exchange) => {
      if (filters.search && 
          !exchange.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !exchange.username.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      // Status filtering removed since schema doesn't have status field
      
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

    const sorted = [...filtered].sort((a: Exchange, b: Exchange) => {
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

    return { filteredExchanges: filtered, sortedExchanges: sorted }
  }, [exchanges, filters])

  // Calculate summary statistics from actual data or use stats from API
  const summaryStats = useMemo(() => {
    if (stats) return stats

    // Fallback calculations from exchanges data
    const totalExchanges = exchanges.length
    const activeExchanges = exchanges.length // All exchanges considered active
    const totalBalance = exchanges.reduce((sum: number, e: Exchange) => sum + e.balance, 0)
    const totalVolume = exchanges.reduce((sum: number, e: Exchange) => sum + e.totalVolume, 0)
    const totalOrders = exchanges.reduce((sum: number, e: Exchange) => sum + e.totalOrders, 0)
    const pendingOrders = exchanges.reduce((sum: number, e: Exchange) => sum + e.pendingOrders, 0)

    return {
      totalExchanges,
      activeExchanges,
      totalBalance,
      totalVolume,
      totalOrders,
      pendingOrders,
      totalExchangesChange: 0,
      activeExchangesChange: 0,
      totalBalanceChange: 0,
      totalVolumeChange: 0
    }
  }, [exchanges, stats])

  const statCards = useMemo(() => {
    if (!summaryStats) return []
    
    return [
      {
        title: 'Total Exchanges',
        value: summaryStats.totalExchanges.toString(),
        change: `${summaryStats.totalExchangesChange >= 0 ? '+' : ''}${summaryStats.totalExchangesChange.toFixed(1)}%`,
        changeType: summaryStats.totalExchangesChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: Building2,
        color: 'blue',
        subtext: `${summaryStats.activeExchanges} active`
      },
      {
        title: 'Total Balance',
        value: `${summaryStats.totalBalance.toLocaleString()} JOD`,
        change: `${summaryStats.totalBalanceChange >= 0 ? '+' : ''}${summaryStats.totalBalanceChange.toFixed(1)}%`,
        changeType: summaryStats.totalBalanceChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: DollarSign,
        color: 'green',
        subtext: `${exchanges.filter((e: Exchange) => e.balance > 0).length} positive`
      },
      {
        title: 'Total Volume',
        value: `${summaryStats.totalVolume.toLocaleString()} JOD`,
        change: `${summaryStats.totalVolumeChange >= 0 ? '+' : ''}${summaryStats.totalVolumeChange.toFixed(1)}%`,
        changeType: summaryStats.totalVolumeChange >= 0 ? 'positive' as const : 'negative' as const,
        icon: TrendingUp,
        color: 'purple',
        subtext: 'All time'
      },
      {
        title: 'Total Orders',
        value: summaryStats.totalOrders.toLocaleString(),
        change: `${summaryStats.pendingOrders} pending`,
        changeType: 'neutral' as const,
        icon: Users,
        color: 'yellow',
        subtext: 'All exchanges'
      }
    ]
  }, [summaryStats, exchanges])

  // Show enhanced loading state
  if (isLoading) {
    return <ExchangesContentLoading />
  }

  // Show error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-medium">Error Loading Exchanges</h3>
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
            Exchange Offices
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 leading-relaxed">
            Manage exchange office accounts, configurations, and monitor their performance.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2.5 sm:py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <button 
            onClick={refetch}
            disabled={isRefetching}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2.5 sm:py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <Link
            href="/admin/exchanges/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 sm:py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-jordan hover:bg-jordan-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jordan transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exchange Office
          </Link>
        </div>
      </div>

      {/* Stats Cards - Optimized for Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div 
              key={index} 
              className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5 lg:p-6 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] animate-slide-up min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col h-full">
                {/* Title and Icon - Inline */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600 leading-tight">
                    {card.title}
                  </p>
                  <div className={`p-1.5 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-${card.color}-100 flex-shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-${card.color}-600`} />
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  {/* Value */}
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 leading-none break-words">
                    {card.value}
                  </p>
                </div>
                
                {/* Change Indicator - Bottom */}
                <div className="flex items-center justify-start mt-auto">
                  <div className="flex items-center">
                    {card.changeType === 'positive' ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-green-500 mr-1 sm:mr-1.5 flex-shrink-0" />
                    ) : card.changeType === 'negative' ? (
                      <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-red-500 mr-1 sm:mr-1.5 flex-shrink-0" />
                    ) : null}
                    <span className={`text-xs sm:text-sm lg:text-base font-semibold ${
                      card.changeType === 'positive' ? 'text-green-600' : 
                      card.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {card.change}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 ml-1 sm:ml-1.5 hidden sm:inline">
                    {card.subtext}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 animate-slide-up">
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
                  className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
                />
              </div>
            </div>
            
            {/* Status filter removed since schema doesn't have status field */}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Balance</label>
              <select
                value={filters.balanceRange}
                onChange={(e) => setFilters({...filters, balanceRange: e.target.value})}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
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
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-jordan focus:ring-jordan text-sm"
                >
                  <option value="created">Date Created</option>
                  <option value="name">Name</option>
                  <option value="balance">Balance</option>
                  <option value="orders">Orders</option>
                  <option value="volume">Volume</option>
                </select>
                <button
                  onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchanges Table/Cards - Mobile Optimized */}
      <div className="bg-white rounded-xl border border-gray-200 animate-slide-up overflow-hidden" style={{ animationDelay: '400ms' }}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-medium text-gray-900">
                Exchange Offices ({sortedExchanges.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {sortedExchanges.length} total exchanges, {' '}
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

        <div className="overflow-hidden">
          {/* Mobile Card View (visible on small screens) */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {sortedExchanges.map((exchange: Exchange, index: number) => (
                <div 
                  key={exchange.id} 
                  className="p-4 hover:bg-gray-50 transition-colors duration-150 animate-fade-in-row"
                  style={{ animationDelay: `${(index + 5) * 100}ms` }}
                  onTouchStart={() => handleExchangeHover(exchange.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      <div className="w-10 h-10 bg-jordan rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {exchange.name}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          @{exchange.username}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(exchange.status)}`}>
                            {exchange.status}
                          </span>
                          <span className={`text-sm font-semibold ${getBalanceColor(exchange.balance)}`}>
                            {exchange.balance.toLocaleString()} JOD
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link 
                      href={`/admin/exchanges/${exchange.id}`}
                      className="text-jordan hover:text-jordan-dark transition-colors duration-150 p-1"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Orders:</span>
                      <span className="ml-1 font-medium">{exchange.totalOrders}</span>
                      {exchange.pendingOrders > 0 && (
                        <span className="ml-1 text-orange-600">({exchange.pendingOrders} pending)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Volume:</span>
                      <span className="ml-1 font-medium">{exchange.totalVolume.toLocaleString()} JOD</span>
                    </div>
                  </div>
                  
                  {exchange.contactEmail && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                      <Mail className="w-3 h-3 inline mr-1" />
                      {exchange.contactEmail}
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
                {sortedExchanges.map((exchange: Exchange, index: number) => (
                  <tr 
                    key={exchange.id} 
                    className="hover:bg-gray-50 transition-colors duration-150 animate-fade-in-row"
                    style={{ animationDelay: `${(index + 5) * 100}ms` }}
                    onMouseEnter={() => handleExchangeHover(exchange.id)}
                  >
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
                          className="text-jordan hover:text-jordan-dark transition-colors duration-150"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/exchanges/${exchange.id}/edit`}
                          className="text-blue-600 hover:text-blue-700 transition-colors duration-150"
                          title="Edit Exchange"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
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
        </div>

        {sortedExchanges.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exchange offices found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.balanceRange
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

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 animate-slide-up" style={{ animationDelay: '600ms' }}>
        <Link
          href="/admin/exchanges/new"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors duration-200 flex-shrink-0">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Add New Exchange</h3>
              <p className="text-sm text-gray-600 mt-0.5">Create a new exchange office account</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/exchanges/settings"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200 flex-shrink-0">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Exchange Settings</h3>
              <p className="text-sm text-gray-600 mt-0.5">Configure global exchange settings</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/exchanges/analytics"
          className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 group transform hover:scale-[1.02]"
        >
          <div className="flex items-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors duration-200 flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Exchange Analytics</h3>
              <p className="text-sm text-gray-600 mt-0.5">View detailed performance analytics</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
} 