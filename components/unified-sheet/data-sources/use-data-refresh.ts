/**
 * Use Data Refresh Hook
 *
 * Hook for refreshing worksheet data from linked sources.
 *
 * @module components/unified-sheet/data-sources/use-data-refresh
 */

'use client'

import { useCallback, useState, useMemo, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  fetchReconciliationData,
  reconciliationRowsToCells,
  RECONCILIATION_COLUMNS,
} from './reconciliation-source'
import type { ReconciliationSourceConfig } from './types'

/**
 * Options for useDataRefresh hook
 */
interface UseDataRefreshOptions {
  /** WorkOS user ID for authentication */
  workosUserId?: string
}

/**
 * Hook for refreshing worksheet data from linked sources
 */
export function useDataRefresh(
  worksheetId: Id<'worksheets'> | undefined,
  options?: UseDataRefreshOptions
) {
  const { workosUserId } = options ?? {}
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshError, setLastRefreshError] = useState<string | null>(null)

  // Get the data source for this worksheet
  const dataSource = useQuery(
    api.worksheetDataSources.getByWorksheet,
    worksheetId ? { worksheetId, workosUserId } : 'skip'
  )

  // Get session if this is a reconciliation source
  const sessionId = useMemo(() => {
    if (dataSource?.sourceType === 'reconciliation') {
      const config = dataSource.sourceConfig as ReconciliationSourceConfig
      return config.sessionId
    }
    return undefined
  }, [dataSource])

  const session = useQuery(
    api.sessions.get,
    sessionId ? { id: sessionId, workosUserId } : 'skip'
  )

  const matches = useQuery(
    api.matches.listBySession,
    sessionId ? { sessionId, workosUserId } : 'skip'
  )

  const suspenseItems = useQuery(
    api.suspenseItems.listBySession,
    sessionId ? { sessionId, workosUserId } : 'skip'
  )

  // Mutations
  const updateRows = useMutation(api.workspaces.updateRows)
  const updateRefreshTimestamp = useMutation(api.worksheetDataSources.updateRefreshTimestamp)

  // Last refreshed time
  const lastRefreshed = useMemo(() => {
    if (!dataSource?.lastRefreshedAt) return null
    return new Date(dataSource.lastRefreshedAt)
  }, [dataSource])

  // Check if source has data
  const hasDataSource = dataSource !== undefined && dataSource !== null
  const sourceType = dataSource?.sourceType ?? 'manual'

  /**
   * Refresh reconciliation data
   */
  const refreshReconciliation = useCallback(async () => {
    if (!worksheetId || !dataSource || !sessionId || !session) {
      throw new Error('Missing required data for refresh')
    }

    const config = dataSource.sourceConfig as ReconciliationSourceConfig

    // Fetch fresh data
    const reconData = fetchReconciliationData(
      config,
      matches ?? undefined,
      suspenseItems ?? undefined,
      { name: session.name, status: session.status }
    )

    if (!reconData) {
      throw new Error('Failed to fetch reconciliation data')
    }

    // Convert to cell format
    const cellRows = reconciliationRowsToCells(reconData.rows, reconData.columns)

    // Update only linked columns in existing rows
    const linkedColumns = dataSource.linkedColumns

    // Build update payload - only update linked columns
    const updates = cellRows.map((cells, rowIndex) => {
      const linkedCells: Record<string, unknown> = {}

      linkedColumns.forEach((colIndex: number) => {
        const key = `col_${colIndex}`
        if (key in cells) {
          linkedCells[key] = cells[key]
        }
      })

      return {
        rowNumber: rowIndex,
        cells: linkedCells,
      }
    })

    // Apply updates
    await updateRows({ worksheetId, rows: updates, workosUserId })

    // Update refresh timestamp
    await updateRefreshTimestamp({ id: dataSource._id, workosUserId })

    return {
      rowsUpdated: updates.length,
      totalMatches: reconData.totalMatches,
      totalSuspense: reconData.totalSuspense,
    }
  }, [
    worksheetId,
    dataSource,
    sessionId,
    session,
    matches,
    suspenseItems,
    updateRows,
    updateRefreshTimestamp,
    workosUserId,
  ])

  /**
   * Main refresh function
   */
  const refresh = useCallback(async () => {
    if (!worksheetId || !hasDataSource) {
      throw new Error('No data source to refresh')
    }

    setIsRefreshing(true)
    setLastRefreshError(null)

    try {
      switch (sourceType) {
        case 'reconciliation':
          return await refreshReconciliation()
        case 'csv_import':
          // CSV imports don't refresh (static data)
          throw new Error('CSV imports cannot be refreshed')
        case 'manual':
          // Manual sources have nothing to refresh
          throw new Error('Manual sources have no external data to refresh')
        default:
          throw new Error(`Unknown source type: ${sourceType}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refresh failed'
      setLastRefreshError(message)
      throw error
    } finally {
      setIsRefreshing(false)
    }
  }, [worksheetId, hasDataSource, sourceType, refreshReconciliation])

  // Auto-refresh effect
  useEffect(() => {
    if (!dataSource?.refreshInterval || isRefreshing) return

    const interval = setInterval(() => {
      refresh().catch(console.error)
    }, dataSource.refreshInterval)

    return () => clearInterval(interval)
  }, [dataSource?.refreshInterval, isRefreshing, refresh])

  return {
    /** Whether a refresh is in progress */
    isRefreshing,
    /** Last refresh timestamp */
    lastRefreshed,
    /** Error from last refresh attempt */
    lastRefreshError,
    /** Whether the worksheet has a data source */
    hasDataSource,
    /** The type of data source */
    sourceType,
    /** Whether the source can be refreshed */
    canRefresh: hasDataSource && sourceType === 'reconciliation',
    /** Linked column indices (read-only) */
    linkedColumns: dataSource?.linkedColumns ?? [],
    /** Refresh data from source */
    refresh,
  }
}
