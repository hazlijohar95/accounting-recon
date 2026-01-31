'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { BrandedErrorState } from '@/components/brand'

interface RootErrorBoundaryProps {
  children: ReactNode
}

/**
 * Root-level Error Boundary for the entire application.
 *
 * Catches any unhandled errors in the React tree and displays
 * a full-page error fallback instead of a white screen.
 */
export function RootErrorBoundary({ children }: RootErrorBoundaryProps) {
  return (
    <ErrorBoundary
      componentName="Application"
      fallback={<RootErrorFallback />}
      onError={(error, errorInfo) => {
        // Log to error tracking service in production
        console.error('Root error boundary caught error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Full-page error fallback for root-level errors.
 * Provides a way to reload the application.
 */
function RootErrorFallback() {
  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <BrandedErrorState
      fullPage
      title="Something went wrong"
      message="An unexpected error occurred. Please try reloading the page."
      onRetry={handleReload}
      onGoHome={handleGoHome}
    />
  )
}
