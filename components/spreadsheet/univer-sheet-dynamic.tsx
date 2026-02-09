'use client'

/**
 * Dynamic Spreadsheet Wrapper
 *
 * Uses Jspreadsheet CE for React 19 compatibility.
 * Provides client-side only loading with error handling.
 */

import { Component, type ReactNode, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/cn'
import type { UniverSheetProps } from './types'

/**
 * Error Boundary for spreadsheet component
 */
class SpreadsheetErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

/**
 * Loading placeholder for spreadsheet
 */
function SpreadsheetLoadingPlaceholder({ height, className }: { height?: string | number; className?: string }) {
  const heightStyle = typeof height === 'number' ? `${height}px` : (height || '600px')

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border border-border overflow-hidden bg-background',
        className
      )}
      style={{ height: heightStyle }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading spreadsheet...</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Error fallback for spreadsheet
 */
function SpreadsheetErrorFallback({ height, className, onRetry }: { height?: string | number; className?: string; onRetry?: () => void }) {
  const heightStyle = typeof height === 'number' ? `${height}px` : (height || '600px')

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center w-full rounded-lg border border-border overflow-hidden bg-background',
        className
      )}
      style={{ height: heightStyle }}
    >
      <div className="text-destructive mb-4">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-2">Spreadsheet unavailable</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
        There was an issue loading the spreadsheet component.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * Dynamically imported JspreadsheetSheet with SSR disabled
 * Uses Jspreadsheet CE for React 19 compatibility
 */
const DynamicJspreadsheetSheet = dynamic(
  () => import('./jspreadsheet-sheet').then(mod => ({ default: mod.JspreadsheetSheet })),
  {
    ssr: false,
    loading: () => <SpreadsheetLoadingPlaceholder />,
  }
)

/**
 * Safe spreadsheet wrapper with error handling
 * Exported as UniverSheetSafe for backwards compatibility
 */
export function UniverSheetSafe(props: UniverSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Only render on client after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleRetry = () => {
    setRetryKey(prev => prev + 1)
  }

  if (!mounted) {
    return <SpreadsheetLoadingPlaceholder height={props.height} className={props.className} />
  }

  return (
    <SpreadsheetErrorBoundary
      key={retryKey}
      fallback={
        <SpreadsheetErrorFallback
          height={props.height}
          className={props.className}
          onRetry={handleRetry}
        />
      }
    >
      <DynamicJspreadsheetSheet {...props} />
    </SpreadsheetErrorBoundary>
  )
}

/**
 * Read-only wrapper
 */
export function UniverSheetSafeReadOnly(props: Omit<UniverSheetProps, 'readOnly'>) {
  return <UniverSheetSafe {...props} readOnly />
}
