'use client'

import { useEffect, useRef, useCallback, useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import jspreadsheet from 'jspreadsheet-ce'
import { cn } from '@/lib/cn'
import type {
  GenericSheetProps,
  ColumnDef,
  SheetRow,
  CellValue,
  CellReference,
  RangeReference,
  CellStyle,
  SpreadsheetAPI,
  SpreadsheetPlugin,
} from './types'
import {
  columnIndexToLetter,
  columnLetterToIndex,
  parseA1Notation,
  toA1Notation,
  generateDefaultColumns,
  generateEmptyRows,
} from './types'

// Import jspreadsheet styles
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import 'jsuites/dist/jsuites.css'

// =============================================================================
// JSPREADSHEET INSTANCE TYPE
// =============================================================================

interface JSpreadsheetInstance {
  setData: (data: (string | number | boolean | null)[][]) => void
  getData: () => (string | number | boolean | null)[][]
  getValue: (cell: string) => string | number | boolean | null
  setValue: (cell: string, value: string | number | boolean | null, updateRecords?: boolean) => void
  setStyle: (cell: string, property: string, value: string) => void
  getStyle: (cell: string) => Record<string, string>
  insertColumn: (numOfColumns?: number, position?: number, insertBefore?: boolean) => void
  deleteColumn: (columnNumber?: number, numOfColumns?: number) => void
  setHeader: (column: number, newValue: string) => void
  getHeader: (column: number) => string
  getHeaders: () => string[]
  setWidth: (column: number, width: number) => void
  getWidth: (column: number) => number
  insertRow: (numOfRows?: number, rowNumber?: number, insertBefore?: boolean) => void
  deleteRow: (rowNumber?: number, numOfRows?: number) => void
  getSelectedCells: () => HTMLTableCellElement[]
  updateSelectionFromCoords: (x1: number, y1: number, x2: number, y2: number) => void
  undo: () => void
  redo: () => void
  destroy: () => void
  options: {
    data: (string | number | boolean | null)[][]
    columns: JSpreadsheetColumn[]
  }
  records: unknown[][]
  el: HTMLElement
}

type JSpreadsheetColumnType =
  | 'html'
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'color'
  | 'image'
  | 'hidden'
  | 'numeric'
  | 'calendar'
  | 'autocomplete'

interface JSpreadsheetColumn {
  title?: string
  width?: number
  type?: JSpreadsheetColumnType
  source?: string[]
  readOnly?: boolean
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert CellReference to A1 string notation
 */
function cellRefToString(ref: CellReference): string {
  if (typeof ref === 'string') return ref
  return toA1Notation(ref.row, ref.col)
}

/**
 * Map column type to jspreadsheet type
 */
function mapColumnType(type: ColumnDef['type']): JSpreadsheetColumnType {
  switch (type) {
    case 'number':
    case 'currency':
    case 'percentage':
      return 'numeric'
    case 'date':
      return 'calendar'
    case 'dropdown':
      return 'dropdown'
    case 'checkbox':
      return 'checkbox'
    default:
      return 'text'
  }
}

/**
 * Convert ColumnDef array to jspreadsheet columns config
 */
function columnsToJspreadsheet(columns: ColumnDef[], readOnly: boolean): JSpreadsheetColumn[] {
  return columns.map((col) => ({
    title: col.name,
    width: col.width || 100,
    type: mapColumnType(col.type),
    source: col.options,
    readOnly: readOnly || !col.editable,
  }))
}

/**
 * Convert SheetRow array to 2D array for jspreadsheet
 */
function rowsToJspreadsheet(rows: SheetRow[], columns: ColumnDef[]): (string | number | boolean | null)[][] {
  return rows.map((row) =>
    columns.map((col) => {
      const value = row[col.key]
      if (value === undefined) return ''
      if (value === null) return ''
      return value as string | number | boolean
    })
  )
}

/**
 * Convert 2D array from jspreadsheet to SheetRow array
 */
function jspreadsheetToRows(data: (string | number | boolean | null)[][], columns: ColumnDef[]): SheetRow[] {
  return data.map((rowData) => {
    const row: SheetRow = {}
    columns.forEach((col, i) => {
      row[col.key] = rowData[i] ?? ''
    })
    return row
  })
}

// =============================================================================
// GENERIC SHEET COMPONENT
// =============================================================================

/**
 * GenericSheet - A general-purpose Excel-like spreadsheet component
 *
 * Features:
 * - Dynamic columns (add/remove/rename/reorder)
 * - Excel formulas (=SUM, =AVERAGE, =IF, etc.)
 * - Multi-sheet support via SheetTabs
 * - Plugin system for extended functionality
 * - Dark mode support
 */
export const GenericSheet = forwardRef<SpreadsheetAPI | null, GenericSheetProps>(function GenericSheet(
  {
    workspaceId,
    localData,
    readOnly = false,
    allowColumnOps = true,
    allowRowOps = true,
    enableFormulas = true,
    showFormulaBar = false,
    showSheetTabs = false,
    showToolbar = false,
    height = '600px',
    className,
    onCellChange,
    onSelectionChange,
    onColumnChange,
    onSheetChange,
    plugins = [],
    defaultColumnCount = 26,
    defaultRowCount = 100,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const spreadsheetRef = useRef<JSpreadsheetInstance | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [formulaValue, setFormulaValue] = useState<string>('')
  const undoStackRef = useRef<unknown[]>([])
  const redoStackRef = useRef<unknown[]>([])

  // Determine initial columns and rows
  const initialColumns = useMemo(() => {
    if (localData?.columns && localData.columns.length > 0) {
      return localData.columns
    }
    return generateDefaultColumns(defaultColumnCount)
  }, [localData?.columns, defaultColumnCount])

  const initialRows = useMemo(() => {
    if (localData?.rows && localData.rows.length > 0) {
      return localData.rows
    }
    return generateEmptyRows(defaultRowCount, initialColumns.length)
  }, [localData?.rows, defaultRowCount, initialColumns.length])

  // Current state (tracks changes)
  const columnsRef = useRef<ColumnDef[]>(initialColumns)
  const rowsRef = useRef<SheetRow[]>(initialRows)

  // ==========================================================================
  // SPREADSHEET API
  // ==========================================================================

  const api: SpreadsheetAPI = useMemo(
    () => ({
      // Cell operations
      setCellValue: (cell: CellReference, value: CellValue) => {
        if (!spreadsheetRef.current) return
        const cellStr = cellRefToString(cell)
        spreadsheetRef.current.setValue(cellStr, value as string | number | boolean | null)
      },

      getCellValue: (cell: CellReference): CellValue => {
        if (!spreadsheetRef.current) return null
        const cellStr = cellRefToString(cell)
        return spreadsheetRef.current.getValue(cellStr)
      },

      setRangeValues: (range: RangeReference, values: CellValue[][]) => {
        if (!spreadsheetRef.current) return
        let startRow: number, startCol: number
        if (typeof range === 'string') {
          const [start] = range.split(':')
          const parsed = parseA1Notation(start)
          startRow = parsed.row
          startCol = parsed.col
        } else {
          startRow = range.startRow
          startCol = range.startCol
        }
        values.forEach((rowValues, ri) => {
          rowValues.forEach((value, ci) => {
            const cell = toA1Notation(startRow + ri, startCol + ci)
            spreadsheetRef.current!.setValue(cell, value as string | number | boolean | null)
          })
        })
      },

      clearRange: (range: RangeReference) => {
        if (!spreadsheetRef.current) return
        let startRow: number, startCol: number, endRow: number, endCol: number
        if (typeof range === 'string') {
          const [start, end] = range.split(':')
          const parsedStart = parseA1Notation(start)
          const parsedEnd = end ? parseA1Notation(end) : parsedStart
          startRow = parsedStart.row
          startCol = parsedStart.col
          endRow = parsedEnd.row
          endCol = parsedEnd.col
        } else {
          startRow = range.startRow
          startCol = range.startCol
          endRow = range.endRow
          endCol = range.endCol
        }
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            spreadsheetRef.current!.setValue(toA1Notation(r, c), '')
          }
        }
      },

      // Column operations
      addColumn: (position?: number, columnDef?: Partial<ColumnDef>): string => {
        if (!spreadsheetRef.current) return ''
        const pos = position ?? columnsRef.current.length
        spreadsheetRef.current.insertColumn(1, pos, false)

        const newColId = `col_${Date.now()}`
        const newCol: ColumnDef = {
          id: newColId,
          key: newColId,
          name: columnDef?.name || columnIndexToLetter(pos),
          type: columnDef?.type || 'text',
          width: columnDef?.width || 100,
          editable: columnDef?.editable ?? true,
          order: pos,
          ...columnDef,
        }

        columnsRef.current.splice(pos, 0, newCol)
        // Update order for all columns
        columnsRef.current.forEach((col, i) => {
          col.order = i
        })

        onColumnChange?.('add', newColId)
        return newColId
      },

      removeColumn: (columnId: string) => {
        if (!spreadsheetRef.current) return
        const index = columnsRef.current.findIndex((c) => c.id === columnId)
        if (index === -1) return
        spreadsheetRef.current.deleteColumn(index, 1)
        columnsRef.current.splice(index, 1)
        // Update order
        columnsRef.current.forEach((col, i) => {
          col.order = i
        })
        onColumnChange?.('remove', columnId)
      },

      renameColumn: (columnId: string, name: string) => {
        if (!spreadsheetRef.current) return
        const index = columnsRef.current.findIndex((c) => c.id === columnId)
        if (index === -1) return
        spreadsheetRef.current.setHeader(index, name)
        columnsRef.current[index].name = name
        onColumnChange?.('rename', columnId)
      },

      setColumnWidth: (columnId: string, width: number) => {
        if (!spreadsheetRef.current) return
        const index = columnsRef.current.findIndex((c) => c.id === columnId)
        if (index === -1) return
        spreadsheetRef.current.setWidth(index, width)
        columnsRef.current[index].width = width
      },

      // Row operations
      addRow: (position?: number, data?: SheetRow): number => {
        if (!spreadsheetRef.current) return -1
        const pos = position ?? rowsRef.current.length
        spreadsheetRef.current.insertRow(1, pos, false)
        const newRow: SheetRow = data || {}
        rowsRef.current.splice(pos, 0, newRow)
        return pos
      },

      removeRow: (rowIndex: number) => {
        if (!spreadsheetRef.current) return
        spreadsheetRef.current.deleteRow(rowIndex, 1)
        rowsRef.current.splice(rowIndex, 1)
      },

      addRows: (position: number, count: number) => {
        if (!spreadsheetRef.current) return
        spreadsheetRef.current.insertRow(count, position, false)
        const newRows = generateEmptyRows(count, columnsRef.current.length)
        rowsRef.current.splice(position, 0, ...newRows)
      },

      removeRows: (startRow: number, count: number) => {
        if (!spreadsheetRef.current) return
        spreadsheetRef.current.deleteRow(startRow, count)
        rowsRef.current.splice(startRow, count)
      },

      // Sheet operations (stub for single-sheet mode)
      getSheets: () => [
        {
          id: 'sheet_1',
          name: 'Sheet 1',
          columns: columnsRef.current,
          rows: rowsRef.current,
          order: 0,
        },
      ],

      addSheet: (name?: string): string => {
        const sheetId = `sheet_${Date.now()}`
        onSheetChange?.('add', sheetId)
        return sheetId
      },

      removeSheet: (sheetId: string) => {
        onSheetChange?.('remove', sheetId)
      },

      renameSheet: (sheetId: string, name: string) => {
        onSheetChange?.('rename', sheetId)
      },

      duplicateSheet: (sheetId: string, newName?: string): string => {
        const newId = `sheet_${Date.now()}`
        onSheetChange?.('add', newId)
        return newId
      },

      setActiveSheet: (_sheetId: string) => {
        // Single sheet mode - no-op
      },

      getActiveSheet: () => ({
        id: 'sheet_1',
        name: 'Sheet 1',
        columns: columnsRef.current,
        rows: rowsRef.current,
        order: 0,
      }),

      // Selection
      getSelection: (): RangeReference | null => {
        if (!spreadsheetRef.current) return null
        const cells = spreadsheetRef.current.getSelectedCells()
        if (cells.length === 0) return null
        // Parse selection from DOM
        const first = cells[0]
        const last = cells[cells.length - 1]
        const startCol = parseInt(first.dataset.x || '0', 10)
        const startRow = parseInt(first.dataset.y || '0', 10)
        const endCol = parseInt(last.dataset.x || '0', 10)
        const endRow = parseInt(last.dataset.y || '0', 10)
        return `${toA1Notation(startRow, startCol)}:${toA1Notation(endRow, endCol)}`
      },

      setSelection: (range: RangeReference) => {
        if (!spreadsheetRef.current) return
        let x1: number, y1: number, x2: number, y2: number
        if (typeof range === 'string') {
          const [start, end] = range.split(':')
          const parsedStart = parseA1Notation(start)
          const parsedEnd = end ? parseA1Notation(end) : parsedStart
          x1 = parsedStart.col
          y1 = parsedStart.row
          x2 = parsedEnd.col
          y2 = parsedEnd.row
        } else {
          x1 = range.startCol
          y1 = range.startRow
          x2 = range.endCol
          y2 = range.endRow
        }
        spreadsheetRef.current.updateSelectionFromCoords(x1, y1, x2, y2)
      },

      // Formatting
      setCellStyle: (cell: CellReference, style: CellStyle) => {
        if (!spreadsheetRef.current) return
        const cellStr = cellRefToString(cell)
        if (style.backgroundColor) {
          spreadsheetRef.current.setStyle(cellStr, 'background-color', style.backgroundColor)
        }
        if (style.color) {
          spreadsheetRef.current.setStyle(cellStr, 'color', style.color)
        }
        if (style.fontWeight) {
          spreadsheetRef.current.setStyle(cellStr, 'font-weight', style.fontWeight)
        }
        if (style.fontStyle) {
          spreadsheetRef.current.setStyle(cellStr, 'font-style', style.fontStyle)
        }
        if (style.textDecoration) {
          spreadsheetRef.current.setStyle(cellStr, 'text-decoration', style.textDecoration)
        }
      },

      setRangeStyle: (range: RangeReference, style: CellStyle) => {
        if (!spreadsheetRef.current) return
        let startRow: number, startCol: number, endRow: number, endCol: number
        if (typeof range === 'string') {
          const [start, end] = range.split(':')
          const parsedStart = parseA1Notation(start)
          const parsedEnd = end ? parseA1Notation(end) : parsedStart
          startRow = parsedStart.row
          startCol = parsedStart.col
          endRow = parsedEnd.row
          endCol = parsedEnd.col
        } else {
          startRow = range.startRow
          startCol = range.startCol
          endRow = range.endRow
          endCol = range.endCol
        }
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            api.setCellStyle({ row: r, col: c }, style)
          }
        }
      },

      // Data
      getData: () => ({
        columns: columnsRef.current,
        rows: rowsRef.current,
      }),

      setData: (columns: ColumnDef[], rows: SheetRow[]) => {
        if (!spreadsheetRef.current) return
        columnsRef.current = columns
        rowsRef.current = rows
        const jspData = rowsToJspreadsheet(rows, columns)
        spreadsheetRef.current.setData(jspData)
      },

      exportToJSON: (): string => {
        return JSON.stringify({
          columns: columnsRef.current,
          rows: rowsRef.current,
        })
      },

      importFromJSON: (json: string) => {
        try {
          const data = JSON.parse(json)
          if (data.columns && data.rows) {
            api.setData(data.columns, data.rows)
          }
        } catch (e) {
          console.error('Failed to import JSON:', e)
        }
      },

      // Undo/Redo
      undo: () => {
        if (!spreadsheetRef.current) return
        spreadsheetRef.current.undo()
      },

      redo: () => {
        if (!spreadsheetRef.current) return
        spreadsheetRef.current.redo()
      },

      canUndo: () => undoStackRef.current.length > 0,

      canRedo: () => redoStackRef.current.length > 0,

      // Freeze
      freezeRows: (_count: number) => {
        // jspreadsheet-ce doesn't support runtime freeze changes well
        console.warn('freezeRows not supported in jspreadsheet-ce at runtime')
      },

      freezeColumns: (_count: number) => {
        console.warn('freezeColumns not supported in jspreadsheet-ce at runtime')
      },
    }),
    [onCellChange, onColumnChange, onSheetChange]
  )

  // Expose API via ref
  useImperativeHandle(ref, () => api, [api])

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    // Destroy existing instance
    if (spreadsheetRef.current) {
      try {
        spreadsheetRef.current.destroy()
      } catch {
        // Ignore destruction errors
      }
      spreadsheetRef.current = null
    }

    // Prepare initial data
    const jspColumns = columnsToJspreadsheet(columnsRef.current, readOnly)
    const jspData = rowsToJspreadsheet(rowsRef.current, columnsRef.current)

    // Create spreadsheet instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = (jspreadsheet as any)(containerRef.current, {
      worksheets: [
        {
          data: jspData.length > 0 ? jspData : [Array(columnsRef.current.length).fill('')],
          columns: jspColumns,
          minDimensions: [columnsRef.current.length, Math.max(defaultRowCount, 50)],
        },
      ],
      tableOverflow: true,
      tableWidth: '100%',
      tableHeight: typeof height === 'number' ? `${height}px` : height,
      editable: !readOnly,
      allowInsertRow: !readOnly && allowRowOps,
      allowInsertColumn: !readOnly && allowColumnOps,
      allowDeleteRow: !readOnly && allowRowOps,
      allowDeleteColumn: !readOnly && allowColumnOps,
      allowRenameColumn: !readOnly && allowColumnOps,
      columnSorting: true,
      search: true,
      pagination: 100,
      paginationOptions: [25, 50, 100, 250],
      defaultColWidth: 100,
      freezeColumns: 0,
      parseFormulas: enableFormulas,
      autoIncrement: true,
      contextMenu: (obj: unknown, x: number | null, y: number | null, e: MouseEvent) => {
        // Return custom context menu items
        const items: { type?: string; title?: string; onclick?: () => void }[] = []

        if (x !== null && y !== null) {
          // Cell context menu
          items.push({
            title: 'Cut',
            onclick: () => document.execCommand('cut'),
          })
          items.push({
            title: 'Copy',
            onclick: () => document.execCommand('copy'),
          })
          items.push({
            title: 'Paste',
            onclick: () => document.execCommand('paste'),
          })
          items.push({ type: 'divisor' })

          if (allowRowOps && !readOnly) {
            items.push({
              title: 'Insert row above',
              onclick: () => {
                ;(obj as JSpreadsheetInstance).insertRow(1, y, true)
              },
            })
            items.push({
              title: 'Insert row below',
              onclick: () => {
                ;(obj as JSpreadsheetInstance).insertRow(1, y, false)
              },
            })
            items.push({
              title: 'Delete row',
              onclick: () => {
                ;(obj as JSpreadsheetInstance).deleteRow(y, 1)
              },
            })
          }

          if (allowColumnOps && !readOnly) {
            items.push({ type: 'divisor' })
            items.push({
              title: 'Insert column left',
              onclick: () => {
                ;(obj as JSpreadsheetInstance).insertColumn(1, x, true)
              },
            })
            items.push({
              title: 'Insert column right',
              onclick: () => {
                ;(obj as JSpreadsheetInstance).insertColumn(1, x, false)
              },
            })
            items.push({
              title: 'Delete column',
              onclick: () => {
                ;(obj as JSpreadsheetInstance).deleteColumn(x, 1)
              },
            })
          }
        }

        // Add plugin context menu items
        plugins.forEach((plugin) => {
          const pluginItems = plugin.getContextMenuItems?.() || []
          if (pluginItems.length > 0) {
            items.push({ type: 'divisor' })
            pluginItems.forEach((item) => {
              items.push({
                title: item.label,
                onclick: () => item.onClick(x !== null && y !== null ? toA1Notation(y, x) : ''),
              })
            })
          }
        })

        return items
      },
      onchange: (
        instance: unknown,
        cell: HTMLElement,
        x: string | number,
        y: string | number,
        value: string | number | boolean | null
      ) => {
        const col = typeof x === 'string' ? parseInt(x, 10) : x
        const row = typeof y === 'string' ? parseInt(y, 10) : y
        const cellRef = toA1Notation(row, col)

        // Update internal rows ref
        if (rowsRef.current[row]) {
          const colKey = columnsRef.current[col]?.key
          if (colKey) {
            const oldValue = rowsRef.current[row][colKey]
            rowsRef.current[row][colKey] = value
            onCellChange?.({ row, col }, value, oldValue)
          }
        }

        // Update formula bar
        setFormulaValue(String(value ?? ''))
      },
      onselection: (
        instance: unknown,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        origin: unknown
      ) => {
        const startCell = toA1Notation(y1, x1)
        const endCell = toA1Notation(y2, x2)
        const range = x1 === x2 && y1 === y2 ? startCell : `${startCell}:${endCell}`

        setSelectedCell(startCell)
        onSelectionChange?.(range)

        // Update formula bar with selected cell value
        if (spreadsheetRef.current) {
          const value = spreadsheetRef.current.getValue(startCell)
          setFormulaValue(String(value ?? ''))
        }
      },
      oninsertcolumn: (instance: unknown, columnNumber: number, numOfColumns: number, insertBefore: boolean) => {
        // Add new column to our tracking
        const pos = insertBefore ? columnNumber : columnNumber + 1
        for (let i = 0; i < numOfColumns; i++) {
          const newColId = `col_${Date.now()}_${i}`
          const newCol: ColumnDef = {
            id: newColId,
            key: newColId,
            name: columnIndexToLetter(pos + i),
            type: 'text',
            width: 100,
            editable: true,
            order: pos + i,
          }
          columnsRef.current.splice(pos + i, 0, newCol)
        }
        // Reorder
        columnsRef.current.forEach((col, idx) => {
          col.order = idx
        })
      },
      ondeletecolumn: (instance: unknown, columnNumber: number, numOfColumns: number) => {
        columnsRef.current.splice(columnNumber, numOfColumns)
        columnsRef.current.forEach((col, idx) => {
          col.order = idx
        })
      },
      oninsertrow: (instance: unknown, rowNumber: number, numOfRows: number, insertBefore: boolean) => {
        const pos = insertBefore ? rowNumber : rowNumber + 1
        const newRows = generateEmptyRows(numOfRows, columnsRef.current.length)
        rowsRef.current.splice(pos, 0, ...newRows)
      },
      ondeleterow: (instance: unknown, rowNumber: number, numOfRows: number) => {
        rowsRef.current.splice(rowNumber, numOfRows)
      },
    }) as unknown as JSpreadsheetInstance

    spreadsheetRef.current = instance
    setIsInitialized(true)

    // Initialize plugins
    // NOTE: Plugins are only initialized once on mount. If you need plugins
    // to change based on state, ensure they are memoized with proper dependencies.
    // See the `plugins` prop documentation in types.ts for details.
    plugins.forEach((plugin) => {
      plugin.onInit?.(api)
    })

    // Apply initial plugin styling
    requestAnimationFrame(() => {
      if (!spreadsheetRef.current) return
      applyPluginStyling()
    })

    return () => {
      // Destroy plugins
      plugins.forEach((plugin) => {
        plugin.onDestroy?.()
      })

      if (spreadsheetRef.current) {
        try {
          spreadsheetRef.current.destroy()
        } catch {
          // Ignore destruction errors
        }
        spreadsheetRef.current = null
      }
      setIsInitialized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only init once - plugins must be stable references (see types.ts)

  // ==========================================================================
  // PLUGIN STYLING
  // ==========================================================================

  const applyPluginStyling = useCallback(() => {
    if (!spreadsheetRef.current) return

    rowsRef.current.forEach((row, rowIndex) => {
      columnsRef.current.forEach((col, colIndex) => {
        const value = row[col.key]
        const cellRef: CellReference = { row: rowIndex, col: colIndex }

        // Check each plugin for cell styling
        for (const plugin of plugins) {
          const style = plugin.getCellStyle?.(cellRef, value, row, col)
          if (style) {
            const cellStr = toA1Notation(rowIndex, colIndex)
            if (style.backgroundColor) {
              spreadsheetRef.current!.setStyle(cellStr, 'background-color', style.backgroundColor)
            }
            if (style.color) {
              spreadsheetRef.current!.setStyle(cellStr, 'color', style.color)
            }
            if (style.fontWeight) {
              spreadsheetRef.current!.setStyle(cellStr, 'font-weight', style.fontWeight)
            }
            break // First plugin wins
          }
        }
      })
    })
  }, [plugins])

  // Update data when localData changes
  useEffect(() => {
    if (!spreadsheetRef.current || !isInitialized) return
    if (!localData) return

    const newColumns = localData.columns || generateDefaultColumns(defaultColumnCount)
    const newRows = localData.rows || generateEmptyRows(defaultRowCount, newColumns.length)

    columnsRef.current = newColumns
    rowsRef.current = newRows

    const jspData = rowsToJspreadsheet(newRows, newColumns)
    spreadsheetRef.current.setData(jspData)

    // Reapply plugin styling
    requestAnimationFrame(applyPluginStyling)
  }, [localData, isInitialized, applyPluginStyling, defaultColumnCount, defaultRowCount])

  // ==========================================================================
  // FORMULA BAR HANDLER
  // ==========================================================================

  const handleFormulaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormulaValue(e.target.value)
    },
    []
  )

  const handleFormulaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && selectedCell && spreadsheetRef.current) {
        spreadsheetRef.current.setValue(selectedCell, formulaValue)
        // Move to container to allow arrow key navigation
        containerRef.current?.focus()
      } else if (e.key === 'Escape') {
        // Restore original value
        if (selectedCell && spreadsheetRef.current) {
          const value = spreadsheetRef.current.getValue(selectedCell)
          setFormulaValue(String(value ?? ''))
        }
        containerRef.current?.focus()
      }
    },
    [selectedCell, formulaValue]
  )

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      className={cn(
        'relative w-full flex flex-col rounded-lg border border-border overflow-hidden bg-background',
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
          {/* Default toolbar buttons */}
          <button
            onClick={() => api.undo()}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => api.redo()}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Plugin toolbar items */}
          {plugins.flatMap((plugin) =>
            (plugin.getToolbarItems?.() || []).map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                disabled={item.disabled}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                title={item.tooltip || item.label}
              >
                {typeof item.icon === 'string' ? (
                  <span className="text-sm">{item.label}</span>
                ) : item.icon ? (
                  <item.icon />
                ) : (
                  <span className="text-sm">{item.label}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Formula bar */}
      {showFormulaBar && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted/20">
          <span className="text-xs font-mono text-muted-foreground w-12 text-center">
            {selectedCell || 'A1'}
          </span>
          <div className="w-px h-5 bg-border" />
          <span className="text-xs text-muted-foreground">fx</span>
          <input
            type="text"
            value={formulaValue}
            onChange={handleFormulaChange}
            onKeyDown={handleFormulaKeyDown}
            className="flex-1 px-2 py-1 text-sm font-mono bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter value or formula (e.g., =SUM(A1:A10))"
          />
        </div>
      )}

      {/* Spreadsheet container */}
      <div
        ref={containerRef}
        className="flex-1 w-full jspreadsheet-container overflow-auto"
        data-testid="generic-sheet"
        tabIndex={0}
      />

      {/* Sheet tabs */}
      {showSheetTabs && (
        <div className="flex items-center gap-1 px-2 py-1 border-t border-border bg-muted/30">
          <button
            className="px-3 py-1 text-sm font-medium bg-background rounded-t border border-b-0 border-border"
          >
            Sheet 1
          </button>
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Add sheet"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading spreadsheet...</span>
          </div>
        </div>
      )}

      {/* Custom styles for dark mode compatibility */}
      <style jsx global>{`
        .jspreadsheet-container .jexcel {
          font-family: inherit;
        }

        .jspreadsheet-container .jexcel_content {
          background-color: var(--background, #ffffff);
        }

        .jspreadsheet-container .jexcel thead td {
          background-color: var(--muted, #f4f4f5);
          color: var(--foreground, #0a0a0a);
          border-color: var(--border, #e4e4e7);
        }

        .jspreadsheet-container .jexcel tbody td {
          background-color: var(--background, #ffffff);
          color: var(--foreground, #0a0a0a);
          border-color: var(--border, #e4e4e7);
        }

        .jspreadsheet-container .jexcel tbody td.jexcel_selected,
        .jspreadsheet-container .jexcel tbody td.highlight,
        .jspreadsheet-container .jexcel tbody td.highlight-selected {
          background-color: var(--primary, #3b82f6) !important;
          color: var(--primary-foreground, #ffffff) !important;
        }

        .jspreadsheet-container .jexcel .jexcel_pagination {
          background-color: var(--muted, #f4f4f5);
          border-color: var(--border, #e4e4e7);
        }

        .jspreadsheet-container .jexcel .jexcel_pagination select,
        .jspreadsheet-container .jexcel .jexcel_pagination input {
          background-color: var(--background, #ffffff);
          color: var(--foreground, #0a0a0a);
          border-color: var(--border, #e4e4e7);
        }

        /* Context menu styling */
        .jspreadsheet-container .jexcel_contextmenu {
          background-color: var(--background, #ffffff);
          border-color: var(--border, #e4e4e7);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .jspreadsheet-container .jexcel_contextmenu a {
          color: var(--foreground, #0a0a0a);
        }

        .jspreadsheet-container .jexcel_contextmenu a:hover {
          background-color: var(--muted, #f4f4f5);
        }

        /* Dark mode overrides */
        .dark .jspreadsheet-container .jexcel_content {
          background-color: var(--background, #0a0a0a);
        }

        .dark .jspreadsheet-container .jexcel thead td {
          background-color: var(--muted, #27272a);
          color: var(--foreground, #fafafa);
        }

        .dark .jspreadsheet-container .jexcel tbody td {
          background-color: var(--background, #0a0a0a);
          color: var(--foreground, #fafafa);
        }

        .dark .jspreadsheet-container .jexcel .jexcel_pagination {
          background-color: var(--muted, #27272a);
        }

        .dark .jspreadsheet-container .jexcel .jexcel_pagination select,
        .dark .jspreadsheet-container .jexcel .jexcel_pagination input {
          background-color: var(--background, #0a0a0a);
          color: var(--foreground, #fafafa);
        }

        .dark .jspreadsheet-container .jexcel_contextmenu {
          background-color: var(--background, #0a0a0a);
          border-color: var(--border, #27272a);
        }

        .dark .jspreadsheet-container .jexcel_contextmenu a {
          color: var(--foreground, #fafafa);
        }

        .dark .jspreadsheet-container .jexcel_contextmenu a:hover {
          background-color: var(--muted, #27272a);
        }
      `}</style>
    </div>
  )
})

export default GenericSheet
