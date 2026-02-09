'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id, Doc, TableNames } from '@/convex/_generated/dataModel'

// =============================================================================
// ID VALIDATION HELPER
// =============================================================================

/**
 * Type guard to validate Convex IDs
 * Checks that the value is a non-empty string (Convex IDs are strings)
 */
function isValidId<T extends TableNames>(id: unknown): id is Id<T> {
  return typeof id === 'string' && id.length > 0
}
import type {
  ColumnDef,
  SheetRow,
  CellValue,
  CellReference,
  SheetDef,
} from '@/components/spreadsheet/core/types'
import {
  columnIndexToLetter,
  generateDefaultColumns,
  generateEmptyRows,
} from '@/components/spreadsheet/core/types'

// =============================================================================
// TYPES
// =============================================================================

export interface UseGenericSpreadsheetOptions {
  /** Workspace ID to load data from */
  workspaceId?: Id<'workspaces'>
  /** Initial local data (no Convex sync) */
  initialData?: {
    columns: ColumnDef[]
    rows: SheetRow[]
  }
  /** WorkOS user ID for auth */
  workosUserId?: string
  /** Default number of columns for blank sheet */
  defaultColumnCount?: number
  /** Default number of rows for blank sheet */
  defaultRowCount?: number
  /** Auto-save delay in ms (0 = disabled) */
  autoSaveDelay?: number
}

export interface UseGenericSpreadsheetReturn {
  // Data
  columns: ColumnDef[]
  rows: SheetRow[]
  sheets: SheetDef[]
  activeSheetId: string
  isLoading: boolean
  error: Error | null

  // Cell operations
  setCellValue: (cell: CellReference, value: CellValue) => void
  getCellValue: (cell: CellReference) => CellValue

  // Column operations
  addColumn: (position?: number, name?: string, type?: ColumnDef['type']) => void
  removeColumn: (columnId: string) => void
  renameColumn: (columnId: string, name: string) => void
  updateColumnWidth: (columnId: string, width: number) => void

  // Row operations
  addRow: (position?: number, data?: SheetRow) => void
  removeRow: (rowIndex: number) => void
  addRows: (position: number, count: number) => void
  removeRows: (startRow: number, count: number) => void

  // Sheet operations
  addSheet: (name?: string) => void
  removeSheet: (sheetId: string) => void
  renameSheet: (sheetId: string, name: string) => void
  duplicateSheet: (sheetId: string) => void
  setActiveSheet: (sheetId: string) => void

  // Data operations
  getData: () => { columns: ColumnDef[]; rows: SheetRow[] }
  setData: (columns: ColumnDef[], rows: SheetRow[]) => void
  clearData: () => void

