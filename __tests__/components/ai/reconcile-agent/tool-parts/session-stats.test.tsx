import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionStats } from '@/components/ai/reconcile-agent/tool-parts/session-stats'

describe('SessionStats', () => {
  const fullResult = {
    sessionName: 'January 2025 Reconciliation',
    progress: 75,
    counts: {
      totalCashTransactions: 100,
      totalAccrualDocuments: 90,
      pendingCash: 25,
      matchedCash: 75,
      pendingAccrual: 15,
      matchedAccrual: 75,
    },
    totals: {
      cashAmount: 150000.5,
      accrualAmount: 149500.25,
      variance: 500.25,
    },
  }

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  // ---------------------------------------------------------------
  // Loading states
  // ---------------------------------------------------------------
  it('renders loading skeleton when streaming', () => {
    const { container } = render(<SessionStats part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders loading skeleton when input-available (tool executing)', () => {
    const { container } = render(<SessionStats part={makePart('input-available')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Error states
  // ---------------------------------------------------------------
  it('renders error message when result has error', () => {
    render(<SessionStats part={makePart('output-available', { error: 'Session not found' })} />)
    expect(screen.getByText('Session not found')).toBeInTheDocument()
  })

  it('renders fallback error when result is undefined', () => {
    render(<SessionStats part={makePart('output-available', undefined)} />)
    expect(screen.getByText('Failed to load stats')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Success rendering
  // ---------------------------------------------------------------
  it('renders session name and progress', () => {
    render(<SessionStats part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('January 2025 Reconciliation')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('renders matched, pending, and total count cards', () => {
    render(<SessionStats part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('75')).toBeInTheDocument() // matchedCash
    expect(screen.getByText('25')).toBeInTheDocument() // pendingCash
    expect(screen.getByText('100')).toBeInTheDocument() // totalCashTransactions
    expect(screen.getByText('Matched')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Total Cash')).toBeInTheDocument()
  })

  it('renders cash, accrual totals and variance', () => {
    render(<SessionStats part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Cash Total')).toBeInTheDocument()
    expect(screen.getByText('Accrual Total')).toBeInTheDocument()
    expect(screen.getByText('Variance')).toBeInTheDocument()
  })

  it('does not render session name if not provided', () => {
    const noNameResult = { ...fullResult, sessionName: undefined }
    render(<SessionStats part={makePart('output-available', noNameResult)} />)
    expect(screen.queryByText('January 2025 Reconciliation')).not.toBeInTheDocument()
  })
})
