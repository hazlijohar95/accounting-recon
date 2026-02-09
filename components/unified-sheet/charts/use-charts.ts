'use client'

import { useQuery, useMutation } from "convex/react"
import { useCallback, useMemo, useState } from "react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import type {
  WorksheetChart,
  UseChartsOptions,
  UseChartsReturn,
} from "./types"

/**
 * Hook for managing worksheet charts
 *
 * @example
 * ```tsx
 * const { charts, createChart, deleteChart } = useCharts({
 *   worksheetId,
 *   workosUserId,
 * })
 *
 * // Create a bar chart
 * await createChart({
 *   title: "Sales by Month",
 *   chartType: "bar",
 *   dataRange: "A1:B12",
 *   labelColumn: 0,
 *   valueColumns: [1],
 *   options: { showLegend: true, showLabels: true, animate: true },
 * })
 * ```
 */
export function useCharts(options: UseChartsOptions): UseChartsReturn {
  const { worksheetId, workosUserId } = options

  // Error state tracking
  const [error, setError] = useState<Error | null>(null)

  // Skip query if worksheetId or workosUserId is invalid
  const shouldSkip = !worksheetId || !workosUserId

  // Query charts from Convex
  const chartsData = useQuery(
    api.worksheetCharts.listByWorksheet,
    shouldSkip ? 'skip' : { worksheetId, workosUserId }
  )

  // Mutations
  const createMutation = useMutation(api.worksheetCharts.create)
  const updateMutation = useMutation(api.worksheetCharts.update)
  const removeMutation = useMutation(api.worksheetCharts.remove)
  const reorderMutation = useMutation(api.worksheetCharts.reorder)

  // Transform charts data
  const charts = useMemo(
    () => (chartsData ?? []) as WorksheetChart[],
    [chartsData]
  )

  // Create a new chart
  const createChart = useCallback(
    async (
      chart: Omit<WorksheetChart, "_id" | "worksheetId" | "position" | "createdAt" | "updatedAt">
    ): Promise<Id<"worksheetCharts">> => {
      try {
        setError(null)
        return await createMutation({
          worksheetId,
          workosUserId,
          title: chart.title,
          chartType: chart.chartType,
          dataRange: chart.dataRange,
          labelColumn: chart.labelColumn,
          valueColumns: chart.valueColumns,
          options: chart.options,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [createMutation, worksheetId, workosUserId]
  )

  // Update a chart
  const updateChart = useCallback(
    async (
      id: Id<"worksheetCharts">,
      updates: Partial<WorksheetChart>
    ): Promise<void> => {
      try {
        setError(null)
        await updateMutation({
          id,
          workosUserId,
          title: updates.title,
          chartType: updates.chartType,
          dataRange: updates.dataRange,
          labelColumn: updates.labelColumn,
          valueColumns: updates.valueColumns,
          options: updates.options,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [updateMutation, workosUserId]
  )

  // Delete a chart
  const deleteChart = useCallback(
    async (id: Id<"worksheetCharts">): Promise<void> => {
      try {
        setError(null)
        await removeMutation({ id, workosUserId })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [removeMutation, workosUserId]
  )

  // Reorder charts
  const reorderCharts = useCallback(
    async (chartIds: Id<"worksheetCharts">[]): Promise<void> => {
      try {
        setError(null)
        await reorderMutation({ worksheetId, workosUserId, chartIds })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [reorderMutation, worksheetId, workosUserId]
  )

  return {
    charts,
    isLoading: chartsData === undefined,
    error,
    createChart,
    updateChart,
    deleteChart,
    reorderCharts,
  }
}
