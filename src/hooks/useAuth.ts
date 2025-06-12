'use client'

import { useEffect, useMemo, useCallback } from 'react'
import { useSupabase } from '@/components/providers'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export type UserRole = 'admin' | 'exchange'

/**
 * Custom hook for authentication state and actions
 * Provides easy access to auth state and login/logout functionality
 */
export const useAuth = () => {
  const { user, session, isLoading, login: authLogin, logout: authLogout } = useSupabase()
  const router = useRouter()

  // Login function with improved error handling
  const login = useCallback(async (username: string, password: string) => {
    try {
      if (!username.trim() || !password.trim()) {
        throw new Error('Username and password are required')
      }

      await authLogin(username, password)
      toast.success('Welcome back!')
      
      // Redirect based on user role after successful login
      setTimeout(() => {
        if (user?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }, 500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      toast.error(errorMessage)
      throw error
    }
  }, [authLogin, router, user?.role])

  // Logout function with improved error handling
  const logout = useCallback(async () => {
    try {
      authLogout()
      toast.success('Logged out successfully')
      router.push('/auth/login')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed'
      toast.error(errorMessage)
      console.error('Logout error:', error)
    }
  }, [authLogout, router])

  // Memoize computed values to prevent unnecessary re-renders
  const authData = useMemo(() => {
    const isAdmin = user?.role === 'admin'
    const isExchange = user?.role === 'exchange'
    const isAuthenticated = !!user

    return {
      // State
      user,
      session,
      isLoading,
      isAuthenticated,
      isAdmin,
      isExchange,
      
      // User info
      role: user?.role,
      exchangeId: user?.exchange_id,
      exchangeName: user?.exchange_name,
      
      // Actions
      login,
      logout,
    }
  }, [user, session, isLoading, login, logout])

  return authData
}

/**
 * Hook for role-based route protection
 * Automatically redirects users based on their role and route access
 */
export const useAuthGuard = (requiredRole?: UserRole) => {
  const { isAuthenticated, isLoading, role, isAdmin, isExchange } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    // Check role-based access
    if (requiredRole && role !== requiredRole) {
      if (requiredRole === 'admin' && !isAdmin) {
        toast.error('Access denied: Admin privileges required')
        router.push('/dashboard')
        return
      }
      
      if (requiredRole === 'exchange' && !isExchange) {
        toast.error('Access denied: Exchange user privileges required')
        router.push('/admin')
        return
      }
    }
  }, [isAuthenticated, isLoading, role, requiredRole, isAdmin, isExchange, router])

  return {
    isAuthenticated,
    isLoading,
    role,
    isAdmin,
    isExchange,
  }
}

/**
 * Hook for checking permissions on specific exchanges
 */
export const useExchangeAccess = (exchangeId?: string) => {
  const { isAdmin, exchangeId: userExchangeId } = useAuth()

  return useMemo(() => {
    const canAccess = !exchangeId || isAdmin || exchangeId === userExchangeId
    const canEdit = canAccess && (isAdmin || exchangeId === userExchangeId)
    
    return {
      canAccess,
      canEdit,
      isOwnExchange: exchangeId === userExchangeId,
    }
  }, [isAdmin, exchangeId, userExchangeId])
}

/**
 * Hook for API requests with authentication
 */
export const useAuthenticatedRequest = () => {
  const { session, logout } = useAuth()

  const makeRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Handle authentication errors
    if (response.status === 401) {
      logout()
      throw new Error('Session expired. Please login again.')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || 'Request failed')
    }

    return response
  }, [session?.access_token, logout])

  return { makeRequest }
} 