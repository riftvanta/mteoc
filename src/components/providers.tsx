'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseProvider } from '@/lib/supabase/provider'
import { getAdaptiveConfig } from '@/lib/performance'

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
      <SupabaseProvider>
        {children}
      </SupabaseProvider>
    </QueryClientProvider>
  )
} 