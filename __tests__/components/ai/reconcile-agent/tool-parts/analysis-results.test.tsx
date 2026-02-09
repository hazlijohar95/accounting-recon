import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnalysisResults } from '@/components/ai/reconcile-agent/tool-parts/analysis-results'

describe('AnalysisResults', () => {
  const fullResult = {
    success: true,
    analyzed: 50,
    pendingCashCount: 10,
    pendingAccrualCount: 5,
    potentialMatches: [
      {
        cashId: 'tx_1',
        cashDescription: 'Bank Transfer - ABC Corp',
        cashAmount: -3000.0,
        accrualId: 'doc_1',
        accrualDescription: 'Invoice from ABC Corp',
        accrualAmount: -3000.0,
        score: 92,
        confidence: 'high',
        factors: ['Exact amount match', 'Same week', 'Name/description similarity'],
      },
      {
        cashId: 'tx_2',
        cashDescription: 'Payment to Vendor Z',
        cashAmount: -1200.0,
        accrualId: 'doc_2',
        accrualDescription: 'Vendor Z PO #4456',
        accrualAmount: -1180.0,
        score: 65,
        confidence: 'medium',
        factors: ['Amount within 5%', 'Within 7 days'],
      },
    ],
    highConfidenceCount: 1,
    message: 'Analyzed 10 cash transactions against 5 accrual documents.',
  }

  const makePart = (state: string, output?: unknown) =>
    ({ state, output }) as any

  it('renders loading spinner during streaming', () => {
    const { container } = render(<AnalysisResults part={makePart('input-streaming')} />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.getByText('Running matching analysis...')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<AnalysisResults part={makePart('output-available', { error: 'Analysis failed' })} />)
    expect(screen.getByText('Analysis failed')).toBeInTheDocument()
  })

  it('renders no matches message', () => {
    render(
      <AnalysisResults
        part={makePart('output-available', {
          success: true,
          potentialMatches: [],
          message: 'No potential matches found.',
        })}
      />
    )
    expect(screen.getByText('No potential matches found.')).toBeInTheDocument()
  })

  it('renders analysis results with scores and factors', () => {
    render(<AnalysisResults part={makePart('output-available', fullResult)} />)

    expect(screen.getByText('Analysis Results')).toBeInTheDocument()
    expect(screen.getByText('1 high confidence')).toBeInTheDocument()
    expect(screen.getByText('92% high')).toBeInTheDocument()
    expect(screen.getByText('65% medium')).toBeInTheDocument()
  })

  it('renders cash and accrual descriptions', () => {
    render(<AnalysisResults part={makePart('output-available', fullResult)} />)

    expect(screen.getByText(/Bank Transfer - ABC Corp/)).toBeInTheDocument()
    expect(screen.getByText(/Invoice from ABC Corp/)).toBeInTheDocument()
  })

  it('renders summary message', () => {
    render(<AnalysisResults part={makePart('output-available', fullResult)} />)
    expect(
      screen.getByText('Analyzed 10 cash transactions against 5 accrual documents.')
    ).toBeInTheDocument()
  })
})
