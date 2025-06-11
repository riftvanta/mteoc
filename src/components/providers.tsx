'use client'

import React, { useState, createContext, useContext, useEffect } from 'react'
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

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const storedUser = localStorage.getItem('auth_user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error('Error checking session:', error)
        localStorage.removeItem('auth_user')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (username: string, password: string) => {
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
      
      // Store user in localStorage and state
      localStorage.setItem('auth_user', JSON.stringify(authUser))
      setUser(authUser)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_user')
    setUser(null)
  }

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

export function Providers({ children }: { children: React.ReactNode }) {
  // Get adaptive configuration based on device capabilities
  const adaptiveConfig = getAdaptiveConfig()
  
  // Create a stable QueryClient instance with adaptive settings
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: adaptiveConfig.queryStaleTime,
        retry: 1,
        refetchOnWindowFocus: false,
        // Reduce background refetching on slow networks
        refetchOnReconnect: !adaptiveConfig.queryStaleTime,
      },
      mutations: {
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
} 