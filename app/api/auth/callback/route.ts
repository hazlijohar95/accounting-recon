import { NextResponse } from 'next/server'
import { WorkOS } from '@workos-inc/node'
import crypto from 'crypto'

// Session cookie configuration
const SESSION_COOKIE_NAME = 'reconciled_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Session data stored in cookie
interface SessionData {
  workosId: string
  email: string
  name?: string
  expiresAt: number
}

// Initialize WorkOS client
function getWorkOS(): WorkOS {
  const apiKey = process.env.WORKOS_API_KEY
  if (!apiKey) {
    throw new Error('WORKOS_API_KEY is not configured')
  }
  return new WorkOS(apiKey)
}

// Sign session data with HMAC for tamper protection
// SECURITY: Uses dedicated SESSION_SECRET, separate from WORKOS_API_KEY
function signSession(data: SessionData): string {
  const isProduction = process.env.NODE_ENV === 'production'

  // SECURITY: In production, SESSION_SECRET is required - never fall back to WORKOS_API_KEY
  // This prevents session forgery if WorkOS key is compromised
  if (!process.env.SESSION_SECRET) {
    if (isProduction) {
      throw new Error('CRITICAL: SESSION_SECRET is required in production')
    }
    console.warn('SESSION_SECRET not set - falling back to WORKOS_API_KEY (development only)')
  }

  const secret = isProduction
    ? process.env.SESSION_SECRET  // Production: must use dedicated secret
    : (process.env.SESSION_SECRET || process.env.WORKOS_API_KEY)  // Dev: allow fallback

  if (!secret) {
    throw new Error('SESSION_SECRET is required for session signing')
  }

  const payload = JSON.stringify(data)
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return Buffer.from(`${payload}.${signature}`).toString('base64')
}

export async function GET(request: Request) {
  try {
    const workos = getWorkOS()
    const clientId = process.env.WORKOS_CLIENT_ID

    if (!clientId) {
      return NextResponse.redirect(new URL('/?error=config', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', request.url))
    }

    // Exchange code for user info
    const { user } = await workos.userManagement.authenticateWithCode({
      clientId,
      code,
    })

    // Create session data
    const sessionData: SessionData = {
      workosId: user.id,
      email: user.email,
      name: user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName || undefined,
      expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
    }

    // Set signed session cookie on the redirect response
    // Note: Must set cookie on response object, not via cookies() when redirecting
    const signedSession = signSession(sessionData)
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set(SESSION_COOKIE_NAME, signedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    console.log('[Auth Callback] Session cookie set for user:', sessionData.email)
    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
}
