import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    console.log('Login API: Starting login process')
    
    const { username, password } = await request.json()
    console.log('Login API: Received credentials for user:', username)

    if (!username || !password) {
      console.log('Login API: Missing username or password')
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      )
    }

    console.log('Login API: Querying database for user:', username)

    // Find user by username with exchange information
    // Note: exchanges.user_id references users.id
    const users = await directDb.query<{
      id: string
      username: string
      password: string
      role: string
      exchange_id: string | null
      exchange_name: string | null
    }>(`
      SELECT 
        u."id",
        u."username",
        u."password",
        u."role",
        e."id" as exchange_id,
        e."name" as exchange_name
      FROM "users" u
      LEFT JOIN "exchanges" e ON e."user_id" = u."id"
      WHERE u."username" = $1
    `, [username])

    console.log('Login API: Database query returned', users.length, 'users')

    if (users.length === 0) {
      console.log('Login API: No user found with username:', username)
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const user = users[0]
    console.log('Login API: Found user:', user.id, 'role:', user.role, 'exchange_id:', user.exchange_id)

    console.log('Login API: Verifying password...')
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    console.log('Login API: Password validation result:', isPasswordValid)
    
    if (!isPasswordValid) {
      console.log('Login API: Invalid password for user:', username)
      return NextResponse.json(
        { message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Return user data (without password)
    const userResponse = {
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase() as 'admin' | 'exchange',
      exchange_id: user.exchange_id,
      exchange_name: user.exchange_name,
    }

    console.log('Login API: Login successful for user:', username, 'role:', userResponse.role)

    return NextResponse.json({
      message: 'Login successful',
      user: userResponse,
    })
  } catch (error) {
    console.error('Login API error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error
    })
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 