import { supabase } from './supabase/client'
import { supabaseAdmin } from './supabase/admin'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'exchange'

export interface AuthUser extends User {
  role?: UserRole
  exchange_id?: string
  exchange_name?: string
}

export interface AuthSession extends Session {
  user: AuthUser
}

/**
 * Authentication and authorization utilities for the Financial Transfer Management System
 * Implements role-based access control for Admin and Exchange Office users
 */

// =============================================
// Authentication Functions
// =============================================

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Get current session with user profile data
 */
export const getCurrentSession = async (): Promise<AuthSession | null> => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return null
  }

  // Fetch user profile data to get role and exchange info
  const userProfile = await getUserProfile(session.user.id)
  
  return {
    ...session,
    user: {
      ...session.user,
      ...userProfile
    }
  } as AuthSession
}

/**
 * Get user profile data including role and exchange information
 */
export const getUserProfile = async (userId: string) => {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(`
      role,
      exchange_id,
      exchanges(name)
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return { role: 'exchange' as UserRole }
  }

  return {
    role: profile.role as UserRole,
    exchange_id: profile.exchange_id,
    exchange_name: (profile.exchanges as any)?.name
  }
}

// =============================================
// Authorization Functions
// =============================================

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession()
  return !!session
}

/**
 * Check if user has admin role
 */
export const isAdmin = async (): Promise<boolean> => {
  const session = await getCurrentSession()
  return session?.user?.role === 'admin'
}

/**
 * Check if user has exchange role
 */
export const isExchangeUser = async (): Promise<boolean> => {
  const session = await getCurrentSession()
  return session?.user?.role === 'exchange'
}

/**
 * Get current user's exchange ID (returns null for admin users)
 */
export const getCurrentExchangeId = async (): Promise<string | null> => {
  const session = await getCurrentSession()
  return session?.user?.exchange_id || null
}

/**
 * Check if user can access a specific exchange's data
 */
export const canAccessExchange = async (exchangeId: string): Promise<boolean> => {
  const session = await getCurrentSession()
  
  if (!session) return false
  
  // Admin can access all exchanges
  if (session.user.role === 'admin') return true
  
  // Exchange users can only access their own data
  return session.user.exchange_id === exchangeId
}

// =============================================
// Admin Functions (Server-side only)
// =============================================

/**
 * Create a new exchange office account (Admin only)
 * This function runs on the server-side with admin privileges
 */
export const createExchangeAccount = async (accountData: {
  email: string
  password: string
  exchangeName: string
  contactInfo: string
  initialBalance: number
  commissionRates: {
    incomingFixed: number
    incomingPercentage: number
    outgoingFixed: number
    outgoingPercentage: number
  }
  allowedBanks: {
    incoming: string[]
    outgoing: string[]
  }
}) => {
  // This should only be called from server-side API routes
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side')
  }

  try {
    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: accountData.email,
      password: accountData.password,
      email_confirm: true,
    })

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`)
    }

    // Create exchange record
    const { data: exchange, error: exchangeError } = await supabaseAdmin
      .from('exchanges')
      .insert({
        name: accountData.exchangeName,
        contact_info: accountData.contactInfo,
        balance: accountData.initialBalance,
        commission_rates: accountData.commissionRates,
        allowed_banks: accountData.allowedBanks,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (exchangeError) {
      throw new Error(`Failed to create exchange: ${exchangeError.message}`)
    }

    // Create user profile linking auth user to exchange
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authUser.user.id,
        role: 'exchange',
        exchange_id: exchange.id,
        created_at: new Date().toISOString(),
      })

    if (profileError) {
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    return {
      user: authUser.user,
      exchange: exchange,
    }
  } catch (error) {
    console.error('Error creating exchange account:', error)
    throw error
  }
}

/**
 * Validate session and return user data (for API routes)
 */
export const validateApiSession = async (request: Request) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('No authorization token provided')
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  const profile = await getUserProfile(user.id)
  
  return {
    ...user,
    ...profile
  } as AuthUser
}

// =============================================
// Route Protection Helpers
// =============================================

/**
 * Check if a route should be protected
 */
export const isProtectedRoute = (pathname: string): boolean => {
  const protectedRoutes = [
    '/dashboard',
    '/orders',
    '/admin',
    '/exchange',
    '/profile',
    '/api/orders',
    '/api/admin',
  ]
  
  return protectedRoutes.some(route => pathname.startsWith(route))
}

/**
 * Check if a route is admin-only
 */
export const isAdminRoute = (pathname: string): boolean => {
  const adminRoutes = [
    '/admin',
    '/api/admin',
  ]
  
  return adminRoutes.some(route => pathname.startsWith(route))
}

/**
 * Check if a route is for exchange users only
 */
export const isExchangeRoute = (pathname: string): boolean => {
  const exchangeRoutes = [
    '/exchange',
    '/orders',
  ]
  
  return exchangeRoutes.some(route => pathname.startsWith(route))
} 