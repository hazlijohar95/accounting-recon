import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchExplanation } from '@/components/ai/reconcile-agent/tool-parts/match-explanation'

describe('MatchExplanation', () => {
  const fullResult = {
    matchId: 'match_001',
    layer: 1,
    layerName: 'Exact Match',
    confidence: 95,
    confidenceLevel: 'high',
    status: 'approved',
    matchReason: 'Exact amount and date match with reference overlap',
    factors: {
      amountMatch: true,
      amountDifference: 0,
      dateProximity: 1,
      referenceMatch: true,
    },
    cashTransaction: {
      description: 'Bank Payment - Supplier X',
      amount: -5000.0,
      date: '2025-01-15',
    },
    accrualDocument: {
      description: 'Invoice from Supplier X',
      amount: -5000.0,
      date: '2025-01-14',
      docNumber: 'INV-5678',
    },
  }

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  // ---------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------
  it('renders loading skeleton during streaming', () => {
    const { container } = render(<MatchExplanation part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------
  it('renders error message', () => {
    render(
      <MatchExplanation part={makePart('output-available', { error: 'Match not found' })} />
    )
    expect(screen.getByText('Match not found')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Success rendering
  // ---------------------------------------------------------------
  it('renders layer name badge', () => {
    render(<MatchExplanation part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Exact Match')).toBeInTheDocument()
  })

  it('renders status', () => {
    render(<MatchExplanation part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('approved')).toBeInTheDocument()
  })

  it('renders confidence score', () => {
    render(<MatchExplanation part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('renders match reason', () => {
    render(<MatchExplanation part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Exact amount and date match with reference overlap')).toBeInTheDocument()
  })

  it('renders cash and accrual transaction details', () => {
    render(<MatchExplanation part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Accrual')).toBeInTheDocument()
    expect(screen.getByText('Bank Payment - Supplier X')).toBeInTheDocument()
    expect(screen.getByText('Invoice from Supplier X')).toBeInTheDocument()
  })

  it('renders matching factors', () => {
    render(<MatchExplanation part={makePart('output-available', fullResult)} />)
    expect(screen.getByText(/Amount: Exact match/)).toBeInTheDocument()
    expect(screen.getByText(/Date: 1 days apart/)).toBeInTheDocument()
    expect(screen.getByText(/Reference: Match found/)).toBeInTheDocument()
  })

  it('renders non-matching factors correctly', () => {
    const noMatchFactors = {
      ...fullResult,
      factors: {
        amountMatch: false,
        amountDifference: 250.5,
        dateProximity: 14,
        referenceMatch: false,
      },
    }
    render(<MatchExplanation part={makePart('output-available', noMatchFactors)} />)
    expect(screen.getByText(/Diff/)).toBeInTheDocument()
    expect(screen.getByText(/14 days apart/)).toBeInTheDocument()
    expect(screen.getByText(/Reference: No match/)).toBeInTheDocument()
  })
})
