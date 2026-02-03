'use client'

/**
 * Worksheet Grid Component.
 *
 * A spreadsheet-like grid using TanStack Table with:
 * - Inline cell editing
 * - Column management (add, resize, rename)
 * - Row selection and bulk operations
 * - Cell status indicators for AI enrichment
 * - Virtualized scrolling for large datasets
 *
 * Brand-consistent with Reconciled's minimal, geometric aesthetic.
 *
 * @module components/workspace/worksheet-grid
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  CellContext,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  IconPlus,
  IconPlay,
  IconMoreVertical,
  IconTrash,
  IconSparkle,
  IconText,
  IconDownload,
  IconRefresh,
  IconX,
  IconCheck,
  IconWarningCircle,
} from '@/components/brand/icons'
import { useGridNavigation, CellPosition } from '@/hooks/useGridNavigation'
import { useGridHistory, createCellEditAction } from '@/hooks/useGridHistory'
import { useGridSelection, cellKey } from '@/hooks/useGridSelection'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { PremiumButton } from '@/components/brand'
import { CustomSelect } from '@/components/brand/custom-select'
import { useSetShowPaywall } from '@/lib/store'
import { WorksheetChat } from './worksheet-chat'
import { CellStatusIndicator } from './cell-status-indicator'
import { AddColumnPopover, ColumnTypeIcon } from './add-column-popover'
import { CompletelyEmptyState, NoRowsState } from './grid-empty-state'
import { GRID_LIMITS, TOAST_DURATIONS } from './grid.constants'

type WorksheetColumn = Doc<'worksheetColumns'>
type WorksheetRow = Doc<'worksheetRows'>

interface WorksheetGridProps {
  worksheetId: Id<'worksheets'>
  worksheetName?: string
  columns: WorksheetColumn[]
  rows: WorksheetRow[]
  userId: Id<'users'>
  workosUserId?: string
  isDemo?: boolean
}

/**
 * Sortable column header for drag-drop reordering
 */
interface SortableColumnHeaderProps {
  id: string
  children: React.ReactNode
  width: number
}

function SortableColumnHeader({ id, children, width }: SortableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        'h-9 text-left border-b border-r border-border last:border-r-0 bg-muted relative group',
        isDragging && 'opacity-50 z-20'
      )}
      {...attributes}
    >
      <div className="flex items-center h-full">
        {/* Drag handle */}
        <div
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary/50"
          title="Drag to reorder"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground">
            <circle cx="3" cy="2" r="1" fill="currentColor" />
            <circle cx="7" cy="2" r="1" fill="currentColor" />
            <circle cx="3" cy="5" r="1" fill="currentColor" />
            <circle cx="7" cy="5" r="1" fill="currentColor" />
            <circle cx="3" cy="8" r="1" fill="currentColor" />
            <circle cx="7" cy="8" r="1" fill="currentColor" />
          </svg>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </th>
  )
}

/**
 * Main worksheet grid component.
 */
