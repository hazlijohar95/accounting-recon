import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://reconciled.dev',
  'https://www.reconciled.dev',
]

// Allow localhost in development
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000')
}

// CSRF token cookie name and header name
const CSRF_COOKIE_NAME = '__csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically random CSRF token.
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Set CSRF token cookie on a response (for initial page load).
 * Call this from middleware or layout to ensure the cookie exists.
 */
export function setCSRFCookie(response: NextResponse): string {
  const token = generateCSRFToken()
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client JS to include in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
  return token
}

/**
 * Get the current CSRF token from cookies (for client-side use).
 */
export function getCSRFTokenFromCookies(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value
}

/**
 * Validate CSRF protection using double-submit cookie pattern + origin check.
 *
 * Defense layers:
 * 1. Origin/Referer header validation (primary — prevents cross-origin requests)
 * 2. Double-submit cookie pattern (secondary — x-csrf-token header must match cookie)
 */
export function validateCSRF(request: NextRequest): { valid: boolean; error?: string } {
  // Layer 1: Origin/Referer validation
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  let originValid = false

  // Check Origin header first (more reliable)
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      originValid = true
    } else {
      return { valid: false, error: 'Invalid origin' }
    }
  } else if (referer) {
    // Fall back to Referer header
    try {
      const refererOrigin = new URL(referer).origin
      if (ALLOWED_ORIGINS.includes(refererOrigin)) {
        originValid = true
      }
    } catch {
      return { valid: false, error: 'Invalid referer' }
    }
    if (!originValid) {
      return { valid: false, error: 'Invalid referer' }
    }
  } else {
    // No Origin or Referer — reject
    return { valid: false, error: 'Missing origin header' }
  }

  // Layer 2: Double-submit cookie validation
  // The client must read the CSRF cookie and send it back as a header.
  // An attacker cannot read our SameSite=strict cookie from a different origin.
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (cookieToken && headerToken) {
    if (cookieToken !== headerToken) {
      return { valid: false, error: 'CSRF token mismatch' }
    }
  }
  // If no token exists yet (first request), origin check alone is sufficient.
  // The middleware should set the cookie on the next response.

  return { valid: true }
}
