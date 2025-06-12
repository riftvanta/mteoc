import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type UserRole = 'admin' | 'exchange'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  exchange_id?: string
  exchange_name?: string
}

export interface AuthSession {
  user: AuthUser
  access_token: string
}

/**
 * Authentication and authorization utilities for the Financial Transfer Management System
 * Custom JWT-based authentication system
 */

// =============================================
// Authentication Functions
// =============================================

/**
 * Sign in with username and password
 */
export const signIn = async (username: string, password: string): Promise<AuthSession> => {
  try {
    // Query the database for the user
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        exchange: true
      }
    })

    if (!user) {
      throw new Error('Invalid username or password')
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new Error('Invalid username or password')
    }

    // Create session data
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase() as UserRole,
      exchange_id: user.exchange?.id,
      exchange_name: user.exchange?.name
    }

    return {
      user: authUser,
      access_token: `auth-token-${user.id}-${Date.now()}`
    }
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

/**
 * Validate session token (for API routes)
 */
export const validateSession = async (token: string): Promise<AuthUser | null> => {
  try {
    // Extract user ID from token (basic validation)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'auth' || tokenParts[1] !== 'token') {
      return null
    }

    const userId = tokenParts[2]
    
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        exchange: true
      }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase() as UserRole,
      exchange_id: user.exchange?.id,
      exchange_name: user.exchange?.name
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

// =============================================
// Authorization Functions
// =============================================

/**
 * Check if user can access a specific exchange's data
 */
export const canAccessExchange = (user: AuthUser, exchangeId: string): boolean => {
  // Admin can access all exchanges
  if (user.role === 'admin') return true
  
  // Exchange users can only access their own data
  return user.exchange_id === exchangeId
}

/**
 * Validate API request and return user data
 */
export const validateApiRequest = async (request: Request): Promise<AuthUser> => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.substring(7)
  const user = await validateSession(token)
  
  if (!user) {
    throw new Error('Invalid or expired session')
  }

  return user
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
    '/api/orders',
    '/api/admin',
    '/api/exchange'
  ]
  
  return protectedRoutes.some(route => pathname.startsWith(route))
}

/**
 * Check if a route is admin-only
 */
export const isAdminRoute = (pathname: string): boolean => {
  const adminRoutes = ['/admin', '/api/admin']
  return adminRoutes.some(route => pathname.startsWith(route))
}

/**
 * Check if a route is for exchange users only
 */
export const isExchangeRoute = (pathname: string): boolean => {
  const exchangeRoutes = ['/exchange', '/orders']
  return exchangeRoutes.some(route => pathname.startsWith(route))
} 