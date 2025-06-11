import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Server-side only Supabase admin client
 * This client bypasses RLS and should only be used in server-side code
 * Never import this in client-side components!
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable - this is required for admin operations')
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch {
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format')
}

// Validate service role key format (should start with 'eyJ')
if (!serviceRoleKey.startsWith('eyJ')) {
  throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY format')
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