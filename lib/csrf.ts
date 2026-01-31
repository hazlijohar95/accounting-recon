import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://reconciled.dev',
  'https://www.reconciled.dev',
]

// Allow localhost in development
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000')
}

export function validateCSRF(request: NextRequest): { valid: boolean; error?: string } {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // Check Origin header first (more reliable)
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      return { valid: true }
    }
    return { valid: false, error: 'Invalid origin' }
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin
      if (ALLOWED_ORIGINS.includes(refererOrigin)) {
        return { valid: true }
      }
    } catch {
      // Invalid referer URL
      return { valid: false, error: 'Invalid referer' }
    }
    return { valid: false, error: 'Invalid referer' }
  }

  // No Origin or Referer - reject
  return { valid: false, error: 'Missing origin header' }
}
