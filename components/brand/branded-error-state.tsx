'use client'

import { cn } from '@/lib/utils'
import { ErrorAnimation } from './error-animation'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface BrandedErrorStateProps {
  /** Error title */
  title?: string
  /** Error message/description */
  message?: string
  /** Optional error code for debugging */
  errorCode?: string
  /** Retry action callback */
  onRetry?: () => void
  /** Navigate home callback */
  onGoHome?: () => void
  /** Component name where error occurred */
  componentName?: string
  /** Additional CSS classes */
  className?: string
  /** Whether this is a full-page error (larger presentation) */
  fullPage?: boolean
}

/**
 * Branded error state component with ErrorAnimation and recovery actions.
 * Provides consistent error display across the application.
 */
export function BrandedErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  errorCode,
  onRetry,
  onGoHome,
  componentName,
  className,
  fullPage = false,
}: BrandedErrorStateProps) {
  const prefersReducedMotion = useReducedMotion()
  const iconSize = fullPage ? 64 : 48

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center justify-center p-8',
        fullPage && 'min-h-screen bg-background',
        !fullPage && 'border border-border',
        className
      )}
    >
      <div className={cn('text-center', fullPage ? 'max-w-lg' : 'max-w-md')}>
        {/* Animated error icon */}
        <div className="mb-6 flex justify-center">
          <ErrorAnimation
            size={iconSize}
            animate={!prefersReducedMotion}
            variant="red"
          />
        </div>

        {/* Geometric accent (error pattern) */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-0.5 bg-destructive/30" />
          <div className="w-1.5 h-1.5 bg-destructive/50 rotate-45" />
          <div className="w-6 h-0.5 bg-destructive/30" />
        </div>

        {/* Error title */}
        <h2 className={cn('font-medium mb-2', fullPage ? 'text-xl' : 'text-lg')}>
          {title}
          {componentName && (
            <span className="text-muted-foreground font-normal"> in {componentName}</span>
          )}
        </h2>

        {/* Error message */}
        <p className="text-sm text-muted-foreground mb-4">{message}</p>

        {/* Error code display */}
        {errorCode && (
          <div className="mb-6 px-3 py-2 bg-secondary/50 border border-border inline-block">
            <code className="text-xs font-mono text-muted-foreground">
              Error: {errorCode}
            </code>
          </div>
        )}

        {/* Action buttons */}
        {(onRetry || onGoHome) && (
          <div className="flex items-center justify-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-5 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center gap-2"
              >
                <RetryIcon />
                Try again
              </button>
            )}
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-5 py-2 border border-border text-sm hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <HomeIcon />
                Go home
              </button>
            )}
          </div>
        )}

        {/* Support text for full page errors */}
        {fullPage && (
          <p className="mt-8 text-xs text-muted-foreground">
            If this problem persists, please contact support.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Compact error state for inline/card usage
 */
export function BrandedErrorStateCompact({
  message = 'Something went wrong',
  onRetry,
  className,
}: Pick<BrandedErrorStateProps, 'message' | 'onRetry' | 'className'>) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 p-4 border border-destructive/20 bg-destructive/5',
        className
      )}
    >
      <ErrorAnimation size={24} animate={!prefersReducedMotion} variant="red" />
      <span className="text-sm text-foreground flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-xs border border-border hover:bg-secondary transition-colors"
        >
          Retry
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
    >
      {/* Circular arrow made from rectangles */}
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

// Geometric home icon (rectangle-based)
function HomeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-current"
    >
      {/* House shape */}
      <rect x="2" y="8" width="12" height="6" fill="currentColor" />
      <rect x="6" y="10" width="4" height="4" fill="currentColor" fillOpacity="0" stroke="currentColor" strokeWidth="1.5" />
      {/* Roof */}
      <polygon points="8,2 2,8 14,8" fill="currentColor" />
    </svg>
  )
}
