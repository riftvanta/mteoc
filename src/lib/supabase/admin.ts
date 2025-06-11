import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Server-side only Supabase admin client
 * This client bypasses RLS and should only be used in server-side code
 * Never import this in client-side components!
 */

// Use fallback values to prevent build errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'

// Only validate in production or when real credentials are provided
const hasRealCredentials = supabaseUrl !== 'https://placeholder.supabase.co' && serviceRoleKey !== 'placeholder-service-role-key'

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

  // Validate service role key format (should start with 'eyJ')
  if (!serviceRoleKey.startsWith('eyJ')) {
    throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY format')
  }
}

// Admin client with service role key - bypasses RLS
export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Helper function to ensure we're running on server-side
 */
export const ensureServerSide = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client can only be used on the server side')
  }
}

/**
 * Safe admin client that ensures server-side usage
 */
export const getAdminClient = () => {
  ensureServerSide()
  return supabaseAdmin
} 