import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpenseInsights } from '@/components/ai/reconcile-agent/tool-parts/expense-insights'

describe('ExpenseInsights', () => {
  const fullResult = {
    summary: {
      totalTransactions: 50,
      totalInflows: 80000.0,
      totalOutflows: 65000.0,
      netCashflow: 15000.0,
      averageTransaction: 2900.0,
    },
    categoryBreakdown: [
      { category: 'Rent', count: 1, total: 25000.0, percentage: '17.2' },
      { category: 'Utilities', count: 5, total: 8500.0, percentage: '5.9' },
    ],
    anomalies: [
      {
        description: 'Unusually large payment',
        amount: -45000.0,
        date: '2025-01-10',
        reason: '15.5x average',
      },
    ],
  }

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  it('renders loading skeleton during streaming', () => {
    const { container } = render(<ExpenseInsights part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<ExpenseInsights part={makePart('output-available', { error: 'Failed to load insights' })} />)
    expect(screen.getByText('Failed to load insights')).toBeInTheDocument()
  })

  it('renders inflows and outflows summary', () => {
    render(<ExpenseInsights part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Inflows')).toBeInTheDocument()
    expect(screen.getByText('Outflows')).toBeInTheDocument()
    expect(screen.getByText('Net Cashflow')).toBeInTheDocument()
  })

  it('renders category breakdown', () => {
    render(<ExpenseInsights part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('By Category')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(screen.getByText('Utilities')).toBeInTheDocument()
    expect(screen.getByText('17.2%')).toBeInTheDocument()
    expect(screen.getByText('5.9%')).toBeInTheDocument()
  })

  it('renders anomalies section', () => {
    render(<ExpenseInsights part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Anomalies (1)')).toBeInTheDocument()
    expect(screen.getByText('Unusually large payment')).toBeInTheDocument()
  })

  it('skips sections when data is missing', () => {
    render(
      <ExpenseInsights part={makePart('output-available', { summary: fullResult.summary })} />
    )
    expect(screen.getByText('Inflows')).toBeInTheDocument()
    expect(screen.queryByText('By Category')).not.toBeInTheDocument()
    expect(screen.queryByText(/Anomalies/)).not.toBeInTheDocument()
  })
})
