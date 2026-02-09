'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useReconcileData } from '@/lib/use-reconcile-data'
import {
  useActiveSession,
  useAppStore,
  useIsDemo,
  useSelectedWorkspaceId,
  useSetSelectedWorkspaceId,
} from '@/lib/store'
import {
  UniverSheetLoading,
  downloadReconciliationReport,
  transformToSpreadsheetData,
  GenericSheet,
  createReconciliationPlugin,
  type SpreadsheetAPI,
} from '@/components/spreadsheet'
import { SpreadsheetToolbar } from '@/components/spreadsheet/SpreadsheetToolbar'
import { SpreadsheetFooter } from '@/components/spreadsheet/SpreadsheetFooter'
import { UniverSheetSafe as UniverSheet } from '@/components/spreadsheet/univer-sheet-dynamic'
import { UnifiedSheet } from '@/components/unified-sheet'
import { Id } from '@/convex/_generated/dataModel'

/**
 * Feature flag for using the new unified sheet component
 * Set NEXT_PUBLIC_USE_UNIFIED_SHEET=true to enable full features
 */
const USE_UNIFIED_SHEET = process.env.NEXT_PUBLIC_USE_UNIFIED_SHEET === 'true'

/**
 * Feature flag for using the new generic spreadsheet component
 * Set NEXT_PUBLIC_USE_GENERIC_SHEET=true to enable Excel-like features
 */
const USE_GENERIC_SHEET = process.env.NEXT_PUBLIC_USE_GENERIC_SHEET === 'true'

/**
 * SpreadsheetView - Standalone spreadsheet view
 *
 * Works like Google Sheets - opens immediately with an empty spreadsheet.
 * Users can start typing right away or import reconciliation data.
 *
 * Features:
 * - Displays reconciliation data in Excel-like spreadsheet format
 * - Supports real-time data from active session
 * - Export to Excel/CSV functionality
 * - Loading state when fetching session data
 * - Immediate usability - no session required
 *
 * With USE_UNIFIED_SHEET enabled:
 * - Full cell editing (when not read-only)
 * - Conditional formatting with presets
 * - Charts (bar, line, pie, area)
 * - Data validation with dropdowns
 * - Import data from reconciliation sessions
 */
