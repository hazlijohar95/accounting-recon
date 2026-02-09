import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchDetails } from '@/components/ai/reconcile-agent/tool-parts/match-details'

describe('MatchDetails', () => {
  const fullResult = {
    matches: [
      {
        matchId: 'mp_001',
        layer: 1,
        layerName: 'Exact Match',
        confidence: 98,
        confidenceLevel: 'high',
        status: 'approved',
        matchReason: 'Exact amount and date match',
        isPartialMatch: false,
        matchedAmount: 5000,
        cashTransaction: {
          id: 'tx_1',
          description: 'Bank Transfer to ABC',
          amount: -5000.0,
          date: '2025-01-15',
        },
        accrualDocument: {
          id: 'doc_1',
          description: 'Invoice from ABC Corp',
          amount: -5000.0,
          date: '2025-01-14',
          docNumber: 'INV-001',
        },
      },
      {
        matchId: 'mp_002',
        error: 'Not found or access denied',
      },
    ],
  }

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  it('renders loading skeleton during streaming', () => {
    const { container } = render(<MatchDetails part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders error message when result has error', () => {
    render(
      <MatchDetails part={makePart('output-available', { error: 'Failed to load match details' })} />
    )
    expect(screen.getByText('Failed to load match details')).toBeInTheDocument()
  })

  it('renders match details with layer, confidence, status', () => {
    render(<MatchDetails part={makePart('output-available', fullResult)} />)

    expect(screen.getByText('Exact Match')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
    expect(screen.getByText('approved')).toBeInTheDocument()
  })

  it('renders cash and accrual transaction info', () => {
    render(<MatchDetails part={makePart('output-available', fullResult)} />)

    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Accrual')).toBeInTheDocument()
    expect(screen.getByText('Bank Transfer to ABC')).toBeInTheDocument()
    expect(screen.getByText('Invoice from ABC Corp')).toBeInTheDocument()
  })

  it('renders match reason', () => {
    render(<MatchDetails part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Exact amount and date match')).toBeInTheDocument()
  })

  it('renders per-match error inline', () => {
    render(<MatchDetails part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Not found or access denied')).toBeInTheDocument()
  })

  it('renders partial match badge when applicable', () => {
    const partialResult = {
      matches: [
        {
          ...fullResult.matches[0],
          isPartialMatch: true,
        },
      ],
    }
    render(<MatchDetails part={makePart('output-available', partialResult)} />)
    expect(screen.getByText('Partial')).toBeInTheDocument()
  })
})
