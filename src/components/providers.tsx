'use client'

import React, { useState, createContext, useContext, useEffect, useCallback, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getAdaptiveConfig } from '@/lib/performance'

// Custom authentication context for username-based auth
interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'exchange'
  exchange_id?: string
  exchange_name?: string
}

interface AuthContextType {
  user: AuthUser | null
  session: any | null
  isLoading: boolean
  hasValidConfig: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  hasValidConfig: true,
  login: async () => {},
  logout: () => {},
})

export const useSupabase = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useSupabase must be used within AuthProvider')
  }
  return context
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  // Check for existing session on mount
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initialized.current) return
    initialized.current = true

    const checkSession = () => {
      try {
        // Only run on client side
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }

        const storedUser = localStorage.getItem('auth_user')
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          // Validate the parsed user has required fields
          if (parsedUser && parsedUser.id && parsedUser.username && parsedUser.role) {
            setUser(parsedUser)
          } else {
            // Invalid stored user, remove it
            localStorage.removeItem('auth_user')
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_user')
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true)

      // Make API call to authenticate
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const { user: authUser } = await response.json()
      
      // Validate user data before storing
      if (!authUser || !authUser.id || !authUser.username || !authUser.role) {
        throw new Error('Invalid user data received from server')
      }
      
      // Store user in localStorage and state
      localStorage.setItem('auth_user', JSON.stringify(authUser))
      setUser(authUser)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user')
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { user } : null,
      isLoading,
      hasValidConfig: true,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// React Query setup with optimized configuration
let queryClient: QueryClient | null = null

const getQueryClient = () => {
  if (!queryClient) {
    const adaptiveConfig = getAdaptiveConfig()
    
    queryClient = new QueryClient({
      defaultOptions: {
                 queries: {
           staleTime: adaptiveConfig.queryStaleTime,
           gcTime: adaptiveConfig.queryStaleTime * 2,
           refetchOnWindowFocus: false,
           refetchOnMount: false,
           refetchOnReconnect: true,
           retry: 1,
           retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
         },
        mutations: {
          retry: 1,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
        },
      },
    })
  }
  return queryClient
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => getQueryClient())
  
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
} 