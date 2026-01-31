/**
 * Server-side Auth Helpers
 *
 * Authentication utilities for Next.js API routes.
 * Verifies session cookies and extracts user information.
 */

import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'reconciled_session'

interface SessionData {
  workosId: string
  email: string
  name?: string
  expiresAt: number
}

/**
 * Verify and decode session from signed cookie
 * SECURITY: Uses a separate SESSION_SECRET for HMAC signing,
 * keeping it independent from WORKOS_API_KEY
 */
function verifySession(signedSession: string): SessionData | null {
  // SECURITY: Use dedicated session secret, not WorkOS API key
  // This prevents session forgery if WorkOS key is compromised
  const secret = process.env.SESSION_SECRET
  const isProduction = process.env.NODE_ENV === 'production'

  // In production, SESSION_SECRET is required - never fall back to API key
  if (!secret) {
    if (isProduction) {
      console.error('CRITICAL: SESSION_SECRET is not configured in production')
      return null
    }
    // Development fallback with warning
    const fallbackSecret = process.env.WORKOS_API_KEY
    if (!fallbackSecret) {
      console.error('SESSION_SECRET is not configured - cannot verify session')
      return null
    }
    console.warn('SESSION_SECRET not set - using WORKOS_API_KEY fallback (development only)')
    return verifySessionWithSecret(signedSession, fallbackSecret)
  }

  return verifySessionWithSecret(signedSession, secret)
}

/**
 * Internal: Verify session with provided secret
 */
function verifySessionWithSecret(signedSession: string, secret: string): SessionData | null {
  try {
    const decoded = Buffer.from(signedSession, 'base64').toString('utf-8')
    const [payload, signature] = decoded.split('.')

    if (!payload || !signature) {
      return null
    }

    // Verify signature using constant-time comparison
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // SECURITY: Convert to buffers and check length before timingSafeEqual
    // timingSafeEqual throws if lengths differ - which could be a DoS vector
    const signatureBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    if (signatureBuffer.length !== expectedBuffer.length) {
      console.warn('Session signature length mismatch')
      return null
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      console.warn('Session signature mismatch')
      return null
    }

    const data = JSON.parse(payload) as SessionData

    // Check expiration
    if (data.expiresAt < Date.now()) {
      console.warn('Session expired')
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to verify session:', error)
    return null
  }
}

/**
 * Get authenticated session from request cookies
 * Returns null if not authenticated
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return null
    }

    return verifySession(sessionCookie.value)
  } catch (error) {
    console.error('Session error:', error)
    return null
  }
}

/**
 * Require authenticated session
 * Throws an error if not authenticated
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
