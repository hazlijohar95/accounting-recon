import React from 'react'
import { vi } from 'vitest'

export const mockSetShowPaywall = vi.fn()
export const mockGenerateExport = vi.fn()
export const mockGenerateAccountingExport = vi.fn()
export const mockGeneratePDFExport = vi.fn()

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

vi.mock('@/lib/store', () => ({
  useAppStore: () => ({
    setShowPaywall: mockSetShowPaywall,
    isDemo: false,
    selectedCompanyId: 'company-1',
  }),
  useCashTransactionsSafe: () => mockCashTransactions,
  useAccrualTransactionsSafe: () => mockAccrualTransactions,
}))

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
  ErrorAnimation: () => <span data-testid="error-animation" />,
}))

// Mutable state for controlling per-query return values in tests.
// Tests can set e.g. `mockQueryState.exportJobStatus = { status: 'completed', ... }`
// to simulate Convex reactive query updates.
export const mockQueryState: {
  exportJobStatus: unknown
  pdfJobStatus: unknown
} = {
  exportJobStatus: null,
  pdfJobStatus: null,
}

vi.mock('convex/react', () => ({
  useAction: (actionRef: string) => {
    // The api mock maps action names to string stubs.
    // Return the matching mock function for each action.
    if (actionRef === 'generateAccountingExport') return mockGenerateAccountingExport
    if (actionRef === 'generatePDFExport') return mockGeneratePDFExport
    // Default: generateExport (also covers any unknown refs)
    return mockGenerateExport
  },
  useQuery: (queryRef: string, args?: unknown) => {
    // 'skip' means the query is disabled -- return undefined (Convex convention)
    if (args === 'skip') return undefined
    if (queryRef === 'getExportJobStatus') return mockQueryState.exportJobStatus
    if (queryRef === 'getPDFJobStatus') return mockQueryState.pdfJobStatus
    // listByCompany -- return empty array so the component doesn't break
    if (queryRef === 'listByCompany') return []
    return null
  },
}))

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

vi.mock('@/lib/convex-hooks/companies', () => ({
  useCompany: () => ({
    _id: 'company-1',
    name: 'Test Company',
    currency: 'MYR',
  }),
}))

vi.mock('@/lib/convex-hooks/shared', () => ({
  useWorkosUserId: () => 'wos_user_1',
}))

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

vi.mock('@/convex/_generated/api', () => ({
  api: {
    exports: {
      index: {
        generateExport: 'generateExport',
        generateAccountingExport: 'generateAccountingExport',
        generatePDFExport: 'generatePDFExport',
        getPDFJobStatus: 'getPDFJobStatus',
        getExportJobStatus: 'getExportJobStatus',
      },
    },
    sessions: {
      listByCompany: 'listByCompany',
    },
    companies: {
      get: 'companies.get',
    },
  },
}))

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

vi.mock('@/components/onboarding', () => ({
  useOnboardingState: () => ({
    isOnboarding: false,
    currentStep: 0,
    totalSteps: 5,
    progress: 100,
    isComplete: true,
    completeItem: vi.fn(),
  }),
  OnboardingTour: () => null,
  OnboardingChecklist: () => null,
}))

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
