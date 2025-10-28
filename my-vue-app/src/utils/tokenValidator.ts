/**
 * Token Validation Utilities
 * 
 * Provides functions to decode and validate JWT tokens without external dependencies.
 * Uses manual base64 decoding to avoid adding jwt-decode library.
 */

/**
 * JWT Token Payload Interface
 */
interface JWTPayload {
  exp?: number
  iat?: number
  sub?: string | number
  [key: string]: any
}

/**
 * Decode JWT token payload
 * @param token - JWT token string
 * @returns Decoded payload object or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (second part)
    const payload = parts[1]
    
    // Replace URL-safe characters and pad if necessary
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    
    // Decode base64
    const decoded = atob(padded)
    
    // Parse JSON
    return JSON.parse(decoded) as JWTPayload
  } catch (error) {
    console.error('Token decode error:', error)
    return null
  }
}

/**
 * Check if token is expired
 * @param token - JWT token string
 * @param bufferSeconds - Time buffer in seconds (default: 60s)
 * @returns true if token is expired or invalid, false otherwise
 */
export function isTokenExpired(token: string | null, bufferSeconds: number = 60): boolean {
  if (!token) {
    return true
  }

  const payload = decodeToken(token)
  if (!payload || !payload.exp) {
    // Treat tokens without expiration or invalid tokens as expired
    return true
  }

  // Get current time in seconds
  const currentTime = Math.floor(Date.now() / 1000)
  
  // Check if token is expired (with buffer)
  return payload.exp <= currentTime + bufferSeconds
}

/**
 * Get remaining time before token expires
 * @param token - JWT token string
 * @returns Remaining time in seconds, or 0 if expired/invalid
 */
export function getTokenRemainingTime(token: string | null): number {
  if (!token) {
    return 0
  }

  const payload = decodeToken(token)
  if (!payload || !payload.exp) {
    return 0
  }

  const currentTime = Math.floor(Date.now() / 1000)
  const remaining = payload.exp - currentTime

  return Math.max(0, remaining)
}

/**
 * Format remaining time to human-readable string
 * @param seconds - Time in seconds
 * @returns Formatted string (e.g., "2小时15分钟")
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) {
    return '已过期'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []
  
  if (hours > 0) {
    parts.push(`${hours}小时`)
  }
  if (minutes > 0) {
    parts.push(`${minutes}分钟`)
  }
  if (hours === 0 && secs > 0) {
    parts.push(`${secs}秒`)
  }

  return parts.length > 0 ? parts.join('') : '少于1秒'
}

/**
 * Get token from storage (checks both localStorage and sessionStorage)
 * @returns Token string or null if not found
 */
export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
}

