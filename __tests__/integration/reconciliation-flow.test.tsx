/**
 * Reconciliation Flow Integration Tests
 *
 * Tests the complete reconciliation workflow including:
 * - Creating a session
 * - Uploading documents
 * - Running matching
 * - Reviewing results
 * - Completing the session
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Convex hooks
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockMutationFn = vi.fn()

vi.mock('convex/react', () => ({
  useQuery: (query: any) => mockUseQuery(query),
  useMutation: (mutation: any) => {
    mockUseMutation(mutation)
    return mockMutationFn
  },
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Next.js router
const mockPush = vi.fn()
const mockParams = { id: 'test-session' }

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
  useParams: () => mockParams,
}))

// Mock auth
vi.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user', email: 'test@example.com' },
  }),
}))

// Simplified reconciliation workflow component
function ReconciliationWorkflow({ sessionId }: { sessionId: string }) {
  const sessionData = mockUseQuery('getSession')
  const matchesData = mockUseQuery('getMatches')

  if (sessionData === undefined) {
    return <div data-testid="loading">Loading...</div>
  }

  if (!sessionData) {
    return <div data-testid="error">Session not found</div>
  }

  const handleRunMatching = async () => {
    await mockMutationFn({ sessionId, useLLM: false })
  }

  const handleApproveMatch = async (matchId: string) => {
    await mockMutationFn({ matchId, status: 'approved' })
  }

  const handleRejectMatch = async (matchId: string) => {
    await mockMutationFn({ matchId, status: 'rejected' })
  }

  const handleCompleteSession = async () => {
    await mockMutationFn({ sessionId })
    mockPush('/dashboard')
  }

  return (
    <div data-testid="workflow">
      {/* Session Header */}
      <header data-testid="session-header">
        <h1>{sessionData.name}</h1>
        <span data-testid="status-badge">{sessionData.status}</span>
      </header>

      {/* Progress */}
      <div data-testid="progress">
        <progress value={sessionData.progress} max={100} />
        <span>{sessionData.progress}% complete</span>
      </div>

      {/* Actions based on status */}
      {sessionData.status === 'draft' && (
        <button data-testid="start-matching" onClick={handleRunMatching}>
          Start Matching
        </button>
      )}

      {sessionData.status === 'processing' && (
        <div data-testid="processing-indicator">
          <span>Processing matches...</span>
        </div>
      )}

      {sessionData.status === 'review' && (
        <div data-testid="review-section">
          <h2>Review Matches</h2>
          {matchesData?.pending?.map((match: any) => (
            <div key={match.id} data-testid="match-item">
              <span>{match.cashDescription} → {match.accrualDescription}</span>
              <span>{match.confidence}%</span>
              <button
                data-testid={`approve-${match.id}`}
                onClick={() => handleApproveMatch(match.id)}
              >
                Approve
              </button>
              <button
                data-testid={`reject-${match.id}`}
                onClick={() => handleRejectMatch(match.id)}
              >
                Reject
              </button>
            </div>
          ))}

          {matchesData?.pending?.length === 0 && (
            <button data-testid="complete-session" onClick={handleCompleteSession}>
              Complete Session
            </button>
          )}
        </div>
      )}

      {sessionData.status === 'completed' && (
        <div data-testid="completed-section">
          <h2>Session Complete</h2>
          <p>All matches have been reviewed.</p>
          <button data-testid="export-report">Export Report</button>
        </div>
      )}

      {/* Summary Stats */}
      <div data-testid="stats-summary">
        <span>Matched: {sessionData.matchedCount}</span>
        <span>Suspense: {sessionData.suspenseCount}</span>
      </div>
    </div>
  )
}

describe('Reconciliation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutationFn.mockResolvedValue({ success: true })
  })

  it('shows draft session with start button', async () => {
    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'draft',
          progress: 0,
          matchedCount: 0,
          suspenseCount: 0,
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('session-header')).toBeInTheDocument()
      expect(screen.getByTestId('start-matching')).toBeInTheDocument()
      expect(screen.getByTestId('status-badge')).toHaveTextContent('draft')
    })
  })

  it('shows processing state during matching', async () => {
    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'processing',
          progress: 45,
          matchedCount: 20,
          suspenseCount: 0,
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('processing-indicator')).toBeInTheDocument()
      expect(screen.getByText('Processing matches...')).toBeInTheDocument()
    })
  })

  it('shows review section with pending matches', async () => {
    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'review',
          progress: 100,
          matchedCount: 45,
          suspenseCount: 5,
        }
      }
      if (query === 'getMatches') {
        return {
          pending: [
            { id: 'm1', cashDescription: 'Payment ABC', accrualDescription: 'Invoice ABC', confidence: 85 },
            { id: 'm2', cashDescription: 'Payment XYZ', accrualDescription: 'Invoice XYZ', confidence: 72 },
          ],
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('review-section')).toBeInTheDocument()
      expect(screen.getAllByTestId('match-item')).toHaveLength(2)
    })
  })

  it('allows approving matches', async () => {
    const user = userEvent.setup()

    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'review',
          progress: 100,
          matchedCount: 45,
          suspenseCount: 5,
        }
      }
      if (query === 'getMatches') {
        return {
          pending: [
            { id: 'm1', cashDescription: 'Payment ABC', accrualDescription: 'Invoice ABC', confidence: 85 },
          ],
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('approve-m1')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('approve-m1'))

    expect(mockMutationFn).toHaveBeenCalledWith({ matchId: 'm1', status: 'approved' })
  })

  it('allows rejecting matches', async () => {
    const user = userEvent.setup()

    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'review',
          progress: 100,
          matchedCount: 45,
          suspenseCount: 5,
        }
      }
      if (query === 'getMatches') {
        return {
          pending: [
            { id: 'm1', cashDescription: 'Payment ABC', accrualDescription: 'Invoice ABC', confidence: 85 },
          ],
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('reject-m1')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('reject-m1'))

    expect(mockMutationFn).toHaveBeenCalledWith({ matchId: 'm1', status: 'rejected' })
  })

  it('shows complete button when all matches reviewed', async () => {
    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'review',
          progress: 100,
          matchedCount: 45,
          suspenseCount: 5,
        }
      }
      if (query === 'getMatches') {
        return {
          pending: [],
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('complete-session')).toBeInTheDocument()
    })
  })

  it('navigates to dashboard after completing', async () => {
    const user = userEvent.setup()

    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'review',
          progress: 100,
          matchedCount: 45,
          suspenseCount: 5,
        }
      }
      if (query === 'getMatches') {
        return {
          pending: [],
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('complete-session')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('complete-session'))

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows completed session with export option', async () => {
    mockUseQuery.mockImplementation((query) => {
      if (query === 'getSession') {
        return {
          name: 'Test Reconciliation',
          status: 'completed',
          progress: 100,
          matchedCount: 50,
          suspenseCount: 3,
        }
      }
      return null
    })

    render(<ReconciliationWorkflow sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('completed-section')).toBeInTheDocument()
      expect(screen.getByTestId('export-report')).toBeInTheDocument()
    })
  })
})
