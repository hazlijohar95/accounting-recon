'use client'

import { cn } from '@/lib/cn'

interface UniverSheetErrorProps {
  error?: Error | null
  onRetry?: () => void
  height?: string | number
  className?: string
}

/**
 * Error state component for UniverSheet
 *
 * Displays when the spreadsheet fails to load or encounters a runtime error.
 * Provides retry functionality and error details.
 */
export function UniverSheetError({
  error,
  onRetry,
  height = '600px',
  className,
}: UniverSheetErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center border border-border rounded-lg bg-background',
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      role="alert"
      aria-live="assertive"
    >
      {/* Error icon */}
      <div className="text-destructive mb-4">
        <svg
          className="w-12 h-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          {/* Grid/spreadsheet icon with X */}
          <rect x="3" y="3" width="18" height="18" strokeLinecap="round" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
          {/* X overlay */}
          <line x1="7" y1="7" x2="17" y2="17" strokeWidth={2} className="text-destructive" />
          <line x1="17" y1="7" x2="7" y2="17" strokeWidth={2} className="text-destructive" />
        </svg>
      </div>

      {/* Error message */}
      <h3 className="text-lg font-medium mb-2">Failed to load spreadsheet</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-md px-4">
        {error?.message || 'An unexpected error occurred while loading the spreadsheet.'}
      </p>

      {/* Error details in development */}
      {process.env.NODE_ENV === 'development' && error?.stack && (
        <details className="mb-4 max-w-lg">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Show technical details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32 text-muted-foreground">
            {error.stack}
          </pre>
        </details>
      )}

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RetryIcon />
          Try Again
        </button>
      )}

      {/* Help text */}
      <p className="mt-4 text-xs text-muted-foreground">
        If the problem persists, try refreshing the page.
      </p>
    </div>
  )
}

/**
 * Geometric retry icon matching brand style
 */
function RetryIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="text-current"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="4" height="2" />
      <rect x="5" y="3" width="2" height="5" />
      <rect x="6" y="2" width="5" height="2" />
      <rect x="10" y="3" width="2" height="4" />
      <rect x="11" y="6" width="2" height="4" />
      <rect x="10" y="9" width="2" height="4" />
      <rect x="5" y="12" width="6" height="2" />
      <rect x="4" y="9" width="2" height="4" />
    </svg>
  )
}
