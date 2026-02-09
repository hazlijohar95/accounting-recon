import { describe, expect, it, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ErrorBoundary,
  ErrorFallback,
  withErrorBoundary,
} from '@/components/ui/error-boundary'

vi.mock('@/components/brand', () => ({
  ErrorAnimation: ({ size }: { size: number }) => <div>Animation {size}</div>,
}))

const logBoundaryError = vi.fn()
vi.mock('@/lib/error-monitor', () => ({
  logBoundaryError: (...args: unknown[]) => logBoundaryError(...args),
}))

const Thrower: React.FC = () => {
  throw new Error('Boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    logBoundaryError.mockClear()
  })

  it('renders fallback and logs error', () => {
    render(
      <ErrorBoundary componentName="Widget">
        <Thrower />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('in Widget')).toBeInTheDocument()
    expect(logBoundaryError).toHaveBeenCalled()
  })

  it('renders custom fallback', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Thrower />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
  })
})

describe('ErrorFallback', () => {
  it('calls onReset', () => {
    const onReset = vi.fn()
    render(<ErrorFallback error={new Error('Boom')} onReset={onReset} />)

    fireEvent.click(screen.getByText('Try again'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})

describe('withErrorBoundary', () => {
  it('wraps component with error boundary', () => {
    const Wrapped = withErrorBoundary(Thrower)
    render(<Wrapped />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
