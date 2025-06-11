import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Initialize Supabase client for middleware (Edge Runtime compatible)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Authentication middleware for the Financial Transfer Management System
 * Handles route protection and role-based access control
 * Based on Next.js authentication best practices
 */

// Define route patterns
const publicRoutes = ['/', '/auth/login']
const protectedRoutes = ['/dashboard', '/orders', '/admin', '/exchange', '/profile', '/api']
const adminOnlyRoutes = ['/admin', '/api/admin']
const exchangeOnlyRoutes = ['/exchange', '/orders']

/**
 * Check if a path matches any of the route patterns
 */
const matchesRoute = (path: string, routes: string[]): boolean => {
  return routes.some(route => {
    if (route === '/') return path === '/'
    return path.startsWith(route)
  })
}

/**
 * Get user session and profile from request
 * Performs optimistic check using cookie data
 */
const getSessionFromRequest = async (request: NextRequest) => {
  try {
    // Get session token from cookie
    const sessionCookie = request.cookies.get('sb-access-token')?.value
    
    if (!sessionCookie) {
      return null
    }

    // Verify session with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(sessionCookie)
    
    if (error || !user) {
      return null
    }

    // Get user profile for role information
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, exchange_id')
      .eq('user_id', user.id)
      .single()

    return {
      user,
      role: profile?.role || 'exchange',
      exchangeId: profile?.exchange_id,
    }
  } catch (error) {
    console.error('Middleware session check error:', error)
    return null
  }
}

/**
 * Main middleware function
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Allow public routes
  if (matchesRoute(pathname, publicRoutes)) {
    return NextResponse.next()
  }

  // Check if route requires authentication
  const isProtectedRoute = matchesRoute(pathname, protectedRoutes)
  
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get user session
  const session = await getSessionFromRequest(request)

  // Redirect to login if not authenticated
  if (!session) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin-only routes
  if (matchesRoute(pathname, adminOnlyRoutes) && session.role !== 'admin') {
    // Redirect admin routes to appropriate dashboard
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Check exchange-only routes
  if (matchesRoute(pathname, exchangeOnlyRoutes) && session.role !== 'exchange') {
    // Redirect exchange routes to admin dashboard
    const adminUrl = new URL('/admin', request.url)
    return NextResponse.redirect(adminUrl)
  }

  // Add user info to headers for server components
  const response = NextResponse.next()
  response.headers.set('x-user-id', session.user.id)
  response.headers.set('x-user-role', session.role)
  if (session.exchangeId) {
    response.headers.set('x-exchange-id', session.exchangeId)
  }

  return response
}

/**
 * Middleware configuration
 * Specify which routes should run the middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - file extensions (js, css, png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.[\\w]+$).*)',
  ],
} 