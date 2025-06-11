/**
 * Optimized React Query hooks for dashboard data with intelligent caching and error handling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { getAdaptiveConfig } from '@/lib/performance'

const adaptiveConfig = getAdaptiveConfig()

// Query keys for consistency
export const queryKeys = {
  dashboardStats: ['dashboard', 'stats'] as const,
  recentOrders: (limit: number) => ['dashboard', 'recent-orders', limit] as const,
  orderDetails: (id: string) => ['order', id] as const,
  exchangeDetails: (id: string) => ['exchange', id] as const,
  ordersByExchange: (exchangeId: string, page: number) => ['orders', 'exchange', exchangeId, page] as const,
  exchangesList: ['exchanges', 'list'] as const,
  exchangesStats: ['exchanges', 'stats'] as const,
} as const

// Error handler for consistent error management
const handleQueryError = (error: unknown, operation: string) => {
  console.error(`${operation} failed:`, error)
  
  let message = `Failed to ${operation.toLowerCase()}`
  if (error instanceof Error) {
    // Parse specific error messages
    if (error.message.includes('503')) {
      message = 'Service temporarily unavailable. Please try again.'
    } else if (error.message.includes('401')) {
      message = 'Please log in again.'
    } else if (error.message.includes('403')) {
      message = 'You do not have permission for this action.'
    }
  }
  
  toast.error(message)
}

// Dashboard statistics hook
export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard/stats')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(`${response.status}: ${errorData.error || errorData.details || 'Unknown error'}`)
      }
      
      return response.json()
    },
    staleTime: adaptiveConfig.queryStaleTime,
    gcTime: adaptiveConfig.queryStaleTime * 2,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: (failureCount, error) => {
      // Don't retry client errors
      if (error.message.includes('4')) return false
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    meta: {
      errorMessage: 'fetch dashboard statistics',
    },
  })
}

// Recent orders hook with pagination
export const useRecentOrders = (limit: number = 5) => {
  return useQuery({
    queryKey: queryKeys.recentOrders(limit),
    queryFn: async () => {
      const response = await fetch(`/api/admin/dashboard/recent-orders?limit=${limit}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(`${response.status}: ${errorData.error || errorData.details || 'Unknown error'}`)
      }
      
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds for recent orders
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    retry: (failureCount, error) => {
      if (error.message.includes('4')) return false
      return failureCount < 2
    },
    meta: {
      errorMessage: 'fetch recent orders',
    },
  })
}

// Combined dashboard data hook for better performance
export const useDashboardData = () => {
  const statsQuery = useDashboardStats()
  const ordersQuery = useRecentOrders(5)
  
  return {
    stats: statsQuery.data,
    orders: ordersQuery.data?.orders || [],
    isLoading: statsQuery.isLoading || ordersQuery.isLoading,
    isError: statsQuery.isError || ordersQuery.isError,
    error: statsQuery.error || ordersQuery.error,
    isRefetching: statsQuery.isRefetching || ordersQuery.isRefetching,
    refetch: () => {
      statsQuery.refetch()
      ordersQuery.refetch()
    }
  }
}

// Order details hook with optimistic updates
export const useOrderDetails = (orderId: string) => {
  return useQuery({
    queryKey: queryKeys.orderDetails(orderId),
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(`${response.status}: ${errorData.error || 'Order not found'}`)
      }
      
      return response.json()
    },
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    meta: {
      errorMessage: 'fetch order details',
    },
  })
}

// Orders by exchange hook with pagination
export const useOrdersByExchange = (exchangeId: string, page: number = 1) => {
  return useQuery({
    queryKey: queryKeys.ordersByExchange(exchangeId, page),
    queryFn: async () => {
      const response = await fetch(`/api/orders/exchange/${exchangeId}?page=${page}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(`${response.status}: ${errorData.error || 'Failed to fetch orders'}`)
      }
      
      return response.json()
    },
    enabled: !!exchangeId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous page data while loading new page
    meta: {
      errorMessage: 'fetch orders',
    },
  })
}

// Update order status mutation
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ orderId, status, reason }: { 
      orderId: string
      status: string
      reason?: string 
    }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || 'Failed to update order status')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats })
      queryClient.invalidateQueries({ queryKey: queryKeys.recentOrders(5) })
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetails(variables.orderId) })
      
      // Update the order in cache optimistically
      queryClient.setQueryData(queryKeys.orderDetails(variables.orderId), data)
      
      toast.success('Order status updated successfully')
    },
    onError: (error) => {
      handleQueryError(error, 'Update order status')
    },
  })
}

// Prefetch utilities for better UX
export const usePrefetchOrderDetails = () => {
  const queryClient = useQueryClient()
  
  return (orderId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.orderDetails(orderId),
      queryFn: async () => {
        const response = await fetch(`/api/orders/${orderId}`)
        if (!response.ok) throw new Error('Failed to fetch order')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}

// Performance monitoring hook
export const useQueryPerformance = () => {
  const queryClient = useQueryClient()
  
  return {
    getCacheSize: () => queryClient.getQueryCache().getAll().length,
    clearCache: () => queryClient.clear(),
    getQueryData: (queryKey: string[]) => queryClient.getQueryData(queryKey),
    invalidateAll: () => queryClient.invalidateQueries(),
  }
}

// Exchanges list hook with filtering and sorting
export const useExchangesList = () => {
  return useQuery({
    queryKey: queryKeys.exchangesList,
    queryFn: async () => {
      const response = await fetch('/api/admin/exchanges')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(`${response.status}: ${errorData.error || errorData.details || 'Unknown error'}`)
      }
      
      return response.json()
    },
    staleTime: adaptiveConfig.queryStaleTime,
    gcTime: adaptiveConfig.queryStaleTime * 2,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: (failureCount, error) => {
      // Don't retry client errors
      if (error.message.includes('4')) return false
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    meta: {
      errorMessage: 'fetch exchanges list',
    },
  })
}

// Exchanges statistics hook
export const useExchangesStats = () => {
  return useQuery({
    queryKey: queryKeys.exchangesStats,
    queryFn: async () => {
      const response = await fetch('/api/admin/exchanges/stats')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(`${response.status}: ${errorData.error || errorData.details || 'Unknown error'}`)
      }
      
      return response.json()
    },
    staleTime: adaptiveConfig.queryStaleTime,
    gcTime: adaptiveConfig.queryStaleTime * 2,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: (failureCount, error) => {
      if (error.message.includes('4')) return false
      return failureCount < 2
    },
    meta: {
      errorMessage: 'fetch exchanges statistics',
    },
  })
}

// Combined exchanges data hook for better performance
export const useExchangesData = () => {
  const listQuery = useExchangesList()
  const statsQuery = useExchangesStats()
  
  return {
    exchanges: listQuery.data?.exchanges || [],
    stats: statsQuery.data,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    isError: listQuery.isError || statsQuery.isError,
    error: listQuery.error || statsQuery.error,
    isRefetching: listQuery.isRefetching || statsQuery.isRefetching,
    refetch: () => {
      listQuery.refetch()
      statsQuery.refetch()
    }
  }
}

// Exchange details hook
export const useExchangeDetails = (exchangeId: string) => {
  return useQuery({
    queryKey: queryKeys.exchangeDetails(exchangeId),
    queryFn: async () => {
      const response = await fetch(`/api/admin/exchanges/${exchangeId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(`${response.status}: ${errorData.error || 'Exchange not found'}`)
      }
      
      return response.json()
    },
    enabled: !!exchangeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    meta: {
      errorMessage: 'fetch exchange details',
    },
  })
}

// Update exchange mutation
export const useUpdateExchange = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ exchangeId, data }: { 
      exchangeId: string
      data: any
    }) => {
      const response = await fetch(`/api/admin/exchanges/${exchangeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || 'Failed to update exchange')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.exchangesList })
      queryClient.invalidateQueries({ queryKey: queryKeys.exchangesStats })
      queryClient.invalidateQueries({ queryKey: queryKeys.exchangeDetails(variables.exchangeId) })
      
      // Update the exchange in cache optimistically
      queryClient.setQueryData(queryKeys.exchangeDetails(variables.exchangeId), data)
      
      toast.success('Exchange updated successfully')
    },
    onError: (error) => {
      handleQueryError(error, 'Update exchange')
    },
  })
}

// Prefetch utilities for exchanges
export const usePrefetchExchangeDetails = () => {
  const queryClient = useQueryClient()
  
  return (exchangeId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.exchangeDetails(exchangeId),
      queryFn: async () => {
        const response = await fetch(`/api/admin/exchanges/${exchangeId}`)
        if (!response.ok) throw new Error('Failed to fetch exchange')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}

// Custom hook for handling query errors globally
export const useQueryErrorHandler = () => {
  return (error: unknown, queryKey: unknown[], operation: string = 'fetch data') => {
    handleQueryError(error, operation)
    
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Query error details:', {
        error,
        queryKey,
        operation,
        timestamp: new Date().toISOString(),
      })
    }
  }
} 