/**
 * Dashboard View Tests
 *
 * Tests the actual DashboardView component including:
 * - Loading / skeleton states
 * - Stats display from reconciliation data
 * - Empty state when no data
 * - Workflow notification states
 * - Recent transactions rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ============================================================================
// MOCK SETUP
// ============================================================================

// Store mocks
const mockIsDemo = vi.fn((): boolean => true)
const mockSelectedCompanyId = vi.fn((): string | null => null)
const mockActiveSession = vi.fn((): Record<string, unknown> | null => ({
  id: 's1',
  name: 'January 2025',
  createdAt: '2025-01-01',
  status: 'review',
  progress: 75,
  totalCash: 100000,
  totalAccrual: 95000,
  matchedCount: 45,
  suspenseCount: 3,
}))

vi.mock('@/lib/store', () => ({
  useIsDemo: () => mockIsDemo(),
  useSelectedCompanyId: () => mockSelectedCompanyId(),
  useActiveSessionSafe: () => mockActiveSession(),
}))

// Convex hooks mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCashTransactions = vi.fn((): any => ({
  data: [
    { id: 't1', date: '2025-01-15', description: 'ACME Corp Payment', amount: 5000, type: 'cash', status: 'matched', category: 'Revenue' },
    { id: 't2', date: '2025-01-14', description: 'AWS Monthly', amount: -450, type: 'cash', status: 'matched', category: 'Cloud' },
    { id: 't3', date: '2025-01-13', description: 'Unknown Debit', amount: -120, type: 'cash', status: 'suspense', category: 'Uncategorized' },
  ],
  isLoading: false,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReconStats = vi.fn((): any => ({
  data: {
    totalCashIn: 50000,
    totalCashOut: 35000,
    matchedCount: 45,
    pendingCount: 5,
    suspenseCount: 3,
    matchRate: 85,
  },
  isLoading: false,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSessions = vi.fn((): any => ({
  data: [{ id: 's1', name: 'January 2025', status: 'review' }],
  isLoading: false,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDashboardWorkflow = vi.fn((): any => ({
  hasDocuments: true,
  isProcessing: false,
  pendingMatchCount: 5,
  approvedMatchCount: 40,
  totalMatchCount: 45,
  isLoading: false,
}))

vi.mock('@/lib/convex-hooks', () => ({
  useMonthlyCashFlow: () => [],
  useExpenseBreakdown: () => [],
  useTopExpenses: () => [],
  useCashTransactionsCombined: () => mockCashTransactions(),
  useReconciliationStatsCombined: () => mockReconStats(),
  useSessionsCombined: () => mockSessions(),
  useDashboardWorkflow: () => mockDashboardWorkflow(),
}))

// Router mock
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}))

// Brand component mocks -- render simplified versions for testability
vi.mock('@/components/brand', () => ({
  ReconciliationProgress: ({ matched, pending, suspense }: { matched: number; pending: number; suspense: number }) => (
    <div data-testid="reconciliation-progress">
      <span>Matched: {matched}</span>
      <span>Pending: {pending}</span>
      <span>Suspense: {suspense}</span>
    </div>
  ),
  DataSyncPulse: ({ active }: { active: boolean }) => (
    <div data-testid="sync-pulse">{active ? 'Syncing' : 'Idle'}</div>
  ),
  BrandedEmptyState: ({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
  StatCard: ({ label, value, prefix }: { label: string; value: number; prefix?: string }) => (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      {prefix}{value}
    </div>
  ),
  IconCashIn: () => <span />,
  IconCashOut: () => <span />,
  IconMatched: () => <span />,
  IconSuspense: () => <span />,
  CashFlowChart: () => <div data-testid="cash-flow-chart" />,
  CashFlowLegend: () => <div />,
  ExpenseChart: () => <div data-testid="expense-chart" />,
  TopExpensesList: () => <div data-testid="top-expenses" />,
  ChartSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
  SkeletonStatCard: () => <div data-testid="skeleton-stat" />,
}))

vi.mock('@/components/brand/icons', () => ({
  IconUpload: () => <span />,
  IconCheckCircle: () => <span />,
  IconArrowRight: () => <span />,
  IconLoader: () => <span />,
  IconFileText: () => <span />,
  IconBell: () => <span />,
}))

// Dynamic import of the component under test
const { DashboardView } = await import('@/components/views/dashboard-view')

// ============================================================================
// TESTS
// ============================================================================

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsDemo.mockReturnValue(true)
    mockSelectedCompanyId.mockReturnValue(null)
    mockActiveSession.mockReturnValue({
      id: 's1', name: 'January 2025', createdAt: '2025-01-01',
      status: 'review', progress: 75, totalCash: 100000, totalAccrual: 95000,
      matchedCount: 45, suspenseCount: 3,
    })
    mockCashTransactions.mockReturnValue({
      data: [
        { id: 't1', date: '2025-01-15', description: 'ACME Corp Payment', amount: 5000, type: 'cash', status: 'matched', category: 'Revenue' },
        { id: 't2', date: '2025-01-14', description: 'AWS Monthly', amount: -450, type: 'cash', status: 'matched', category: 'Cloud' },
        { id: 't3', date: '2025-01-13', description: 'Unknown Debit', amount: -120, type: 'cash', status: 'suspense', category: 'Uncategorized' },
      ],
      isLoading: false,
    })
    mockReconStats.mockReturnValue({
      data: {
        totalCashIn: 50000, totalCashOut: 35000,
        matchedCount: 45, pendingCount: 5, suspenseCount: 3, matchRate: 85,
      },
      isLoading: false,
    })
    mockSessions.mockReturnValue({
      data: [{ id: 's1', name: 'January 2025', status: 'review' }],
      isLoading: false,
    })
    mockDashboardWorkflow.mockReturnValue({
      hasDocuments: true, isProcessing: false,
      pendingMatchCount: 5, approvedMatchCount: 40, totalMatchCount: 45, isLoading: false,
    })
  })

  // ---------- Rendering ----------

  it('renders stat cards with correct values', () => {
    render(<DashboardView />)

    expect(screen.getByTestId('stat-cash-in')).toHaveTextContent('$50000')
    expect(screen.getByTestId('stat-cash-out')).toHaveTextContent('$35000')
    expect(screen.getByTestId('stat-matched')).toHaveTextContent('45')
    expect(screen.getByTestId('stat-suspense')).toHaveTextContent('3')
  })

  it('renders recent transactions sorted by date descending', () => {
    render(<DashboardView />)

    const descriptions = screen.getAllByText(/ACME|AWS|Unknown/)
    // Should be sorted: Jan 15 (ACME), Jan 14 (AWS), Jan 13 (Unknown)
    expect(descriptions[0]).toHaveTextContent('ACME Corp Payment')
    expect(descriptions[1]).toHaveTextContent('AWS Monthly')
    expect(descriptions[2]).toHaveTextContent('Unknown Debit')
  })

  it('shows active session name in header', () => {
    render(<DashboardView />)
    expect(screen.getByText('January 2025')).toBeInTheDocument()
  })

  // ---------- Loading States ----------

  it('shows skeleton cards when stats are loading', () => {
    mockReconStats.mockReturnValue({ data: { totalCashIn: 0, totalCashOut: 0, matchedCount: 0, pendingCount: 0, suspenseCount: 0, matchRate: 0 }, isLoading: true })

    render(<DashboardView />)

    const skeletons = screen.getAllByTestId('skeleton-stat')
    expect(skeletons).toHaveLength(4)
  })

  // ---------- Empty State ----------

  it('shows empty state when no sessions and not loading', () => {
    mockIsDemo.mockReturnValue(false)
    mockActiveSession.mockReturnValue(null)
    mockSessions.mockReturnValue({ data: [], isLoading: false })
    mockCashTransactions.mockReturnValue({ data: [], isLoading: false })

    render(<DashboardView />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No reconciliation sessions yet')).toBeInTheDocument()
  })

  it('does NOT show empty state while sessions are still loading', () => {
    mockIsDemo.mockReturnValue(false)
    mockActiveSession.mockReturnValue(null)
    mockSessions.mockReturnValue({ data: [], isLoading: true })
    mockCashTransactions.mockReturnValue({ data: [], isLoading: false })

    render(<DashboardView />)

    // Should NOT show empty state -- data is still loading
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  // ---------- Workflow Notifications ----------

  it('shows review notification when matches are pending', async () => {
    const user = userEvent.setup()
    render(<DashboardView />)

    // Click the notification bell
    const bellButton = screen.getByRole('button', { name: /workflow notifications/i })
    await user.click(bellButton)

    expect(screen.getByText('5 matches ready for review')).toBeInTheDocument()
    expect(screen.getByText(/40 already approved/)).toBeInTheDocument()
  })

  it('shows upload prompt when no documents in real mode', async () => {
    const user = userEvent.setup()
    mockIsDemo.mockReturnValue(false)
    mockDashboardWorkflow.mockReturnValue({
      hasDocuments: false, isProcessing: false,
      pendingMatchCount: 0, approvedMatchCount: 0, totalMatchCount: 0, isLoading: false,
    })
    // Need at least a session to avoid empty state
    mockSessions.mockReturnValue({ data: [{ id: 's1', name: 'Test', status: 'draft' }], isLoading: false })
    mockCashTransactions.mockReturnValue({
      data: [{ id: 't1', date: '2025-01-01', description: 'Test', amount: 100, type: 'cash', status: 'pending', category: 'Other' }],
      isLoading: false,
    })

    render(<DashboardView />)

    const bellButton = screen.getByRole('button', { name: /workflow notifications/i })
    await user.click(bellButton)

    expect(screen.getByText(/Get started/)).toBeInTheDocument()
  })

  it('shows completion state when all matches approved', async () => {
    const user = userEvent.setup()
    mockDashboardWorkflow.mockReturnValue({
      hasDocuments: true, isProcessing: false,
      pendingMatchCount: 0, approvedMatchCount: 45, totalMatchCount: 45, isLoading: false,
    })

    render(<DashboardView />)

    const bellButton = screen.getByRole('button', { name: /workflow notifications/i })
    await user.click(bellButton)

    expect(screen.getByText('Reconciliation complete!')).toBeInTheDocument()
  })

  // ---------- DataSyncPulse ----------

  it('shows sync pulse as active when session is processing', () => {
    mockActiveSession.mockReturnValue({
      id: 's1', name: 'Processing Session', createdAt: '2025-01-01',
      status: 'processing', progress: 50, totalCash: 0, totalAccrual: 0,
      matchedCount: 0, suspenseCount: 0,
    })

    render(<DashboardView />)
    expect(screen.getByTestId('sync-pulse')).toHaveTextContent('Syncing')
  })

  it('shows sync pulse as idle when session is not processing', () => {
    mockIsDemo.mockReturnValue(false)
    mockActiveSession.mockReturnValue({
      id: 's1', name: 'Review Session', createdAt: '2025-01-01',
      status: 'review', progress: 100, totalCash: 100000, totalAccrual: 95000,
      matchedCount: 45, suspenseCount: 3,
    })

    render(<DashboardView />)
    expect(screen.getByTestId('sync-pulse')).toHaveTextContent('Idle')
  })

  // ---------- Navigation ----------

  it('navigates to reconcile page when clicking Continue Reconciliation', async () => {
    const user = userEvent.setup()
    render(<DashboardView />)

    await user.click(screen.getByText('Continue Reconciliation'))
    expect(mockPush).toHaveBeenCalledWith('/reconcile')
  })

  it('navigates to upload page from empty state', async () => {
    const user = userEvent.setup()
    mockIsDemo.mockReturnValue(false)
    mockActiveSession.mockReturnValue(null)
    mockSessions.mockReturnValue({ data: [], isLoading: false })
    mockCashTransactions.mockReturnValue({ data: [], isLoading: false })

    render(<DashboardView />)

    await user.click(screen.getByText('Upload Documents'))
    expect(mockPush).toHaveBeenCalledWith('/upload')
  })

  // ---------- Accessibility ----------

  it('notification bell has proper ARIA attributes', () => {
    render(<DashboardView />)

    const bellButton = screen.getByRole('button', { name: /workflow notifications/i })
    expect(bellButton).toHaveAttribute('aria-expanded', 'false')
    expect(bellButton).toHaveAttribute('aria-haspopup', 'true')
  })

  it('notification dropdown closes on Escape key', async () => {
    const user = userEvent.setup()
    render(<DashboardView />)

    const bellButton = screen.getByRole('button', { name: /workflow notifications/i })
    await user.click(bellButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
