'use client'

/**
 * Unified Sheet Component
 *
 * Full-featured spreadsheet with Convex persistence and AI integration.
 * Combines Univer.js editing capabilities with real-time sync.
 *
 * @module components/unified-sheet/unified-sheet
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { cn } from '@/lib/cn'
import { useUniverAPI, type CellChangeEvent } from '@/components/spreadsheet/use-univer-api'
import { UniverSheetSafe as UniverSheet } from '@/components/spreadsheet/univer-sheet-dynamic'
import type { ReconciliationSheetData } from '@/components/spreadsheet/types'
import type { Id } from '@/convex/_generated/dataModel'
import { useConvexSync } from './hooks/use-convex-sync'
import { useDataRefresh } from './data-sources/use-data-refresh'
import { ImportDialog } from './data-sources/import-dialog'
import type { SyncConfig, SyncStatus } from './sync/convex-sync-adapter'
import { PremiumButton as Button } from '@/components/brand/premium-button'
import { useToastHelpers } from '@/components/ui/toast'
import { Import, RefreshCw, Link2, Unlink2, Palette, BarChart3 } from 'lucide-react'
import { ConditionalRulesPanel, FormatToolbarButton, useConditionalFormatting } from './formatting'
import { ChartPanel, useCharts } from './charts'
import { TRANSACTION_COLUMNS } from '@/components/spreadsheet/constants'

/**
 * Default columns for formatting (derived from spreadsheet columns)
 */
const defaultColumns = TRANSACTION_COLUMNS.map((col, index) => ({
  index,
  name: col.header,
}))

/**
 * Props for the UnifiedSheet component
 */
export interface UnifiedSheetProps {
  /** Worksheet ID for Convex persistence */
  worksheetId?: Id<'worksheets'> | null
  /** Workspace ID (required for import dialog) */
  workspaceId?: Id<'workspaces'> | null
  /** Company ID (required for import dialog) */
  companyId?: Id<'companies'> | null
  /** WorkOS user ID for authentication */
  workosUserId?: string
  /** Initial data to populate the sheet */
  data?: ReconciliationSheetData
  /** Whether the sheet is read-only */
  readOnly?: boolean
  /** Show toolbar with import/refresh buttons */
  showToolbar?: boolean
  /** CSS class name */
  className?: string
  /** Height of the sheet container */
  height?: string | number
  /** Sync configuration overrides */
  syncConfig?: Partial<SyncConfig>
  /** Callback when sync status changes */
  onSyncStatusChange?: (status: SyncStatus) => void
  /** Callback when cell value changes (before sync) */
  onCellChange?: (event: CellChangeEvent) => void
  /** Callback when a new worksheet is created from import */
  onWorksheetCreated?: (worksheetId: Id<'worksheets'>) => void
}

/**
 * Sync Status Indicator
 */
function SyncStatusIndicator({
  status,
  pendingCount,
}: {
  status: SyncStatus
  pendingCount: number
}) {
  if (status === 'idle' && pendingCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-background/80 backdrop-blur-sm border border-border">
      {status === 'syncing' && (
        <>
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-muted-foreground">Saving{pendingCount > 1 ? ` (${pendingCount})` : ''}...</span>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-red-500">Sync error</span>
        </>
      )}
      {status === 'idle' && pendingCount > 0 && (
        <>
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Pending changes ({pendingCount})</span>
        </>
      )}
    </div>
  )
}

/**
 * Toolbar for spreadsheet actions
 */
