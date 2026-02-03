/**
 * Server-side authentication helpers using WorkOS AuthKit.
 * Use these in API routes and server components.
 */

import { withAuth } from '@workos-inc/authkit-nextjs';

/**
 * Session data returned from getSession
 */
export interface SessionData {
  workosId: string;
  email: string;
  name?: string;
}

/**
 * Get the current user session from AuthKit.
 * Returns null if no user is authenticated.
 *
 * @example
 * ```ts
 * const session = await getSession();
 * if (!session) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const { user } = await withAuth();

    if (!user) {
      return null;
    }

    return {
      workosId: user.id,
      email: user.email,
      name: user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName || undefined,
    };
  } catch (error) {
    console.error('[Auth Server] Failed to get session:', error);
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated.
 * Use this in API routes that require authentication.
 *
 * @throws Error if user is not authenticated
 *
 * @example
 * ```ts
 * try {
 *   const session = await requireSession();
 *   // User is authenticated, session is guaranteed to exist
 * } catch (error) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
}

/**
 * Get session with fallback for dev mode.
 * In Convex dev environment, WorkOS auth may fail.
 * Falls back to workosUserId from request headers.
 */
export async function getSessionWithFallback(
  request: Request
): Promise<SessionData | null> {
  // Try normal WorkOS session first
  const session = await getSession();
  if (session) return session;

  // In strict auth mode, don't allow fallback
  if (process.env.AUTH_STRICT_MODE === 'true') {
    return null;
  }

  // Try to get workosUserId from request header
  const workosUserId = request.headers.get('x-workos-user-id');
  if (workosUserId) {
    // Return minimal session data for dev fallback
    return {
      workosId: workosUserId,
      email: 'dev-fallback@local',
    };
  }

  return null;
}

/**
 * Get the access token for the current session.
 * Useful for passing to other services that need to verify the user.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { accessToken } = await withAuth();
    return accessToken || null;
  } catch (error) {
    console.error('[Auth Server] Failed to get access token:', error);
    return null;
  }
}
