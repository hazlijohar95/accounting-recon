'use client'

import { ReactNode } from 'react'
import { useAuth } from './auth-provider'
import { useIsDemo } from '@/lib/store'
import { LogoAnimatedWithText, LoadingSpinner } from '@/components/brand'
import { IconSignIn } from '@/components/brand/icons'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
}

/**
 * AuthGuard protects routes that require authentication.
 *
 * Behavior:
 * - In demo mode: Always shows children (demo data accessible without auth)
 * - Auth not configured: Always shows children (fallback for development)
 * - Auth loading: Shows loading spinner
 * - Not authenticated: Shows login prompt
 * - Authenticated: Shows children
 */
export function AuthGuard({ children, fallback, requireAuth = false }: AuthGuardProps) {
  const { user, isLoading, isAuthConfigured, login } = useAuth()
  const isDemo = useIsDemo()

  // Demo mode bypasses auth requirement
  if (isDemo) {
    return <>{children}</>
  }

  // If auth is not configured, allow access (development fallback)
  if (!isAuthConfigured) {
    return <>{children}</>
  }

  // If not requiring auth, just show children
  if (!requireAuth) {
    return <>{children}</>
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      fallback ?? (
        <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background">
          <LogoAnimatedWithText size={32} animate />
          <LoadingSpinner size="md" />
        </div>
      )
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-8 bg-background p-4">
        <LogoAnimatedWithText size={40} animate={false} />

        <div className="text-center space-y-2 max-w-md">
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome to Reconcile
          </h1>
          <p className="text-muted-foreground">
            Sign in to access your reconciliation dashboard and manage your company data.
          </p>
        </div>

        <button
          onClick={login}
          className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-xl font-medium hover:bg-foreground/90 transition-colors"
        >
          <IconSignIn size={20} />
          Sign in to continue
        </button>

        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <button onClick={login} className="text-foreground underline hover:no-underline">
            Sign up here
          </button>
        </p>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Simple wrapper that only shows content to authenticated users.
 * Falls back to null when not authenticated (no login prompt).
 */
export function AuthenticatedOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const isDemo = useIsDemo()

  if (isDemo || isLoading) {
    return null
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

/**
 * Only shows content when user is NOT authenticated.
 * Useful for showing login buttons or demo mode toggles.
 */
export function UnauthenticatedOnly({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthConfigured } = useAuth()

  if (isLoading) {
    return null
  }

  // If auth not configured, don't show unauthenticated content
  if (!isAuthConfigured) {
    return null
  }

  if (user) {
    return null
  }

  return <>{children}</>
}
