import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateCSRF } from '@/lib/csrf'

const SESSION_COOKIE_NAME = 'reconciled_session'

export async function POST(request: NextRequest) {
  try {
    // SECURITY: CSRF validation
    const csrf = validateCSRF(request)
    if (!csrf.valid) {
      return NextResponse.json(
        { error: csrf.error },
        { status: 403 }
      )
    }

    // Clear the session cookie
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}

// NOTE: GET handler removed for security - logout via <img src> attack (CSRF)
// Use POST with CSRF token only
