'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasValidSupabaseConfig } from './client'
import type { User, Session } from '@supabase/supabase-js'

interface SupabaseContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  hasValidConfig: boolean
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  session: null,
  isLoading: true,
  hasValidConfig: false,
})

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasValidConfig = hasValidSupabaseConfig()

  useEffect(() => {
    // Only attempt auth operations if we have valid Supabase config
    if (!hasValidConfig) {
      setIsLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }).catch((error) => {
      console.warn('Supabase auth error:', error)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [hasValidConfig])

  return (
    <SupabaseContext.Provider value={{ user, session, isLoading, hasValidConfig }}>
      {children}
    </SupabaseContext.Provider>
  )
} 