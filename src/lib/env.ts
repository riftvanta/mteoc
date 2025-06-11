/**
 * Environment variables validation
 * Ensures all required environment variables are present and properly formatted
 */

const requiredEnvVars = {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Database Configuration
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
} as const

/**
 * Validate all required environment variables
 */
export function validateEnv(): { isValid: boolean; missing: string[] } {
  const missing: string[] = []
  
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value || value.trim() === '') {
      missing.push(key)
    }
  }
  
  return {
    isValid: missing.length === 0,
    missing,
  }
}

/**
 * Get validated environment variables
 * Throws an error if any required variables are missing
 */
export function getEnvVars() {
  const validation = validateEnv()
  
  if (!validation.isValid) {
    throw new Error(
      `Missing required environment variables: ${validation.missing.join(', ')}`
    )
  }
  
  return requiredEnvVars
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Check if we're in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production'

/**
 * Get the current environment
 */
export const environment = process.env.NODE_ENV || 'development' 