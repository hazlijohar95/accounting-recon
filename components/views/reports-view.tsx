'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useAppStore,
  useMatchesSafe,
  useCashTransactionsSafe,
  useAccrualTransactionsSafe,
  useActiveSessionSafe,
} from '@/lib/store'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRecentActivity } from '@/lib/convex-hooks'
import {
  IconDownload,
  IconCaretDown,
  IconCheckCircle,
  IconXCircle,
  IconUpload,
  IconPlay,
  IconClock,
  IconFileText,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import {
  SkeletonTable,
  ButtonPrimary,
  ButtonSecondary,
  StatCard,
  ChartSection,
  IconMatched,
  IconSuspense,
  MatchLayerBadge,
  BrandedEmptyState,
} from '@/components/brand'
import { useToastHelpers } from '@/components/ui'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import type { Id } from '@/convex/_generated/dataModel'
import type { ReportType as ExportReportType, AccountingSoftware } from '@/lib/exports/types'
import type { MatchLayer } from '@/components/brand'

type ReportType = 'summary' | 'detailed' | 'variance' | 'audit'

interface Report {
  id: ReportType
  name: string
  exportType?: ExportReportType
}

const reports: Report[] = [
  { id: 'summary', name: 'Summary', exportType: 'bank_recon' },
  { id: 'detailed', name: 'All Matches', exportType: 'bank_recon' },
  { id: 'variance', name: 'Differences', exportType: 'client_query' },
  { id: 'audit', name: 'Activity Log', exportType: 'transaction_listing' },
]

const accountingSoftwareOptions: { id: AccountingSoftware; name: string }[] = [
  { id: 'sql_accounting', name: 'SQL Accounting' },
  { id: 'autocount', name: 'AutoCount' },
  { id: 'quickbooks_iif', name: 'QuickBooks (IIF)' },
  { id: 'xero_csv', name: 'Xero (CSV)' },
]

/**
 * ReportsView wrapped with ErrorBoundary for graceful error handling.
 */
export function ReportsView() {
  return (
    <ErrorBoundary componentName="ReportsView">
      <ReportsViewContent />
    </ErrorBoundary>
  )
}

function ReportsViewContent() {
  const router = useRouter()
  // Mode-aware selectors - automatically return correct data based on isDemo
  const matches = useMatchesSafe()
  const cashTransactions = useCashTransactionsSafe()
  const accrualTransactions = useAccrualTransactionsSafe()
  const activeSession = useActiveSessionSafe()
  // Actions and UI state still from store
  const { setShowPaywall, isDemo, selectedCompanyId } = useAppStore()
  const [selectedReport, setSelectedReport] = useState<ReportType>('summary')

  // Empty state for Real mode with no data
  const hasNoData = !isDemo && matches.length === 0 && cashTransactions.length === 0 && accrualTransactions.length === 0

  if (hasNoData) {
    return (
      <BrandedEmptyState
        variant="upload"
        title="No reports available yet"
        description="Upload and reconcile your bank statements and invoices to generate reports."
        action={{
          label: 'Upload Documents',
          onClick: () => router.push('/upload'),
        }}
      />
    )
  }

  // Derived loading state from data instead of fake setTimeout
  const hasData = useMemo(() =>
    matches.length > 0 || cashTransactions.length > 0 || accrualTransactions.length > 0,
    [matches, cashTransactions, accrualTransactions]
  )
  const [isLoading, setIsLoading] = useState(!hasData)
  const [exportLoading, setExportLoading] = useState<'csv' | 'xlsx' | 'accounting' | null>(null)
  const [showAccountingMenu, setShowAccountingMenu] = useState(false)

  // Toast notifications
  const toast = useToastHelpers()

  // Convex actions
  const generateExport = useAction(api.exports.index.generateExport)
  const generateAccountingExport = useAction(api.exports.index.generateAccountingExport)

  // Fetch real activity data from backend
  const recentActivity = useRecentActivity(
    selectedCompanyId as Id<"companies"> | undefined,
    10
  )

  // Update loading state when data becomes available
  useEffect(() => {
    if (hasData) {
      setIsLoading(false)
    }
  }, [hasData])

  // Close accounting menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowAccountingMenu(false)
    if (showAccountingMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showAccountingMenu])

  const matchedCount = matches.filter(m => m.approved).length
  const pendingCount = matches.filter(m => !m.approved).length
  const suspenseCount = cashTransactions.filter(t => t.status === 'suspense').length
  const totalTransactions = matchedCount + pendingCount + suspenseCount
  const totalCash = cashTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalAccrual = accrualTransactions.reduce((sum, t) => sum + t.amount, 0)
  const variance = totalCash - totalAccrual

  // Percentages for progress bar
  const matchedPct = totalTransactions > 0 ? (matchedCount / totalTransactions) * 100 : 0
  const pendingPct = totalTransactions > 0 ? (pendingCount / totalTransactions) * 100 : 0
  const reviewPct = totalTransactions > 0 ? (suspenseCount / totalTransactions) * 100 : 0

  // Download file from data URL
  const downloadFile = useCallback((dataUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const handleExport = useCallback(async (format: 'csv' | 'xlsx') => {
    if (isDemo) {
      setShowPaywall(true)
      return
    }

    if (!activeSession?.id) {
      toast.error('No active session selected')
      return
    }

    setExportLoading(format)

    try {
      const report = reports.find(r => r.id === selectedReport)
      const reportType = report?.exportType || 'bank_recon'

      const result = await generateExport({
        sessionId: activeSession.id as Id<"reconciliationSessions">,
        reportType,
        format,
        options: {
          includeMatched: true,
          includePending: true,
          includeSuspense: true,
        },
      })

      if (result.success && result.fileUrl && result.fileName) {
        downloadFile(result.fileUrl, result.fileName)
        toast.success(`${format.toUpperCase()} export ready`, 'Your file is downloading')
      } else {
        toast.error('Export failed', result.error || 'Unknown error')
      }
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setExportLoading(null)
    }
  }, [isDemo, activeSession, selectedReport, generateExport, setShowPaywall, downloadFile, toast])

  const handleAccountingExport = useCallback(async (software: AccountingSoftware) => {
    if (isDemo) {
      setShowPaywall(true)
      return
    }

    if (!activeSession?.id) {
      toast.error('No active session selected')
      return
    }

    setExportLoading('accounting')
    setShowAccountingMenu(false)

    try {
      const result = await generateAccountingExport({
        sessionId: activeSession.id as Id<"reconciliationSessions">,
        software,
        options: {
          includeJournalEntries: true,
        },
      })

      if (result.success && result.fileUrl && result.fileName) {
        downloadFile(result.fileUrl, result.fileName)
        const softwareName = accountingSoftwareOptions.find(o => o.id === software)?.name || software
        toast.success(`${softwareName} export ready`, 'Your file is downloading')
      } else {
        toast.error('Export failed', result.error || 'Unknown error')
      }
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setExportLoading(null)
    }
  }, [isDemo, activeSession, generateAccountingExport, setShowPaywall, downloadFile, toast])

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeSession?.name || 'No session selected'}</p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonSecondary
            size="sm"
            icon={<IconDownload size={12} />}
            loading={exportLoading === 'csv'}
            disabled={exportLoading !== null}
            onClick={() => handleExport('csv')}
          >
            CSV
          </ButtonSecondary>
          <ButtonPrimary
            size="sm"
            icon={<IconDownload size={12} />}
            loading={exportLoading === 'xlsx'}
            disabled={exportLoading !== null}
            onClick={() => handleExport('xlsx')}
          >
            Excel
          </ButtonPrimary>

          {/* Accounting Software Export Dropdown */}
          <div className="relative">
            <ButtonSecondary
              size="sm"
              icon={<IconDownload size={12} />}
              loading={exportLoading === 'accounting'}
              disabled={exportLoading !== null}
              onClick={(e) => {
                e.stopPropagation()
                setShowAccountingMenu(!showAccountingMenu)
              }}
            >
              Accounting
              <IconCaretDown size={12} className="ml-1" />
            </ButtonSecondary>

            {showAccountingMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border shadow-lg z-10">
                {accountingSoftwareOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAccountingExport(option.id)
                    }}
                    className="w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors"
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="px-6 py-4 border-b border-border flex gap-1" role="tablist" aria-label="Report types">
        {reports.map((report) => (
          <button
            key={report.id}
            role="tab"
            aria-selected={selectedReport === report.id}
            aria-controls={`report-panel-${report.id}`}
            tabIndex={selectedReport === report.id ? 0 : -1}
            onClick={() => setSelectedReport(report.id)}
            className={cn(
              'px-4 py-2 text-sm transition-colors duration-200',
              selectedReport === report.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-secondary/50'
            )}
          >
            {report.name}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <main
        className="flex-1 p-6 overflow-auto"
        role="tabpanel"
        id={`report-panel-${selectedReport}`}
        aria-live="polite"
        aria-busy={isLoading}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SkeletonTable rows={1} columns={1} />
              <SkeletonTable rows={1} columns={1} />
              <SkeletonTable rows={1} columns={1} />
              <SkeletonTable rows={1} columns={1} />
            </div>
            <SkeletonTable rows={5} columns={4} />
          </div>
        )}

        {/* Summary Report */}
        {!isLoading && selectedReport === 'summary' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              style={{ animationDelay: '0ms' }}
            >
              <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <StatCard
                  label="Matched"
                  value={matchedCount}
                  icon={<IconMatched className="text-muted-foreground" />}
                  animate
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <StatCard
                  label="Pending"
                  value={pendingCount}
                  icon={<IconClock size={12} />}
                  animate
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <StatCard
                  label="Needs Review"
                  value={suspenseCount}
                  icon={<IconSuspense className="text-muted-foreground" />}
                  animate
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <StatCard
                  label="Total"
                  value={totalTransactions}
                  icon={<IconFileText size={12} />}
                  animate
                />
              </div>
            </div>

            {/* Progress Section */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <ChartSection
                title="Reconciliation Progress"
                subtitle={`${matchedPct.toFixed(0)}% complete`}
              >
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="h-3 bg-secondary flex overflow-hidden">
                    <div
                      className="bg-foreground transition-all duration-500"
                      style={{ width: `${matchedPct}%` }}
                    />
                    <div
                      className="bg-muted-foreground transition-all duration-500"
                      style={{ width: `${pendingPct}%` }}
                    />
                    <div
                      className="bg-destructive/60 transition-all duration-500"
                      style={{ width: `${reviewPct}%` }}
                    />
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-between text-xs">
                    <LegendItem
                      color="bg-foreground"
                      label="Matched"
                      value={`${matchedPct.toFixed(1)}%`}
                      count={matchedCount}
                    />
                    <LegendItem
                      color="bg-muted-foreground"
                      label="Pending"
                      value={`${pendingPct.toFixed(1)}%`}
                      count={pendingCount}
                    />
                    <LegendItem
                      color="bg-destructive/60"
                      label="Needs Review"
                      value={`${reviewPct.toFixed(1)}%`}
                      count={suspenseCount}
                    />
                  </div>
                </div>
              </ChartSection>
            </div>
          </div>
        )}

        {/* Differences Report */}
        {!isLoading && selectedReport === 'variance' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <StatCard
                  label="Bank Total"
                  value={Math.abs(totalCash)}
                  prefix="$"
                  decimals={2}
                  animate
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <StatCard
                  label="Books Total"
                  value={Math.abs(totalAccrual)}
                  prefix="$"
                  decimals={2}
                  animate
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <StatCard
                  label="Difference"
                  value={Math.abs(variance)}
                  prefix={variance < 0 ? "-$" : "$"}
                  decimals={2}
                  trend={variance === 0 ? 'neutral' : variance > 0 ? 'up' : 'down'}
                  trendValue={variance === 0 ? 'Balanced' : undefined}
                  className={cn(
                    variance === 0 && 'border-emerald-500/30',
                    variance !== 0 && 'border-destructive/30'
                  )}
                  animate
                />
              </div>
            </div>

            {/* Unmatched Items */}
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <ChartSection
                title="Unmatched Items"
                subtitle={`${cashTransactions.filter(t => t.status !== 'matched').length} items`}
              >
                {cashTransactions.filter(t => t.status !== 'matched').length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    All items have been matched
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {cashTransactions.filter(t => t.status !== 'matched').map((tx, i) => (
                      <div
                        key={tx.id}
                        className="py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors -mx-4 px-4 animate-fade-in-up"
                        style={{ animationDelay: `${200 + i * 50}ms` }}
                      >
                        <div>
                          <div className="text-sm">{tx.description}</div>
                          <div className="text-xs text-muted-foreground">{tx.date}</div>
                        </div>
                        <div className="text-sm font-medium tabular-nums">
                          ${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ChartSection>
            </div>
          </div>
        )}

        {/* All Matches Report */}
        {!isLoading && selectedReport === 'detailed' && (
          <div className="animate-fade-in-up">
            {matches.length === 0 ? (
              <BrandedEmptyState
                variant="reconcile"
                title="No matches yet"
                description="Run the reconciliation process to see matched transactions here."
              />
            ) : (
              <ChartSection
                title="All Matches"
                subtitle={`${matches.length} matches`}
              >
                <div className="-mx-4">
                  {/* Table Header */}
                  <div
                    className="grid grid-cols-12 px-4 py-2 border-b border-border text-xs text-muted-foreground uppercase tracking-wider"
                    role="row"
                  >
                    <div role="columnheader" className="col-span-3">Cash Description</div>
                    <div role="columnheader" className="col-span-3">Accrual Description</div>
                    <div role="columnheader" className="col-span-2 text-right">Amount</div>
                    <div role="columnheader" className="col-span-2 text-center">Match Type</div>
                    <div role="columnheader" className="col-span-2 text-center">Status</div>
                  </div>

                  {/* Table Rows */}
                  <div role="table" aria-label="Detailed match report">
                    {matches.map((match, i) => (
                      <div
                        key={match.id}
                        className="grid grid-cols-12 px-4 py-3 border-b border-border text-sm hover:bg-secondary/30 transition-colors animate-fade-in-up"
                        role="row"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div role="cell" className="col-span-3 truncate pr-2">{match.cashTransaction.description}</div>
                        <div role="cell" className="col-span-3 truncate pr-2">{match.accrualTransaction.description}</div>
                        <div role="cell" className="col-span-2 text-right font-medium tabular-nums">
                          ${Math.abs(match.cashTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div role="cell" className="col-span-2 flex justify-center">
                          <MatchLayerBadge layer={match.matchLayer as MatchLayer} />
                        </div>
                        <div role="cell" className="col-span-2 flex justify-center">
                          <span className={cn(
                            'px-2 py-0.5 text-xs',
                            match.approved ? 'bg-foreground/10' : 'bg-secondary'
                          )}>
                            {match.approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartSection>
            )}
          </div>
        )}

        {/* Activity Log */}
        {!isLoading && selectedReport === 'audit' && (
          <div className="animate-fade-in-up">
            <ChartSection
              title="Activity Log"
              subtitle={recentActivity ? `${recentActivity.length} recent transactions` : "Recent actions"}
            >
              <div className="divide-y divide-border -mx-4">
                {/* Show real activity data from backend */}
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((activity: { id: Id<"transactions">; time: string; date: string; description: string; amount: number; type: string; status: string }, i: number) => (
                    <ActivityRow
                      key={activity.id}
                      icon={
                        activity.status === 'matched' ? (
                          <IconCheckCircle size={16} />
                        ) : activity.status === 'suspense' ? (
                          <IconXCircle size={16} />
                        ) : activity.type === 'inflow' ? (
                          <IconDownload size={16} />
                        ) : (
                          <IconUpload size={16} />
                        )
                      }
                      iconBg={
                        activity.status === 'matched'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : activity.status === 'suspense'
                            ? 'bg-destructive/10 text-destructive'
                            : activity.type === 'inflow'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-foreground/10 text-foreground'
                      }
                      action={
                        activity.status === 'matched'
                          ? 'Transaction matched'
                          : activity.status === 'suspense'
                            ? 'Needs review'
                            : activity.type === 'inflow'
                              ? 'Inflow recorded'
                              : 'Outflow recorded'
                      }
                      detail={`${activity.description} - $${Math.abs(activity.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      time={activity.time}
                      delay={i * 50}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No recent activity to display
                  </div>
                )}
              </div>
            </ChartSection>
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Legend item for progress bar
 */
function LegendItem({
  color,
  label,
  value,
  count
}: {
  color: string
  label: string
  value: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2', color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  )
}

/**
 * Timeline-style activity row
 */
function ActivityRow({
  icon,
  iconBg,
  action,
  detail,
  time,
  delay
}: {
  icon: React.ReactNode
  iconBg: string
  action: string
  detail: string
  time: string
  delay: number
}) {
  return (
    <div
      className="py-3 px-4 flex items-start gap-4 hover:bg-secondary/30 transition-colors animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn('w-8 h-8 flex items-center justify-center shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{action}</div>
        <div className="text-xs text-muted-foreground truncate">{detail}</div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">{time}</div>
    </div>
  )
}
