interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

interface CacheConfig {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
}

class ApiCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number
  private defaultTTL: number

  constructor(config: CacheConfig = {}) {
    this.cache = new Map()
    this.maxSize = config.maxSize || 100
    this.defaultTTL = config.ttl || 5 * 60 * 1000 // 5 minutes default
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))

    // If still over max size, remove oldest entries
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toRemove = entries.slice(0, this.cache.size - this.maxSize)
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: any, ttl?: number): void {
    this.cleanup()
    
    const now = Date.now()
    const expiresAt = now + (ttl || this.defaultTTL)
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  size(): number {
    this.cleanup()
    return this.cache.size
  }
}

// Create cache instances with different TTL for different data types
export const responseCache = new ApiCache({ ttl: 30 * 1000, maxSize: 50 }) // 30 seconds for live data
export const staticCache = new ApiCache({ ttl: 5 * 60 * 1000, maxSize: 100 }) // 5 minutes for static data
export const historyCache = new ApiCache({ ttl: 60 * 1000, maxSize: 30 }) // 1 minute for history data

// Helper function to create cache keys
export function createCacheKey(url: string, params?: Record<string, any>): string {
  const paramString = params ? JSON.stringify(params) : ''
  return `${url}${paramString ? `?${btoa(paramString)}` : ''}`
}

// Cached fetch wrapper
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  cacheConfig?: { cache?: ApiCache; ttl?: number; skipCache?: boolean }
): Promise<Response> {
  const { cache = responseCache, ttl, skipCache = false } = cacheConfig || {}
  
  // Don't cache mutations (POST, PUT, DELETE, PATCH)
  const method = options?.method?.toUpperCase() || 'GET'
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
  
  if (skipCache || isMutation) {
    const response = await fetch(url, options)
    
    // Invalidate related cache entries on mutations
    if (isMutation) {
      invalidateCachePattern(url)
    }
    
    return response
  }

  const cacheKey = createCacheKey(url, options?.body ? JSON.parse(options.body as string) : undefined)
  
  // Check cache first
  const cachedData = cache.get(cacheKey)
  if (cachedData) {
    // Return a mock Response object with cached data
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Fetch from API
  const response = await fetch(url, options)
  
  if (response.ok) {
    const data = await response.clone().json()
    cache.set(cacheKey, data, ttl)
  }
  
  return response
}

// Helper to invalidate cache entries matching a pattern
export function invalidateCachePattern(pattern: string): void {
  const caches = [responseCache, staticCache, historyCache]
  
  caches.forEach(cache => {
    const keysToDelete: string[] = []
    
    // @ts-ignore - accessing private cache property
    for (const key of cache.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key))
  })
}

// Specific cache configurations for different API endpoints
export const cacheConfigs = {
  // Live data - short cache
  'latest-voltage': { cache: responseCache, ttl: 10 * 1000 }, // 10 seconds
  'latest-current': { cache: responseCache, ttl: 10 * 1000 }, // 10 seconds
  'latest-tap-position': { cache: responseCache, ttl: 10 * 1000 }, // 10 seconds
  
  // Static data - longer cache
  'transformers/list': { cache: staticCache, ttl: 2 * 60 * 1000 }, // 2 minutes
  'transformers/metadata': { cache: staticCache, ttl: 5 * 60 * 1000 }, // 5 minutes
  'devices/available': { cache: staticCache, ttl: 5 * 60 * 1000 }, // 5 minutes
  
  // Historical data - medium cache
  'tap-change-log': { cache: historyCache, ttl: 60 * 1000 }, // 1 minute
  'device-history': { cache: historyCache, ttl: 60 * 1000 }, // 1 minute
  'trend': { cache: historyCache, ttl: 30 * 1000 }, // 30 seconds
}

// Helper to get cache config for a URL
export function getCacheConfig(url: string) {
  for (const [pattern, config] of Object.entries(cacheConfigs)) {
    if (url.includes(pattern)) {
      return config
    }
  }
  return { cache: responseCache, ttl: 30 * 1000 } // default
}