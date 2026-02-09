import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransactionTable } from '@/components/ai/reconcile-agent/tool-parts/transaction-table'

describe('TransactionTable', () => {
  const sampleTransactions = [
    {
      id: 'tx_1',
      type: 'cash',
      description: 'Payment to Vendor A',
      amount: -5000.0,
      date: '2025-01-15',
      status: 'pending',
      reference: 'REF-001',
    },
    {
      id: 'tx_2',
      type: 'accrual',
      description: 'Invoice from Supplier B',
      amount: 3250.5,
      date: '2025-01-16',
      status: 'matched',
      docNumber: 'INV-1234',
    },
  ]

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  // ---------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------
  it('renders loading skeleton during input-streaming', () => {
    const { container } = render(<TransactionTable part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------
  it('renders error message', () => {
    render(
      <TransactionTable part={makePart('output-available', { error: 'Failed to list transactions' })} />
    )
    expect(screen.getByText('Failed to list transactions')).toBeInTheDocument()
  })

  it('renders fallback error when result is undefined', () => {
    render(<TransactionTable part={makePart('output-available', undefined)} />)
    expect(screen.getByText('Failed to load transactions')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------
  it('renders empty state when no transactions match', () => {
    render(
      <TransactionTable
        part={makePart('output-available', {
          transactions: [],
          totalFound: 0,
          truncated: false,
        })}
      />
    )
    expect(screen.getByText('No transactions found matching the criteria.')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Data rendering
  // ---------------------------------------------------------------
  it('renders transactions in a table', () => {
    render(
      <TransactionTable
        part={makePart('output-available', {
          transactions: sampleTransactions,
          totalFound: 2,
          truncated: false,
        })}
      />
    )

    // Header
    expect(screen.getByText('Transactions (2)')).toBeInTheDocument()

    // Column headers
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    // Row data
    expect(screen.getByText('Payment to Vendor A')).toBeInTheDocument()
    expect(screen.getByText('Invoice from Supplier B')).toBeInTheDocument()
    expect(screen.getByText('cash')).toBeInTheDocument()
    expect(screen.getByText('accrual')).toBeInTheDocument()
    expect(screen.getByText('2025-01-15')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('matched')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Truncation indicator
  // ---------------------------------------------------------------
  it('renders truncation notice when results are truncated', () => {
    render(
      <TransactionTable
        part={makePart('output-available', {
          transactions: sampleTransactions,
          totalFound: 50,
          truncated: true,
        })}
      />
    )
    expect(screen.getByText('Transactions (50+)')).toBeInTheDocument()
    expect(screen.getByText('Showing 2 of 50 results')).toBeInTheDocument()
  })

  it('does not render truncation notice when not truncated', () => {
    render(
      <TransactionTable
        part={makePart('output-available', {
          transactions: sampleTransactions,
          totalFound: 2,
          truncated: false,
        })}
      />
    )
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })
})
