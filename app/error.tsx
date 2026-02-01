'use client'

import { useEffect } from 'react'
import { IconWarning, IconRefresh } from '@/components/brand/icons'
import { captureException } from '@/lib/sentry'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    captureException(error, {
      tags: {
        errorType: 'page',
        digest: error.digest || 'none',
      },
    })
  }, [error])

  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <IconWarning size={32} className="text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-accent transition-colors"
        >
          <IconRefresh size={16} />
          Try again
        </button>
      </div>
    </div>
  )
}
