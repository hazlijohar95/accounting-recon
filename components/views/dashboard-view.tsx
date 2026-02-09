'use client'

/**
 * Dashboard View Component.
 *
 * The main dashboard page showing reconciliation overview statistics,
 * cash flow charts, expense breakdowns, and recent transactions.
 * Displays demo data when in demo mode, or actual user data when authenticated.
 *
 * @module components/views/dashboard-view
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  useIsDemo,
  useSelectedCompanyId,
  useActiveSessionSafe,
} from '@/lib/store'
import {
  useMonthlyCashFlow,
  useExpenseBreakdown,
  useTopExpenses,
  useCashTransactionsCombined,
  useReconciliationStatsCombined,
  useSessionsCombined,
  useDashboardWorkflow,
} from '@/lib/convex-hooks'
import {
  IconUpload,
  IconCheckCircle,
  IconArrowRight,
  IconLoader,
  IconFileText,
  IconBell,
} from '@/components/brand/icons'
import {
  ReconciliationProgress,
  DataSyncPulse,
  BrandedEmptyState,
  StatCard,
  IconCashIn,
  IconCashOut,
  IconMatched,
  IconSuspense,
  CashFlowChart,
  CashFlowLegend,
  ExpenseChart,
  TopExpensesList,
  ChartSection,
  SkeletonStatCard,
} from '@/components/brand'
import type { CashFlowDataPoint, ExpenseCategory, TopExpense } from '@/components/brand'

// ============================================================================
// DEMO DATA
// ============================================================================
// Uses relative month labels that won't go stale over time.

function generateDemoCashFlow(): CashFlowDataPoint[] {
  const now = new Date()
  const data: CashFlowDataPoint[] = []
  const amounts = [
    { inflow: 38000, outflow: 35500 },
    { inflow: 42000, outflow: 38500 },
    { inflow: 39500, outflow: 36000 },
    { inflow: 45000, outflow: 39200 },
    { inflow: 48000, outflow: 42000 },
    { inflow: 46500, outflow: 40500 },
    { inflow: 50000, outflow: 43000 },
    { inflow: 52000, outflow: 45500 },
    { inflow: 48500, outflow: 41000 },
    { inflow: 55000, outflow: 47000 },
    { inflow: 62000, outflow: 52000 },
    { inflow: 55000, outflow: 46000 },
  ]
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
    data.push({ month: label, ...amounts[11 - i] })
  }
  return data
}

const DEMO_CASH_FLOW = generateDemoCashFlow()

const DEMO_EXPENSES: ExpenseCategory[] = [
  { category: 'Payroll', amount: 28500, percentage: 35 },
  { category: 'Cloud Services', amount: 12450, percentage: 15 },
  { category: 'Rent', amount: 10000, percentage: 12 },
  { category: 'Software', amount: 8500, percentage: 10 },
  { category: 'Marketing', amount: 6200, percentage: 8 },
  { category: 'Other', amount: 16350, percentage: 20 },
]

const DEMO_TOP_EXPENSES: TopExpense[] = [
  { id: '1', description: 'PAYROLL - Monthly', amount: 28500.00, date: '2025-01-22', category: 'Payroll' },
  { id: '2', description: 'AWS Services - Monthly', amount: 2450.00, date: '2025-01-15', category: 'Cloud' },
  { id: '3', description: 'Unknown Transfer', amount: 1200.00, date: '2025-01-25', category: 'Suspense' },
  { id: '4', description: 'Software License - Adobe', amount: 599.99, date: '2025-01-26', category: 'Software' },
  { id: '5', description: 'Office Supplies - Staples', amount: 342.50, date: '2025-01-20', category: 'Office' },
]

// ============================================================================
// CURRENCY FORMATTER
// ============================================================================

/** Format a number as currency. Centralised so we can swap to company settings later. */
function formatCurrency(amount: number, opts?: { sign?: boolean }): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (opts?.sign) {
    return amount < 0 ? `-$${formatted}` : `+$${formatted}`
  }
  return `$${formatted}`
}

// ============================================================================
// MAIN DASHBOARD VIEW
// ============================================================================

