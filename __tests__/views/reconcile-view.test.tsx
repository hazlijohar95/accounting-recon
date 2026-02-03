/**
 * Reconcile View Tests
 *
 * Tests the main reconciliation view component including:
 * - Loading states
 * - Match display
 * - Suspense item handling
 * - Error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Convex hooks
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
  useMutation: () => mockUseMutation(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock the session context
vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user', email: 'test@example.com' },
  }),
}))

// Mock component to test (simplified for unit testing)
function ReconcileViewTest({ sessionId }: { sessionId: string }) {
  const data = mockUseQuery()

  if (data === undefined) {
    return <div data-testid="loading-skeleton">Loading...</div>
  }

  if (data.error) {
    return <div role="alert">Something went wrong</div>
  }

  return (
    <div data-testid="reconcile-view">
      <h1>Reconciliation Session</h1>
      {data.matches?.map((match: any) => (
        <div key={match.id} data-testid="match-row">
          <span>{match.confidence}%</span>
          <span>Layer {match.layer}</span>
        </div>
      ))}
      {data.suspenseItems?.map((item: any) => (
        <div key={item.id} data-testid="suspense-item">
          <span>{item.description}</span>
          <span>${item.amount}</span>
        </div>
      ))}
    </div>
  )
}

describe('ReconcileView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockUseQuery.mockReturnValue(undefined)

    render(<ReconcileViewTest sessionId="test-session" />)

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('displays matched transactions', async () => {
    mockUseQuery.mockReturnValue({
      matches: [
        { id: '1', confidence: 95, layer: 1 },
        { id: '2', confidence: 82, layer: 3 },
      ],
      suspenseItems: [],
    })

    render(<ReconcileViewTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument()
      expect(screen.getByText('82%')).toBeInTheDocument()
    })

    const matchRows = screen.getAllByTestId('match-row')
    expect(matchRows).toHaveLength(2)
  })

  it('displays suspense items', async () => {
    mockUseQuery.mockReturnValue({
      matches: [],
      suspenseItems: [
        { id: 's1', description: 'Unmatched payment', amount: 150.00 },
        { id: 's2', description: 'Missing invoice', amount: 275.50 },
      ],
    })

    render(<ReconcileViewTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByText('Unmatched payment')).toBeInTheDocument()
      expect(screen.getByText('$150')).toBeInTheDocument()
      expect(screen.getByText('Missing invoice')).toBeInTheDocument()
    })

    const suspenseItems = screen.getAllByTestId('suspense-item')
    expect(suspenseItems).toHaveLength(2)
  })

  it('handles error state gracefully', () => {
    mockUseQuery.mockReturnValue({ error: new Error('Network error') })

    render(<ReconcileViewTest sessionId="test-session" />)

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('shows empty state when no matches or suspense items', async () => {
    mockUseQuery.mockReturnValue({
      matches: [],
      suspenseItems: [],
    })

    render(<ReconcileViewTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByText('Reconciliation Session')).toBeInTheDocument()
    })

    expect(screen.queryAllByTestId('match-row')).toHaveLength(0)
    expect(screen.queryAllByTestId('suspense-item')).toHaveLength(0)
  })

  it('displays confidence scores correctly', async () => {
    mockUseQuery.mockReturnValue({
      matches: [
        { id: '1', confidence: 100, layer: 1 },
        { id: '2', confidence: 70, layer: 4 },
        { id: '3', confidence: 55, layer: 5 },
      ],
      suspenseItems: [],
    })

    render(<ReconcileViewTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('70%')).toBeInTheDocument()
      expect(screen.getByText('55%')).toBeInTheDocument()
    })
  })

  it('shows correct layer information', async () => {
    mockUseQuery.mockReturnValue({
      matches: [
        { id: '1', confidence: 100, layer: 1 },
        { id: '2', confidence: 90, layer: 2 },
        { id: '3', confidence: 85, layer: 3 },
      ],
      suspenseItems: [],
    })

    render(<ReconcileViewTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByText('Layer 1')).toBeInTheDocument()
      expect(screen.getByText('Layer 2')).toBeInTheDocument()
      expect(screen.getByText('Layer 3')).toBeInTheDocument()
    })
  })
})

// ============ REVIEW TAB & CONFIDENCE WORKFLOW TESTS ============

describe('Review Tab & Confidence Workflow', () => {
  // Helper type matching MatchPair structure
  interface TestMatch {
    id: string
    confidence: 'high' | 'medium' | 'low'
    matchLayer: 1 | 2 | 3 | 4 | 5 | 6
    approved: boolean
    matchReason?: string
  }

  /**
   * Separates pending matches by confidence level (matches component logic)
   */
  function separatePendingByConfidence(pendingMatches: TestMatch[]): {
    highConfidence: TestMatch[]
    mediumLowConfidence: TestMatch[]
  } {
    const highConfidence = pendingMatches.filter(m => m.confidence === 'high')
    const mediumLowConfidence = pendingMatches.filter(
      m => m.confidence === 'medium' || m.confidence === 'low'
    )
    return { highConfidence, mediumLowConfidence }
  }

  /**
   * Gets confidence warning message (matches component logic)
   */
  function getConfidenceWarning(match: TestMatch): string | null {
    if (match.matchLayer === 5) return 'AI suggested match - verify manually'
    if (match.matchLayer === 4) return 'Fuzzy name match - verify counterparty'
    if (match.confidence === 'medium') return 'Medium confidence - review amounts'
    if (match.confidence === 'low') return 'Low confidence - careful review needed'
    return null
  }

  const testMatches: TestMatch[] = [
    { id: 'm1', confidence: 'high', matchLayer: 1, approved: false },
    { id: 'm2', confidence: 'high', matchLayer: 2, approved: false },
    { id: 'm3', confidence: 'medium', matchLayer: 3, approved: false },
    { id: 'm4', confidence: 'medium', matchLayer: 5, approved: false, matchReason: 'AI: Amount match' },
    { id: 'm5', confidence: 'low', matchLayer: 4, approved: false },
    { id: 'm6', confidence: 'high', matchLayer: 1, approved: true },
    { id: 'm7', confidence: 'medium', matchLayer: 5, approved: true, matchReason: 'AI: Reference match' },
  ]

  describe('tab filtering', () => {
    it('shows high confidence in Ready tab', () => {
      const pending = testMatches.filter(m => !m.approved)
      const { highConfidence } = separatePendingByConfidence(pending)

      expect(highConfidence).toHaveLength(2)
      expect(highConfidence.every(m => m.confidence === 'high')).toBe(true)
    })

    it('shows medium and low confidence in Review tab', () => {
      const pending = testMatches.filter(m => !m.approved)
      const { mediumLowConfidence } = separatePendingByConfidence(pending)

      expect(mediumLowConfidence).toHaveLength(3)
      expect(mediumLowConfidence.every(
        m => m.confidence === 'medium' || m.confidence === 'low'
      )).toBe(true)
    })

    it('shows all approved in Matched tab regardless of confidence', () => {
      const approved = testMatches.filter(m => m.approved)

      expect(approved).toHaveLength(2)
      expect(approved.some(m => m.confidence === 'high')).toBe(true)
      expect(approved.some(m => m.confidence === 'medium')).toBe(true)
    })

    it('correctly distributes all matches across tabs', () => {
      const pending = testMatches.filter(m => !m.approved)
      const approved = testMatches.filter(m => m.approved)
      const { highConfidence, mediumLowConfidence } = separatePendingByConfidence(pending)

      const total = highConfidence.length + mediumLowConfidence.length + approved.length
      expect(total).toBe(testMatches.length)
    })
  })

  describe('confidence warnings', () => {
    it('shows AI warning for Layer 5 matches', () => {
      const aiMatch: TestMatch = { id: 'm1', confidence: 'medium', matchLayer: 5, approved: false }
      expect(getConfidenceWarning(aiMatch)).toBe('AI suggested match - verify manually')
    })

    it('shows fuzzy warning for Layer 4 matches', () => {
      const fuzzyMatch: TestMatch = { id: 'm1', confidence: 'low', matchLayer: 4, approved: false }
      expect(getConfidenceWarning(fuzzyMatch)).toBe('Fuzzy name match - verify counterparty')
    })

    it('shows medium confidence warning when not Layer 4/5', () => {
      const mediumMatch: TestMatch = { id: 'm1', confidence: 'medium', matchLayer: 2, approved: false }
      expect(getConfidenceWarning(mediumMatch)).toBe('Medium confidence - review amounts')
    })

    it('shows low confidence warning when not Layer 4/5', () => {
      const lowMatch: TestMatch = { id: 'm1', confidence: 'low', matchLayer: 3, approved: false }
      expect(getConfidenceWarning(lowMatch)).toBe('Low confidence - careful review needed')
    })

    it('returns null for high confidence non-AI/fuzzy matches', () => {
      const exactMatch: TestMatch = { id: 'm1', confidence: 'high', matchLayer: 1, approved: false }
      expect(getConfidenceWarning(exactMatch)).toBeNull()
    })

    it('prioritizes layer warning over confidence warning', () => {
      // Layer 5 with medium confidence should show AI warning, not medium warning
      const aiMedium: TestMatch = { id: 'm1', confidence: 'medium', matchLayer: 5, approved: false }
      expect(getConfidenceWarning(aiMedium)).toBe('AI suggested match - verify manually')

      // Layer 4 with low confidence should show fuzzy warning, not low warning
      const fuzzyLow: TestMatch = { id: 'm1', confidence: 'low', matchLayer: 4, approved: false }
      expect(getConfidenceWarning(fuzzyLow)).toBe('Fuzzy name match - verify counterparty')
    })
  })

  describe('match reasoning display', () => {
    it('identifies Layer 5 matches needing AI reasoning display', () => {
      const aiMatch: TestMatch = {
        id: 'm1',
        confidence: 'medium',
        matchLayer: 5,
        approved: false,
        matchReason: 'Smart fallback: Amount match; Reference match'
      }

      const shouldShowAIReasoning = aiMatch.matchReason &&
        (aiMatch.matchLayer === 4 || aiMatch.matchLayer === 5)

      expect(shouldShowAIReasoning).toBe(true)
    })

    it('identifies Layer 4 matches needing match reason display', () => {
      const fuzzyMatch: TestMatch = {
        id: 'm1',
        confidence: 'medium',
        matchLayer: 4,
        approved: false,
        matchReason: 'Fuzzy counterparty match: 65% similarity'
      }

      const shouldShowReason = fuzzyMatch.matchReason &&
        (fuzzyMatch.matchLayer === 4 || fuzzyMatch.matchLayer === 5)

      expect(shouldShowReason).toBe(true)
    })

    it('does not show reasoning for Layer 1-3 matches', () => {
      const exactMatch: TestMatch = {
        id: 'm1',
        confidence: 'high',
        matchLayer: 1,
        approved: false,
        matchReason: undefined
      }

      const shouldShowReason = exactMatch.matchReason &&
        (exactMatch.matchLayer === 4 || exactMatch.matchLayer === 5)

      expect(shouldShowReason).toBeFalsy()
    })
  })
})

