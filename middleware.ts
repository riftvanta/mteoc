import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified authentication middleware for the Financial Transfer Management System
 * Since we're using localStorage-based authentication, middleware only handles
 * basic route protection. Client-side redirects handle authentication checks.
 */

// Define route patterns
const publicRoutes = ['/', '/auth/login']
const apiRoutes = ['/api']

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
 * Main middleware function - simplified for localStorage auth
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('well-known')
  ) {
    return NextResponse.next()
  }

  // Allow all public routes and API routes (API routes handle their own auth)
  if (matchesRoute(pathname, publicRoutes) || matchesRoute(pathname, apiRoutes)) {
    return NextResponse.next()
  }

  // For all other routes, let the client-side handle authentication
  // This prevents middleware redirect loops with localStorage-based auth
  return NextResponse.next()
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