function SpreadsheetToolbar({
  worksheetId,
  workspaceId,
  companyId,
  workosUserId,
  showImport,
  onWorksheetCreated,
  onRefresh,
  isRefreshing,
  canRefresh,
  hasDataSource,
  sourceType,
  lastRefreshed,
  syncStatus,
  pendingCount,
  columns,
  getColumnData,
}: {
  worksheetId?: Id<'worksheets'> | null
  workspaceId?: Id<'workspaces'> | null
  companyId?: Id<'companies'> | null
  workosUserId?: string
  showImport: boolean
  onWorksheetCreated?: (worksheetId: Id<'worksheets'>) => void
  onRefresh: () => void
  isRefreshing: boolean
  canRefresh: boolean
  hasDataSource: boolean
  sourceType: string
  lastRefreshed: Date | null
  syncStatus: SyncStatus
  pendingCount: number
  columns: Array<{ index: number; name: string }>
  /** Function to get data from spreadsheet by column index */
  getColumnData: (columnIndex: number) => (string | number)[]
}) {
  const [importOpen, setImportOpen] = useState(false)
  const [formatPanelOpen, setFormatPanelOpen] = useState(false)
  const [chartPanelOpen, setChartPanelOpen] = useState(false)

  // Get formatting rules count for indicator
  // Hooks are called unconditionally but skip queries internally when IDs are missing
  const { rules } = useConditionalFormatting({
    worksheetId: worksheetId as Id<'worksheets'>,
    workosUserId: workosUserId ?? '',
  })

  // Get charts count for indicator
  const { charts } = useCharts({
    worksheetId: worksheetId as Id<'worksheets'>,
    workosUserId: workosUserId ?? '',
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Import Button */}
          {showImport && workspaceId && companyId && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setImportOpen(true)}
                icon={<Import className="h-4 w-4" />}
              >
                Import Data
              </Button>
              <ImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                workspaceId={workspaceId}
                companyId={companyId}
                workosUserId={workosUserId}
                onImportComplete={(id) => {
                  onWorksheetCreated?.(id)
                  setImportOpen(false)
                }}
              />
            </>
          )}

          {/* Refresh Button */}
          {worksheetId && canRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              loading={isRefreshing}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          )}

          {/* Format Button */}
          {worksheetId && workosUserId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFormatPanelOpen(true)}
              icon={<Palette className="h-4 w-4" />}
              className={cn(rules.length > 0 && 'ring-1 ring-blue-300')}
            >
              Format
              {rules.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full">
                  {rules.length}
                </span>
              )}
            </Button>
          )}

          {/* Charts Button */}
          {worksheetId && workosUserId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChartPanelOpen(true)}
              icon={<BarChart3 className="h-4 w-4" />}
              className={cn(charts.length > 0 && 'ring-1 ring-green-300')}
            >
              Charts
              {charts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full">
                  {charts.length}
                </span>
              )}
            </Button>
          )}

          {/* Data Source Indicator */}
          {worksheetId && hasDataSource && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>Linked to {sourceType}</span>
              {lastRefreshed && (
                <span className="text-muted-foreground/60">
                  (last: {lastRefreshed.toLocaleTimeString()})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side - sync status */}
        <div className="flex items-center gap-2">
          <SyncStatusIndicator status={syncStatus} pendingCount={pendingCount} />
        </div>
      </div>

      {/* Conditional Formatting Panel */}
      {worksheetId && workosUserId && (
        <ConditionalRulesPanel
          worksheetId={worksheetId}
          workosUserId={workosUserId}
          open={formatPanelOpen}
          onOpenChange={setFormatPanelOpen}
          columns={columns}
        />
      )}

      {/* Charts Panel */}
      {worksheetId && workosUserId && (
        <ChartPanel
          worksheetId={worksheetId}
          workosUserId={workosUserId}
          open={chartPanelOpen}
          onOpenChange={setChartPanelOpen}
          columns={columns}
          getColumnData={getColumnData}
        />
      )}
    </>
  )
}

/**
 * UnifiedSheet - Full-featured spreadsheet with persistence
 *
 * Features:
 * - Full cell editing
 * - Real-time Convex sync
 * - Optimistic concurrency control
 * - Unsaved changes warning
 * - Status indicators
 * - Data import from reconciliation
 * - Linked data refresh
 */
