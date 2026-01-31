import { NextResponse } from 'next/server'
import { WorkOS } from '@workos-inc/node'

export async function GET(request: Request) {
  try {
    const apiKey = process.env.WORKOS_API_KEY
    const clientId = process.env.WORKOS_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI

    // Log configuration status server-side only (never expose to client)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Login] Config check:', {
        hasApiKey: !!apiKey,
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri,
      })
    }

    if (!apiKey) {
      console.error('[Login] Missing WORKOS_API_KEY')
      // SECURITY: Generic error message - don't reveal which config is missing
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      )
    }

    if (!clientId || !redirectUri) {
      // Log detailed info server-side for debugging
      console.error('[Login] Missing configuration:', {
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri,
      })
      // SECURITY: Generic error message - don't reveal configuration details
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      )
    }

    const workos = new WorkOS(apiKey)

    // Generate authorization URL
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      clientId,
      redirectUri,
      provider: 'authkit',
    })

    // Log redirect URL in development only
    if (process.env.NODE_ENV === 'development') {
      console.log('[Login] Redirecting to:', authorizationUrl)
    }

    // Redirect to WorkOS AuthKit
    return NextResponse.redirect(authorizationUrl)
  } catch (error) {
    // Log full error server-side for debugging
    console.error('[Login] Error:', error)
    // SECURITY: Generic error message - don't expose internal details
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 500 }
    )
  }
}