export function DashboardView() {
  const router = useRouter()
  const isDemo = useIsDemo()
  const selectedCompanyId = useSelectedCompanyId()

  // Mode-aware data
  const { data: cashTransactions, isLoading: isCashLoading } = useCashTransactionsCombined()
  const { data: reconStats, isLoading: isStatsLoading } = useReconciliationStatsCombined()
  const { data: sessions, isLoading: isSessionsLoading } = useSessionsCombined()
  const activeSession = useActiveSessionSafe()

  // Workflow state -- works in both demo and real mode via server-side aggregates
  const workflow = useDashboardWorkflow(activeSession?.id)

  // Chart data queries (skip in demo mode)
  const companyId = isDemo ? undefined : selectedCompanyId ?? undefined
  const cashFlowData = useMonthlyCashFlow(companyId)
  const expenseData = useExpenseBreakdown(companyId)
  const topExpensesData = useTopExpenses(companyId)

  // Notification dropdown
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!showNotifications) return

    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotifications(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showNotifications])

  // Derive workflow guidance state
  const workflowState = useMemo(() => {
    if (workflow.isLoading) return null

    if (!workflow.hasDocuments && !isDemo) {
      return {
        type: 'upload' as const,
        title: 'Get started with your first reconciliation',
        description: 'Upload your bank statements and invoices to begin matching transactions.',
        action: { label: 'Upload Documents', href: '/upload' },
        icon: <IconUpload size={20} />,
      }
    }

    if (workflow.isProcessing) {
      return {
        type: 'processing' as const,
        title: 'Processing your documents',
        description: "We're extracting transactions from your documents. This usually completes in under a minute.",
        action: null,
        icon: <IconLoader size={20} />,
      }
    }

    if (workflow.pendingMatchCount > 0) {
      return {
        type: 'review' as const,
        title: `${workflow.pendingMatchCount} matches ready for review`,
        description: `Review and approve matched transactions. ${workflow.approvedMatchCount} already approved.`,
        action: { label: 'Review Matches', href: '/reconcile' },
        icon: <IconFileText size={20} />,
      }
    }

    if (workflow.totalMatchCount > 0 && workflow.pendingMatchCount === 0) {
      return {
        type: 'complete' as const,
        title: 'Reconciliation complete!',
        description: `All ${workflow.approvedMatchCount} matches approved. Export your reconciliation report.`,
        action: { label: 'Export Report', href: '/reports' },
        icon: <IconCheckCircle size={20} />,
      }
    }

    return null
  }, [workflow, isDemo])

  // Chart data: backend queries for real mode, demo data for demo mode
  const chartCashFlow = useMemo<CashFlowDataPoint[]>(() => {
    if (isDemo) return DEMO_CASH_FLOW
    return cashFlowData ?? []
  }, [isDemo, cashFlowData])

  const chartExpenses = useMemo<ExpenseCategory[]>(() => {
    if (isDemo) return DEMO_EXPENSES
    return expenseData ?? []
  }, [isDemo, expenseData])

  const chartTopExpenses = useMemo<TopExpense[]>(() => {
    if (isDemo) return DEMO_TOP_EXPENSES
    return (topExpensesData ?? []).map(tx => ({ ...tx, id: String(tx.id) }))
  }, [isDemo, topExpensesData])

  // Reconciliation progress data
  const progressData = useMemo(() => ({
    matched: reconStats.matchedCount,
    pending: reconStats.pendingCount,
    suspense: reconStats.suspenseCount,
    total: reconStats.matchedCount + reconStats.pendingCount + reconStats.suspenseCount,
    matchRate: reconStats.matchRate,
  }), [reconStats])

  // Loading states
  const isChartsLoading = !isDemo && (
    cashFlowData === undefined ||
    expenseData === undefined ||
    topExpensesData === undefined
  )
  const isStatsLoadingAny = isStatsLoading || isCashLoading

  // Empty state: only show when we're sure there's no data (not just loading)
  const hasNoData = !isDemo
    && !isSessionsLoading
    && sessions.length === 0
    && cashTransactions.length === 0

  // Whether the dashboard is actively syncing (has an active session being processed)
  const isSyncing = activeSession?.status === 'processing' || (isDemo && true)

  const handleNavigate = useCallback((href: string) => {
    setShowNotifications(false)
    router.push(href)
  }, [router])

  // Sort recent transactions by date descending
  // Must be above early returns to maintain consistent hook call order
  const recentTransactions = useMemo(
    () => [...cashTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [cashTransactions]
  )

  if (hasNoData) {
    return (
      <BrandedEmptyState
        variant="upload"
        title="No reconciliation sessions yet"
        description="Upload your bank statements and invoices to get started with your first reconciliation."
        action={{
          label: 'Upload Documents',
          onClick: () => router.push('/upload'),
        }}
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeSession ? activeSession.name : 'No active session'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSyncPulse active={isSyncing} />

          {/* Notification Bell */}
          {workflowState && (
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label="Workflow notifications"
                aria-expanded={showNotifications}
                aria-haspopup="true"
              >
                <IconBell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" aria-hidden="true" />
              </button>

              {showNotifications && (
                <NotificationDropdown
                  state={workflowState}
                  onNavigate={handleNavigate}
                />
              )}
            </div>
          )}

          <button
            onClick={() => router.push('/reconcile')}
            className="px-4 py-2 bg-foreground text-background text-sm hover:bg-foreground/90 transition-colors"
          >
            Continue Reconciliation
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isStatsLoadingAny ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              label="Cash In"
              value={reconStats.totalCashIn}
              prefix="$"
              icon={<IconCashIn className="w-3 h-3" />}
              decimals={2}
              animate
            />
            <StatCard
              label="Cash Out"
              value={reconStats.totalCashOut}
              prefix="$"
              icon={<IconCashOut className="w-3 h-3" />}
              decimals={2}
              animate
            />
            <StatCard
              label="Matched"
              value={reconStats.matchedCount}
              icon={<IconMatched className="w-3 h-3" />}
              secondaryText={`${reconStats.pendingCount} pending review`}
              animate
            />
            <StatCard
              label="Suspense"
              value={reconStats.suspenseCount}
              icon={<IconSuspense className="w-3 h-3" />}
              trend={reconStats.suspenseCount > 0 ? 'down' : 'neutral'}
              secondaryText="Unmatched items"
              animate
            />
          </>
        )}
      </div>

      {/* Cash Flow Chart */}
      <ChartSection
        title="Cash Flow"
        subtitle="12 Months"
        headerRight={<CashFlowLegend />}
      >
        {isChartsLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <IconLoader size={24} className="text-muted-foreground" />
          </div>
        ) : chartCashFlow.length > 0 ? (
          <CashFlowChart data={chartCashFlow} height={280} animate />
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No cash flow data available
          </div>
        )}
      </ChartSection>

      {/* Two-column: Expenses + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Breakdown */}
        <ChartSection title="Expense Breakdown" subtitle="By category">
          {isChartsLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <IconLoader size={24} className="text-muted-foreground" />
            </div>
          ) : chartExpenses.length > 0 ? (
            <ExpenseChart data={chartExpenses} limit={5} animate />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No expense data available
            </div>
          )}
        </ChartSection>

        {/* Reconciliation Progress */}
        <ChartSection
          title="Reconciliation Progress"
          headerRight={
            (activeSession || isDemo) && (
              <span className="text-sm text-muted-foreground font-mono">
                {`${progressData.matchRate}%`}
              </span>
            )
          }
        >
          {activeSession || isDemo ? (
            <>
              <ReconciliationProgress
                matched={progressData.matched}
                pending={progressData.pending}
                suspense={progressData.suspense}
                animate
              />
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Expenses</div>
                {isChartsLoading ? (
                  <div className="py-4 flex justify-center">
                    <IconLoader size={16} className="text-muted-foreground" />
                  </div>
                ) : chartTopExpenses.length > 0 ? (
                  <TopExpensesList data={chartTopExpenses} limit={3} animate />
                ) : (
                  <div className="py-4 text-sm text-muted-foreground text-center">
                    No expenses recorded
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No active session
            </div>
          )}
        </ChartSection>
      </div>

      {/* Recent Transactions */}
      <ChartSection title="Recent Transactions">
        <div className="divide-y divide-border -mx-4 -mb-4">
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-muted/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-1.5 h-1.5 ${
                    tx.status === 'matched'
                      ? 'bg-foreground'
                      : tx.status === 'suspense'
                        ? 'bg-destructive'
                        : 'bg-muted-foreground'
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <div className="text-sm">{tx.description}</div>
                  <div className="text-xs text-muted-foreground">{tx.date}</div>
                </div>
              </div>
              <div
                className={`text-sm font-medium tabular-nums ${
                  tx.amount < 0 ? 'text-muted-foreground' : 'text-emerald-500'
                }`}
              >
                {formatCurrency(tx.amount, { sign: true })}
              </div>
            </div>
          ))}
          {recentTransactions.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              No recent transactions
            </div>
          )}
        </div>
      </ChartSection>
    </div>
  )
}