  // Sync
  isSyncing: boolean
  lastSyncedAt: number | null
  syncNow: () => Promise<void>
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert Convex column to ColumnDef
 */
function convexColumnToColumnDef(col: Doc<'worksheetColumns'>): ColumnDef {
  return {
    id: col._id,
    key: `col_${col.order}`,
    name: col.name,
    type: (col.columnType as ColumnDef['type']) || 'text',
    width: col.width || 100,
    editable: true,
    order: col.order,
    formula: col.excelFormula || col.formula,
    format: col.format,
    options: col.dropdownOptions,
    hidden: col.hidden,
    validation: col.validation ? {
      type: col.validation.type,
      allowedValues: col.validation.allowedValues,
      min: col.validation.min,
      max: col.validation.max,
      pattern: col.validation.pattern,
      required: col.validation.required,
      errorMessage: col.validation.errorMessage,
    } : undefined,
  }
}

/**
 * Convert Convex row to SheetRow
 */
function convexRowToSheetRow(row: Doc<'worksheetRows'>): SheetRow {
  return row.cells as SheetRow
}

/**
 * Normalize cell reference to {row, col}
 */
function normalizeCellRef(ref: CellReference): { row: number; col: number } {
  if (typeof ref === 'string') {
    const match = ref.match(/^([A-Z]+)(\d+)$/)
    if (!match) throw new Error(`Invalid cell reference: ${ref}`)
    let colIndex = 0
    for (let i = 0; i < match[1].length; i++) {
      colIndex = colIndex * 26 + (match[1].charCodeAt(i) - 64)
    }
    return {
      row: parseInt(match[2], 10) - 1,
      col: colIndex - 1,
    }
  }
  return ref
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing generic spreadsheet data with optional Convex sync
 */
export function useGenericSpreadsheet(
  options: UseGenericSpreadsheetOptions = {}
): UseGenericSpreadsheetReturn {
  const {
    workspaceId,
    initialData,
    workosUserId,
    defaultColumnCount = 26,
    defaultRowCount = 100,
    autoSaveDelay = 1000,
  } = options

  // Local state
  const [localColumns, setLocalColumns] = useState<ColumnDef[]>(
    initialData?.columns || generateDefaultColumns(defaultColumnCount)
  )
  const [localRows, setLocalRows] = useState<SheetRow[]>(
    initialData?.rows || generateEmptyRows(defaultRowCount, defaultColumnCount)
  )
  const [activeSheetId, setActiveSheetId] = useState('sheet_1')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Pending changes for batch sync
  // Note: We capture rowId at change time to avoid stale closure issues
  const pendingChangesRef = useRef<{
    cells: Map<string, { row: number; col: number; value: CellValue; rowId?: Id<'worksheetRows'> }>
    columns: Map<string, Partial<ColumnDef>>
    deletedColumns: Set<string>
    deletedRows: Set<number>
  }>({
    cells: new Map(),
    columns: new Map(),
    deletedColumns: new Set(),
    deletedRows: new Set(),
  })

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Convex queries (only if workspaceId provided)
  const worksheetsQuery = useQuery(
    api.workspaces.getWorkspaceWithWorksheets,
    workspaceId ? { workspaceId, workosUserId } : 'skip'
  )

  // Get first worksheet data
  const firstWorksheetId = worksheetsQuery?.worksheets?.[0]?._id
  const worksheetDataQuery = useQuery(
    api.workspaces.getWorksheetData,
    firstWorksheetId ? { worksheetId: firstWorksheetId, workosUserId } : 'skip'
  )

  // Convex mutations
  const updateCellMutation = useMutation(api.workspaces.updateCell)
  const addColumnMutation = useMutation(api.workspaces.addColumn)
  const renameColumnMutation = useMutation(api.workspaces.renameColumn)
  const updateColumnWidthMutation = useMutation(api.workspaces.updateColumnWidth)
  const deleteColumnMutation = useMutation(api.workspaces.deleteColumn)
  const addRowMutation = useMutation(api.workspaces.addRow)
  const deleteRowMutation = useMutation(api.workspaces.deleteRow)
  const createWorksheetMutation = useMutation(api.workspaces.createWorksheet)
  const renameWorksheetMutation = useMutation(api.workspaces.renameWorksheet)
  const duplicateWorksheetMutation = useMutation(api.workspaces.duplicateWorksheet)
  const deleteWorksheetMutation = useMutation(api.workspaces.deleteWorksheet)

  // Sync Convex data to local state
  useEffect(() => {
    if (worksheetDataQuery?.columns && worksheetDataQuery?.rows) {
      const columns = worksheetDataQuery.columns.map(convexColumnToColumnDef)
      const rows = worksheetDataQuery.rows.map(convexRowToSheetRow)

      setLocalColumns(columns.length > 0 ? columns : generateDefaultColumns(defaultColumnCount))
      setLocalRows(rows.length > 0 ? rows : generateEmptyRows(defaultRowCount, columns.length || defaultColumnCount))
      setLastSyncedAt(Date.now())
    }
  }, [worksheetDataQuery, defaultColumnCount, defaultRowCount])

  // Auto-save timer
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveDelay <= 0 || !workspaceId) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Cancel any in-flight mutations from previous auto-save
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    autoSaveTimerRef.current = setTimeout(async () => {
      // Sync pending changes
      const pending = pendingChangesRef.current

      if (pending.cells.size > 0) {
        setIsSyncing(true)
        try {
          for (const [, change] of pending.cells) {
            // Use rowId captured at change time to avoid stale closure
            const rowId = change.rowId
            if (!rowId || !isValidId<'worksheetRows'>(rowId)) {
              console.warn('[useGenericSpreadsheet] Invalid or missing rowId, skipping sync for row:', change.row)
              continue
            }
            await updateCellMutation({
              rowId,
              columnKey: `col_${change.col}`,
              value: change.value,
              workosUserId,
            })
          }
          pending.cells.clear()
          setLastSyncedAt(Date.now())
        } catch (e) {
          // Don't set error if aborted
          if (e instanceof Error && e.name !== 'AbortError') {
            setError(e)
          } else if (!(e instanceof Error)) {
            setError(new Error('Sync failed'))
          }
        } finally {
          setIsSyncing(false)
        }
      }
    }, autoSaveDelay)
  }, [autoSaveDelay, workspaceId, updateCellMutation, workosUserId])

  // Cell operations
  const setCellValue = useCallback((cell: CellReference, value: CellValue) => {
    const { row, col } = normalizeCellRef(cell)

    // Capture rowId NOW to avoid stale closure issues in auto-save
    const rowId = worksheetDataQuery?.rows?.[row]?._id

    setLocalRows((prev) => {
      const newRows = [...prev]
      if (!newRows[row]) {
        newRows[row] = {}
      }
      newRows[row] = { ...newRows[row], [`col_${col}`]: value }
      return newRows
    })

    // Queue for sync with captured rowId
    pendingChangesRef.current.cells.set(`${row}:${col}`, { row, col, value, rowId })
    scheduleAutoSave()
  }, [scheduleAutoSave, worksheetDataQuery?.rows])

  const getCellValue = useCallback((cell: CellReference): CellValue => {
    const { row, col } = normalizeCellRef(cell)
    return localRows[row]?.[`col_${col}`] ?? null
  }, [localRows])

  // Column operations
  const addColumn = useCallback(async (position?: number, name?: string, type?: ColumnDef['type']) => {
    const pos = position ?? localColumns.length
    const newCol: ColumnDef = {
      id: `col_${Date.now()}`,
      key: `col_${pos}`,
      name: name || columnIndexToLetter(pos),
      type: type || 'text',
      width: 100,
      editable: true,
      order: pos,
    }

    setLocalColumns((prev) => {
      const updated = [...prev]
      updated.splice(pos, 0, newCol)
      // Re-index keys
      return updated.map((col, i) => ({ ...col, key: `col_${i}`, order: i }))
    })

    // Sync to Convex
    if (workspaceId && firstWorksheetId) {
      try {
        await addColumnMutation({
          worksheetId: firstWorksheetId,
          name: newCol.name,
          columnType: (newCol.type === 'formula' ? 'formula' : newCol.type === 'number' || newCol.type === 'currency' || newCol.type === 'percentage' ? 'number' : 'text') as 'text' | 'number' | 'formula',
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to add column'))
      }
    }
  }, [localColumns.length, workspaceId, firstWorksheetId, addColumnMutation, workosUserId])

  const removeColumn = useCallback(async (columnId: string) => {
    const index = localColumns.findIndex((c) => c.id === columnId)
    if (index === -1) return

    setLocalColumns((prev) => {
      const updated = prev.filter((c) => c.id !== columnId)
      return updated.map((col, i) => ({ ...col, key: `col_${i}`, order: i }))
    })

    // Sync to Convex
    if (workspaceId && isValidId<'worksheetColumns'>(columnId)) {
      try {
        await deleteColumnMutation({
          columnId,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to delete column'))
      }
    }
  }, [localColumns, workspaceId, deleteColumnMutation, workosUserId])

  const renameColumn = useCallback(async (columnId: string, name: string) => {
    setLocalColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, name } : col))
    )

    // Sync to Convex
    if (workspaceId && isValidId<'worksheetColumns'>(columnId)) {
      try {
        await renameColumnMutation({
          columnId,
          name,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to rename column'))
      }
    }
  }, [workspaceId, renameColumnMutation, workosUserId])

  const updateColumnWidth = useCallback(async (columnId: string, width: number) => {
    setLocalColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, width } : col))
    )

    // Sync to Convex
    if (workspaceId && isValidId<'worksheetColumns'>(columnId)) {
      try {
        await updateColumnWidthMutation({
          columnId,
          width,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to update column width'))
      }
    }
  }, [workspaceId, updateColumnWidthMutation, workosUserId])

  // Row operations
  const addRow = useCallback(async (position?: number, data?: SheetRow) => {
    const pos = position ?? localRows.length

    setLocalRows((prev) => {
      const newRows = [...prev]
      newRows.splice(pos, 0, data || {})
      return newRows
    })

    // Sync to Convex
    if (workspaceId && firstWorksheetId) {
      try {
        await addRowMutation({
          worksheetId: firstWorksheetId,
          cells: data,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to add row'))
      }
    }
  }, [localRows.length, workspaceId, firstWorksheetId, addRowMutation, workosUserId])

  const removeRow = useCallback(async (rowIndex: number) => {
    const rowId = worksheetDataQuery?.rows?.[rowIndex]?._id

    setLocalRows((prev) => prev.filter((_, i) => i !== rowIndex))

    // Sync to Convex
    if (workspaceId && rowId && isValidId<'worksheetRows'>(rowId)) {
      try {
        await deleteRowMutation({
          rowId,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to delete row'))
      }
    }
  }, [workspaceId, worksheetDataQuery, deleteRowMutation, workosUserId])

  const addRows = useCallback((position: number, count: number) => {
    setLocalRows((prev) => {
      const newRows = [...prev]
      const emptyRows = generateEmptyRows(count, localColumns.length)
      newRows.splice(position, 0, ...emptyRows)
      return newRows
    })
  }, [localColumns.length])

  const removeRows = useCallback((startRow: number, count: number) => {
    setLocalRows((prev) => {
      const newRows = [...prev]
      newRows.splice(startRow, count)
      return newRows
    })
  }, [])

  // Sheet operations
  const sheets: SheetDef[] = useMemo(() => {
    if (worksheetsQuery?.worksheets) {
      return worksheetsQuery.worksheets.map((ws: Doc<'worksheets'>) => ({
        id: ws._id,
        name: ws.name,
        columns: localColumns,
        rows: localRows,
        order: ws.order ?? 0,
        frozenRows: ws.frozenRows,
        frozenColumns: ws.frozenColumns,
      }))
    }
    return [{
      id: 'sheet_1',
      name: 'Sheet 1',
      columns: localColumns,
      rows: localRows,
      order: 0,
    }]
  }, [worksheetsQuery, localColumns, localRows])

  const addSheet = useCallback(async (name?: string) => {
    if (workspaceId) {
      try {
        await createWorksheetMutation({
          workspaceId,
          name: name || `Sheet ${sheets.length + 1}`,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to add sheet'))
      }
    }
  }, [workspaceId, sheets.length, createWorksheetMutation, workosUserId])

  const removeSheet = useCallback(async (sheetId: string) => {
    if (sheets.length <= 1) return // Can't delete last sheet

    if (workspaceId && isValidId<'worksheets'>(sheetId)) {
      try {
        await deleteWorksheetMutation({
          worksheetId: sheetId,
          workosUserId,
        })
        // Switch to another sheet if we deleted the active one
        if (sheetId === activeSheetId) {
          const remaining = sheets.filter((s) => s.id !== sheetId)
          if (remaining.length > 0) {
            setActiveSheetId(remaining[0].id)
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to delete sheet'))
      }
    }
  }, [workspaceId, sheets, activeSheetId, deleteWorksheetMutation, workosUserId])

  const renameSheet = useCallback(async (sheetId: string, name: string) => {
    if (workspaceId && isValidId<'worksheets'>(sheetId)) {
      try {
        await renameWorksheetMutation({
          worksheetId: sheetId,
          name,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to rename sheet'))
      }
    }
  }, [workspaceId, renameWorksheetMutation, workosUserId])

  const duplicateSheet = useCallback(async (sheetId: string) => {
    if (workspaceId && isValidId<'worksheets'>(sheetId)) {
      try {
        await duplicateWorksheetMutation({
          worksheetId: sheetId,
          workosUserId,
        })
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to duplicate sheet'))
      }
    }
  }, [workspaceId, duplicateWorksheetMutation, workosUserId])

  // Data operations
  const getData = useCallback(() => ({
    columns: localColumns,
    rows: localRows,
  }), [localColumns, localRows])

  const setData = useCallback((columns: ColumnDef[], rows: SheetRow[]) => {
    setLocalColumns(columns)
    setLocalRows(rows)
  }, [])

  const clearData = useCallback(() => {
    setLocalColumns(generateDefaultColumns(defaultColumnCount))
    setLocalRows(generateEmptyRows(defaultRowCount, defaultColumnCount))
  }, [defaultColumnCount, defaultRowCount])

  // Manual sync
  const syncNow = useCallback(async () => {
    if (!workspaceId || !firstWorksheetId) return

    setIsSyncing(true)
    try {
      const pending = pendingChangesRef.current

      for (const [, change] of pending.cells) {
        // Use rowId captured at change time
        const rowId = change.rowId
        if (rowId && isValidId<'worksheetRows'>(rowId)) {
          await updateCellMutation({
            rowId,
            columnKey: `col_${change.col}`,
            value: change.value,
            workosUserId,
          })
        }
      }
      pending.cells.clear()
      setLastSyncedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Sync failed'))
    } finally {
      setIsSyncing(false)
    }
  }, [workspaceId, firstWorksheetId, updateCellMutation, workosUserId])

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      // Abort any in-flight mutations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    columns: localColumns,
    rows: localRows,
    sheets,
    activeSheetId,
    isLoading: workspaceId ? worksheetDataQuery === undefined : false,
    error,

    setCellValue,
    getCellValue,

    addColumn,
    removeColumn,
    renameColumn,
    updateColumnWidth,

    addRow,
    removeRow,
    addRows,
    removeRows,

    addSheet,
    removeSheet,
    renameSheet,
    duplicateSheet,
    setActiveSheet: setActiveSheetId,

    getData,
    setData,
    clearData,

    isSyncing,
    lastSyncedAt,
    syncNow,
  }
}
