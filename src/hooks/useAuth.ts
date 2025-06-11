'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase/provider'
import { signIn, signOut, getCurrentSession, type AuthUser, type UserRole } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

/**
 * Custom hook for authentication state and actions
 * Provides easy access to auth state and login/logout functionality
 */
export const useAuth = () => {
  const { user, session, isLoading } = useSupabase()
  const [userProfile, setUserProfile] = useState<AuthUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const router = useRouter()

  // Load user profile data when session changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (session?.user) {
        try {
          const authSession = await getCurrentSession()
          setUserProfile(authSession?.user || null)
        } catch (error) {
          console.error('Error loading user profile:', error)
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
      }
      setProfileLoading(false)
    }

    loadUserProfile()
  }, [session])

  // Login function
  const login = async (email: string, password: string) => {
    try {
      await signIn(email, password)
      toast.success('Welcome back!')
      
      // Redirect based on user role (will be determined after profile loads)
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
      await signOut()
      setUserProfile(null)
      toast.success('Logged out successfully')
      router.push('/auth/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed')
      throw error
    }
  }

  // Role-based checks
  const isAdmin = userProfile?.role === 'admin'
  const isExchange = userProfile?.role === 'exchange'
  const isAuthenticated = !!userProfile

  return {
    // State
    user: userProfile,
    session,
    isLoading: isLoading || profileLoading,
    isAuthenticated,
    isAdmin,
    isExchange,
    
    // User info
    role: userProfile?.role,
    exchangeId: userProfile?.exchange_id,
    exchangeName: userProfile?.exchange_name,
    
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