export function UnifiedSheet({
  worksheetId = null,
  workspaceId = null,
  companyId = null,
  workosUserId,
  data,
  readOnly = false,
  showToolbar = false,
  className,
  height = '600px',
  syncConfig,
  onSyncStatusChange,
  onCellChange,
  onWorksheetCreated,
}: UnifiedSheetProps) {
  const [showSyncStatus, setShowSyncStatus] = useState(true)

  // Toast for user feedback
  const toast = useToastHelpers()

  // Track last toast time to debounce rapid edit attempts on linked columns
  const lastLinkedColumnToastRef = useRef<number>(0)

  // Get Univer API hook for subscribing to cell changes
  const univerAPI = useUniverAPI()

  // Initialize Convex sync
  const {
    handleCellChange: syncCellChange,
    status: syncStatus,
    pendingCount,
    isReady: syncReady,
  } = useConvexSync({
    worksheetId,
    workosUserId,
    config: syncConfig,
    onStatusChange: onSyncStatusChange,
    warnOnUnsavedChanges: !readOnly,
  })

  // Initialize data refresh hook
  const {
    refresh,
    isRefreshing,
    canRefresh,
    hasDataSource,
    sourceType,
    lastRefreshed,
    linkedColumns,
  } = useDataRefresh(worksheetId ?? undefined, { workosUserId })

  // Combined cell change handler
  const handleCellChange = useCallback((event: CellChangeEvent) => {
    // Block edits on linked columns if data source exists
    if (hasDataSource && linkedColumns.includes(event.column)) {
      // Debounce toast to avoid spamming on rapid edit attempts
      const now = Date.now()
      if (now - lastLinkedColumnToastRef.current > 2000) {
        lastLinkedColumnToastRef.current = now
        toast.warning(
          'Column is read-only',
          `This column is linked to ${sourceType} data. Use the Refresh button to update or unlink the data source to edit.`
        )
      }
      return
    }

    // Notify parent
    onCellChange?.(event)

    // Sync to Convex if not read-only and we have a worksheet ID
    if (!readOnly && worksheetId) {
      syncCellChange(event)
    }
  }, [readOnly, worksheetId, syncCellChange, onCellChange, hasDataSource, linkedColumns, sourceType, toast])

  // Subscribe to Univer cell changes (delayed to ensure full initialization)
  useEffect(() => {
    if (!univerAPI.isReady || readOnly) return

    let unsubscribe: (() => void) | null = null

    // Delay subscription to ensure Univer is fully initialized
    const timeoutId = setTimeout(() => {
      try {
        unsubscribe = univerAPI.onCellChange(handleCellChange)
      } catch {
        // Silently ignore subscription errors
      }
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [univerAPI.isReady, univerAPI.onCellChange, handleCellChange, readOnly])

  // Hide sync status after idle for 3 seconds
  useEffect(() => {
    if (syncStatus === 'idle' && pendingCount === 0) {
      const timer = setTimeout(() => {
        setShowSyncStatus(false)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setShowSyncStatus(true)
    }
  }, [syncStatus, pendingCount])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refresh()
    } catch (error) {
      console.error('Refresh failed:', error)
    }
  }, [refresh])

  // Get column data from spreadsheet for charts
  // This extracts data from the provided data prop
  const getColumnData = useCallback((columnIndex: number): (string | number)[] => {
    if (!data?.transactions) return []

    // Map column index to data field based on TRANSACTION_COLUMNS order
    type TxField = keyof typeof data.transactions[0]
    const columnMap: Record<number, TxField> = {
      0: 'date',
      1: 'description',
      2: 'amount',
      3: 'reference',
      4: 'matchStatus',
      5: 'matchConfidence',
    }

    const field = columnMap[columnIndex]
    if (!field) return []

    return data.transactions.map((tx) => {
      const value = tx[field]
      if (value === undefined || value === null) return ''
      return typeof value === 'number' ? value : String(value)
    })
  }, [data])

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <SpreadsheetToolbar
          worksheetId={worksheetId}
          workspaceId={workspaceId}
          companyId={companyId}
          workosUserId={workosUserId}
          showImport={!readOnly}
          onWorksheetCreated={onWorksheetCreated}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          canRefresh={canRefresh}
          hasDataSource={hasDataSource}
          sourceType={sourceType}
          lastRefreshed={lastRefreshed}
          syncStatus={syncStatus}
          pendingCount={pendingCount}
          columns={defaultColumns}
          getColumnData={getColumnData}
        />
      )}

      {/* Univer Sheet */}
      <div className="relative flex-1">
        <UniverSheet
          data={data}
          readOnly={readOnly}
          height={height}
        />
      </div>
    </div>
  )
}

/**
 * Read-only wrapper for UnifiedSheet
 */
export function UnifiedSheetReadOnly(
  props: Omit<UnifiedSheetProps, 'readOnly' | 'worksheetId' | 'workosUserId' | 'syncConfig'>
) {
  return <UnifiedSheet {...props} readOnly />
}
