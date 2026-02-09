'use client'

import { useQuery, useMutation } from "convex/react"
import { useCallback, useMemo, useState } from "react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import type {
  ConditionalFormatRule,
  CellFormatting,
  FormatCondition,
  PresetType,
  UseConditionalFormattingOptions,
  UseConditionalFormattingReturn,
} from "./types"

/**
 * Parse A1-style cell reference to row and column indices
 * @param cellRef Cell reference like "A1", "B10", "AA5"
 * @returns { row, col } with 0-based indices, or null if invalid
 */
function parseCellReference(cellRef: string): { row: number; col: number } | null {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null

  const colStr = match[1].toUpperCase()
  const rowNum = parseInt(match[2], 10)

  // Convert column letters to 0-based index (A=0, B=1, ..., Z=25, AA=26)
  let col = 0
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 65 + 1)
  }
  col -= 1 // Convert to 0-based

  return { row: rowNum - 1, col } // Row is also 0-based
}

/**
 * Hook for managing conditional formatting rules
 *
 * Provides CRUD operations for formatting rules and cell-level formatting evaluation.
 *
 * @example
 * ```tsx
 * const { rules, createPreset, getCellFormatting } = useConditionalFormatting({
 *   worksheetId,
 *   workosUserId,
 * })
 *
 * // Apply confidence band preset to column 5
 * await createPreset("confidenceBand", 5)
 *
 * // Get formatting for a cell
 * const formatting = getCellFormatting(0, 5, 85) // returns yellow formatting
 * ```
 */
