/**
 * Environment variables validation and configuration
 * Ensures all required environment variables are present and properly formatted
 */

import { z } from 'zod'

// Define environment variable schema
const envSchema = z.object({
  // Database Configuration (Required)
  POSTGRES_PRISMA_URL: z.string().url('Invalid POSTGRES_PRISMA_URL format'),
  POSTGRES_URL_NON_POOLING: z.string().url('Invalid POSTGRES_URL_NON_POOLING format'),
  
  // Supabase Configuration (Optional for development)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid NEXT_PUBLIC_SUPABASE_URL format').optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required').optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),
  
  // Runtime Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional Configurations
  REDIS_URL: z.string().url('Invalid REDIS_URL format').optional(),
})

// Parse environment variables
let envVars: z.infer<typeof envSchema>

try {
  envVars = envSchema.parse(process.env)
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
    throw new Error(
      `Environment validation failed:\n${missingVars.join('\n')}`
    )
  }
  throw error
}

/**
 * Get validated environment variables
 */
export function getEnvVars() {
  return envVars
}

/**
 * Check if all required environment variables are present
 */
export function validateEnv(): { isValid: boolean; errors: string[] } {
  try {
    envSchema.parse(process.env)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return { isValid: false, errors }
    }
    return { isValid: false, errors: ['Unknown validation error'] }
  }
}

/**
 * Check if we have valid Supabase configuration
 */
export function hasValidSupabaseConfig(): boolean {
  return !!(envVars.NEXT_PUBLIC_SUPABASE_URL && envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Environment flags
 */
export const isDevelopment = envVars.NODE_ENV === 'development'
export const isProduction = envVars.NODE_ENV === 'production'
export const isTest = envVars.NODE_ENV === 'test'

/**
 * Database configuration
 */
export const databaseConfig = {
  prismaUrl: envVars.POSTGRES_PRISMA_URL,
  directUrl: envVars.POSTGRES_URL_NON_POOLING,
} as const

/**
 * Supabase configuration (optional)
 */
export const supabaseConfig = {
  url: envVars.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY,
} as const

/**
 * Application configuration
 */
export const appConfig = {
  environment: envVars.NODE_ENV,
  isDevelopment,
  isProduction,
  isTest,
  hasSupabase: hasValidSupabaseConfig(),
  redisUrl: envVars.REDIS_URL,
} as const

// Validate environment on module load (but not during build)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  const validation = validateEnv()
  if (!validation.isValid && isProduction) {
    console.error('Environment validation failed in production:', validation.errors)
    process.exit(1)
  } else if (!validation.isValid && isDevelopment) {
    console.warn('Environment validation warnings:', validation.errors)
  }
} 