'use client'

import { createContext, useContext, useCallback, ReactNode, useEffect } from 'react'
import { useAuth as useAuthKitAuth, useAccessToken } from '@workos-inc/authkit-nextjs/components'
import { useAppStore } from '@/lib/store'

// User type for auth state
interface User {
  id: string // WorkOS user ID
  email: string
  name?: string
  avatarUrl?: string
  workosId: string
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAuthConfigured: boolean
  login: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Use AuthKit's hooks for auth state
  const { user: authKitUser, loading, signOut, refreshAuth } = useAuthKitAuth()
  const { getAccessToken: getToken } = useAccessToken()

  // Check if WorkOS is configured
  const isAuthConfigured = Boolean(
    typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_WORKOS_CLIENT_ID
  )

  // Map AuthKit user to our User type
  const user: User | null = authKitUser
    ? {
        id: authKitUser.id,
        email: authKitUser.email,
        name: authKitUser.firstName && authKitUser.lastName
          ? `${authKitUser.firstName} ${authKitUser.lastName}`.trim()
          : authKitUser.firstName || undefined,
        avatarUrl: authKitUser.profilePictureUrl || undefined,
        workosId: authKitUser.id,
      }
    : null

  // Auto-switch to Real mode when user logs in
  useEffect(() => {
    if (user && !loading) {
      const state = useAppStore.getState()
      if (state.isDemo) {
        console.log('[Auth] User authenticated, switching to Real mode')
        state.toggleMode()
      }
    }
  }, [user, loading])

  // Redirect to login
  const login = useCallback(() => {
    console.log('[Auth] Login clicked, redirecting to /api/auth/login')
    window.location.href = '/api/auth/login'
  }, [])

  // Logout using AuthKit's signOut
  const logout = useCallback(async () => {
    try {
      // Reset to demo mode on logout
      const state = useAppStore.getState()
      if (!state.isDemo) {
        console.log('[Auth] Logging out, switching back to Demo mode')
        state.toggleMode()
      }
      // Use AuthKit's signOut - it handles the redirect
      await signOut({ returnTo: '/' })
    } catch (error) {
      console.error('Logout failed:', error)
      // Fallback: redirect manually
      window.location.href = '/api/auth/logout'
    }
  }, [signOut])

  // Refresh session using AuthKit's refreshAuth
  const refresh = useCallback(async () => {
    try {
      await refreshAuth()
    } catch (error) {
      console.error('[Auth] Refresh failed:', error)
    }
  }, [refreshAuth])

  // Get access token for Convex authentication
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await getToken()
      return token || null
    } catch (error) {
      console.error('[Auth] Failed to get access token:', error)
      return null
    }
  }, [getToken])

  const value: AuthContextValue = {
    user,
    isLoading: loading,
    isAuthenticated: Boolean(user),
    isAuthConfigured,
    login,
    logout,
    refresh,
    getAccessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to access auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Optional hook that doesn't throw (for components that may be outside provider)
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext)
}
