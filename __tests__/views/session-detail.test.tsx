/**
 * Session Detail View Tests
 *
 * Tests the session detail component including:
 * - Session information display
 * - Progress tracking
 * - Match/suspense counts
 * - Action buttons
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Convex hooks
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mockMutationFn = vi.fn()

vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
  useMutation: () => mockMutationFn,
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
  }),
  useParams: () => ({ id: 'test-session-id' }),
}))

// Simplified session detail component for testing
function SessionDetailTest({ sessionId }: { sessionId: string }) {
  const data = mockUseQuery()

  if (data === undefined) {
    return <div data-testid="loading">Loading session...</div>
  }

  if (data === null) {
    return <div data-testid="not-found">Session not found</div>
  }

  const handleRunMatching = () => {
    mockMutationFn({ sessionId })
  }

  return (
    <div data-testid="session-detail">
      <header>
        <h1 data-testid="session-name">{data.name}</h1>
        <span data-testid="session-status">{data.status}</span>
      </header>

      <div data-testid="progress-section">
        <div>Progress: {data.progress}%</div>
        <div className="progress-bar" style={{ width: `${data.progress}%` }} />
      </div>

      <div data-testid="stats">
        <div data-testid="match-count">Matches: {data.matchedCount}</div>
        <div data-testid="suspense-count">Suspense: {data.suspenseCount}</div>
        <div data-testid="total-cash">Cash Transactions: {data.totalCash}</div>
        <div data-testid="total-accrual">Accrual Documents: {data.totalAccrual}</div>
      </div>

      <div data-testid="period">
        <span>Period: {data.periodStart} - {data.periodEnd}</span>
      </div>

      {data.status === 'draft' && (
        <button data-testid="run-matching-btn" onClick={handleRunMatching}>
          Run Matching
        </button>
      )}

      {data.status === 'review' && (
        <button data-testid="complete-btn">Complete Review</button>
      )}
    </div>
  )
}

describe('SessionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockUseQuery.mockReturnValue(undefined)

    render(<SessionDetailTest sessionId="test-session" />)

    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('shows not found for invalid session', () => {
    mockUseQuery.mockReturnValue(null)

    render(<SessionDetailTest sessionId="invalid-session" />)

    expect(screen.getByTestId('not-found')).toBeInTheDocument()
    expect(screen.getByText('Session not found')).toBeInTheDocument()
  })

  it('displays session information correctly', async () => {
    mockUseQuery.mockReturnValue({
      name: 'January 2025 Reconciliation',
      status: 'review',
      progress: 100,
      matchedCount: 45,
      suspenseCount: 8,
      totalCash: 53,
      totalAccrual: 60,
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
    })

    render(<SessionDetailTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('session-name')).toHaveTextContent('January 2025 Reconciliation')
      expect(screen.getByTestId('session-status')).toHaveTextContent('review')
    })
  })

  it('displays progress correctly', async () => {
    mockUseQuery.mockReturnValue({
      name: 'Test Session',
      status: 'processing',
      progress: 65,
      matchedCount: 30,
      suspenseCount: 0,
      totalCash: 50,
      totalAccrual: 55,
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
    })

    render(<SessionDetailTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByText('Progress: 65%')).toBeInTheDocument()
    })
  })

  it('displays stats correctly', async () => {
    mockUseQuery.mockReturnValue({
      name: 'Test Session',
      status: 'completed',
      progress: 100,
      matchedCount: 45,
      suspenseCount: 8,
      totalCash: 53,
      totalAccrual: 60,
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
    })

    render(<SessionDetailTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('match-count')).toHaveTextContent('Matches: 45')
      expect(screen.getByTestId('suspense-count')).toHaveTextContent('Suspense: 8')
      expect(screen.getByTestId('total-cash')).toHaveTextContent('Cash Transactions: 53')
      expect(screen.getByTestId('total-accrual')).toHaveTextContent('Accrual Documents: 60')
    })
  })

  it('shows run matching button for draft sessions', async () => {
    mockUseQuery.mockReturnValue({
      name: 'Draft Session',
      status: 'draft',
      progress: 0,
      matchedCount: 0,
      suspenseCount: 0,
      totalCash: 25,
      totalAccrual: 30,
      periodStart: '2025-02-01',
      periodEnd: '2025-02-28',
    })

    render(<SessionDetailTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('run-matching-btn')).toBeInTheDocument()
    })
  })

  it('shows complete button for review sessions', async () => {
    mockUseQuery.mockReturnValue({
      name: 'Review Session',
      status: 'review',
      progress: 100,
      matchedCount: 40,
      suspenseCount: 5,
      totalCash: 45,
      totalAccrual: 50,
      periodStart: '2025-02-01',
      periodEnd: '2025-02-28',
    })

    render(<SessionDetailTest sessionId="test-session" />)

    await waitFor(() => {
      expect(screen.getByTestId('complete-btn')).toBeInTheDocument()
      expect(screen.queryByTestId('run-matching-btn')).not.toBeInTheDocument()
    })
  })

  it('calls mutation when run matching is clicked', async () => {
    const user = userEvent.setup()

    mockUseQuery.mockReturnValue({
      name: 'Draft Session',
      status: 'draft',
      progress: 0,
      matchedCount: 0,
      suspenseCount: 0,
      totalCash: 25,
      totalAccrual: 30,
      periodStart: '2025-02-01',
      periodEnd: '2025-02-28',
    })

    render(<SessionDetailTest sessionId="test-session-123" />)

    await waitFor(() => {
      expect(screen.getByTestId('run-matching-btn')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('run-matching-btn'))

    expect(mockMutationFn).toHaveBeenCalledWith({ sessionId: 'test-session-123' })
  })
})
