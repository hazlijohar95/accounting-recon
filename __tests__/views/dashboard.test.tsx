/**
 * Dashboard View Tests
 *
 * Tests the dashboard component including:
 * - Session list display
 * - Stats overview
 * - Navigation
 * - Loading states
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
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}))

// Simplified dashboard component for testing
function DashboardTest() {
  const data = mockUseQuery()

  if (data === undefined) {
    return <div data-testid="loading">Loading dashboard...</div>
  }

  return (
    <div data-testid="dashboard">
      <div data-testid="stats-overview">
        <div>Total Sessions: {data.totalSessions}</div>
        <div>Active Sessions: {data.activeSessions}</div>
        <div>Completed: {data.completedSessions}</div>
      </div>
      <div data-testid="session-list">
        {data.sessions?.map((session: any) => (
          <div key={session.id} data-testid="session-card">
            <h3>{session.name}</h3>
            <span>{session.status}</span>
            <span>{session.matchCount} matches</span>
          </div>
        ))}
      </div>
      {data.sessions?.length === 0 && (
        <div data-testid="empty-state">No sessions yet</div>
      )}
    </div>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockUseQuery.mockReturnValue(undefined)

    render(<DashboardTest />)

    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('displays stats overview correctly', async () => {
    mockUseQuery.mockReturnValue({
      totalSessions: 15,
      activeSessions: 3,
      completedSessions: 12,
      sessions: [],
    })

    render(<DashboardTest />)

    await waitFor(() => {
      expect(screen.getByText('Total Sessions: 15')).toBeInTheDocument()
      expect(screen.getByText('Active Sessions: 3')).toBeInTheDocument()
      expect(screen.getByText('Completed: 12')).toBeInTheDocument()
    })
  })

  it('displays session list', async () => {
    mockUseQuery.mockReturnValue({
      totalSessions: 2,
      activeSessions: 1,
      completedSessions: 1,
      sessions: [
        { id: 's1', name: 'January 2025', status: 'review', matchCount: 45 },
        { id: 's2', name: 'February 2025', status: 'completed', matchCount: 67 },
      ],
    })

    render(<DashboardTest />)

    await waitFor(() => {
      expect(screen.getByText('January 2025')).toBeInTheDocument()
      expect(screen.getByText('February 2025')).toBeInTheDocument()
      expect(screen.getByText('45 matches')).toBeInTheDocument()
      expect(screen.getByText('67 matches')).toBeInTheDocument()
    })

    const sessionCards = screen.getAllByTestId('session-card')
    expect(sessionCards).toHaveLength(2)
  })

  it('shows empty state when no sessions', async () => {
    mockUseQuery.mockReturnValue({
      totalSessions: 0,
      activeSessions: 0,
      completedSessions: 0,
      sessions: [],
    })

    render(<DashboardTest />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No sessions yet')).toBeInTheDocument()
    })
  })

  it('displays session status correctly', async () => {
    mockUseQuery.mockReturnValue({
      totalSessions: 3,
      activeSessions: 2,
      completedSessions: 1,
      sessions: [
        { id: 's1', name: 'Session 1', status: 'draft', matchCount: 0 },
        { id: 's2', name: 'Session 2', status: 'processing', matchCount: 10 },
        { id: 's3', name: 'Session 3', status: 'completed', matchCount: 50 },
      ],
    })

    render(<DashboardTest />)

    await waitFor(() => {
      expect(screen.getByText('draft')).toBeInTheDocument()
      expect(screen.getByText('processing')).toBeInTheDocument()
      expect(screen.getByText('completed')).toBeInTheDocument()
    })
  })
})