export function WorksheetGrid({ worksheetId, worksheetName = 'worksheet', columns, rows, userId, workosUserId, isDemo = false }: WorksheetGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const setShowPaywall = useSetShowPaywall()

  // Real-time cell status subscription (for live updates during enrichment)
  const cellStatuses = useQuery(
    api.workspaces.getCellStatuses,
    !isDemo ? { worksheetId, workosUserId } : 'skip'
  )

  // Merge cell statuses with rows for real-time updates
  const rowsWithLiveStatus = useMemo(() => {
    if (!cellStatuses || isDemo) return rows

    return rows.map(row => {
      const liveStatus = cellStatuses.find((cs: { rowId: Id<'worksheetRows'> }) => cs.rowId === row._id)
      if (!liveStatus) return row

      return {
        ...row,
        cells: liveStatus.cells,
        cellStatus: liveStatus.cellStatus,
        cellErrors: liveStatus.cellErrors,
        updatedAt: liveStatus.updatedAt,
      }
    })
  }, [rows, cellStatuses, isDemo])

  // Guard action - blocks actions when in demo mode
  // Returns true if action should be blocked
  const guardAction = useCallback((actionType?: 'ai' | 'edit' | 'delete') => {
    // Demo mode: allow basic edits but block AI-intensive operations
    if (isDemo) {
      // For demo mode, block AI enrichment operations
      if (actionType === 'ai') {
        setShowPaywall(true)
        return true
      }
      // Allow basic edits in demo mode for trial experience
      return false
    }
    return false
  }, [isDemo, setShowPaywall])

  // Mutations
  const addColumn = useMutation(api.workspaces.addColumn)
  const deleteColumn = useMutation(api.workspaces.deleteColumn)
  const updateColumn = useMutation(api.workspaces.updateColumn)
  const addRow = useMutation(api.workspaces.addRow)
  const addRows = useMutation(api.workspaces.addRows)
  const updateCell = useMutation(api.workspaces.updateCell)
  const deleteRows = useMutation(api.workspaces.deleteRows)
  const reorderColumns = useMutation(api.workspaces.reorderColumns)
  const updateColumnWidth = useMutation(api.workspaces.updateColumnWidth)
  const createBatchJobs = useMutation(api.agents.createBatchJobs)
  const createJob = useMutation(api.agents.createJob)

  // DnD sensors for column reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  )

  // Handle column drag end
  const handleColumnDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Get column IDs in new order
    const oldIndex = columns.findIndex(c => c._id === active.id)
    const newIndex = columns.findIndex(c => c._id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Create new order array
    const newColumnIds = columns.map(c => c._id)
    const [removed] = newColumnIds.splice(oldIndex, 1)
    newColumnIds.splice(newIndex, 0, removed)

    // Optimistic update handled by Convex reactivity
    await reorderColumns({
      worksheetId,
      columnIds: newColumnIds,
      workosUserId,
    })
  }, [columns, worksheetId, workosUserId, reorderColumns])

  // State
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [editingInputColumn, setEditingInputColumn] = useState<Id<'worksheetColumns'> | null>(null)
  const [cellMenuOpen, setCellMenuOpen] = useState<{
    rowId: string
    colKey: string
    columnId: Id<'worksheetColumns'>
    position: { x: number; y: number }
  } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    details?: string
  } | null>(null)

  // Show toast with auto-dismiss
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info', details?: string) => {
    setToast({ message, type, details })
    const duration = type === 'error' ? TOAST_DURATIONS.ERROR : TOAST_DURATIONS.DEFAULT
    setTimeout(() => setToast(null), duration)
  }, [])

  // Undo/Redo history
  const { pushAction, canUndo, canRedo, undo, redo } = useGridHistory({
    onUndo: (action) => {
      showToast(`Undone: ${action.description}`, 'info')
    },
    onRedo: (action) => {
      showToast(`Redone: ${action.description}`, 'info')
    },
  })

  // Helper to update cell with history tracking
  const updateCellWithHistory = useCallback(async (
    rowId: Id<'worksheetRows'>,
    columnKey: string,
    newValue: unknown,
    previousValue: unknown
  ) => {
    // Perform the update
    await updateCell({
      rowId,
      columnKey,
      value: newValue,
      workosUserId,
    })

    // Push to history
    pushAction(createCellEditAction(
      rowId,
      columnKey,
      previousValue,
      newValue,
      async (rId, cKey, value) => {
        await updateCell({
          rowId: rId as Id<'worksheetRows'>,
          columnKey: cKey,
          value,
          workosUserId,
        })
      }
    ))
  }, [updateCell, workosUserId, pushAction])

  // Close menus on outside click
  useEffect(() => {
    const handleClick = () => {
      setColumnMenuOpen(null)
      setAddColumnOpen(false)
      setCellMenuOpen(null)
      setEditingInputColumn(null)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Handlers
  const handleAddColumn = async (
    type: 'text' | 'number' | 'formula',
    name: string,
    formula?: string,
    inputColumnId?: Id<'worksheetColumns'>
  ) => {
    // Block AI formula columns in demo mode
    if (type === 'formula' && guardAction('ai')) return
    if (guardAction('edit')) return
    await addColumn({
      worksheetId,
      name,
      columnType: type,
      formula: formula ? `=ENRICH("${formula}")` : undefined,
      dataSource: type === 'formula' ? 'llm' : undefined,
      inputColumnId,
      workosUserId,
    })
  }

  const handleDeleteColumn = async (columnId: Id<'worksheetColumns'>) => {
    if (guardAction('delete')) return
    if (!confirm('Delete this column?')) return
    try {
      await deleteColumn({ columnId, workosUserId })
    } catch (err) {
      // Show error to user (e.g., dependency error)
      alert(err instanceof Error ? err.message : 'Failed to delete column')
    }
    setColumnMenuOpen(null)
  }

  const handleUpdateInputColumn = async (
    columnId: Id<'worksheetColumns'>,
    newInputColumnId: Id<'worksheetColumns'> | null
  ) => {
    if (guardAction('edit')) return
    await updateColumn({
      columnId,
      inputColumnId: newInputColumnId,
      workosUserId,
    })
    setEditingInputColumn(null)
    setColumnMenuOpen(null)
  }

  const handleAddRow = useCallback(async () => {
    if (guardAction('edit')) return
    await addRow({ worksheetId, workosUserId })
  }, [guardAction, addRow, worksheetId, workosUserId])

  // Convert editing cell to position format for navigation hook
  const getEditingPosition = useCallback((): CellPosition | null => {
    if (!editingCell) return null
    const rowIndex = rowsWithLiveStatus.findIndex(r => r._id === editingCell.rowId)
    const colIndex = columns.findIndex(c => `col_${c.order}` === editingCell.colKey)
    if (rowIndex === -1 || colIndex === -1) return null
    return { rowIndex, colIndex }
  }, [editingCell, rowsWithLiveStatus, columns])

  // Keyboard navigation handlers
  const handleNavEditStart = useCallback((position: CellPosition, initialValue?: string) => {
    if (guardAction('edit')) return
    const row = rowsWithLiveStatus[position.rowIndex]
    const col = columns[position.colIndex]
    if (!row || !col) return
    const colKey = `col_${col.order}`
    const currentValue = row.cells[colKey]
    setEditingCell({ rowId: row._id, colKey })
    setEditValue(initialValue ?? String(currentValue ?? ''))
  }, [rowsWithLiveStatus, columns, guardAction])

  const handleNavEditConfirm = useCallback(async () => {
    if (!editingCell) return
    if (isDemo) {
      setEditingCell(null)
      return
    }

    const row = rows.find((r) => r._id === editingCell.rowId)
    const currentValue = row?.cells[editingCell.colKey]

    if (String(currentValue ?? '') !== editValue) {
      await updateCellWithHistory(
        editingCell.rowId as Id<'worksheetRows'>,
        editingCell.colKey,
        editValue,
        currentValue
      )
    }
    setEditingCell(null)
  }, [editingCell, rows, editValue, isDemo, updateCellWithHistory])

  const handleNavEditCancel = useCallback(() => {
    setEditingCell(null)
  }, [])

  const handleNavClearCell = useCallback(async (position: CellPosition) => {
    if (guardAction('edit')) return
    const row = rowsWithLiveStatus[position.rowIndex]
    const col = columns[position.colIndex]
    if (!row || !col) return
    const colKey = `col_${col.order}`
    const currentValue = row.cells[colKey]
    if (currentValue !== '' && currentValue != null) {
      await updateCellWithHistory(
        row._id as Id<'worksheetRows'>,
        colKey,
        '',
        currentValue
      )
    }
  }, [rowsWithLiveStatus, columns, guardAction, updateCellWithHistory])

  // Grid navigation hook
  const {
    focusedCell,
    setFocusedCell,
    handleKeyDown: handleGridKeyDown,
    handleCellFocus,
    handleCellDoubleClick,
    isCellFocused,
    gridRef,
  } = useGridNavigation({
    rowCount: rowsWithLiveStatus.length,
    colCount: columns.length,
    onEditStart: handleNavEditStart,
    onEditConfirm: handleNavEditConfirm,
    onEditCancel: handleNavEditCancel,
    onClearCell: handleNavClearCell,
    onAddRow: handleAddRow,
    isEditing: editingCell !== null,
    editingPosition: getEditingPosition(),
  })

  // Cell selection hook
  const {
    selectedCells,
    isCellSelected,
    handleCellMouseDown: handleSelectionMouseDown,
    handleCellMouseEnter: handleSelectionMouseEnter,
    handleMouseUp: handleSelectionMouseUp,
    selectRow: selectEntireRow,
    selectColumn: selectEntireColumn,
    selectAll,
    clearSelection,
    isDragging: isSelectionDragging,
  } = useGridSelection({
    rowCount: rowsWithLiveStatus.length,
    colCount: columns.length,
  })

  // Handle Cmd/Ctrl+A for select all
  useEffect(() => {
    const handleSelectAllKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !editingCell) {
        e.preventDefault()
        selectAll()
      }
    }
    window.addEventListener('keydown', handleSelectAllKeydown)
    return () => window.removeEventListener('keydown', handleSelectAllKeydown)
  }, [selectAll, editingCell])

  // End drag selection on global mouse up
  useEffect(() => {
    if (isSelectionDragging) {
      window.addEventListener('mouseup', handleSelectionMouseUp)
      return () => window.removeEventListener('mouseup', handleSelectionMouseUp)
    }
  }, [isSelectionDragging, handleSelectionMouseUp])

  const handleDeleteSelectedRows = async () => {
    if (guardAction('delete')) return
    if (selectedRows.size === 0) return
    if (!confirm(`Delete ${selectedRows.size} row(s)?`)) return

    await deleteRows({
      rowIds: Array.from(selectedRows) as Id<'worksheetRows'>[],
      workosUserId,
    })
    setSelectedRows(new Set())
  }

  const handleCellClick = (rowId: string, colKey: string, value: unknown) => {
    if (guardAction('edit')) return
    setEditingCell({ rowId, colKey })
    setEditValue(String(value ?? ''))
  }

  const handleCellBlur = async () => {
    if (!editingCell) return
    if (isDemo) {
      setEditingCell(null)
      return
    }

    const row = rows.find((r) => r._id === editingCell.rowId)
    const currentValue = row?.cells[editingCell.colKey]

    if (String(currentValue ?? '') !== editValue) {
      await updateCellWithHistory(
        editingCell.rowId as Id<'worksheetRows'>,
        editingCell.colKey,
        editValue,
        currentValue
      )
    }

    setEditingCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const handleRunColumn = async (column: WorksheetColumn) => {
    if (guardAction('ai')) return
    if (column.columnType !== 'formula' || !column.formula) return

    // Use inputColumnId if set, otherwise default to first non-formula column
    let inputColKey: string
    if (column.inputColumnId) {
      const inputColumn = columns.find(c => c._id === column.inputColumnId)
      inputColKey = inputColumn ? `col_${inputColumn.order}` : `col_${columns[0]?.order ?? 0}`
    } else {
      // Find first non-formula column that isn't this column itself
      const availableInputColumns = columns.filter(c =>
        c.columnType !== 'formula' && c._id !== column._id
      )
      if (availableInputColumns.length === 0) {
        showToast('No input columns available', 'error', 'Add a text or number column first to use as input for AI enrichment.')
        return
      }
      inputColKey = `col_${availableInputColumns[0].order}`
    }

    try {
      const result = await createBatchJobs({
        worksheetId,
        columnId: column._id,
        prompt: column.formula.replace(/^=ENRICH\(["'](.*)["']\)$/i, '$1'),
        dataSource: column.dataSource || 'llm',
        inputColumnKey: inputColKey,
        userId,
      })

      if (result.created === 0) {
        showToast('No jobs created', 'info', 'All rows either have existing values, pending jobs, or empty input cells.')
      } else {
        showToast(
          result.message || `Created ${result.created} enrichment jobs`,
          'success',
          result.hasMore ? `${result.created} of 100 max per batch. Run again for more.` : undefined
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage.includes('Insufficient credits')) {
        showToast('Insufficient credits', 'error', 'Purchase more credits to run AI enrichment.')
      } else if (errorMessage.includes('not yet available')) {
        showToast('Data source not available', 'error', errorMessage)
      } else {
        showToast('Failed to create jobs', 'error', errorMessage)
      }
    }
  }

  /**
   * Run AI enrichment on a single cell
   */
  const handleRunCell = async (
    rowId: Id<'worksheetRows'>,
    columnId: Id<'worksheetColumns'>,
    colKey: string
  ) => {
    if (guardAction('ai')) return
    const column = columns.find(c => c._id === columnId)
    if (!column?.formula) return
    const row = rowsWithLiveStatus.find(r => r._id === rowId)
    if (!row) return

    // Use inputColumnId if set, otherwise default to first non-formula column
    let inputColKey: string
    if (column.inputColumnId) {
      const inputColumn = columns.find(c => c._id === column.inputColumnId)
      inputColKey = inputColumn ? `col_${inputColumn.order}` : `col_${columns[0]?.order ?? 0}`
    } else {
      // Find first non-formula column that isn't this column itself
      const availableInputColumns = columns.filter(c =>
        c.columnType !== 'formula' && c._id !== column._id
      )
      if (availableInputColumns.length === 0) {
        showToast('No input column available', 'error')
        setCellMenuOpen(null)
        return
      }
      inputColKey = `col_${availableInputColumns[0].order}`
    }

    const input = row.cells[inputColKey]
    if (!input) {
      showToast('Input cell is empty', 'info', 'Add data to the input column first.')
      setCellMenuOpen(null)
      return
    }

    try {
      await createJob({
        worksheetId,
        rowId,
        columnId,
        input: String(input),
        prompt: column.formula.replace(/^=ENRICH\(["'](.*)["']\)$/i, '$1'),
        dataSource: column.dataSource || 'llm',
        userId,
      })
      showToast('Enrichment started', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage.includes('Insufficient credits')) {
        showToast('Insufficient credits', 'error')
      } else {
        showToast('Failed to start enrichment', 'error', errorMessage)
      }
    }
    setCellMenuOpen(null)
  }

  /**
   * Export worksheet data as CSV
   */
  const handleExportCSV = useCallback(() => {
    // Build header row from column names
    const headers = columns.map(col => col.name)
    const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')

    // Build data rows
    const dataRows = rowsWithLiveStatus.map(row => {
      return columns.map(col => {
        const colKey = `col_${col.order}`
        const value = row.cells[colKey] ?? ''
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    })

    // Combine header and data
    const csv = [headerRow, ...dataRows].join('\n')

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${worksheetName.replace(/[^a-z0-9]/gi, '_')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [columns, rowsWithLiveStatus, worksheetName])

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (guardAction('edit')) {
      e.preventDefault()
      return
    }

    const text = e.clipboardData.getData('text')
    if (!text) return

    // SECURITY: Validate paste size to prevent memory issues
    const maxTotalSize = GRID_LIMITS.MAX_PASTE_ROWS * GRID_LIMITS.MAX_PASTE_COLUMNS * GRID_LIMITS.MAX_CELL_LENGTH
    if (text.length > maxTotalSize) {
      console.warn('Paste data too large, ignoring')
      return
    }

    const lines = text.trim().split('\n')

    // SECURITY: Limit number of rows
    if (lines.length > GRID_LIMITS.MAX_PASTE_ROWS) {
      console.warn(`Paste truncated from ${lines.length} to ${GRID_LIMITS.MAX_PASTE_ROWS} rows`)
      lines.length = GRID_LIMITS.MAX_PASTE_ROWS
    }

    const rowsData = lines.map((line) => {
      const values = line.split('\t')
      const cells: Record<string, unknown> = {}

      // SECURITY: Limit columns and sanitize cell values
      const limitedValues = values.slice(0, GRID_LIMITS.MAX_PASTE_COLUMNS)
      limitedValues.forEach((val, i) => {
        // Truncate cell content and sanitize
        const sanitized = val
          .trim()
          .slice(0, GRID_LIMITS.MAX_CELL_LENGTH)
          // Remove null bytes and control characters (except newlines within cells)
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        cells[`col_${i}`] = sanitized
      })
      return cells
    })

    // Filter out empty rows
    const validRows = rowsData.filter((cells) =>
      Object.values(cells).some((v) => v !== '')
    )

    if (validRows.length > 0) {
      e.preventDefault()
      await addRows({ worksheetId, rowsData: validRows, workosUserId })
    }
  }

  // Build table columns
  const tableColumns = useMemo<ColumnDef<WorksheetRow>[]>(() => {
    // Row selector column
    const selectorColumn: ColumnDef<WorksheetRow> = {
      id: 'select',
      size: 40,
      header: () => (
        <div className="flex items-center justify-center h-full">
          <input
            type="checkbox"
            checked={selectedRows.size === rowsWithLiveStatus.length && rowsWithLiveStatus.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRows(new Set(rowsWithLiveStatus.map((r) => r._id)))
              } else {
                setSelectedRows(new Set())
              }
            }}
            className="w-3.5 h-3.5 accent-foreground"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center h-full">
          <input
            type="checkbox"
            checked={selectedRows.has(row.original._id)}
            onChange={(e) => {
              const newSelected = new Set(selectedRows)
              if (e.target.checked) {
                newSelected.add(row.original._id)
              } else {
                newSelected.delete(row.original._id)
              }
              setSelectedRows(newSelected)
            }}
            className="w-3.5 h-3.5 accent-foreground"
          />
        </div>
      ),
    }

    // Data columns
    const dataColumns: ColumnDef<WorksheetRow>[] = columns.map((col) => {
      const colKey = `col_${col.order}`

      return {
        id: col._id,
        accessorFn: (row) => row.cells[colKey],
        size: col.width || 160,
        header: () => {
          // Find input column name for display
          const inputColumnName = col.inputColumnId
            ? columns.find(c => c._id === col.inputColumnId)?.name
            : null

          return (
          <div
            className="flex items-center gap-2 px-2 h-full group relative"
            onClick={(e) => e.stopPropagation()}
          >
            <ColumnTypeIcon type={col.columnType} />
            <div className="flex-1 truncate">
              <span className="text-xs font-medium">{col.name}</span>
              {col.columnType === 'formula' && inputColumnName && (
                <span className="text-[9px] text-muted-foreground ml-1">
                  from @{inputColumnName}
                </span>
              )}
              {col.columnType === 'formula' && !col.inputColumnId && columns.length > 1 && (
                <span className="text-[9px] text-amber-600 ml-1">
                  (first col)
                </span>
              )}
            </div>
            {col.columnType === 'formula' && (
              <button
                onClick={() => handleRunColumn(col)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                title="Run AI enrichment"
              >
                <IconPlay size={10} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setColumnMenuOpen(columnMenuOpen === col._id ? null : col._id)
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
            >
              <IconMoreVertical size={10} />
            </button>
            {columnMenuOpen === col._id && (
              <div
                className="absolute top-full right-0 mt-1 bg-background border border-border shadow-lg z-20 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {col.columnType === 'formula' && (
                  <>
                    <button
                      onClick={() => handleRunColumn(col)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-left"
                    >
                      <IconPlay size={12} />
                      Run Enrichment
                    </button>
                    {/* Edit Input Column option */}
                    {editingInputColumn === col._id ? (
                      <div className="px-3 py-2 space-y-2 border-t border-border">
                        <p className="text-[10px] text-muted-foreground">Select input column:</p>
                        <CustomSelect
                          value={col.inputColumnId || ''}
                          onChange={(value) => {
                            handleUpdateInputColumn(
                              col._id,
                              value ? value as Id<'worksheetColumns'> : null
                            )
                          }}
                          options={columns
                            .filter(c => c.columnType !== 'formula' && c._id !== col._id)
                            .map(c => ({ value: c._id, label: c.name }))
                          }
                          placeholder="First column (default)"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingInputColumn(col._id)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-left"
                      >
                        <IconText size={12} />
                        Change Input Column
                      </button>
                    )}
                    <div className="border-t border-border" />
                  </>
                )}
                <button
                  onClick={() => handleDeleteColumn(col._id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <IconTrash size={12} />
                  Delete Column
                </button>
              </div>
            )}
          </div>
        )},
        cell: ({ row }: CellContext<WorksheetRow, unknown>) => {
          const value = row.original.cells[colKey]
          const status = row.original.cellStatus?.[colKey]
          const error = row.original.cellErrors?.[colKey]
          const isEditing =
            editingCell?.rowId === row.original._id && editingCell?.colKey === colKey
          const isFormulaCol = col.columnType === 'formula'

          // Get row and column indices for keyboard navigation
          const rowIndex = rowsWithLiveStatus.findIndex(r => r._id === row.original._id)
          const colIndex = columns.findIndex(c => c._id === col._id)
          const cellPosition = { rowIndex, colIndex }
          const isFocused = isCellFocused(cellPosition)
          const isSelected = isCellSelected(cellPosition)

          if (isEditing) {
            return (
              <input
                type={col.columnType === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleCellBlur}
                onKeyDown={handleKeyDown}
                className="w-full h-full px-2 py-1 text-sm bg-background border-none outline-none ring-2 ring-chart-5"
                autoFocus
              />
            )
          }

          return (
            <>
              <div
                onClick={(e) => {
                  handleCellFocus(cellPosition)
                  handleCellClick(row.original._id, colKey, value)
                }}
                onMouseDown={(e) => handleSelectionMouseDown(cellPosition, e)}
                onMouseEnter={() => handleSelectionMouseEnter(cellPosition)}
                onDoubleClick={() => handleCellDoubleClick(cellPosition)}
                onContextMenu={(e) => {
                  // Only show context menu for formula columns
                  if (col.columnType !== 'formula') return
                  e.preventDefault()
                  setCellMenuOpen({
                    rowId: row.original._id,
                    colKey,
                    columnId: col._id,
                    position: { x: e.clientX, y: e.clientY },
                  })
                }}
                tabIndex={isFocused ? 0 : -1}
                className={cn(
                  'w-full h-full px-2 py-1 text-sm cursor-cell flex items-center gap-1.5 transition-all outline-none select-none',
                  status === 'running' && 'bg-chart-5/5',
                  status === 'error' && 'bg-destructive/5',
                  status === 'complete' && isFormulaCol && 'bg-success/5',
                  col.columnType === 'number' && 'font-mono tabular-nums justify-end',
                  // Selection styling - light blue background
                  isSelected && !isFocused && 'bg-chart-5/10',
                  // Focus ring styling - blue border for focused cell
                  isFocused && 'ring-2 ring-chart-5 ring-inset z-10'
                )}
              >
                <CellStatusIndicator status={status} error={error} />
                <span className="truncate flex-1">{value != null ? String(value) : ''}</span>
              </div>
              {/* Per-cell AI context menu */}
              {cellMenuOpen?.rowId === row.original._id && cellMenuOpen?.colKey === colKey && createPortal(
                <div
                  className="fixed bg-background border border-border shadow-lg z-50 min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{ left: cellMenuOpen.position.x, top: cellMenuOpen.position.y }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleRunCell(row.original._id as Id<'worksheetRows'>, col._id, colKey)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-left"
                  >
                    {value ? (
                      <>
                        <IconRefresh size={12} className="text-chart-5" />
                        Re-run AI
                      </>
                    ) : (
                      <>
                        <IconSparkle size={12} className="text-chart-5" />
                        Run AI
                      </>
                    )}
                  </button>
                </div>,
                document.body
              )}
            </>
          )
        },
      }
    })

    return [selectorColumn, ...dataColumns]
  }, [
    columns,
    rowsWithLiveStatus,
    selectedRows,
    editingCell,
    editValue,
    columnMenuOpen,
    cellMenuOpen,
    editingInputColumn,
    isCellFocused,
    handleCellFocus,
    handleCellDoubleClick,
    isCellSelected,
    handleSelectionMouseDown,
    handleSelectionMouseEnter,
    handleRunColumn,
    handleDeleteColumn,
    handleUpdateInputColumn,
    handleCellBlur,
    handleCellClick,
    handleRunCell,
  ])

  // React Table instance
  const table = useReactTable({
    data: rowsWithLiveStatus,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row._id,
  })

  // Virtualization
  const { rows: tableRows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0

  return (
    <div className="flex h-full" onPaste={handlePaste}>
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/20">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (guardAction('edit')) return
              setAddColumnOpen(!addColumnOpen)
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          >
            <IconPlus size={12} />
            Column
          </button>
          <AddColumnPopover
            isOpen={addColumnOpen}
            onClose={() => setAddColumnOpen(false)}
            onAdd={handleAddColumn}
            existingColumns={columns}
          />
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={handleAddRow}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
        >
          <IconPlus size={12} />
          Row
        </button>

        {selectedRows.size > 0 && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={handleDeleteSelectedRows}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <IconTrash size={12} />
              Delete ({selectedRows.size})
            </button>
          </>
        )}

        <div className="flex-1" />

        {/* Chat button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors",
            isChatOpen ? "bg-chart-5/10 text-chart-5" : "hover:bg-secondary"
          )}
          title="Chat with data"
        >
          <IconSparkle size={12} className={isChatOpen ? "text-chart-5" : ""} />
          Chat
        </button>

        {/* Export button */}
        {rowsWithLiveStatus.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
            title="Export as CSV"
          >
            <IconDownload size={12} />
            Export
          </button>
        )}

        <span className="text-label px-2">
          {rowsWithLiveStatus.length} row{rowsWithLiveStatus.length !== 1 ? 's' : ''} · {columns.length} col{columns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      <div
        ref={(node) => {
          // Combine parentRef for virtualization and gridRef for keyboard navigation
          parentRef.current = node
          gridRef.current = node
        }}
        className="flex-1 overflow-auto scrollbar-thin focus:outline-none"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleColumnDragEnd}
        >
        <table className="w-full border-collapse min-w-max">
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {/* Non-sortable selector column */}
                {headerGroup.headers.slice(0, 1).map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="h-9 text-left border-b border-r border-border bg-muted"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
                {/* Sortable data columns */}
                <SortableContext
                  items={columns.map(c => c._id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {headerGroup.headers.slice(1).map((header) => (
                    <SortableColumnHeader
                      key={header.id}
                      id={header.id}
                      width={header.getSize()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </SortableColumnHeader>
                  ))}
                </SortableContext>
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = tableRows[virtualRow.index]
              const isSelected = selectedRows.has(row.id)
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors',
                    isSelected ? 'bg-secondary' : 'hover:bg-secondary/30'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="h-9 border-b border-r border-border last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
            {/* Add row button at bottom */}
            {columns.length > 0 && (
              <tr className="group">
                <td
                  colSpan={columns.length + 1}
                  className="h-9 border-b border-border"
                >
                  <button
                    onClick={handleAddRow}
                    className="w-full h-full px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-1.5 opacity-50 group-hover:opacity-100"
                  >
                    <IconPlus size={12} />
                    Add row
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </DndContext>

        {/* Empty state */}
        {rowsWithLiveStatus.length === 0 && columns.length === 0 && (
          <CompletelyEmptyState
            onAddColumn={() => {
              if (guardAction('edit')) return
              setAddColumnOpen(true)
            }}
          />
        )}

        {/* Has columns but no rows */}
        {rowsWithLiveStatus.length === 0 && columns.length > 0 && (
          <NoRowsState onAddRow={handleAddRow} />
        )}
      </div>
      </div>

      {/* Chat Panel */}
      {isChatOpen && (
        <WorksheetChat
          worksheetId={worksheetId}
          worksheetName={worksheetName}
          columns={columns}
          rows={rowsWithLiveStatus}
          workosUserId={workosUserId}
          onClose={() => setIsChatOpen(false)}
          className="w-80 shrink-0"
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className={cn(
          "fixed bottom-4 right-4 z-50 max-w-sm p-4 shadow-lg animate-in slide-in-from-bottom-2 duration-200",
          "border",
          toast.type === 'error' && "bg-destructive/10 border-destructive/30",
          toast.type === 'success' && "bg-success/10 border-success/30",
          toast.type === 'info' && "bg-muted border-border"
        )}>
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' && <IconWarningCircle size={16} className="text-destructive" />}
              {toast.type === 'success' && <IconCheck size={16} className="text-success" />}
              {toast.type === 'info' && <IconSparkle size={16} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                toast.type === 'error' && "text-destructive",
                toast.type === 'success' && "text-success",
                toast.type === 'info' && "text-foreground"
              )}>
                {toast.message}
              </p>
              {toast.details && (
                <p className="text-xs text-muted-foreground mt-1">{toast.details}</p>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 p-1 hover:bg-secondary transition-colors"
            >
              <IconX size={12} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
