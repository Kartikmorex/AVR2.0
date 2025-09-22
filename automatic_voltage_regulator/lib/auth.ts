import { NextRequest } from 'next/server'

export const USER_ID_COOKIE_NAME = 'iosense_user_id'
export const DEFAULT_USER_ID = '61dfcee73ba65478ecf10c57'

/**
 * Get user ID from cookies on server-side API routes
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  const cookieStore = req.cookies
  const userIdCookie = cookieStore.get(USER_ID_COOKIE_NAME)
  const userId = userIdCookie?.value || process.env.IOSENSE_USER_ID || DEFAULT_USER_ID
  console.log('🔍 getUserIdFromRequest:', {
    cookieValue: userIdCookie?.value,
    envUserId: process.env.IOSENSE_USER_ID,
    finalUserId: userId
  })
  return userId
}

/**
 * Set user ID cookie on client-side
 */
export function setUserIdCookie(userId: string): void {
  if (typeof window !== 'undefined') {
    const maxAge = 30 * 24 * 60 * 60 // 30 days
    const cookieString = `${USER_ID_COOKIE_NAME}=${userId}; path=/; max-age=${maxAge}; SameSite=Lax`
    console.log('🍪 Setting cookie:', cookieString)
    document.cookie = cookieString
    console.log('🍪 Cookie after setting:', document.cookie)
  }
}

/**
 * Get user ID from cookies on client-side
 */
export function getUserIdFromClientCookies(): string | null {
  if (typeof window === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  console.log('🍪 Client cookies:', document.cookie)
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === USER_ID_COOKIE_NAME) {
      console.log('✅ Found user ID cookie:', { name, value })
      return value
    }
  }
  console.log('❌ No user ID cookie found')
  return null
}

/**
 * Remove user ID cookie
 */
export function removeUserIdCookie(): void {
  if (typeof window !== 'undefined') {
    document.cookie = `${USER_ID_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
  }
}