'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'

// Interfaces for Exchange Dashboard Data
export interface ExchangeStats {
  currentBalance: number
  balanceChange: number
  totalOrders: number
  ordersChange: number
  pendingOrders: number
  completedOrders: number
  thisWeekVolume: number
  volumeChange: number
}

export interface ExchangeOrder {
  id: string
  orderNumber: string
  type: 'INCOMING' | 'OUTGOING'
  status: string
  amount: number
  commission: number
  netAmount: number
  createdAt: string
  updatedAt?: string
  canEdit: boolean
  canCancel: boolean
  canDownload: boolean
  hasUnreadMessages?: boolean
  senderName?: string
  recipientName?: string
  bankName?: string
  cliqBankAliasName?: string
  cliqBankAliasMobile?: string
  paymentProofUrl?: string
  completionProofUrl?: string
  rejectionReason?: string
  exchangeId?: string
  exchangeName?: string
  messages?: Array<{
    id: string
    content: string
    senderType: string
    createdAt: string
  }>
}

// API Functions
async function fetchExchangeStats(exchangeId: string): Promise<ExchangeStats> {
  const response = await fetch(`/api/exchange/stats?exchangeId=${exchangeId}`)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Stats API error: ${response.status} - ${error}`)
  }
  return response.json()
}

async function fetchExchangeOrders(exchangeId: string, limit?: number): Promise<ExchangeOrder[]> {
  const params = new URLSearchParams({ exchangeId })
  if (limit) params.append('limit', limit.toString())
  
  const response = await fetch(`/api/exchange/orders?${params}`)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Orders API error: ${response.status} - ${error}`)
  }
  return response.json()
}

async function fetchExchangeOrder(orderId: string): Promise<ExchangeOrder> {
  const response = await fetch(`/api/exchange/orders/${orderId}`)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Order details API error: ${response.status} - ${error}`)
  }
  return response.json()
}

// Query Keys
export const exchangeQueryKeys = {
  all: ['exchange'] as const,
  stats: (exchangeId: string) => [...exchangeQueryKeys.all, 'stats', exchangeId] as const,
  orders: (exchangeId: string) => [...exchangeQueryKeys.all, 'orders', exchangeId] as const,
  order: (orderId: string) => [...exchangeQueryKeys.all, 'order', orderId] as const,
  recentOrders: (exchangeId: string) => [...exchangeQueryKeys.orders(exchangeId), 'recent'] as const,
}

// Hooks
export function useExchangeStats() {
  const { exchangeId } = useAuth()
  
  return useQuery({
    queryKey: exchangeQueryKeys.stats(exchangeId || ''),
    queryFn: () => fetchExchangeStats(exchangeId!),
    enabled: !!exchangeId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useExchangeOrders(limit?: number) {
  const { exchangeId } = useAuth()
  
  return useQuery({
    queryKey: limit 
      ? exchangeQueryKeys.recentOrders(exchangeId || '')
      : exchangeQueryKeys.orders(exchangeId || ''),
    queryFn: () => fetchExchangeOrders(exchangeId!, limit),
    enabled: !!exchangeId,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useExchangeOrder(orderId: string) {
  return useQuery({
    queryKey: exchangeQueryKeys.order(orderId),
    queryFn: () => fetchExchangeOrder(orderId),
    enabled: !!orderId,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Combined Dashboard Data Hook
export function useExchangeDashboardData() {
  const { exchangeId } = useAuth()
  const queryClient = useQueryClient()
  
  const statsQuery = useExchangeStats()
  const ordersQuery = useExchangeOrders(10) // Get recent 10 orders for dashboard
  
  // Combined loading state
  const isLoading = statsQuery.isLoading || ordersQuery.isLoading
  const isError = statsQuery.isError || ordersQuery.isError
  const error = statsQuery.error || ordersQuery.error
  
  // Combined refetching state
  const isRefetching = statsQuery.isRefetching || ordersQuery.isRefetching
  
  // Manual refetch function
  const refetch = async () => {
    await Promise.all([
      statsQuery.refetch(),
      ordersQuery.refetch()
    ])
  }
  
  // Invalidate and refetch
  const invalidateAndRefetch = async () => {
    if (exchangeId) {
      await queryClient.invalidateQueries({
        queryKey: exchangeQueryKeys.all
      })
      await refetch()
    }
  }
  
  return {
    stats: statsQuery.data,
    orders: ordersQuery.data || [],
    isLoading,
    isError,
    error: error as Error | null,
    isRefetching,
    refetch,
    invalidateAndRefetch,
    
    // Individual query states for more granular control
    statsQuery,
    ordersQuery,
  }
}

// Prefetch Hook for Order Details
export function usePrefetchExchangeOrderDetails() {
  const queryClient = useQueryClient()
  
  const prefetchOrderDetails = (orderId: string) => {
    queryClient.prefetchQuery({
      queryKey: exchangeQueryKeys.order(orderId),
      queryFn: () => fetchExchangeOrder(orderId),
      staleTime: 1000 * 60 * 2, // 2 minutes
    })
  }
  
  return prefetchOrderDetails
}

// Optimistic Updates Helper
export function useExchangeOptimisticUpdates() {
  const queryClient = useQueryClient()
  const { exchangeId } = useAuth()
  
  const updateOrderOptimistically = (orderId: string, updates: Partial<ExchangeOrder>) => {
    if (!exchangeId) return
    
    // Update individual order
    queryClient.setQueryData(
      exchangeQueryKeys.order(orderId),
      (old: ExchangeOrder | undefined) => old ? { ...old, ...updates } : undefined
    )
    
    // Update orders list
    queryClient.setQueryData(
      exchangeQueryKeys.orders(exchangeId),
      (old: ExchangeOrder[] | undefined) => 
        old?.map(order => order.id === orderId ? { ...order, ...updates } : order)
    )
    
    // Update recent orders
    queryClient.setQueryData(
      exchangeQueryKeys.recentOrders(exchangeId),
      (old: ExchangeOrder[] | undefined) => 
        old?.map(order => order.id === orderId ? { ...order, ...updates } : order)
    )
  }
  
  const addNewOrderOptimistically = (newOrder: ExchangeOrder) => {
    if (!exchangeId) return
    
    // Add to orders list
    queryClient.setQueryData(
      exchangeQueryKeys.orders(exchangeId),
      (old: ExchangeOrder[] | undefined) => [newOrder, ...(old || [])]
    )
    
    // Add to recent orders
    queryClient.setQueryData(
      exchangeQueryKeys.recentOrders(exchangeId),
      (old: ExchangeOrder[] | undefined) => [newOrder, ...(old || [])].slice(0, 10)
    )
  }
  
  const removeOrderOptimistically = (orderId: string) => {
    if (!exchangeId) return
    
    // Remove from orders list
    queryClient.setQueryData(
      exchangeQueryKeys.orders(exchangeId),
      (old: ExchangeOrder[] | undefined) => old?.filter(order => order.id !== orderId)
    )
    
    // Remove from recent orders
    queryClient.setQueryData(
      exchangeQueryKeys.recentOrders(exchangeId),
      (old: ExchangeOrder[] | undefined) => old?.filter(order => order.id !== orderId)
    )
    
    // Remove individual order cache
    queryClient.removeQueries({
      queryKey: exchangeQueryKeys.order(orderId)
    })
  }
  
  return {
    updateOrderOptimistically,
    addNewOrderOptimistically,
    removeOrderOptimistically,
  }
} 