'use client'

import React, { useState, createContext, useContext, useEffect, useCallback, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getAdaptiveConfig } from '@/lib/performance'

// Authentication context with simplified JWT-based auth
interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'exchange'
  exchange_id?: string
  exchange_name?: string
}

interface AuthContextType {
  user: AuthUser | null
  session: { user: AuthUser; access_token: string } | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
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
  const [session, setSession] = useState<{ user: AuthUser; access_token: string } | null>(null)
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
        const storedToken = localStorage.getItem('auth_token')
        
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser)
          // Validate the parsed user has required fields
          if (parsedUser?.id && parsedUser?.username && parsedUser?.role) {
            setUser(parsedUser)
            setSession({ user: parsedUser, access_token: storedToken })
          } else {
            // Invalid stored data, clear it
            localStorage.removeItem('auth_user')
            localStorage.removeItem('auth_token')
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_user')
          localStorage.removeItem('auth_token')
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

      const { user: authUser, access_token } = await response.json()
      
      // Validate user data before storing
      if (!authUser?.id || !authUser?.username || !authUser?.role) {
        throw new Error('Invalid user data received from server')
      }
      
      // Store user and token in localStorage and state
      localStorage.setItem('auth_user', JSON.stringify(authUser))
      localStorage.setItem('auth_token', access_token)
      setUser(authUser)
      setSession({ user: authUser, access_token })
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
      localStorage.removeItem('auth_token')
    }
    setUser(null)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
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
          retry: (failureCount, error) => {
            // Don't retry on authentication errors
            if (error instanceof Error && error.message.includes('Invalid or expired')) {
              return false
            }
            return failureCount < 2
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        },
        mutations: {
          retry: (failureCount, error) => {
            // Don't retry on authentication errors
            if (error instanceof Error && error.message.includes('Invalid or expired')) {
              return false
            }
            return failureCount < 2
          },
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