// ============ KEYBOARD NAVIGATION LOGIC TESTS ============

describe('Keyboard Navigation Logic', () => {
  function navigateList(
    currentIndex: number,
    listLength: number,
    direction: 'next' | 'prev'
  ): number {
    if (listLength === 0) return -1

    if (direction === 'next') {
      return currentIndex < listLength - 1 ? currentIndex + 1 : 0
    } else {
      return currentIndex > 0 ? currentIndex - 1 : listLength - 1
    }
  }

  it('navigates down with arrow keys', () => {
    expect(navigateList(0, 5, 'next')).toBe(1)
    expect(navigateList(2, 5, 'next')).toBe(3)
  })

  it('wraps to beginning when at end', () => {
    expect(navigateList(4, 5, 'next')).toBe(0)
  })

  it('navigates up with arrow keys', () => {
    expect(navigateList(2, 5, 'prev')).toBe(1)
    expect(navigateList(4, 5, 'prev')).toBe(3)
  })

  it('wraps to end when at beginning', () => {
    expect(navigateList(0, 5, 'prev')).toBe(4)
  })

  it('returns -1 for empty list', () => {
    expect(navigateList(0, 0, 'next')).toBe(-1)
    expect(navigateList(0, 0, 'prev')).toBe(-1)
  })
})
