/**
 * Supabase client configuration (optional service)
 * Used only for file storage and other non-auth services if needed
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { supabaseConfig } from '@/lib/env'

// Create Supabase client only if configuration is available
export const supabase = supabaseConfig.url && supabaseConfig.anonKey 
  ? createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: false, // We handle auth separately
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

/**
 * Check if Supabase is configured and available
 */
export const hasValidSupabaseConfig = (): boolean => {
  return !!(supabaseConfig.url && supabaseConfig.anonKey)
}

/**
 * Storage utilities (if using Supabase for file storage)
 */
export const supabaseStorage = {
  /**
   * Upload file to Supabase storage
   */
  async uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
    if (!supabase) {
      console.warn('Supabase not configured for file storage')
      return null
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('File upload error:', error)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      console.error('File upload failed:', error)
      return null
    }
  },

  /**
   * Delete file from Supabase storage
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    if (!supabase) {
      return false
    }

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      return !error
    } catch (error) {
      console.error('File deletion failed:', error)
      return false
    }
  },

  /**
   * Get public URL for file
   */
  getPublicUrl(bucket: string, path: string): string | null {
    if (!supabase) {
      return null
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  },
} 