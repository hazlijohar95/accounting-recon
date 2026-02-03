import type { ErrorInfo } from 'react'

type CaptureContext = {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

export function captureException(error: unknown, context?: CaptureContext) {
  // Log errors to console in development
  // TODO: Replace with proper error monitoring service when needed
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error captured]', error, context)
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