export function useConditionalFormatting(
  options: UseConditionalFormattingOptions
): UseConditionalFormattingReturn {
  const { worksheetId, workosUserId, enabledOnly = true } = options

  // Error state tracking
  const [error, setError] = useState<Error | null>(null)

  // Skip query if worksheetId or workosUserId is invalid
  const shouldSkip = !worksheetId || !workosUserId

  // Query rules from Convex
  const rulesData = useQuery(
    api.worksheetConditionalFormats.listByWorksheet,
    shouldSkip ? 'skip' : { worksheetId, workosUserId, enabledOnly }
  )

  // Mutations
  const createMutation = useMutation(api.worksheetConditionalFormats.create)
  const createPresetMutation = useMutation(api.worksheetConditionalFormats.createPreset)
  const updateMutation = useMutation(api.worksheetConditionalFormats.update)
  const toggleMutation = useMutation(api.worksheetConditionalFormats.toggle)
  const removeMutation = useMutation(api.worksheetConditionalFormats.remove)
  const reorderMutation = useMutation(api.worksheetConditionalFormats.reorder)

  // Transform rules data
  const rules = useMemo(
    () => (rulesData ?? []) as ConditionalFormatRule[],
    [rulesData]
  )

  // Create a new custom rule
  const createRule = useCallback(
    async (
      rule: Omit<ConditionalFormatRule, "_id" | "worksheetId" | "createdAt" | "updatedAt">
    ): Promise<Id<"worksheetConditionalFormats">> => {
      try {
        setError(null)
        return await createMutation({
          worksheetId,
          workosUserId,
          name: rule.name,
          range: rule.range,
          ruleType: rule.ruleType,
          conditions: rule.conditions,
          priority: rule.priority,
          enabled: rule.enabled,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [createMutation, worksheetId, workosUserId]
  )

  // Create a preset rule
  const createPreset = useCallback(
    async (
      presetType: PresetType,
      columnIndex: number,
      name?: string
    ): Promise<Id<"worksheetConditionalFormats">> => {
      try {
        setError(null)
        return await createPresetMutation({
          worksheetId,
          workosUserId,
          presetType,
          columnIndex,
          name,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [createPresetMutation, worksheetId, workosUserId]
  )

  // Update an existing rule
  const updateRule = useCallback(
    async (
      id: Id<"worksheetConditionalFormats">,
      updates: Partial<ConditionalFormatRule>
    ): Promise<void> => {
      try {
        setError(null)
        await updateMutation({
          id,
          workosUserId,
          name: updates.name,
          range: updates.range,
          ruleType: updates.ruleType,
          conditions: updates.conditions,
          priority: updates.priority,
          enabled: updates.enabled,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [updateMutation, workosUserId]
  )

  // Toggle a rule on/off
  const toggleRule = useCallback(
    async (id: Id<"worksheetConditionalFormats">): Promise<boolean> => {
      try {
        setError(null)
        return await toggleMutation({ id, workosUserId })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [toggleMutation, workosUserId]
  )

  // Delete a rule
  const deleteRule = useCallback(
    async (id: Id<"worksheetConditionalFormats">): Promise<void> => {
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

  // Reorder rules
  const reorderRules = useCallback(
    async (ruleIds: Id<"worksheetConditionalFormats">[]): Promise<void> => {
      try {
        setError(null)
        await reorderMutation({ worksheetId, workosUserId, ruleIds })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [reorderMutation, worksheetId, workosUserId]
  )

  // Evaluate a single condition against a value
  const evaluateCondition = useCallback(
    (condition: FormatCondition, value: unknown): boolean => {
      const numValue = typeof value === "number" ? value : parseFloat(String(value))
      const strValue = String(value).toLowerCase()
      const condValue = condition.value
      const condNumValue = typeof condValue === "number" ? condValue : parseFloat(String(condValue))
      const condStrValue = String(condValue).toLowerCase()

      switch (condition.operator) {
        case "gt":
          return !isNaN(numValue) && numValue > condNumValue
        case "gte":
          return !isNaN(numValue) && numValue >= condNumValue
        case "lt":
          return !isNaN(numValue) && numValue < condNumValue
        case "lte":
          return !isNaN(numValue) && numValue <= condNumValue
        case "eq":
          return strValue === condStrValue || numValue === condNumValue
        case "neq":
          return strValue !== condStrValue && numValue !== condNumValue
        case "contains":
          return strValue.includes(condStrValue)
        case "startsWith":
          return strValue.startsWith(condStrValue)
        case "endsWith":
          return strValue.endsWith(condStrValue)
        case "between": {
          const value2 = condition.value2
          const condNumValue2 = typeof value2 === "number" ? value2 : parseFloat(String(value2))
          return !isNaN(numValue) && numValue >= condNumValue && numValue <= condNumValue2
        }
        default:
          return false
      }
    },
    []
  )

  // Check if a cell falls within a rule's range
  const cellInRange = useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      range: ConditionalFormatRule["range"]
    ): boolean => {
      // If columnIndex is specified, check only that
      if (range.columnIndex !== undefined) {
        return columnIndex === range.columnIndex
      }

      // If rowIndex is specified, check only that
      if (range.rowIndex !== undefined) {
        return rowIndex === range.rowIndex
      }

      // If cell range is specified (e.g., "A1:B10")
      if (range.startCell) {
        const start = parseCellReference(range.startCell)
        if (!start) return false // Invalid start reference

        // If no end cell, just check the single cell
        if (!range.endCell) {
          return rowIndex === start.row && columnIndex === start.col
        }

        const end = parseCellReference(range.endCell)
        if (!end) return false // Invalid end reference

        // Check if cell is within the rectangular range
        return (
          rowIndex >= start.row &&
          rowIndex <= end.row &&
          columnIndex >= start.col &&
          columnIndex <= end.col
        )
      }

      // Default: no range means applies to all cells
      return true
    },
    []
  )

  // Get formatting for a specific cell
  const getCellFormatting = useCallback(
    (rowIndex: number, columnIndex: number, cellValue: unknown): CellFormatting | null => {
      // Rules are already sorted by priority (lowest to highest)
      // Later rules override earlier ones
      let appliedFormatting: CellFormatting | null = null

      for (const rule of rules) {
        if (!rule.enabled) continue
        if (!cellInRange(rowIndex, columnIndex, rule.range)) continue

        // Check each condition in the rule
        for (const condition of rule.conditions) {
          if (evaluateCondition(condition, cellValue)) {
            // Merge formatting (later conditions override)
            appliedFormatting = {
              ...(appliedFormatting ?? {}),
              ...condition.formatting,
            }
            // For most rule types, we stop at first matching condition
            // But for presets, all conditions are independent
            if (
              rule.ruleType !== "confidenceBand" &&
              rule.ruleType !== "statusColor" &&
              rule.ruleType !== "matchLayer"
            ) {
              break
            }
          }
        }
      }

      return appliedFormatting
    },
    [rules, cellInRange, evaluateCondition]
  )

  return {
    rules,
    isLoading: rulesData === undefined,
    error,
    createRule,
    createPreset,
    updateRule,
    toggleRule,
    deleteRule,
    reorderRules,
    getCellFormatting,
  }
}

/**
 * Convert cell formatting to CSS style object
 */
export function formattingToStyle(formatting: CellFormatting | null): React.CSSProperties {
  if (!formatting) return {}

  return {
    backgroundColor: formatting.backgroundColor,
    color: formatting.textColor,
    fontWeight: formatting.bold ? "bold" : undefined,
    fontStyle: formatting.italic ? "italic" : undefined,
    textDecoration: [
      formatting.underline ? "underline" : "",
      formatting.strikethrough ? "line-through" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined,
  }
}
