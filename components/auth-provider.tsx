'use client'

import { createContext, useContext, useCallback, ReactNode, useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'


// User type for auth state
// Note: id can be either a Convex user ID or WorkOS user ID during auth flow
interface User {
  id: string // Convex ID or WorkOS ID
  email: string
  name?: string
  avatarUrl?: string
  workosId?: string
}

// ID format validation - accepts both Convex IDs and WorkOS user IDs
// Convex: alphanumeric with underscores/hyphens, 10-64 chars
// WorkOS: user_XXXX format
const isValidUserId = (id: string): boolean =>
  /^[a-zA-Z0-9_-]{10,64}$/.test(id) || /^user_[a-zA-Z0-9]+$/.test(id)

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAuthConfigured: boolean
  login: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if WorkOS is configured
  const isAuthConfigured = Boolean(
    typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_WORKOS_CLIENT_ID
  )

  // Fetch session on mount
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          // SECURITY: Validate ID format before using
          if (!data.user.id || !isValidUserId(data.user.id)) {
            console.error('Invalid user ID format from session:', data.user.id)
            setUser(null)
            return
          }
          setUser({
            ...data.user,
            id: data.user.id,
          })
        } else {
          setUser(null)
        }
      } else {
        // Handle 4xx/5xx responses - user is not authenticated
        if (response.status !== 401) {
          // Log unexpected errors (401 is expected for unauthenticated users)
          console.warn('Session fetch returned status:', response.status)
        }
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Auto-switch to Real mode when user logs in
  useEffect(() => {
    if (user && !isLoading) {
      const state = useAppStore.getState()
      if (state.isDemo) {
        console.log('[Auth] User authenticated, switching to Real mode')
        state.toggleMode() // toggleMode() switches Demo→Real when isDemo is true
      }
    }
  }, [user, isLoading])

  // Redirect to login
  const login = useCallback(() => {
    console.log('[Auth] Login clicked, redirecting to /api/auth/login')
    window.location.href = '/api/auth/login'
  }, [])

  // Logout and clear session
  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (response.ok) {
        setUser(null)
        window.location.href = '/'
      } else {
        // Server error - still clear local state and redirect
        // (cookie may be invalid anyway)
        console.warn('Logout response not ok:', response.status)
        setUser(null)
        window.location.href = '/'
      }
    } catch (error) {
      // Network error - don't clear user state, let user retry
      console.error('Logout failed:', error)
    }
  }, [])

  // Refresh session
  const refresh = useCallback(async () => {
    await fetchSession()
  }, [fetchSession])

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isAuthConfigured,
    login,
    logout,
    refresh,
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
