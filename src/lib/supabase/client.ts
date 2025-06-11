import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Use fallback values to prevent build errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Only validate in production or when real credentials are provided
const hasRealCredentials = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-anon-key'

if (process.env.NODE_ENV === 'production' && !hasRealCredentials) {
  throw new Error('Missing Supabase environment variables in production')
}

// Validate URL format only if we have real credentials
if (hasRealCredentials) {
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format')
  }
}

// Client-side Supabase client (browser and server)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: hasRealCredentials,
    autoRefreshToken: hasRealCredentials,
    detectSessionInUrl: hasRealCredentials,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Export helper to check if we have real credentials
export const hasValidSupabaseConfig = () => hasRealCredentials 