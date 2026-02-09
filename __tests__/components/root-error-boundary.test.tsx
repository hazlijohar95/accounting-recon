import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { RootErrorBoundary } from '@/components/root-error-boundary'

const captureReactError = vi.fn()
vi.mock('@/lib/sentry', () => ({
  captureReactError: (...args: unknown[]) => captureReactError(...args),
}))

vi.mock('@/components/brand', () => ({
  BrandedErrorState: ({ title, onRetry, onGoHome }: any) => (
    <div>
      <h1>{title}</h1>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onGoHome}>Home</button>
    </div>
  ),
}))

const Thrower: React.FC = () => {
  throw new Error('Root crash')
}

describe('RootErrorBoundary', () => {
  it('renders fallback and reports error', () => {
    render(
      <RootErrorBoundary>
        <Thrower />
      </RootErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(captureReactError).toHaveBeenCalled()
  })

  it('triggers retry and go home actions', () => {
    render(
      <RootErrorBoundary>
        <Thrower />
      </RootErrorBoundary>
    )

    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
