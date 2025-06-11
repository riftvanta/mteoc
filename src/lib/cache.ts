/**
 * Comprehensive caching system with Redis support and in-memory fallback
 * Provides both server-side and client-side caching strategies
 */

interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Cache invalidation tags
  staleWhileRevalidate?: number // Background refresh time
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
}

// In-memory cache for development and fallback
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private timers = new Map<string, NodeJS.Timeout>()

  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = (options.ttl || 300) * 1000 // Convert to milliseconds
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl,
      tags: options.tags || []
    }

    this.cache.set(key, entry)

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
    }

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key)
      this.timers.delete(key)
    }, ttl)

    this.timers.set(key, timer)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!)
        this.timers.delete(key)
      }
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
      this.timers.delete(key)
    }
  }

  invalidateByTag(tag: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.delete(key))
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.cache.clear()
    this.timers.clear()
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }
}

// Global cache instance
const memoryCache = new MemoryCache()

// Redis cache implementation (for production)
class RedisCache {
  private client: any = null
  private isConnected = false

  async connect(): Promise<void> {
    try {
      // Try to use Redis if available
      if (process.env.REDIS_URL && typeof window === 'undefined') {
        const Redis = await import('ioredis').catch(() => null)
        if (Redis) {
          this.client = new Redis.default(process.env.REDIS_URL)
          this.isConnected = true
          console.log('Redis cache connected successfully')
        }
      }
    } catch (error) {
      console.warn('Redis not available, using memory cache:', error)
      this.isConnected = false
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    if (!this.isConnected) {
      return memoryCache.set(key, value, options)
    }

    try {
      const ttl = options.ttl || 300
      const cacheData = {
        data: value,
        tags: options.tags || [],
        timestamp: Date.now()
      }

      await this.client.setex(key, ttl, JSON.stringify(cacheData))

      // Store tags for invalidation
      if (options.tags?.length) {
        for (const tag of options.tags) {
          await this.client.sadd(`tag:${tag}`, key)
          await this.client.expire(`tag:${tag}`, ttl)
        }
      }
    } catch (error) {
      console.warn('Redis set failed, falling back to memory cache:', error)
      memoryCache.set(key, value, options)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return memoryCache.get<T>(key)
    }

    try {
      const cached = await this.client.get(key)
      if (!cached) return null

      const parsed = JSON.parse(cached)
      return parsed.data
    } catch (error) {
      console.warn('Redis get failed, falling back to memory cache:', error)
      return memoryCache.get<T>(key)
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return memoryCache.delete(key)
    }

    try {
      await this.client.del(key)
    } catch (error) {
      console.warn('Redis delete failed:', error)
      memoryCache.delete(key)
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    if (!this.isConnected) {
      return memoryCache.invalidateByTag(tag)
    }

    try {
      const keys = await this.client.smembers(`tag:${tag}`)
      if (keys.length > 0) {
        await this.client.del(...keys)
        await this.client.del(`tag:${tag}`)
      }
    } catch (error) {
      console.warn('Redis tag invalidation failed:', error)
      memoryCache.invalidateByTag(tag)
    }
  }
}

// Global cache instance
const cache = new RedisCache()

// Initialize cache connection
if (typeof window === 'undefined') {
  cache.connect().catch(console.warn)
}

// Cache wrapper functions
export const cacheManager = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return cache.get<T>(key)
  },

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    return cache.set(key, value, options)
  },

  /**
   * Delete specific key
   */
  async delete(key: string): Promise<void> {
    return cache.delete(key)
  },

  /**
   * Invalidate all keys with specific tag
   */
  async invalidateTag(tag: string): Promise<void> {
    return cache.invalidateByTag(tag)
  },

  /**
   * Cache a function result with automatic key generation
   */
  async cached<T>(
    fn: () => Promise<T>,
    keyParts: (string | number)[],
    options: CacheOptions = {}
  ): Promise<T> {
    const key = keyParts.join(':')
    
    // Try to get from cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn()
    await this.set(key, result, options)
    
    return result
  },

  /**
   * Memoize function with cache
   */
  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    options: CacheOptions = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args)
      const cached = await this.get(key)
      
      if (cached !== null) {
        return cached
      }

      const result = await fn(...args)
      await this.set(key, result, options)
      
      return result
    }) as T
  }
}

// Cache key generators for consistency
export const cacheKeys = {
  dashboardStats: () => 'dashboard:stats',
  recentOrders: (limit: number) => `dashboard:recent-orders:${limit}`,
  orderDetails: (orderId: string) => `order:${orderId}`,
  exchangeDetails: (exchangeId: string) => `exchange:${exchangeId}`,
  userSession: (userId: string) => `session:${userId}`,
  systemConfig: () => 'system:config',
  bankList: () => 'banks:active',
  ordersByExchange: (exchangeId: string, page: number) => `orders:exchange:${exchangeId}:page:${page}`,
  orderSearch: (query: string, filters: string) => `search:orders:${query}:${filters}`,
  analytics: (timeframe: string) => `analytics:${timeframe}`,
}

// Cache tags for invalidation
export const cacheTags = {
  ORDERS: 'orders',
  EXCHANGES: 'exchanges',
  USERS: 'users',
  DASHBOARD: 'dashboard',
  SYSTEM_CONFIG: 'system_config',
  BANKS: 'banks',
  ANALYTICS: 'analytics',
}

// Helper function to invalidate multiple related caches
export const invalidateRelatedCaches = async (tags: string[]) => {
  await Promise.all(tags.map(tag => cacheManager.invalidateTag(tag)))
}

// Performance monitoring for cache
export const cacheStats = {
  hits: 0,
  misses: 0,
  
  recordHit() {
    this.hits++
  },
  
  recordMiss() {
    this.misses++
  },
  
  getHitRate() {
    const total = this.hits + this.misses
    return total > 0 ? (this.hits / total) * 100 : 0
  },
  
  reset() {
    this.hits = 0
    this.misses = 0
  }
} 