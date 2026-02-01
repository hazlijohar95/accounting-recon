'use client'

import { useEffect } from 'react'
import { IconWarning, IconRefresh } from '@/components/brand/icons'
import { captureException } from '@/lib/sentry'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error monitoring (self-hosted Convex + optional Sentry)
    captureException(error, {
      tags: {
        errorType: 'global',
        digest: error.digest || 'none',
      },
    })
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
            <IconWarning size={40} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Application Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              A critical error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 font-mono">
                Reference: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <IconRefresh size={16} />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
