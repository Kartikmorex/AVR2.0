import { useState, useEffect, useCallback, useRef } from 'react'
import { cachedFetch, getCacheConfig, invalidateCachePattern } from '@/lib/api-cache'

interface UseCachedApiOptions {
  enabled?: boolean
  refetchInterval?: number
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  cacheKey?: string
}

interface UseCachedApiResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  mutate: (newData: T) => void
}

export function useCachedApi<T = any>(
  url: string,
  options: RequestInit = {},
  config: UseCachedApiOptions = {}
): UseCachedApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const {
    enabled = true,
    refetchInterval,
    onSuccess,
    onError,
    cacheKey
  } = config

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return

    setLoading(true)
    setError(null)

    try {
      const cacheConfig = getCacheConfig(url)
      const response = await cachedFetch(url, options, cacheConfig)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (mountedRef.current) {
        setData(result)
        onSuccess?.(result)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      if (mountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [url, enabled, options, onSuccess, onError])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const mutate = useCallback((newData: T) => {
    setData(newData)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (enabled && url) {
      fetchData()
    }
  }, [fetchData, enabled, url])

  useEffect(() => {
    if (refetchInterval && enabled && url) {
      intervalRef.current = setInterval(fetchData, refetchInterval)
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [fetchData, refetchInterval, enabled, url])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return { data, loading, error, refetch, mutate }
}

// Specialized hooks for common API patterns
export function useCachedTransformers() {
  return useCachedApi('/avr/api/transformers/list', {}, {
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  })
}

export function useCachedLatestVoltage(deviceId: string, enabled = true) {
  const url = deviceId 
    ? `/avr/api/transformers/latest-voltage?deviceId=${encodeURIComponent(deviceId)}`
    : ''
  
  return useCachedApi(url, {}, {
    enabled: enabled && !!deviceId,
    refetchInterval: 10 * 1000, // Refresh every 10 seconds for live data
  })
}

export function useCachedLatestCurrent(deviceId: string, enabled = true) {
  const url = deviceId 
    ? `/avr/api/transformers/latest-current?deviceId=${encodeURIComponent(deviceId)}`
    : ''
  
  return useCachedApi(url, {}, {
    enabled: enabled && !!deviceId,
    refetchInterval: 10 * 1000, // Refresh every 10 seconds for live data
  })
}

export function useCachedLatestTapPosition(deviceId: string, enabled = true) {
  const url = deviceId 
    ? `/avr/api/transformers/latest-tap-position?deviceId=${encodeURIComponent(deviceId)}`
    : ''
  
  return useCachedApi(url, {}, {
    enabled: enabled && !!deviceId,
    refetchInterval: 10 * 1000, // Refresh every 10 seconds for live data
  })
}

export function useCachedTapChangeLog(deviceId: string, page = 1, pageSize = 10, enabled = true) {
  const url = deviceId 
    ? `/avr/api/transformers/tap-change-log?deviceId=${encodeURIComponent(deviceId)}&page=${page}&pageSize=${pageSize}`
    : ''
  
  return useCachedApi(url, {}, {
    enabled: enabled && !!deviceId,
  })
}

export function useCachedDeviceHistory(deviceId: string, page = 1, pageSize = 10, enabled = true) {
  const url = deviceId 
    ? `/avr/api/transformers/device-history?deviceId=${encodeURIComponent(deviceId)}&page=${page}&pageSize=${pageSize}`
    : ''
  
  return useCachedApi(url, {}, {
    enabled: enabled && !!deviceId,
  })
}

// Mutation hook for API calls that modify data
export function useCachedMutation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (
    url: string,
    options: RequestInit = {},
    invalidatePatterns: string[] = []
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await cachedFetch(url, options, { skipCache: true })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Invalidate related cache entries
      invalidatePatterns.forEach(pattern => {
        invalidateCachePattern(pattern)
      })
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return { mutate, loading, error }
}