// ============================================================================
// NOTIFICATION DROPDOWN
// ============================================================================

interface WorkflowState {
  type: 'upload' | 'processing' | 'review' | 'complete'
  title: string
  description: string
  action: { label: string; href: string } | null
  icon: React.ReactNode
}

interface NotificationDropdownProps {
  state: WorkflowState
  onNavigate: (href: string) => void
}

const DOT_COLORS: Record<WorkflowState['type'], string> = {
  upload: 'bg-blue-500',
  processing: 'bg-amber-500',
  review: 'bg-purple-500',
  complete: 'bg-emerald-500',
}

/**
 * Compact notification dropdown showing workflow status.
 * Appears when clicking the bell icon in the header.
 */
function NotificationDropdown({ state, onNavigate }: NotificationDropdownProps) {
  return (
    <div
      role="dialog"
      aria-label="Workflow status"
      className="absolute right-0 top-full mt-2 w-72 bg-background border border-border shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Status
        </span>
      </div>

      <div className="p-3">
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[state.type]}`}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{state.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {state.description}
            </p>

            {state.action && (
              <button
                onClick={() => onNavigate(state.action!.href)}
                className="mt-2 text-xs font-medium text-foreground hover:underline flex items-center gap-1"
              >
                {state.action.label}
                <IconArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
