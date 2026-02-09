import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuspenseList } from '@/components/ai/reconcile-agent/tool-parts/suspense-list'

describe('SuspenseList', () => {
  const items = [
    {
      id: 'si_1',
      sourceType: 'cash',
      description: 'Unknown debit - Wire transfer',
      amount: -2500.0,
      date: '2025-01-18',
      reason: 'no_match',
      suggestedAction: 'Find corresponding invoice',
      status: 'open',
    },
    {
      id: 'si_2',
      sourceType: 'accrual',
      description: 'Invoice #7890 - Pending payment',
      amount: -800.0,
      date: '2025-01-20',
      reason: 'amount_mismatch',
      suggestedAction: 'Review for partial match',
      status: 'queried',
    },
  ]

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  it('renders loading skeleton during streaming', () => {
    const { container } = render(<SuspenseList part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<SuspenseList part={makePart('output-available', { error: 'Failed to load' })} />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })

  it('renders empty state with success message', () => {
    render(
      <SuspenseList
        part={makePart('output-available', { items: [], totalFound: 0, truncated: false })}
      />
    )
    expect(
      screen.getByText('No suspense items found. All items are matched or resolved.')
    ).toBeInTheDocument()
  })

  it('renders items with type badges and status', () => {
    render(
      <SuspenseList
        part={makePart('output-available', { items, totalFound: 2, truncated: false })}
      />
    )

    expect(screen.getByText('Suspense Items (2)')).toBeInTheDocument()
    expect(screen.getByText('cash')).toBeInTheDocument()
    expect(screen.getByText('accrual')).toBeInTheDocument()
    expect(screen.getByText('Unknown debit - Wire transfer')).toBeInTheDocument()
    expect(screen.getByText('Invoice #7890 - Pending payment')).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('queried')).toBeInTheDocument()
  })

  it('renders truncation notice', () => {
    render(
      <SuspenseList
        part={makePart('output-available', { items, totalFound: 25, truncated: true })}
      />
    )
    expect(screen.getByText('Showing 2 of 25 items')).toBeInTheDocument()
  })

  it('renders reason with underscores replaced by spaces', () => {
    render(
      <SuspenseList
        part={makePart('output-available', { items, totalFound: 2, truncated: false })}
      />
    )
    expect(screen.getByText(/no match/)).toBeInTheDocument()
    expect(screen.getByText(/amount mismatch/)).toBeInTheDocument()
  })
})
