/**
 * Rate Limiting Utility with Redis (Upstash) Support
 *
 * Provides sliding window rate limiting for API routes.
 * Uses Upstash Redis for production (scalable across instances),
 * falls back to in-memory for development or when Redis is not configured.
 *
 * @module lib/rate-limit
 */

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Remaining requests in current window */
  remaining: number
  /** When the rate limit resets (unix timestamp ms) */
  reset: number
  /** Retry-After header value in seconds (only if blocked) */
  retryAfter?: number
}

// =============================================================================
// REDIS CLIENT (Upstash) - Lazy loaded
// =============================================================================

// Check if Redis is configured
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const isRedisConfigured = Boolean(REDIS_URL && REDIS_TOKEN)

// Lazy-loaded Upstash modules (types are `any` since packages may not be installed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RatelimitClass: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisClass: any = null
let upstashLoadAttempted = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any = null

// Create Upstash rate limiters for different namespaces
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rateLimiters = new Map<string, any>()

async function loadUpstash(): Promise<boolean> {
  if (upstashLoadAttempted) return RatelimitClass !== null
  upstashLoadAttempted = true

  if (!isRedisConfigured) return false

  try {
    const [ratelimitModule, redisModule] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ])
    RatelimitClass = ratelimitModule.Ratelimit
    RedisClass = redisModule.Redis

    // Create Redis client
    redis = new RedisClass({
      url: REDIS_URL!,
      token: REDIS_TOKEN!,
    })

    return true
  } catch {
    console.warn('[RateLimit] Upstash packages not installed, using in-memory rate limiting')
    return false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUpstashRateLimiter(
  namespace: string,
  config: RateLimitConfig
): Promise<any> {
  if (!await loadUpstash() || !redis || !RatelimitClass) return null

  const key = `${namespace}:${config.limit}:${config.windowMs}`
  let limiter = rateLimiters.get(key)

  if (!limiter) {
    // Convert windowMs to seconds for Upstash
    const windowSec = Math.ceil(config.windowMs / 1000)
    limiter = new RatelimitClass({
      redis,
      limiter: RatelimitClass.slidingWindow(config.limit, `${windowSec} s`),
      prefix: `ratelimit:${namespace}`,
      analytics: true, // Enable analytics in Upstash dashboard
    })
    rateLimiters.set(key, limiter)
  }

  return limiter
}

// =============================================================================
// IN-MEMORY FALLBACK (Development)
// =============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limits (per-instance) - used when Redis not configured
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
let cleanupInterval: ReturnType<typeof setInterval> | null = null

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

function checkInMemoryRateLimit(
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

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if a request is rate limited.
 *
 * Uses Upstash Redis in production for distributed rate limiting,
 * falls back to in-memory store for development.
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param namespace - Rate limit namespace (e.g., "upload", "chat")
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  namespace: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Try Upstash first if configured
  if (isRedisConfigured) {
    const limiter = await getUpstashRateLimiter(namespace, config)
    if (limiter) {
      try {
        const result = await limiter.limit(identifier)
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
          retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
        }
      } catch (error) {
        // Log error but fall back to in-memory on Redis failure
        console.error('[RateLimit] Redis error, falling back to in-memory:', error)
      }
    }
  }

  // Fall back to in-memory rate limiting
  return checkInMemoryRateLimit(identifier, namespace, config)
}

/**
 * Synchronous rate limit check (for backwards compatibility).
 * Uses in-memory store only - for async Redis support, use checkRateLimit.
 *
 * @deprecated Use checkRateLimit (async) for production
 */
export function checkRateLimitSync(
  identifier: string,
  namespace: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkInMemoryRateLimit(identifier, namespace, config)
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

  /** Data export: 5 per hour (prevent abuse) */
  export: { limit: 5, windowMs: 60 * 60 * 1000 },

  /** Account deletion: 3 per day (prevent accidents) */
  deleteAccount: { limit: 3, windowMs: 24 * 60 * 60 * 1000 },
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

/**
 * Check if Redis rate limiting is configured and available
 */
export function isRedisRateLimitingEnabled(): boolean {
  return isRedisConfigured
}
