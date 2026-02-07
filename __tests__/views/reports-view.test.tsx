/**
 * ReportsView Component Tests
 *
 * Tests the main reports page including:
 * - Tab navigation
 * - Summary statistics
 * - Export menu functionality
 * - PDF export polling
 * - Error states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Test data
const mockMatches = [
  {
    id: '1',
    approved: true,
    matchLayer: 1,
    cashTransaction: { id: 'c1', description: 'Payment ABC', amount: 1000, date: '2025-01-15' },
    accrualTransaction: { id: 'a1', description: 'Invoice ABC', amount: 1000, date: '2025-01-14' },
  },
  {
    id: '2',
    approved: false,
    matchLayer: 3,
    cashTransaction: { id: 'c2', description: 'Payment XYZ', amount: 500, date: '2025-01-16' },
    accrualTransaction: { id: 'a2', description: 'Invoice XYZ', amount: 500, date: '2025-01-15' },
  },
]

const mockCashTransactions = [
  { id: 'c1', description: 'Payment ABC', amount: 1000, date: '2025-01-15', status: 'matched' },
  { id: 'c2', description: 'Payment XYZ', amount: 500, date: '2025-01-16', status: 'pending' },
  { id: 'c3', description: 'Unmatched', amount: 200, date: '2025-01-17', status: 'suspense' },
]

const mockAccrualTransactions = [
  { id: 'a1', description: 'Invoice ABC', amount: 1000, date: '2025-01-14', status: 'matched' },
  { id: 'a2', description: 'Invoice XYZ', amount: 500, date: '2025-01-15', status: 'pending' },
]

const mockActiveSession = {
  id: 'session-1',
  name: 'Q1 2025 Reconciliation',
}

const mockSetShowPaywall = vi.fn()
const mockGenerateExport = vi.fn()
const mockGenerateAccountingExport = vi.fn()
const mockGeneratePDFExport = vi.fn()
const mockAddToast = vi.fn()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}))

// Mock store before importing component
vi.mock('@/lib/store', () => ({
  useAppStore: () => ({
    setShowPaywall: mockSetShowPaywall,
    isDemo: false,
    selectedCompanyId: 'company-1',
  }),
  useCashTransactionsSafe: () => mockCashTransactions,
  useAccrualTransactionsSafe: () => mockAccrualTransactions,
}))

// Mock brand exports to avoid Three.js side effects
vi.mock('@/components/brand', () => ({
  SkeletonTable: () => <div data-testid="skeleton-table" />,
  ButtonPrimary: ({ children, loading, icon, ...props }: { children: React.ReactNode; loading?: boolean; icon?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  ButtonSecondary: ({ children, loading, icon, ...props }: { children: React.ReactNode; loading?: boolean; icon?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  StatCard: ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      {value ? <span>{value}</span> : null}
    </div>
  ),
  ChartSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <span>{title}</span>
      {children}
    </div>
  ),
  IconMatched: () => <span data-testid="icon-matched" />,
  IconSuspense: () => <span data-testid="icon-suspense" />,
  MatchLayerBadge: ({ layer }: { layer: number }) => <span>{layer}</span>,
  BrandedEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}))

// Mock convex hooks
vi.mock('convex/react', () => ({
  useAction: () => mockGenerateExport,
  useQuery: () => null,
}))

// Mock convex-hooks
vi.mock('@/lib/convex-hooks', () => ({
  useRecentActivity: () => [
    {
      id: 'tx1',
      time: '2 min ago',
      date: '2025-01-17',
      description: 'Payment ABC',
      amount: 1000,
      type: 'inflow',
      status: 'matched',
    },
  ],
}))

// Mock toast helpers
vi.mock('@/components/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/components/ui')>()
  return {
    ...original,
    useToastHelpers: () => ({
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    }),
  }
})

// Mock API
vi.mock('@/convex/_generated/api', () => ({
  api: {
    exports: {
      index: {
        generateExport: 'generateExport',
        generateAccountingExport: 'generateAccountingExport',
        generatePDFExport: 'generatePDFExport',
        getPDFJobStatus: 'getPDFJobStatus',
      },
    },
    sessions: {
      listByCompany: 'listByCompany',
    },
  },
}))

// Mock auth provider
vi.mock('@/components/auth-provider', () => {
  const mockAuth = {
    user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
    workosUserId: 'wos_user_1',
  }
  return {
    useAuth: () => mockAuth,
    useOptionalAuth: () => mockAuth,
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

// Mock onboarding state
vi.mock('@/components/onboarding', () => ({
  useOnboardingState: () => ({
    isOnboarding: false,
    currentStep: 0,
    totalSteps: 5,
    progress: 100,
    isComplete: true,
  }),
  OnboardingTour: () => null,
  OnboardingChecklist: () => null,
}))

// Mock useReconcileData hook
vi.mock('@/lib/use-reconcile-data', () => ({
  useReconcileData: () => ({
    matches: mockMatches,
    pendingMatches: mockMatches.filter(m => !m.approved),
    approvedMatches: mockMatches.filter(m => m.approved),
    rejectedMatches: [],
    suspenseTransactions: [],
    sessionId: 'session-1',
    sessionName: 'Q1 2025 Reconciliation',
    isLoading: false,
    isDemo: false,
    counts: { pending: 1, approved: 1, rejected: 0, suspense: 0 },
  }),
}))

// Import after mocks
import { ReportsView } from '@/components/views/reports-view'

describe('ReportsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateExport.mockResolvedValue({
      success: true,
      fileUrl: 'data:text/csv;base64,abc123',
      fileName: 'report.csv',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Tab Navigation', () => {
    it('renders all four report tabs', () => {
      render(<ReportsView />)

      expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /all matches/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /differences/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /activity log/i })).toBeInTheDocument()
    })

    it('shows summary tab as selected by default', () => {
      render(<ReportsView />)

      const summaryTab = screen.getByRole('tab', { name: /summary/i })
      expect(summaryTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to detailed tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      const detailedTab = screen.getByRole('tab', { name: /all matches/i })
      expect(detailedTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to variance tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      const varianceTab = screen.getByRole('tab', { name: /differences/i })
      expect(varianceTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to audit tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /activity log/i }))

      const auditTab = screen.getByRole('tab', { name: /activity log/i })
      expect(auditTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Summary Statistics', () => {
    it('displays matched stat card', async () => {
      render(<ReportsView />)

      // Wait for loading to complete - "Matched" appears in stat card and legend
      await waitFor(() => {
        const elements = screen.getAllByText(/matched/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('displays pending stat card', async () => {
      render(<ReportsView />)

      // Wait for loading to complete - "Pending" appears in stat card and legend
      await waitFor(() => {
        const elements = screen.getAllByText(/pending/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('displays needs review stat card', async () => {
      render(<ReportsView />)

      // Wait for loading to complete and check for the stat label
      await waitFor(() => {
        // Look for "Needs Review" which appears in stat card and legend
        const elements = screen.getAllByText(/needs review/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('displays total stat card', async () => {
      render(<ReportsView />)

      await waitFor(() => {
        expect(screen.getByText('Total')).toBeInTheDocument()
      })
    })

    it('displays reconciliation progress section', async () => {
      render(<ReportsView />)

      await waitFor(() => {
        expect(screen.getByText('Reconciliation Progress')).toBeInTheDocument()
      })
    })
  })

  describe('Export Menu', () => {
    it('shows export button', () => {
      render(<ReportsView />)

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })

    it('opens export menu when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('CSV export')).toBeInTheDocument()
        expect(screen.getByText('Excel export')).toBeInTheDocument()
      })
    })

    it('shows PDF export option in menu', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('PDF report')).toBeInTheDocument()
      })
    })

    it('shows accounting software section', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('Accounting')).toBeInTheDocument()
      })
    })

    it('shows SQL Accounting option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('SQL Accounting')).toBeInTheDocument()
      })
    })

    it('shows AutoCount option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('AutoCount')).toBeInTheDocument()
      })
    })

    it('shows QuickBooks option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('QuickBooks (IIF)')).toBeInTheDocument()
      })
    })

    it('shows Xero option', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      await waitFor(() => {
        expect(screen.getByText('Xero (CSV)')).toBeInTheDocument()
      })
    })
  })

  describe('All Matches Tab', () => {
    it('displays match transactions', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getByText('Payment ABC')).toBeInTheDocument()
        expect(screen.getByText('Invoice ABC')).toBeInTheDocument()
      })
    })

    it('shows approved status', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument()
      })
    })

    it('shows pending status', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
      })
    })

    it('displays table headers', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /all matches/i }))

      await waitFor(() => {
        expect(screen.getByText('Cash Description')).toBeInTheDocument()
        expect(screen.getByText('Accrual Description')).toBeInTheDocument()
        expect(screen.getByText('Amount')).toBeInTheDocument()
        expect(screen.getByText('Match Type')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
      })
    })
  })

  describe('Differences Tab', () => {
    it('displays bank total stat', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Bank Total')).toBeInTheDocument()
      })
    })

    it('displays books total stat', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Books Total')).toBeInTheDocument()
      })
    })

    it('displays difference stat', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Difference')).toBeInTheDocument()
      })
    })

    it('displays unmatched items section', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /differences/i }))

      await waitFor(() => {
        expect(screen.getByText('Unmatched Items')).toBeInTheDocument()
      })
    })
  })

  describe('Activity Log Tab', () => {
    it('switches to activity log tab when clicked', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      const auditTab = screen.getByRole('tab', { name: /activity log/i })
      await user.click(auditTab)

      // Tab should now be selected
      expect(auditTab).toHaveAttribute('aria-selected', 'true')
    })

    it('displays recent activity when tab selected', async () => {
      const user = userEvent.setup()
      render(<ReportsView />)

      await user.click(screen.getByRole('tab', { name: /activity log/i }))

      // Should show activity-related content (based on mock data)
      await waitFor(() => {
        expect(screen.getByText('Transaction matched')).toBeInTheDocument()
      })
    })
  })

  describe('Session Name Display', () => {
    it('shows session name in header', () => {
      render(<ReportsView />)

      expect(screen.getByText('Q1 2025 Reconciliation')).toBeInTheDocument()
    })

    it('shows Reports as page title', () => {
      render(<ReportsView />)

      expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper tablist role', () => {
      render(<ReportsView />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('has proper tab roles', () => {
      render(<ReportsView />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
    })

    it('has proper tabpanel role', () => {
      render(<ReportsView />)

      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })
  })
})
