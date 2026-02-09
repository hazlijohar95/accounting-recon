import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchCandidates } from '@/components/ai/reconcile-agent/tool-parts/match-candidates'

describe('MatchCandidates', () => {
  const fullResult = {
    suspenseItem: {
      sourceType: 'cash',
      description: 'Unknown transfer - Ref 9821',
      amount: -1500.0,
      date: '2025-01-20',
    },
    potentialMatches: [
      {
        id: 'doc_1',
        description: 'Invoice 9821 - Company XYZ',
        amount: -1500.0,
        date: '2025-01-18',
        similarity: 85,
        reason: 'Exact amount match, Same week',
      },
      {
        id: 'doc_2',
        description: 'PO from Company XYZ',
        amount: -1480.0,
        date: '2025-01-22',
        similarity: 55,
        reason: 'Amount within 5%',
      },
    ],
    totalFound: 2,
  }

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  // ---------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------
  it('renders loading skeleton during streaming', () => {
    const { container } = render(<MatchCandidates part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------
  it('renders error message', () => {
    render(
      <MatchCandidates part={makePart('output-available', { error: 'Failed to find candidates', potentialMatches: [] })} />
    )
    expect(screen.getByText('Failed to find candidates')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // Success rendering
  // ---------------------------------------------------------------
  it('renders suspense item details', () => {
    render(<MatchCandidates part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Unmatched Item')).toBeInTheDocument()
    expect(screen.getByText('Unknown transfer - Ref 9821')).toBeInTheDocument()
  })

  it('renders candidate list with scores', () => {
    render(<MatchCandidates part={makePart('output-available', fullResult)} />)
    expect(screen.getByText('Candidates (2)')).toBeInTheDocument()
    expect(screen.getByText('Invoice 9821 - Company XYZ')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('PO from Company XYZ')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()
  })

  it('renders empty candidates message', () => {
    render(
      <MatchCandidates
        part={makePart('output-available', { ...fullResult, potentialMatches: [], totalFound: 0 })}
      />
    )
    expect(screen.getByText('No candidates found.')).toBeInTheDocument()
  })
})
