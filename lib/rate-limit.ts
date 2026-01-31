/**
 * In-memory Rate Limiting Utility
 *
 * Provides sliding window rate limiting for API routes.
 * For multi-instance deployments, replace with Redis-backed solution
 * (e.g., @upstash/ratelimit).
 *
 * @module lib/rate-limit
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limits (per-instance)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

// Start cleanup on module load
startCleanup()

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Remaining requests in current window */
  remaining: number
  /** When the rate limit resets (unix timestamp ms) */
  reset: number
  /** Retry-After header value in seconds (only if blocked) */
  retryAfter?: number
}

/**
 * Check if a request is rate limited.
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param namespace - Rate limit namespace (e.g., "upload", "chat")
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  namespace: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${namespace}:${identifier}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // If no entry or window expired, create new window
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
    return {
      success: true,
      remaining: config.limit - 1,
      reset: entry.resetAt,
    }
  }

  // Check if over limit
  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt,
      retryAfter,
    }
  }

  // Increment counter
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.resetAt,
  }
}

/**
 * Pre-configured rate limiters for different API routes
 */
export const RateLimits = {
  /** File uploads: 10 per minute */
  upload: { limit: 10, windowMs: 60 * 1000 },

  /** Chat/LLM operations: 20 per minute */
  chat: { limit: 20, windowMs: 60 * 1000 },

  /** Matching stream (expensive): 5 per minute */
  matching: { limit: 5, windowMs: 60 * 1000 },

  /** CSV import: 10 per minute */
  csvImport: { limit: 10, windowMs: 60 * 1000 },

  /** Auth operations: 10 per minute */
  auth: { limit: 10, windowMs: 60 * 1000 },
} as const

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.reset / 1000)),
  }

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter)
  }

  return headers
}

/**
 * Get identifier from session for rate limiting.
 * Falls back to IP-based rate limiting for anonymous users to prevent DoS.
 *
 * SECURITY: Using a shared 'anonymous' bucket would allow one attacker to
 * block all unauthenticated users. IP-based limiting ensures fairness.
 *
 * @param session - User session if authenticated
 * @param clientIp - Client IP address for anonymous rate limiting
 */
export function getRateLimitIdentifier(
  session: { workosId: string } | null,
  clientIp?: string | null
): string {
  if (session?.workosId) {
    return session.workosId
  }

  // SECURITY: Use IP-based rate limiting for anonymous requests
  // This prevents one attacker from blocking all unauthenticated users
  if (clientIp) {
    // Prefix with 'ip:' to namespace anonymous rate limits
    return `ip:${clientIp}`
  }

  // Fallback for edge cases where IP is unavailable (should be rare)
  // Use a random-ish identifier based on timestamp to avoid complete lockout
  return `anon:${Date.now() % 10000}`
}

/**
 * Extract client IP from request headers.
 * Handles common proxy headers (X-Forwarded-For, CF-Connecting-IP, etc.)
 *
 * @param headers - Request headers object or Headers instance
 */
export function getClientIp(headers: Headers | { get: (key: string) => string | null }): string | null {
  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // Standard proxy header (take first IP in chain)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim()
    if (firstIp) return firstIp
  }

  // Vercel
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp

  return null
}
