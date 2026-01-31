'use client'

/**
 * Dashboard View Component.
 *
 * The main dashboard page showing reconciliation overview statistics,
 * cash flow charts, expense breakdowns, and recent transactions.
 * Displays demo data when in demo mode, or actual user data when authenticated.
 *
 * Features:
 * - Stat cards for Cash In/Out, Matched, Suspense counts
 * - 12-month cash flow chart with inflow/outflow bars
 * - Expense breakdown donut chart by category
 * - Reconciliation progress indicator
 * - Top expenses list
 * - Recent transactions feed
 *
 * @module components/views/dashboard-view
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  useAppStore,
  useIsDemo,
  useSelectedCompanyId,
  useCashTransactionsSafe,
  useAccrualTransactionsSafe,
  useMatchesSafe,
  useActiveSessionSafe,
  useSessionsSafe,
} from '@/lib/store'
import {
  useMonthlyCashFlow,
  useExpenseBreakdown,
  useTopExpenses,
  useReconciliationStats,
} from '@/lib/convex-hooks'
import { Upload, CheckCircle2, ArrowRight, Loader2, FileText, Bell } from 'lucide-react'
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
} from '@/components/brand'
import type { CashFlowDataPoint, ExpenseCategory, TopExpense } from '@/components/brand'

// Demo data for cash flow chart (12 months)
const demoCashFlowData: CashFlowDataPoint[] = [
  { month: 'Feb 24', inflow: 38000, outflow: 35500 },
  { month: 'Mar 24', inflow: 42000, outflow: 38500 },
  { month: 'Apr 24', inflow: 39500, outflow: 36000 },
  { month: 'May 24', inflow: 45000, outflow: 39200 },
  { month: 'Jun 24', inflow: 48000, outflow: 42000 },
  { month: 'Jul 24', inflow: 46500, outflow: 40500 },
  { month: 'Aug 24', inflow: 50000, outflow: 43000 },
  { month: 'Sep 24', inflow: 52000, outflow: 45500 },
  { month: 'Oct 24', inflow: 48500, outflow: 41000 },
  { month: 'Nov 24', inflow: 55000, outflow: 47000 },
  { month: 'Dec 24', inflow: 62000, outflow: 52000 },
  { month: 'Jan 25', inflow: 55000, outflow: 46000 },
]

// Demo data for expense breakdown
const demoExpenseData: ExpenseCategory[] = [
  { category: 'Payroll', amount: 28500, percentage: 35 },
  { category: 'Cloud Services', amount: 12450, percentage: 15 },
  { category: 'Rent', amount: 10000, percentage: 12 },
  { category: 'Software', amount: 8500, percentage: 10 },
  { category: 'Marketing', amount: 6200, percentage: 8 },
  { category: 'Other', amount: 16350, percentage: 20 },
]

// Demo data for top expenses
const demoTopExpenses: TopExpense[] = [
  { id: '1', description: 'PAYROLL - January 2025', amount: 28500.00, date: '2025-01-22', category: 'Payroll' },
  { id: '2', description: 'AWS Services - Monthly', amount: 2450.00, date: '2025-01-15', category: 'Cloud' },
  { id: '3', description: 'Unknown Transfer', amount: 1200.00, date: '2025-01-25', category: 'Suspense' },
  { id: '4', description: 'Software License - Adobe', amount: 599.99, date: '2025-01-26', category: 'Software' },
  { id: '5', description: 'Office Supplies - Staples', amount: 342.50, date: '2025-01-20', category: 'Office' },
]

/**
 * Main dashboard view with stats, charts, and reconciliation progress.
 *
 * Automatically switches between demo data and real data based on mode.
 * Shows empty state with upload CTA when no data is available in real mode.
 *
 * @example
 * ```tsx
 * // In app/(app)/dashboard/page.tsx
 * export default function DashboardPage() {
 *   return <DashboardView />
 * }
 * ```
 */
