import { captureException as sentryCaptureException } from '@sentry/nextjs'
import type { ErrorInfo } from 'react'

type CaptureContext = Parameters<typeof sentryCaptureException>[1]

export function captureException(error: unknown, context?: CaptureContext) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    sentryCaptureException(error, context)
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[Sentry disabled]', error)
  }
}

export function captureReactError(error: Error, errorInfo: ErrorInfo, source?: string) {
  captureException(error, {
    tags: {
      source: source || 'react',
    },
    extra: {
      componentStack: errorInfo.componentStack,
    },
  })
}
