'use client'

/**
 * React hook for Convex spreadsheet synchronization
 *
 * Connects the Univer spreadsheet to Convex for real-time persistence.
 * Handles:
 * - Debounced cell updates
 * - Optimistic concurrency control
 * - Unsaved changes warnings
 *
 * @module components/unified-sheet/hooks/use-convex-sync
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { CellChangeEvent } from '@/components/spreadsheet/use-univer-api'
import {
  ConvexSyncAdapter,
  createSyncAdapter,
  type SyncConfig,
  type SyncStatus,
} from '../sync/convex-sync-adapter'

interface UseConvexSyncOptions {
  /** Worksheet ID to sync with */
  worksheetId: Id<'worksheets'> | null
  /** WorkOS user ID for authentication */
  workosUserId?: string
  /** Sync configuration overrides */
  config?: Partial<SyncConfig>
  /** Callback when sync status changes */
  onStatusChange?: (status: SyncStatus) => void
  /** Enable beforeunload warning for unsaved changes */
  warnOnUnsavedChanges?: boolean
}

interface UseConvexSyncResult {
  /** Handle a cell change from Univer */
  handleCellChange: (event: CellChangeEvent) => void
  /** Force save all pending changes */
  forceSave: () => Promise<void>
  /** Current sync status */
  status: SyncStatus
  /** Number of pending changes */
  pendingCount: number
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Last error message */
  lastError?: string
  /** Whether the adapter is ready */
  isReady: boolean
}

/**
 * Hook to sync Univer spreadsheet changes to Convex
 */
export function useConvexSync({
  worksheetId,
  workosUserId,
  config,
  onStatusChange,
  warnOnUnsavedChanges = true,
}: UseConvexSyncOptions): UseConvexSyncResult {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [lastError, setLastError] = useState<string>()
  const [isReady, setIsReady] = useState(false)

  const adapterRef = useRef<ConvexSyncAdapter | null>(null)

  // Convex mutations
  const updateCell = useMutation(api.workspaces.updateCell)

  // Get worksheet data for row ID lookup
  const worksheetData = useQuery(
    api.workspaces.getWorksheetData,
    worksheetId ? { worksheetId, workosUserId } : 'skip'
  )

  // Create a map of rowNumber -> rowId for quick lookup
  const rowIdMap = useRef<Map<number, Id<'worksheetRows'>>>(new Map())

  // Update row ID map when worksheet data changes
  useEffect(() => {
    if (worksheetData?.rows) {
      rowIdMap.current.clear()
      for (const row of worksheetData.rows) {
        rowIdMap.current.set(row.rowNumber, row._id)
      }

      // Also update version tracking in the adapter
      if (adapterRef.current) {
        for (const row of worksheetData.rows) {
          if (row.version !== undefined) {
            adapterRef.current.setRowVersion(row._id, row.version)
          }
        }
      }
    }
  }, [worksheetData?.rows])

  // Initialize adapter - create new instance per worksheet
  useEffect(() => {
    // Don't initialize if no worksheet ID
    if (!worksheetId) {
      setIsReady(false)
      return
    }

    // Create a new adapter for this worksheet
    const adapter = createSyncAdapter(config)
    adapterRef.current = adapter

    // Save cell function
    const saveCellFn = async (
      _worksheetId: string,
      rowNumber: number,
      columnKey: string,
      value: unknown,
      expectedVersion?: number
    ): Promise<{ version?: number; error?: string }> => {
      if (!worksheetId) {
        return { error: 'No worksheet ID' }
      }

      const rowId = rowIdMap.current.get(rowNumber)
      if (!rowId) {
        return { error: 'Row not found' }
      }

      try {
        const result = await updateCell({
          rowId,
          columnKey,
          value,
          workosUserId,
          expectedVersion,
        })
        return { version: result?.version }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { error: message }
      }
    }

    // Get row ID function
    const getRowIdFn = async (
      _worksheetId: string,
      rowNumber: number
    ): Promise<string | null> => {
      const rowId = rowIdMap.current.get(rowNumber)
      return rowId ?? null
    }

    adapter.initialize(saveCellFn, getRowIdFn)

    // Add status listener
    const unsubscribe = adapter.addListener((event) => {
      setStatus(event.status)
      setPendingCount(event.pendingCount)
      setLastError(event.lastError)
      onStatusChange?.(event.status)
    })

    setIsReady(true)

    // Cleanup: dispose adapter when worksheet changes or component unmounts
    return () => {
      unsubscribe()
      adapter.dispose()
      adapterRef.current = null
    }
  }, [worksheetId, workosUserId, config, updateCell, onStatusChange])

  // Handle cell change
  const handleCellChange = useCallback((event: CellChangeEvent) => {
    if (adapterRef.current) {
      adapterRef.current.handleCellChange(event)
    }
  }, [])

  // Force save
  const forceSave = useCallback(async () => {
    if (adapterRef.current) {
      await adapterRef.current.forceSave()
    }
  }, [])

  // Warn on unsaved changes
  useEffect(() => {
    if (!warnOnUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (adapterRef.current?.hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [warnOnUnsavedChanges])

  // Force save on blur (when user switches tabs/windows)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && adapterRef.current?.hasUnsavedChanges()) {
        adapterRef.current.forceSave()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    handleCellChange,
    forceSave,
    status,
    pendingCount,
    hasUnsavedChanges: adapterRef.current?.hasUnsavedChanges() ?? false,
    lastError,
    isReady,
  }
}
