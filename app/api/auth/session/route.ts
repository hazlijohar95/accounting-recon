import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'reconciled_session'

// Session data stored in cookie
interface SessionData {
  workosId: string
  email: string
  name?: string
  expiresAt: number
}

// Verify and decode session from signed cookie
function verifySession(signedSession: string): SessionData | null {
  // SECURITY: Use same secret as callback route - SESSION_SECRET with fallback to WORKOS_API_KEY
  const secret = process.env.SESSION_SECRET || process.env.WORKOS_API_KEY
  if (!secret) {
    console.error('SESSION_SECRET/WORKOS_API_KEY is not configured - cannot verify session')
    return null
  }
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

    // SECURITY: Use constant-time comparison to prevent timing attacks
    // Wrap in try-catch since timingSafeEqual throws on length mismatch
    // (we don't pre-check length as that itself leaks timing info)
    try {
      const signatureBuffer = Buffer.from(signature, 'hex')
      const expectedBuffer = Buffer.from(expectedSignature, 'hex')

      if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        console.warn('Session signature mismatch')
        return null
      }
    } catch {
      // Length mismatch or invalid hex - signature is invalid
      console.warn('Session signature verification failed')
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

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null })
    }

    const session = verifySession(sessionCookie.value)

    if (!session) {
      // Clear invalid cookie
      cookieStore.delete(SESSION_COOKIE_NAME)
      return NextResponse.json({ user: null })
    }

    // Return user info from session
    // Note: The frontend needs workosId to sync with Convex
    // The Convex user ID will be resolved client-side via the users query
    return NextResponse.json({
      user: {
        id: session.workosId, // Use workosId as temporary ID until Convex user is synced
        workosId: session.workosId,
        email: session.email,
        name: session.name,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