export function SpreadsheetView() {
  const searchParams = useSearchParams()
  const urlSessionId = searchParams.get('sessionId')
  const isDemo = useIsDemo()
  const { selectedCompanyId, currentUser } = useAppStore()
  const workosUserId = currentUser?.workosId

  // Workspace selection for import feature
  const selectedWorkspaceId = useSelectedWorkspaceId()
  const setSelectedWorkspaceId = useSetSelectedWorkspaceId()

  // Demo mode: use store session
  const demoActiveSession = useActiveSession()

  // Real mode: fetch sessions from Convex
  const companySessions = useQuery(
    api.sessions.listByCompany,
    !isDemo && selectedCompanyId ? { companyId: selectedCompanyId as Id<"companies"> } : 'skip'
  )

  // Determine session ID: URL param > most recent session (real mode) > demo session
  const sessionId = useMemo(() => {
    if (isDemo) {
      return demoActiveSession?.id as Id<'reconciliationSessions'> | undefined
    }
    if (urlSessionId) {
      return urlSessionId as Id<'reconciliationSessions'>
    }
    if (companySessions && companySessions.length > 0) {
      return companySessions[0]._id
    }
    return undefined
  }, [isDemo, urlSessionId, companySessions, demoActiveSession])

  // Get session name for display
  const sessionName = useMemo(() => {
    if (isDemo) {
      return demoActiveSession?.name
    }
    if (companySessions && sessionId) {
      const session = companySessions.find(s => s._id === sessionId)
      return session?.name
    }
    return undefined
  }, [isDemo, sessionId, companySessions, demoActiveSession])

  const {
    matches,
    suspenseTransactions,
    isLoading,
    isDemo: reconcileIsDemo,
    counts,
  } = useReconcileData(sessionId)

  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  // Transform data to spreadsheet format
  const spreadsheetData = useMemo(
    () => transformToSpreadsheetData(matches || [], suspenseTransactions || []),
    [matches, suspenseTransactions]
  )

  /**
   * Sanitize filename for safe download
   * Removes special characters and limits length
   */
  const sanitizeFilename = useCallback((name: string): string => {
    return name
      .replace(/[^a-z0-9\-_]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100) || 'reconciliation'
  }, [])

  // Handle export to Excel
  const handleExport = async () => {
    setExportLoading(true)
    setExportError(null)

    try {
      const filename = sessionName
        ? `${sanitizeFilename(sessionName)}_reconciliation.xlsx`
        : 'reconciliation_report.xlsx'

      await downloadReconciliationReport(spreadsheetData, filename)
    } catch (error) {
      console.error('Export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  // Handle retry after error - uses key-based remount instead of page reload
  const handleRetry = useCallback(() => {
    setRetryKey(prev => prev + 1)
  }, [])

  // Determine if we have any data to display
  const hasData = (matches?.length ?? 0) > 0 || (suspenseTransactions?.length ?? 0) > 0

  // Loading state - only show when we have a session and data is loading
  if (sessionId && isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex-1 p-4">
          <UniverSheetLoading height="calc(100vh - 240px)" />
        </div>
      </div>
    )
  }

  // Create reconciliation plugin for styling (memoized)
  // IMPORTANT: Plugin is recreated when hasData changes to ensure proper initialization
  // The GenericSheet component expects plugins to be stable references (memoized)
  const reconciliationPlugin = useMemo(
    () => hasData ? createReconciliationPlugin() : undefined,
    [hasData]
  )

  // Ref for programmatic spreadsheet control
  const spreadsheetApiRef = useRef<SpreadsheetAPI | null>(null)

  // Convert reconciliation data to generic format for GenericSheet
  const genericSheetData = useMemo(() => {
    if (!spreadsheetData.transactions.length && !spreadsheetData.invoices.length) {
      return undefined // Use default blank sheet
    }

    // For now, show transactions only - can be switched via tabs
    const transactions = spreadsheetData.transactions
    return {
      columns: [
        { id: 'col_0', key: 'col_0', name: 'Date', type: 'date' as const, width: 100, editable: true, order: 0 },
        { id: 'col_1', key: 'col_1', name: 'Description', type: 'text' as const, width: 250, editable: true, order: 1 },
        { id: 'col_2', key: 'col_2', name: 'Amount', type: 'currency' as const, width: 120, editable: true, order: 2 },
        { id: 'col_3', key: 'col_3', name: 'Reference', type: 'text' as const, width: 120, editable: true, order: 3 },
        { id: 'col_4', key: 'col_4', name: 'Status', type: 'text' as const, width: 100, editable: false, order: 4 },
        { id: 'col_5', key: 'col_5', name: 'Confidence', type: 'percentage' as const, width: 100, editable: false, order: 5 },
      ],
      rows: transactions.map(txn => ({
        col_0: txn.date,
        col_1: txn.description,
        col_2: txn.amount,
        col_3: txn.reference || '',
        col_4: txn.matchStatus,
        col_5: txn.matchConfidence,
      })),
    }
  }, [spreadsheetData])

  // Use GenericSheet when feature flag is enabled (new Excel-like mode)
  if (USE_GENERIC_SHEET) {
    return (
      <div className="flex flex-col h-full">
        <SpreadsheetToolbar
          hasData={hasData}
          matchedCount={counts.approved + counts.pending}
          unmatchedCount={counts.suspense}
          isDemo={reconcileIsDemo}
          isUnifiedSheet
          exportLoading={exportLoading}
          exportError={exportError}
          onExport={handleExport}
          workspaceSelector={{
            companyId: selectedCompanyId as Id<'companies'> | null,
            workosUserId,
            selectedWorkspaceId,
            onSelect: setSelectedWorkspaceId,
          }}
        />

        {/* GenericSheet - Excel-like spreadsheet with dynamic columns */}
        <div className="flex-1 overflow-hidden p-4">
          <GenericSheet
            ref={spreadsheetApiRef}
            key={`spreadsheet-${retryKey}`}
            localData={genericSheetData}
            readOnly={reconcileIsDemo}
            allowColumnOps={!reconcileIsDemo}
            allowRowOps={!reconcileIsDemo}
            enableFormulas
            showFormulaBar={!reconcileIsDemo}
            showToolbar={!reconcileIsDemo}
            showSheetTabs
            height="calc(100vh - 280px)"
            plugins={reconciliationPlugin ? [reconciliationPlugin] : []}
            className="shadow-sm"
          />
        </div>

        <SpreadsheetFooter />
      </div>
    )
  }

  // Use UnifiedSheet when feature flag is enabled
  if (USE_UNIFIED_SHEET) {
    return (
      <div className="flex flex-col h-full">
        <SpreadsheetToolbar
          hasData={hasData}
          matchedCount={counts.approved + counts.pending}
          unmatchedCount={counts.suspense}
          isDemo={reconcileIsDemo}
          isUnifiedSheet
          exportLoading={exportLoading}
          exportError={exportError}
          onExport={handleExport}
          workspaceSelector={{
            companyId: selectedCompanyId as Id<'companies'> | null,
            workosUserId,
            selectedWorkspaceId,
            onSelect: setSelectedWorkspaceId,
          }}
        />

        {/* UnifiedSheet with full features */}
        <div className="flex-1 overflow-hidden">
          <UnifiedSheet
            key={`spreadsheet-${retryKey}`}
            data={spreadsheetData}
            workspaceId={selectedWorkspaceId}
            companyId={selectedCompanyId as Id<'companies'> | null}
            workosUserId={workosUserId ?? undefined}
            readOnly={reconcileIsDemo} // Read-only in demo mode
            showToolbar={!reconcileIsDemo} // Show toolbar in real mode
            height="calc(100vh - 300px)"
            className="h-full"
          />
        </div>

        <SpreadsheetFooter />
      </div>
    )
  }

  // Legacy: Use original UniverSheet directly
  return (
    <div className="flex flex-col h-full">
      <SpreadsheetToolbar
        hasData={hasData}
        matchedCount={counts.approved + counts.pending}
        unmatchedCount={counts.suspense}
        isDemo={reconcileIsDemo}
        exportLoading={exportLoading}
        exportError={exportError}
        onExport={handleExport}
      />

      {/* Spreadsheet */}
      <div className="flex-1 p-4 overflow-hidden">
        <UniverSheet
          key={`spreadsheet-${retryKey}`}
          data={spreadsheetData}
          height="calc(100vh - 240px)"
          className="shadow-sm"
        />
      </div>

      <SpreadsheetFooter />
    </div>
  )
}
