/**
 * Use Import Reconciliation Hook
 *
 * Hook for importing reconciliation data into a worksheet.
 *
 * @module components/unified-sheet/data-sources/use-import-reconciliation
 */

'use client'

import { useCallback, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  fetchReconciliationData,
  getReconciliationLinkedColumns,
  reconciliationRowsToCells,
  RECONCILIATION_COLUMNS,
} from './reconciliation-source'
import type { ReconciliationSourceConfig } from './types'

/**
 * Options for useImportReconciliation hook
 */
interface UseImportReconciliationOptions {
  /** WorkOS user ID for authentication (required for mutations) */
  workosUserId?: string
  /** Additional configuration options */
  config?: Partial<Omit<ReconciliationSourceConfig, 'sessionId'>>
}

/**
 * Hook for importing reconciliation data into a worksheet
 */
export function useImportReconciliation(
  sessionId: Id<'reconciliationSessions'> | undefined,
  options?: UseImportReconciliationOptions
) {
  const { workosUserId, config } = options ?? {}

  // Query session data
  const session = useQuery(
    api.sessions.get,
    sessionId ? { id: sessionId, workosUserId } : 'skip'
  )

  // Query matches
  const matches = useQuery(
    api.matches.listBySession,
    sessionId ? { sessionId, status: config?.matchStatusFilter, workosUserId } : 'skip'
  )

  // Query suspense items
  const suspenseItems = useQuery(
    api.suspenseItems.listBySession,
    sessionId ? { sessionId, status: config?.suspenseStatusFilter, workosUserId } : 'skip'
  )

  // Mutations for creating worksheet data
  const createDataSource = useMutation(api.worksheetDataSources.create)
  const createWorksheetMutation = useMutation(api.workspaces.createWorksheet)
  const createRowsMutation = useMutation(api.workspaces.createRows)
  const createColumnsMutation = useMutation(api.workspaces.createColumns)

  // Transform data
  const reconData = useMemo(() => {
    if (!sessionId || !session) return null

    const fullConfig: ReconciliationSourceConfig = {
      sessionId,
      includeMatches: config?.includeMatches ?? true,
      includeSuspense: config?.includeSuspense ?? true,
      matchStatusFilter: config?.matchStatusFilter,
      suspenseStatusFilter: config?.suspenseStatusFilter,
    }

    return fetchReconciliationData(
      fullConfig,
      matches ?? undefined,
      suspenseItems ?? undefined,
      session ? { name: session.name, status: session.status } : undefined
    )
  }, [sessionId, session, matches, suspenseItems, config])

  // Check if data is loading
  const isLoading = session === undefined || matches === undefined || suspenseItems === undefined

  /**
   * Import reconciliation data into a new worksheet
   */
  const importToNewWorksheet = useCallback(
    async (workspaceId: Id<'workspaces'>, worksheetName?: string) => {
      if (!sessionId || !reconData || !session) {
        throw new Error('No session data to import')
      }

      // Create new worksheet
      const worksheetId = await createWorksheetMutation({
        workspaceId,
        name: worksheetName ?? `Recon - ${session.name}`,
        workosUserId,
      })

      // Create columns
      await createColumnsMutation({
        worksheetId,
        columns: RECONCILIATION_COLUMNS.map((col, index) => ({
          name: col.name,
          order: index,
          columnType: 'text' as const,
          width: col.width,
        })),
        workosUserId,
      })

      // Convert rows to cells format
      const cellRows = reconciliationRowsToCells(reconData.rows, reconData.columns)

      // Create rows
      if (cellRows.length > 0) {
        await createRowsMutation({
          worksheetId,
          rows: cellRows.map((cells, index) => ({
            rowNumber: index,
            cells,
          })),
          workosUserId,
        })
      }

      // Create data source link
      await createDataSource({
        worksheetId,
        sourceType: 'reconciliation',
        sourceConfig: {
          sessionId,
          includeMatches: config?.includeMatches ?? true,
          includeSuspense: config?.includeSuspense ?? true,
          matchStatusFilter: config?.matchStatusFilter,
          suspenseStatusFilter: config?.suspenseStatusFilter,
        },
        linkedColumns: getReconciliationLinkedColumns(),
        readonly: true,
        workosUserId,
      })

      return {
        worksheetId,
        rowCount: cellRows.length,
        columnCount: RECONCILIATION_COLUMNS.length,
      }
    },
    [
      sessionId,
      reconData,
      session,
      config,
      workosUserId,
      createWorksheetMutation,
      createColumnsMutation,
      createRowsMutation,
      createDataSource,
    ]
  )

  return {
    /** Transformed reconciliation data ready for display */
    data: reconData,
    /** Whether data is still loading */
    isLoading,
    /** Total number of matches */
    totalMatches: reconData?.totalMatches ?? 0,
    /** Total number of suspense items */
    totalSuspense: reconData?.totalSuspense ?? 0,
    /** Session name */
    sessionName: reconData?.sessionName ?? '',
    /** Session status */
    sessionStatus: reconData?.sessionStatus ?? '',
    /** Import data into a new worksheet */
    importToNewWorksheet,
    /** Column definitions */
    columns: RECONCILIATION_COLUMNS,
  }
}
