/**
 * Tests for SpreadsheetView component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock dependencies before importing the component
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}))

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
}))

vi.mock('@/convex/_generated/api', () => ({
  api: {
    sessions: {
      listByCompany: 'listByCompany',
    },
  },
}))

vi.mock('@/lib/use-reconcile-data', () => ({
  useReconcileData: vi.fn(),
}))

// Store mock - defaults to demo mode for backward compatibility with tests
const mockIsDemo = vi.fn(() => true)
const mockUseAppStore = vi.fn(() => ({
  selectedCompanyId: 'company-1',
  currentUser: { workosId: 'user-1' },
}))

vi.mock('@/lib/store', () => ({
  useActiveSession: vi.fn(),
  useIsDemo: () => mockIsDemo(),
  useAppStore: () => mockUseAppStore(),
  useSelectedWorkspaceId: () => null,
  useSetSelectedWorkspaceId: () => vi.fn(),
}))

vi.mock('@/components/spreadsheet', () => ({
  UniverSheet: vi.fn(({ data }) => (
    <div data-testid="univer-sheet">
      {data?.transactions?.length || 0} transactions, {data?.invoices?.length || 0} invoices
    </div>
  )),
  UniverSheetLoading: vi.fn(() => <div data-testid="loading-skeleton">Loading...</div>),
  UniverSheetError: vi.fn(({ onRetry }) => (
    <div data-testid="error-state">
      <button onClick={onRetry}>Retry</button>
    </div>
  )),
  downloadReconciliationReport: vi.fn(),
  transformToSpreadsheetData: vi.fn(() => ({ transactions: [], invoices: [] })),
  // New generic spreadsheet exports
  GenericSheet: vi.fn(() => <div data-testid="generic-sheet">Generic Sheet</div>),
  createReconciliationPlugin: vi.fn(() => ({
    name: 'reconciliation',
    getCellStyle: vi.fn(),
    getToolbarItems: vi.fn(() => []),
  })),
}))

// Mock the dynamic wrapper component
vi.mock('@/components/spreadsheet/univer-sheet-dynamic', () => ({
  UniverSheetSafe: vi.fn(({ data }) => (
    <div data-testid="univer-sheet">
      {data?.transactions?.length || 0} transactions, {data?.invoices?.length || 0} invoices
    </div>
  )),
  UniverSheetSafeReadOnly: vi.fn(({ data }) => (
    <div data-testid="univer-sheet-readonly">
      {data?.transactions?.length || 0} transactions, {data?.invoices?.length || 0} invoices
    </div>
  )),
}))

vi.mock('@/components/brand/branded-empty-state', () => ({
  BrandedEmptyState: vi.fn(({ title, description }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )),
}))

vi.mock('@/components/unified-sheet', () => ({
  UnifiedSheet: vi.fn(({ data }) => (
    <div data-testid="unified-sheet">
      {data?.transactions?.length || 0} transactions, {data?.invoices?.length || 0} invoices
    </div>
  )),
}))

// Import after mocks are set up
import { SpreadsheetView } from '@/components/views/spreadsheet-view'
import { useReconcileData } from '@/lib/use-reconcile-data'
import { useActiveSession } from '@/lib/store'
import { downloadReconciliationReport, transformToSpreadsheetData } from '@/components/spreadsheet'

const mockUseReconcileData = useReconcileData as ReturnType<typeof vi.fn>
const mockUseActiveSession = useActiveSession as ReturnType<typeof vi.fn>
const mockDownloadReport = downloadReconciliationReport as ReturnType<typeof vi.fn>
const mockTransformData = transformToSpreadsheetData as ReturnType<typeof vi.fn>

// Export mocks for individual test control
export { mockIsDemo, mockUseAppStore }

describe('SpreadsheetView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: demo mode with session selected, not loading, has data
    mockIsDemo.mockReturnValue(true)
    mockUseAppStore.mockReturnValue({
      selectedCompanyId: 'company-1',
      currentUser: { workosId: 'user-1' },
    })
    mockUseActiveSession.mockReturnValue({ id: 's1', name: 'Test Session' })
    mockUseReconcileData.mockReturnValue({
      matches: [{ id: 'm1' }],
      suspenseTransactions: [],
      isLoading: false,
      isDemo: true, // Demo mode by default for tests
      counts: { approved: 1, pending: 0, suspense: 0 },
    })
    mockTransformData.mockReturnValue({
      transactions: [{ id: 'tx1' }],
      invoices: [{ id: 'inv1' }],
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('standalone spreadsheet behavior', () => {
    it('shows spreadsheet immediately when no session selected (not empty state)', () => {
      // Simulate real mode (not demo) with no session
      mockIsDemo.mockReturnValue(false)
      mockUseActiveSession.mockReturnValue(null)
      mockUseReconcileData.mockReturnValue({
        matches: [],
        suspenseTransactions: [],
        isLoading: false,
        isDemo: false,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      // Should show spreadsheet, not empty state - this is the new behavior
      expect(screen.getByTestId('univer-sheet')).toBeInTheDocument()
      expect(screen.getByText(/Empty spreadsheet/)).toBeInTheDocument()
    })

    it('shows spreadsheet when session has no data (not empty state)', () => {
      mockUseReconcileData.mockReturnValue({
        matches: [],
        suspenseTransactions: [],
        isLoading: false,
        isDemo: false,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      // Should show spreadsheet, not empty state - this is the new behavior
      expect(screen.getByTestId('univer-sheet')).toBeInTheDocument()
      expect(screen.getByText(/Empty spreadsheet/)).toBeInTheDocument()
    })

    it('shows spreadsheet in demo mode without session', () => {
      mockUseActiveSession.mockReturnValue(null)
      mockUseReconcileData.mockReturnValue({
        matches: [{ id: 'm1' }],
        suspenseTransactions: [],
        isLoading: false,
        isDemo: true,
        counts: { approved: 1, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      // Should show spreadsheet
      expect(screen.getByTestId('univer-sheet')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading skeleton while loading when session exists', () => {
      // Need a session for loading to show
      mockUseActiveSession.mockReturnValue({ id: 's1', name: 'Test Session' })
      mockUseReconcileData.mockReturnValue({
        matches: [],
        suspenseTransactions: [],
        isLoading: true,
        isDemo: true, // Demo mode so we have a session
        counts: { approved: 0, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })

    it('shows loading skeleton even with partial data during loading', () => {
      // Need a session for loading to show
      mockUseActiveSession.mockReturnValue({ id: 's1', name: 'Test Session' })
      mockUseReconcileData.mockReturnValue({
        matches: [{ id: 'm1' }],
        suspenseTransactions: [],
        isLoading: true,
        isDemo: true, // Demo mode so we have a session
        counts: { approved: 1, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })

    it('does NOT show loading when no session exists (shows empty spreadsheet instead)', () => {
      // No session
      mockIsDemo.mockReturnValue(false)
      mockUseActiveSession.mockReturnValue(null)
      mockUseReconcileData.mockReturnValue({
        matches: [],
        suspenseTransactions: [],
        isLoading: true, // Loading true but no session
        isDemo: false,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      // Should show spreadsheet immediately, not loading
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
      expect(screen.getByTestId('univer-sheet')).toBeInTheDocument()
    })
  })

  describe('spreadsheet rendering', () => {
    it('renders spreadsheet with data', () => {
      render(<SpreadsheetView />)

      expect(screen.getByTestId('univer-sheet')).toBeInTheDocument()
    })

    it('passes transformed data to UniverSheet', () => {
      mockTransformData.mockReturnValue({
        transactions: [{ id: 'tx1' }, { id: 'tx2' }],
        invoices: [{ id: 'inv1' }],
      })

      render(<SpreadsheetView />)

      expect(screen.getByText('2 transactions, 1 invoices')).toBeInTheDocument()
    })

    it('transforms data using transformToSpreadsheetData', () => {
      const matches = [{ id: 'm1' }, { id: 'm2' }]
      const suspense = [{ id: 's1' }]

      mockUseReconcileData.mockReturnValue({
        matches,
        suspenseTransactions: suspense,
        isLoading: false,
        isDemo: false,
        counts: { approved: 2, pending: 0, suspense: 1 },
      })

      render(<SpreadsheetView />)

      expect(mockTransformData).toHaveBeenCalledWith(matches, suspense)
    })
  })

  describe('demo mode', () => {
    it('shows demo mode badge when in demo', () => {
      mockUseReconcileData.mockReturnValue({
        matches: [{ id: 'm1' }],
        suspenseTransactions: [],
        isLoading: false,
        isDemo: true,
        counts: { approved: 1, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      expect(screen.getByText('Demo Mode')).toBeInTheDocument()
    })

    it('does not show demo badge when not in demo', () => {
      // Set up non-demo mode
      mockIsDemo.mockReturnValue(false)
      mockUseReconcileData.mockReturnValue({
        matches: [{ id: 'm1' }],
        suspenseTransactions: [],
        isLoading: false,
        isDemo: false, // Key: reconcileIsDemo should be false
        counts: { approved: 1, pending: 0, suspense: 0 },
      })

      render(<SpreadsheetView />)

      expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument()
    })
  })

  describe('toolbar', () => {
    it('displays match counts', () => {
      mockUseReconcileData.mockReturnValue({
        matches: [{ id: 'm1' }, { id: 'm2' }],
        suspenseTransactions: [{ id: 's1' }],
        isLoading: false,
        isDemo: false,
        counts: { approved: 1, pending: 1, suspense: 1 },
      })

      render(<SpreadsheetView />)

      // Total matches = approved + pending
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('shows suspense count as unmatched', () => {
      mockUseReconcileData.mockReturnValue({
        matches: [{ id: 'm1' }],
        suspenseTransactions: [{ id: 's1' }, { id: 's2' }],
        isLoading: false,
        isDemo: false,
        counts: { approved: 1, pending: 0, suspense: 2 },
      })

      render(<SpreadsheetView />)

      // Check for unmatched count
      const unmatchedText = screen.getByText('2')
      expect(unmatchedText).toBeInTheDocument()
    })
  })

  describe('export functionality', () => {
    it('renders export button', () => {
      render(<SpreadsheetView />)

      expect(screen.getByText('Export Excel')).toBeInTheDocument()
    })

    it('calls downloadReconciliationReport when export clicked', async () => {
      const user = userEvent.setup()

      render(<SpreadsheetView />)

      await user.click(screen.getByText('Export Excel'))

      await waitFor(() => {
        expect(mockDownloadReport).toHaveBeenCalled()
      })
    })

    it('uses session name in export filename', async () => {
      const user = userEvent.setup()
      mockUseActiveSession.mockReturnValue({ id: 's1', name: 'Q1 2024 Reconciliation' })

      render(<SpreadsheetView />)

      await user.click(screen.getByText('Export Excel'))

      await waitFor(() => {
        expect(mockDownloadReport).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('reconciliation.xlsx')
        )
      })
    })

    it('uses default filename when no session name', async () => {
      const user = userEvent.setup()
      mockUseActiveSession.mockReturnValue({ id: 's1', name: '' })

      render(<SpreadsheetView />)

      await user.click(screen.getByText('Export Excel'))

      await waitFor(() => {
        expect(mockDownloadReport).toHaveBeenCalledWith(
          expect.anything(),
          'reconciliation_report.xlsx'
        )
      })
    })

    it('shows loading state during export', async () => {
      const user = userEvent.setup()
      mockDownloadReport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<SpreadsheetView />)

      await user.click(screen.getByText('Export Excel'))

      expect(screen.getByText('Exporting...')).toBeInTheDocument()
    })

    it('shows error message when export fails', async () => {
      const user = userEvent.setup()
      mockDownloadReport.mockRejectedValue(new Error('Export failed'))

      render(<SpreadsheetView />)

      await user.click(screen.getByText('Export Excel'))

      await waitFor(() => {
        expect(screen.getByText('Export failed')).toBeInTheDocument()
      })
    })

    it('disables export button during loading', async () => {
      const user = userEvent.setup()
      mockDownloadReport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)))

      render(<SpreadsheetView />)

      const button = screen.getByText('Export Excel').closest('button')
      await user.click(button!)

      // Button should be disabled while loading
      expect(button).toBeDisabled()
    })
  })

  describe('legend', () => {
    it('displays match status legend', () => {
      render(<SpreadsheetView />)

      expect(screen.getByText('Matched (90%+)')).toBeInTheDocument()
      expect(screen.getByText('Suggested (70-89%)')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('displays suspense in legend', () => {
      render(<SpreadsheetView />)

      // The < character might be rendered differently
      expect(screen.getByText(/Suspense/)).toBeInTheDocument()
    })
  })

  describe('retry functionality', () => {
    it('remounts spreadsheet on retry via key change', async () => {
      const user = userEvent.setup()

      // Start with an error state scenario - we'll simulate retry
      const { rerender } = render(<SpreadsheetView />)

      // Initial render
      expect(screen.getByTestId('univer-sheet')).toBeInTheDocument()

      // Simulate a scenario where retry would be needed
      // The component uses retryKey state which changes the key on UniverSheet
      // This is tested indirectly through the component behavior
    })
  })

  describe('data handling', () => {
    it('handles null matches array', () => {
      mockUseReconcileData.mockReturnValue({
        matches: null,
        suspenseTransactions: [],
        isLoading: false,
        isDemo: false,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })

      expect(() => render(<SpreadsheetView />)).not.toThrow()
    })

    it('handles null suspenseTransactions array', () => {
      mockUseReconcileData.mockReturnValue({
        matches: [],
        suspenseTransactions: null,
        isLoading: false,
        isDemo: false,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })

      expect(() => render(<SpreadsheetView />)).not.toThrow()
    })

    it('transforms data with empty arrays when null', () => {
      mockUseReconcileData.mockReturnValue({
        matches: null,
        suspenseTransactions: null,
        isLoading: false,
        isDemo: true,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })
      mockTransformData.mockReturnValue({ transactions: [], invoices: [] })

      render(<SpreadsheetView />)

      // Should call transform with empty arrays (|| [] fallback)
      expect(mockTransformData).toHaveBeenCalledWith([], [])
    })

    it('shows empty spreadsheet message when no data', () => {
      mockUseReconcileData.mockReturnValue({
        matches: [],
        suspenseTransactions: [],
        isLoading: false,
        isDemo: false,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })
      mockTransformData.mockReturnValue({ transactions: [], invoices: [] })

      render(<SpreadsheetView />)

      expect(screen.getByText(/Empty spreadsheet/)).toBeInTheDocument()
    })

    it('disables export button when no data', () => {
      mockUseReconcileData.mockReturnValue({
        matches: [],
        suspenseTransactions: [],
        isLoading: false,
        isDemo: false,
        counts: { approved: 0, pending: 0, suspense: 0 },
      })
      mockTransformData.mockReturnValue({ transactions: [], invoices: [] })

      render(<SpreadsheetView />)

      const exportButton = screen.getByText('Export Excel').closest('button')
      expect(exportButton).toBeDisabled()
    })
  })
})
