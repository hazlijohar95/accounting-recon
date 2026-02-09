import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  AuthGuard,
  AuthenticatedOnly,
  UnauthenticatedOnly,
} from '@/components/auth-guard'

const login = vi.fn()

vi.mock('@/components/brand', () => ({
  LogoAnimatedWithText: () => <div>Logo</div>,
  LoadingSpinner: () => <div>Loading</div>,
}))

vi.mock('@/components/brand/icons', () => ({
  IconSignIn: () => <span>Icon</span>,
}))

const useAuthMock = vi.fn()
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}))

const useIsDemoMock = vi.fn()
vi.mock('@/lib/store', () => ({
  useIsDemo: () => useIsDemoMock(),
}))

describe('AuthGuard', () => {
  it('renders children in demo mode', () => {
    useIsDemoMock.mockReturnValue(true)
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthConfigured: true,
      login,
    })

    render(
      <AuthGuard requireAuth>
        <div>Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders children when auth not configured', () => {
    useIsDemoMock.mockReturnValue(false)
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthConfigured: false,
      login,
    })

    render(
      <AuthGuard requireAuth>
        <div>Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders children when auth not required', () => {
    useIsDemoMock.mockReturnValue(false)
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthConfigured: true,
      login,
    })

    render(
      <AuthGuard requireAuth={false}>
        <div>Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders loading fallback', () => {
    useIsDemoMock.mockReturnValue(false)
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthConfigured: true,
      login,
    })

    render(
      <AuthGuard requireAuth>
        <div>Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('renders login prompt when unauthenticated', () => {
    useIsDemoMock.mockReturnValue(false)
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthConfigured: true,
      login,
    })

    render(
      <AuthGuard requireAuth>
        <div>Content</div>
      </AuthGuard>
    )

    fireEvent.click(screen.getByText('Sign in to continue'))
    expect(login).toHaveBeenCalled()
  })

  it('renders children when authenticated', () => {
    useIsDemoMock.mockReturnValue(false)
    useAuthMock.mockReturnValue({
      user: { id: 'user' },
      isLoading: false,
      isAuthConfigured: true,
      login,
    })

    render(
      <AuthGuard requireAuth>
        <div>Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})

describe('AuthenticatedOnly', () => {
  it('hides content when unauthenticated', () => {
    useIsDemoMock.mockReturnValue(false)
    useAuthMock.mockReturnValue({ user: null, isLoading: false })

    render(
      <AuthenticatedOnly>
        <div>Private</div>
      </AuthenticatedOnly>
    )

    expect(screen.queryByText('Private')).not.toBeInTheDocument()
  })
})

describe('UnauthenticatedOnly', () => {
  it('shows content when unauthenticated', () => {
    useIsDemoMock.mockReturnValue(false)
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthConfigured: true,
    })

    render(
      <UnauthenticatedOnly>
        <div>Public</div>
      </UnauthenticatedOnly>
    )

    expect(screen.getByText('Public')).toBeInTheDocument()
  })
})
