/**
 * Optimized caching system with memory-based fallback
 * Provides efficient caching with proper eviction and error handling
 */

import { appConfig } from './env'

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 300, // 5 minutes
  maxMemorySize: 50 * 1024 * 1024, // 50MB in bytes
  cleanupInterval: 60 * 1000, // 1 minute
  maxKeyLength: 250,
} as const

// Cache entry interface
interface CacheEntry<T = any> {
  value: T
  ttl: number
  createdAt: number
  accessCount: number
  lastAccessed: number
  tags: string[]
  size: number
}

// Cache options interface
interface CacheOptions {
  ttl?: number
  tags?: string[]
}

// Cache statistics interface
interface CacheStats {
  hits: number
  misses: number
  evictions: number
  currentSize: number
  entryCount: number
  hitRate: number
}

/**
 * In-memory cache with LRU eviction and TTL support
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentSize: 0,
    entryCount: 0,
    hitRate: 0,
  }
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  /**
   * Calculate approximate size of data in bytes
   */
  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2 // Approximate Unicode bytes
    } catch {
      return 1024 // Default size for non-serializable data
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.createdAt + entry.ttl * 1000
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    // Remove 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25)
    
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const [key, entry] = entries[i]
      this.cache.delete(key)
      this.stats.currentSize -= entry.size
      this.stats.evictions++
    }

    this.stats.entryCount = this.cache.size
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key)
      if (entry) {
        this.cache.delete(key)
        this.stats.currentSize -= entry.size
        this.stats.evictions++
      }
    }

    this.stats.entryCount = this.cache.size

    // Evict LRU if memory usage is high
    if (this.stats.currentSize > CACHE_CONFIG.maxMemorySize) {
      this.evictLRU()
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, CACHE_CONFIG.cleanupInterval)

    // Cleanup on process exit
    process.on('beforeExit', () => {
      this.destroy()
    })
  }

  /**
   * Validate cache key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a non-empty string')
    }
    if (key.length > CACHE_CONFIG.maxKeyLength) {
      throw new Error(`Cache key too long (max ${CACHE_CONFIG.maxKeyLength} characters)`)
    }
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | null {
    try {
      this.validateKey(key)
      
      const entry = this.cache.get(key)
      if (!entry) {
        this.stats.misses++
        return null
      }

      if (this.isExpired(entry)) {
        this.cache.delete(key)
        this.stats.currentSize -= entry.size
        this.stats.entryCount--
        this.stats.misses++
        return null
      }

      // Update access statistics
      entry.accessCount++
      entry.lastAccessed = Date.now()
      this.stats.hits++

      return entry.value as T
    } catch (error) {
      console.error('Cache get error:', error)
      this.stats.misses++
      return null
    }
  }

  /**
   * Set value in cache
   */
  set<T = any>(key: string, value: T, options: CacheOptions = {}): boolean {
    try {
      this.validateKey(key)

      const size = this.calculateSize(value)
      const now = Date.now()
      const ttl = options.ttl ?? CACHE_CONFIG.defaultTTL

      // Check if adding this entry would exceed memory limit
      if (size > CACHE_CONFIG.maxMemorySize) {
        console.warn(`Cache entry too large: ${key} (${size} bytes)`)
        return false
      }

      // Remove existing entry if present
      const existingEntry = this.cache.get(key)
      if (existingEntry) {
        this.stats.currentSize -= existingEntry.size
      }

      // Create new entry
      const entry: CacheEntry<T> = {
        value,
        ttl,
        createdAt: now,
        accessCount: 0,
        lastAccessed: now,
        tags: options.tags ?? [],
        size,
      }

      this.cache.set(key, entry)
      this.stats.currentSize += size
      this.stats.entryCount = this.cache.size

      // Trigger cleanup if memory usage is high
      if (this.stats.currentSize > CACHE_CONFIG.maxMemorySize) {
        this.cleanup()
      }

      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    try {
      this.validateKey(key)
      
      const entry = this.cache.get(key)
      if (entry) {
        this.cache.delete(key)
        this.stats.currentSize -= entry.size
        this.stats.entryCount--
        return true
      }
      return false
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  /**
   * Clear entries by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
        this.stats.currentSize -= entry.size
        cleared++
      }
    }

    this.stats.entryCount = this.cache.size
    return cleared
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.stats.currentSize = 0
    this.stats.entryCount = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// Global cache instance
const globalCache = new MemoryCache()

/**
 * Cache manager with advanced features
 */
export class CacheManager {
  private cache: MemoryCache

  constructor(cache: MemoryCache = globalCache) {
    this.cache = cache
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    return this.cache.get<T>(key)
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    return this.cache.set(key, value, options)
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  /**
   * Cache a function result with automatic key generation
   */
  async cached<T>(
    fn: () => Promise<T>,
    keys: string[],
    options: CacheOptions = {}
  ): Promise<T> {
    const cacheKey = keys.join(':')
    
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn()
    await this.set(cacheKey, result, options)
    
    return result
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    return this.cache.clearByTags(tags)
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats()
  }
}

// Export default cache manager instance
export const cacheManager = new CacheManager()

// Cache key generators
export const cacheKeys = {
  dashboardStats: () => 'dashboard:stats',
  recentOrders: (limit: number) => `orders:recent:${limit}`,
  exchangeStats: (exchangeId: string) => `exchange:${exchangeId}:stats`,
  orderDetails: (orderId: string) => `order:${orderId}:details`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  exchangeOrders: (exchangeId: string, page: number) => `exchange:${exchangeId}:orders:${page}`,
} as const

// Cache tags for grouped invalidation
export const cacheTags = {
  DASHBOARD: 'dashboard',
  ORDERS: 'orders',
  EXCHANGES: 'exchanges',
  USERS: 'users',
  ADMIN: 'admin',
} as const

// Development cache debugging
if (appConfig.isDevelopment) {
  // Log cache stats every 5 minutes
  setInterval(() => {
    const stats = cacheManager.getStats()
    if (stats.hits + stats.misses > 0) {
      console.log('Cache Stats:', {
        hitRate: `${stats.hitRate.toFixed(2)}%`,
        entries: stats.entryCount,
        size: `${(stats.currentSize / 1024 / 1024).toFixed(2)}MB`,
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions,
      })
    }
  }, 5 * 60 * 1000)
} 