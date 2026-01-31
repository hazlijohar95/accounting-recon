'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ErrorAnimation } from '@/components/brand'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  className?: string
  /** Component name for better error messages */
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error, and displays a fallback UI.
 *
 * @example
 * <ErrorBoundary componentName="TransactionsTable">
 *   <TransactionsTable />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          componentName={this.props.componentName}
          onReset={this.handleReset}
          className={this.props.className}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  componentName?: string
  onReset?: () => void
  className?: string
}

/**
 * Default error fallback UI
 * Matches the minimal, brutalist aesthetic of Reconciled
 */
export function ErrorFallback({
  error,
  componentName,
  onReset,
  className,
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center justify-center p-8 border border-border',
        className
      )}
    >
      {/* Branded error animation */}
      <div className="mb-4">
        <ErrorAnimation size={48} variant="red" animate />
      </div>

      {/* Geometric accent */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-4 h-0.5 bg-destructive/30" />
        <div className="w-1 h-1 bg-destructive/50 rotate-45" />
        <div className="w-4 h-0.5 bg-destructive/30" />
      </div>

      {/* Error message */}
      <h3 className="text-sm font-medium text-foreground mb-1">
        Something went wrong
        {componentName && <span className="text-muted-foreground"> in {componentName}</span>}
      </h3>

      {/* Error details (dev only) */}
      {process.env.NODE_ENV === 'development' && error && (
        <p className="text-xs text-muted-foreground font-mono mt-2 max-w-md text-center truncate">
          {error.message}
        </p>
      )}

      {/* Reset button */}
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm border border-border hover:bg-secondary transition-colors focus-ring"
        >
          <RetryIcon />
          Try again
        </button>
      )}
    </div>
  )
}

// Geometric retry icon (rectangle-based)
function RetryIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-current"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="4" height="2" fill="currentColor" />
      <rect x="5" y="3" width="2" height="5" fill="currentColor" />
      <rect x="6" y="2" width="5" height="2" fill="currentColor" />
      <rect x="10" y="3" width="2" height="4" fill="currentColor" />
      <rect x="11" y="6" width="2" height="4" fill="currentColor" />
      <rect x="10" y="9" width="2" height="4" fill="currentColor" />
      <rect x="5" y="12" width="6" height="2" fill="currentColor" />
      <rect x="4" y="9" width="2" height="4" fill="currentColor" />
    </svg>
  )
}

/**
 * Higher-order component for wrapping components with error boundary
 *
 * @example
 * const SafeTransactionsTable = withErrorBoundary(TransactionsTable, {
 *   componentName: 'TransactionsTable'
 * })
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps} componentName={displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

  return ComponentWithErrorBoundary
}
