/**
 * Performance monitoring and optimization utilities
 */

/**
 * Debounce function for search inputs and API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(later, wait)
    
    if (callNow) {
      func(...args)
    }
  }
}

/**
 * Throttle function for scroll events and real-time updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Simple performance timer for debugging
 */
export class PerformanceTimer {
  private startTime: number
  private name: string
  
  constructor(name: string) {
    this.name = name
    this.startTime = performance.now()
  }
  
  end(): number {
    const endTime = performance.now()
    const duration = endTime - this.startTime
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${this.name}: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
}

/**
 * Measure async function performance
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = new PerformanceTimer(name)
  try {
    const result = await fn()
    timer.end()
    return result
  } catch (error) {
    timer.end()
    throw error
  }
}

/**
 * Check if the user is on a slow network (client-side only)
 */
export function isSlowNetwork(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false
  }
  
  const connection = (navigator as any).connection
  
  // Consider 2G or slow-2g as slow networks
  return connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g'
}

/**
 * Get device memory info (if available, client-side only)
 */
export function getDeviceMemory(): number | undefined {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return undefined
  }
  
  return (navigator as any).deviceMemory
}

/**
 * Check if the device is considered low-end (client-side only)
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    // Default to false on server-side (assume decent device)
    return false
  }
  
  const memory = getDeviceMemory()
  const cores = navigator.hardwareConcurrency || 1
  
  // Consider devices with <= 4GB RAM or <= 2 cores as low-end
  return (memory !== undefined && memory <= 4) || cores <= 2
}

/**
 * Adaptive configuration based on device capabilities
 * Provides sensible defaults for server-side rendering
 */
export function getAdaptiveConfig() {
  // Use defaults for server-side rendering
  if (typeof window === 'undefined') {
    return {
      realtimeEventsPerSecond: 10,
      queryStaleTime: 5 * 60 * 1000, // 5 minutes
      imageQuality: 0.9,
      searchDebounceMs: 300,
      reduceMotion: false,
    }
  }
  
  // Client-side detection
  const isLowEnd = isLowEndDevice()
  const isSlowNet = isSlowNetwork()
  
  return {
    // Reduce real-time update frequency for low-end devices
    realtimeEventsPerSecond: isLowEnd ? 5 : 10,
    
    // Adjust query stale time based on network
    queryStaleTime: isSlowNet ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10min vs 5min
    
    // Image quality settings
    imageQuality: isLowEnd || isSlowNet ? 0.7 : 0.9,
    
    // Debounce delay for search
    searchDebounceMs: isSlowNet ? 500 : 300,
    
    // Animation preferences
    reduceMotion: isLowEnd,
  }
} 