'use client'

import { useEffect } from 'react'
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

  // Login function
  const login = async (username: string, password: string) => {
    try {
      await authLogin(username, password)
      toast.success('Welcome back!')
      
      // Redirect based on user role after login
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    try {
      authLogout()
      toast.success('Logged out successfully')
      router.push('/auth/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed')
      throw error
    }
  }

  // Role-based checks
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
}

/**
 * Hook for role-based route protection
 * Automatically redirects users based on their role and route access
 */
export const useAuthGuard = (requiredRole?: UserRole) => {
  const { isAuthenticated, isLoading, role, isAdmin, isExchange } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    // Check role-based access
    if (requiredRole) {
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

  const canAccess = !exchangeId || isAdmin || exchangeId === userExchangeId
  const canEdit = canAccess && (isAdmin || exchangeId === userExchangeId)
  
  return {
    canAccess,
    canEdit,
    isOwnExchange: exchangeId === userExchangeId,
  }
} 