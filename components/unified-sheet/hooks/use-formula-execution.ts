'use client'

/**
 * React hook for formula execution with Convex integration
 *
 * Connects custom formulas (like =ENRICH) to the Convex agent job system.
 * Handles:
 * - Formula parsing and validation
 * - Agent job creation
 * - Status tracking and updates
 *
 * @module components/unified-sheet/hooks/use-formula-execution
 */

import { useCallback, useRef, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  FormulaRegistry,
  getFormulaRegistry,
  isCustomFormula,
  FORMULA_PLACEHOLDERS,
  type FormulaContext,
  type FormulaResult,
} from '../formulas/formula-registry'

interface UseFormulaExecutionOptions {
  /** Worksheet ID */
  worksheetId: Id<'worksheets'> | null
  /** User ID */
  userId: Id<'users'> | null
  /** Callback when formula execution starts */
  onExecutionStart?: (row: number, col: number) => void
  /** Callback when formula execution completes */
  onExecutionComplete?: (row: number, col: number, result: FormulaResult) => void
  /** Callback when formula execution fails */
  onExecutionError?: (row: number, col: number, error: string) => void
}

interface UseFormulaExecutionResult {
  /** Execute a formula at a specific cell */
  executeFormula: (
    formula: string,
    row: number,
    col: number,
    rowId?: Id<'worksheetRows'>,
    columnId?: Id<'worksheetColumns'>,
    getCellValue?: (ref: string) => unknown
  ) => Promise<FormulaResult>
  /** Check if a string is a custom formula */
  isCustomFormula: (formula: string) => boolean
  /** Get the formula registry */
  registry: FormulaRegistry
  /** Job stats for the worksheet */
  jobStats: {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
  } | null
}

/**
 * Hook for executing custom formulas with Convex backend
 */
export function useFormulaExecution({
  worksheetId,
  userId,
  onExecutionStart,
  onExecutionComplete,
  onExecutionError,
}: UseFormulaExecutionOptions): UseFormulaExecutionResult {
  const registry = useMemo(() => getFormulaRegistry(), [])

  // Convex mutations
  const createJob = useMutation(api.agents.createJob)

  // Job stats query
  const jobStats = useQuery(
    api.agents.getJobStats,
    worksheetId ? { worksheetId } : 'skip'
  )

  // Track pending executions
  const pendingExecutionsRef = useRef<Map<string, Promise<FormulaResult>>>(new Map())

  /**
   * Execute a custom formula
   */
  const executeFormula = useCallback(async (
    formula: string,
    row: number,
    col: number,
    rowId?: Id<'worksheetRows'>,
    columnId?: Id<'worksheetColumns'>,
    getCellValue?: (ref: string) => unknown
  ): Promise<FormulaResult> => {
    // Check if it's a custom formula
    if (!isCustomFormula(formula)) {
      return {
        value: formula,
        status: 'error',
        error: 'Not a custom formula',
      }
    }

    // Check prerequisites
    if (!worksheetId) {
      return {
        value: '#ERROR!',
        status: 'error',
        error: 'No worksheet ID',
      }
    }

    if (!userId) {
      return {
        value: '#ERROR!',
        status: 'error',
        error: 'Not authenticated',
      }
    }

    // Create unique key for this execution
    const key = `${row}:${col}:${formula}`

    // Check for existing pending execution
    const existing = pendingExecutionsRef.current.get(key)
    if (existing) {
      return existing
    }

    // Notify execution start
    onExecutionStart?.(row, col)

    // Create job context
    const context: FormulaContext = {
      worksheetId,
      rowNumber: row,
      columnNumber: col,
      rowId,
      columnId,
      userId,
      getCellValue,
      createJob: async (params) => {
        if (!rowId || !columnId) {
          throw new Error('Row or column ID required for job creation')
        }

        const jobId = await createJob({
          worksheetId,
          rowId,
          columnId,
          input: params.input,
          prompt: params.prompt,
          dataSource: params.dataSource,
          userId,
        })

        return jobId
      },
    }

    // Execute the formula
    const executionPromise = registry.execute(formula, context)
      .then(result => {
        pendingExecutionsRef.current.delete(key)
        onExecutionComplete?.(row, col, result)
        return result
      })
      .catch(error => {
        pendingExecutionsRef.current.delete(key)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        onExecutionError?.(row, col, errorMessage)
        return {
          value: '#ERROR!',
          status: 'error' as const,
          error: errorMessage,
        }
      })

    pendingExecutionsRef.current.set(key, executionPromise)
    return executionPromise
  }, [worksheetId, userId, registry, createJob, onExecutionStart, onExecutionComplete, onExecutionError])

  return {
    executeFormula,
    isCustomFormula,
    registry,
    jobStats: jobStats ?? null,
  }
}

/**
 * Hook for subscribing to formula job status updates
 */
export function useFormulaJobStatus(worksheetId: Id<'worksheets'> | null) {
  // Subscribe to job stats for real-time updates
  const jobStats = useQuery(
    api.agents.getJobStats,
    worksheetId ? { worksheetId } : 'skip'
  )

  // Subscribe to all jobs for this worksheet
  const allJobs = useQuery(
    api.agents.getJobsForWorksheet,
    worksheetId ? { worksheetId } : 'skip'
  )

  // Create a map of cell positions to job status
  const cellJobStatus = useMemo(() => {
    if (!allJobs) return new Map<string, { status: string; result?: string; error?: string }>()

    const map = new Map<string, { status: string; result?: string; error?: string }>()

    for (const job of allJobs) {
      // We'd need column order to map properly - this is a simplified version
      // In practice, you'd need to join with worksheetColumns
      map.set(`${job.rowId}:${job.columnId}`, {
        status: job.status,
        result: job.result,
        error: job.error,
      })
    }

    return map
  }, [allJobs])

  return {
    jobStats,
    allJobs,
    cellJobStatus,
    hasRunningJobs: (jobStats?.running ?? 0) > 0,
    hasPendingJobs: (jobStats?.pending ?? 0) > 0,
    hasFailedJobs: (jobStats?.failed ?? 0) > 0,
  }
}
