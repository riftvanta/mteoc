import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'
import { z } from 'zod'
import { safeDbOperation } from '@/lib/db'

// Request validation schema
const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password too long'),
})

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userAttempts = rateLimitMap.get(ip)

  if (!userAttempts || now > userAttempts.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
    return true
  }

  if (userAttempts.count >= RATE_LIMIT.maxAttempts) {
    return false
  }

  userAttempts.count++
  return true
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request)
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts',
          message: 'Please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}))
    
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          message: 'Please check your input and try again',
          details: validationResult.error.errors,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { username, password } = validationResult.data

    // Perform authentication with database error handling
    const authResult = await safeDbOperation(
      () => signIn(username, password),
      'user_authentication',
      1 // Only retry once for auth
    )

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        user: authResult.user,
        access_token: authResult.access_token,
        message: 'Login successful'
      },
      { status: 200 }
    )

    // Set security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response

  } catch (error) {
    console.error('Login error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      ip: getClientIP(request),
    })

    // Return generic error message for security
    const isKnownError = error instanceof Error && (
      error.message.includes('Invalid username or password') ||
      error.message.includes('User not found')
    )

    if (isKnownError) {
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: 'Invalid username or password',
          code: 'AUTH_FAILED'
        },
        { status: 401 }
      )
    }

    // Generic server error
    return NextResponse.json(
      { 
        error: 'Server error',
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'GET method is not supported for this endpoint',
      code: 'METHOD_NOT_ALLOWED'
    },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'PUT method is not supported for this endpoint',
      code: 'METHOD_NOT_ALLOWED'
    },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'DELETE method is not supported for this endpoint',
      code: 'METHOD_NOT_ALLOWED'
    },
    { status: 405 }
  )
} 