export function DashboardView() {
  const router = useRouter()
  const isDemo = useIsDemo()
  const selectedCompanyId = useSelectedCompanyId()

  // Mode-aware selectors - automatically return correct data based on isDemo
  const cashTransactions = useCashTransactionsSafe()
  const accrualTransactions = useAccrualTransactionsSafe()
  const matches = useMatchesSafe()
  const activeSession = useActiveSessionSafe()
  const sessions = useSessionsSafe()

  // Get companyId for real data queries (skip in demo mode or when no company selected)
  const companyId = isDemo ? undefined : selectedCompanyId ?? undefined

  // Real data queries (skip in demo mode or when no company selected)
  const cashFlowData = useMonthlyCashFlow(companyId)
  const expenseData = useExpenseBreakdown(companyId)
  const topExpensesData = useTopExpenses(companyId)
  const reconStats = useReconciliationStats(companyId)

  // State for notification dropdown
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Determine the current workflow state for guidance
  const workflowState = useMemo(() => {
    const hasDocuments = cashTransactions.length > 0 || accrualTransactions.length > 0
    const pendingCount = matches.filter((m) => !m.approved).length
    const approvedCount = matches.filter((m) => m.approved).length
    const totalMatches = matches.length
    const isProcessing = activeSession?.status === 'processing'

    if (!hasDocuments && !isDemo) {
      return {
        type: 'upload' as const,
        title: 'Get started with your first reconciliation',
        description: 'Upload your bank statements and invoices to begin matching transactions.',
        action: { label: 'Upload Documents', href: '/upload' },
        icon: <Upload className="w-5 h-5" />,
      }
    }

    if (isProcessing) {
      return {
        type: 'processing' as const,
        title: 'Processing your documents',
        description: 'We\'re extracting transactions from your documents. This usually completes in under a minute.',
        action: null,
        icon: <Loader2 className="w-5 h-5 animate-spin" />,
      }
    }

    if (pendingCount > 0) {
      return {
        type: 'review' as const,
        title: `${pendingCount} matches ready for review`,
        description: `Review and approve matched transactions. ${approvedCount} already approved.`,
        action: { label: 'Review Matches', href: '/reconcile' },
        icon: <FileText className="w-5 h-5" />,
      }
    }

    if (totalMatches > 0 && pendingCount === 0) {
      return {
        type: 'complete' as const,
        title: 'Reconciliation complete!',
        description: `All ${approvedCount} matches approved. Export your reconciliation report.`,
        action: { label: 'Export Report', href: '/reports' },
        icon: <CheckCircle2 className="w-5 h-5" />,
      }
    }

    return null
  }, [cashTransactions, accrualTransactions, matches, activeSession, isDemo])

  // Memoize calculations - prefer backend stats over local store for accuracy
  // Backend reconStats is the source of truth for match/pending/suspense counts
  // Cash in/out totals come from local store (could be moved to backend later)
  const stats = useMemo(() => {
    // Use backend reconciliation stats when available (non-demo mode)
    if (!isDemo && reconStats) {
      return {
        totalCashIn: cashTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        totalCashOut: cashTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
        matchedCount: reconStats.matched ?? 0,
        pendingCount: reconStats.pending ?? 0,
        suspenseCount: reconStats.suspense ?? 0,
      }
    }
    // Fallback to local store calculation (demo mode or loading state)
    return {
      totalCashIn: cashTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
      totalCashOut: cashTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      matchedCount: matches.filter(m => m.approved).length,
      pendingCount: matches.filter(m => !m.approved).length,
      suspenseCount: cashTransactions.filter(t => t.status === 'suspense').length,
    }
  }, [isDemo, reconStats, cashTransactions, matches])

  // Empty state for Real mode with no data
  const hasNoData = !isDemo && sessions.length === 0 && cashTransactions.length === 0 && accrualTransactions.length === 0

  // Chart data: use backend queries for real mode, demo data for demo mode
  const chartCashFlow: CashFlowDataPoint[] = useMemo(() => {
    if (isDemo) return demoCashFlowData
    // Backend returns { month, monthKey, inflow, outflow, net } - chart only needs month, inflow, outflow
    return cashFlowData ?? []
  }, [isDemo, cashFlowData])

  const chartExpenses: ExpenseCategory[] = useMemo(() => {
    if (isDemo) return demoExpenseData
    return expenseData ?? []
  }, [isDemo, expenseData])

  const chartTopExpenses: TopExpense[] = useMemo(() => {
    if (isDemo) return demoTopExpenses
    // Backend returns id as Id<"transactions">, but TopExpense expects string
    return (topExpensesData ?? []).map(tx => ({
      ...tx,
      id: String(tx.id), // Convert Convex ID to string
    }))
  }, [isDemo, topExpensesData])

  // Reconciliation stats from backend (for non-demo mode)
  const statsData = useMemo(() => {
    if (isDemo) {
      return { matched: 127, pending: 12, suspense: 5, total: 144, matchRate: 88 }
    }
    return reconStats ?? { matched: 0, pending: 0, suspense: 0, total: 0, matchRate: 0 }
  }, [isDemo, reconStats])

  // Loading state for charts (only in real mode)
  const isChartsLoading = !isDemo && (
    cashFlowData === undefined ||
    expenseData === undefined ||
    topExpensesData === undefined
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
          <DataSyncPulse active={true} />

          {/* Notification Bell */}
          {workflowState && (
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {/* Notification dot */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <NotificationDropdown
                  state={workflowState}
                  onNavigate={(href) => {
                    setShowNotifications(false)
                    router.push(href)
                  }}
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

      {/* Stats Grid - Responsive: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cash In"
          value={stats.totalCashIn}
          prefix="$"
          icon={<IconCashIn className="w-3 h-3" />}
          decimals={2}
          animate
        />
        <StatCard
          label="Cash Out"
          value={stats.totalCashOut}
          prefix="$"
          icon={<IconCashOut className="w-3 h-3" />}
          decimals={2}
          animate
        />
        <StatCard
          label="Matched"
          value={stats.matchedCount}
          icon={<IconMatched className="w-3 h-3" />}
          secondaryText={`${stats.pendingCount} pending review`}
          animate
        />
        <StatCard
          label="Needs Review"
          value={stats.suspenseCount}
          icon={<IconSuspense className="w-3 h-3" />}
          trend={stats.suspenseCount > 0 ? 'down' : 'neutral'}
          animate
        />
      </div>

      {/* Cash Flow Chart */}
      <ChartSection
        title="Cash Flow"
        subtitle="12 Months"
        headerRight={<CashFlowLegend />}
      >
        {isChartsLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartCashFlow.length > 0 ? (
          <CashFlowChart data={chartCashFlow} height={280} animate />
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No cash flow data available
          </div>
        )}
      </ChartSection>

      {/* Two-column: Expenses + Progress - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Breakdown */}
        <ChartSection
          title="Expense Breakdown"
          subtitle="By category"
        >
          {isChartsLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
                {isDemo ? `${statsData.matchRate}%` : `${activeSession?.progress ?? 0}%`}
              </span>
            )
          }
        >
          {activeSession || isDemo ? (
            <>
              <ReconciliationProgress
                matched={isDemo ? statsData.matched : stats.matchedCount}
                pending={isDemo ? statsData.pending : stats.pendingCount}
                suspense={isDemo ? statsData.suspense : stats.suspenseCount}
                animate={true}
              />
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Expenses</div>
                {isChartsLoading ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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

      {/* Recent Activity - Using ChartSection for consistency */}
      <ChartSection title="Recent Transactions">
        <div className="divide-y divide-border -mx-4 -mb-4">
          {cashTransactions.slice(0, 5).map((tx, index) => (
            <div
              key={tx.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-muted/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 ${
                  tx.status === 'matched' ? 'bg-foreground' :
                  tx.status === 'suspense' ? 'bg-destructive' : 'bg-muted-foreground'
                }`} />
                <div>
                  <div className="text-sm">{tx.description}</div>
                  <div className="text-xs text-muted-foreground">{tx.date}</div>
                </div>
              </div>
              <div className={`text-sm font-medium tabular-nums ${tx.amount < 0 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
          {cashTransactions.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              No recent transactions
            </div>
          )}
        </div>
      </ChartSection>
    </div>
  )
}

/**
 * Generate monthly cash flow data from transaction list.
 *
 * Aggregates transactions by month and calculates inflows (positive)
 * and outflows (negative amounts) for the last 12 months.
 *
 * @param transactions - Array of transactions with date and amount
 * @returns Array of CashFlowDataPoint sorted by month
 */
function generateCashFlowFromTransactions(transactions: Array<{ date: string; amount: number }>): CashFlowDataPoint[] {
  const monthlyData: Record<string, { inflow: number; outflow: number }> = {}

  for (const tx of transactions) {
    // Null safety: skip if date is missing or invalid
    if (!tx.date || typeof tx.date !== 'string') continue
    const monthKey = tx.date.substring(0, 7) // "2025-01"
    if (!monthKey || monthKey.length !== 7) continue

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { inflow: 0, outflow: 0 }
    }
    if (tx.amount > 0) {
      monthlyData[monthKey].inflow += tx.amount
    } else {
      monthlyData[monthKey].outflow += Math.abs(tx.amount)
    }
  }

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        inflow: data.inflow,
        outflow: data.outflow,
      }
    })
}

/**
 * Generate expense breakdown by category from transactions.
 *
 * Aggregates negative amounts (outflows) by category and calculates
 * percentage of total expenses. Returns top 6 categories.
 *
 * @param transactions - Array of transactions with amount and optional category
 * @returns Array of ExpenseCategory sorted by amount descending
 */
function generateExpenseBreakdown(transactions: Array<{ amount: number; category?: string }>): ExpenseCategory[] {
  const categoryTotals: Record<string, number> = {}
  let total = 0

  for (const tx of transactions) {
    if (tx.amount >= 0) continue
    const category = tx.category || 'Uncategorized'
    const amount = Math.abs(tx.amount)
    categoryTotals[category] = (categoryTotals[category] || 0) + amount
    total += amount
  }

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
}

/**
 * Get top 5 largest expenses from transactions.
 *
 * Filters for outflows (negative amounts), sorts by amount descending,
 * and returns the 5 largest expenses.
 *
 * @param transactions - Array of transactions with full details
 * @returns Array of TopExpense for display
 */
function generateTopExpenses(transactions: Array<{ id: string; description: string; amount: number; date: string; category?: string }>): TopExpense[] {
  return transactions
    .filter(tx => tx.amount < 0 && tx.id && tx.description && tx.date) // Null safety
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5)
    .map(tx => ({
      id: tx.id,
      description: tx.description,
      amount: Math.abs(tx.amount),
      date: tx.date,
      category: tx.category || 'Uncategorized',
    }))
}

// =============================================================================
// NOTIFICATION DROPDOWN
// =============================================================================

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

/**
 * Compact notification dropdown that shows workflow status.
 * Appears when clicking the bell icon in the header.
 */
function NotificationDropdown({ state, onNavigate }: NotificationDropdownProps) {
  const dotColors: Record<WorkflowState['type'], string> = {
    upload: 'bg-blue-500',
    processing: 'bg-amber-500',
    review: 'bg-purple-500',
    complete: 'bg-emerald-500',
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
      </div>

      {/* Notification Item */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColors[state.type]}`} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{state.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{state.description}</p>

            {/* Action */}
            {state.action && (
              <button
                onClick={() => onNavigate(state.action!.href)}
                className="mt-2 text-xs font-medium text-foreground hover:underline flex items-center gap-1"
              >
                {state.action.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
