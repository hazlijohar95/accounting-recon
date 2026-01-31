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
import { useMutation } from 'convex/react'
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
  Plus,
  Play,
  Loader2,
  AlertCircle,
  Check,
  MoreVertical,
  Trash2,
  Sparkles,
  Type,
  Hash,
  RefreshCw,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PremiumButton, ButtonSecondary, ButtonDanger } from '@/components/brand'
import { useSetShowPaywall } from '@/lib/store'

type WorksheetColumn = Doc<'worksheetColumns'>
type WorksheetRow = Doc<'worksheetRows'>

interface WorksheetGridProps {
  worksheetId: Id<'worksheets'>
  columns: WorksheetColumn[]
  rows: WorksheetRow[]
  userId: Id<'users'>
  isDemo?: boolean
}

/**
 * Cell status indicator with brand-consistent styling
 */
function CellStatusIndicator({ status, error }: { status?: string; error?: string }) {
  if (!status || status === 'idle') return null

  return (
    <div className="flex items-center justify-center shrink-0">
      {status === 'pending' && (
        <span title="Pending">
          <div className="w-2 h-2 bg-muted-foreground/40 animate-pulse" />
        </span>
      )}
      {status === 'running' && (
        <span title="Running">
          <Loader2 size={12} className="text-chart-5 animate-spin" />
        </span>
      )}
      {status === 'complete' && (
        <span title="Complete">
          <Check size={12} className="text-success" />
        </span>
      )}
      {status === 'error' && (
        <span title={error || 'Error'}>
          <AlertCircle size={12} className="text-destructive" />
        </span>
      )}
    </div>
  )
}

/**
 * Column type icon
 */
function ColumnTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'number':
      return <Hash size={12} className="text-muted-foreground" />
    case 'formula':
      return <Sparkles size={12} className="text-chart-5" />
    default:
      return <Type size={12} className="text-muted-foreground" />
  }
}

/**
 * Add column popover
 */
function AddColumnPopover({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (type: 'text' | 'number' | 'formula', name: string, formula?: string) => void
}) {
  const [step, setStep] = useState<'type' | 'name' | 'formula'>('type')
  const [selectedType, setSelectedType] = useState<'text' | 'number' | 'formula'>('text')
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setStep('type')
      setName('')
      setFormula('')
    }
  }, [isOpen])

  useEffect(() => {
    if (step === 'name' || step === 'formula') {
      inputRef.current?.focus()
    }
  }, [step])

  if (!isOpen) return null

  const handleTypeSelect = (type: 'text' | 'number' | 'formula') => {
    setSelectedType(type)
    setStep('name')
  }

  const handleNameSubmit = () => {
    if (!name.trim()) return
    if (selectedType === 'formula') {
      setStep('formula')
    } else {
      onAdd(selectedType, name.trim())
      onClose()
    }
  }

  const handleFormulaSubmit = () => {
    if (!formula.trim()) return
    onAdd('formula', name.trim(), formula.trim())
    onClose()
  }

  return (
    <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg z-20 min-w-[200px] animate-in fade-in slide-in-from-top-1 duration-150">
      {step === 'type' && (
        <div className="p-1">
          <button
            onClick={() => handleTypeSelect('text')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
          >
            <Type size={14} />
            Text Column
          </button>
          <button
            onClick={() => handleTypeSelect('number')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
          >
            <Hash size={14} />
            Number Column
          </button>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => handleTypeSelect('formula')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
          >
            <Sparkles size={14} className="text-chart-5" />
            AI Formula Column
          </button>
        </div>
      )}

      {step === 'name' && (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ColumnTypeIcon type={selectedType} />
            <span className="capitalize">{selectedType} column</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Column name..."
            className="w-full px-2 py-1.5 text-sm border border-border bg-background focus:outline-none focus:border-foreground transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit()
              if (e.key === 'Escape') onClose()
            }}
          />
          <div className="flex gap-2">
            <ButtonSecondary size="sm" onClick={onClose} className="flex-1">
              Cancel
            </ButtonSecondary>
            <PremiumButton size="sm" onClick={handleNameSubmit} disabled={!name.trim()} className="flex-1">
              {selectedType === 'formula' ? 'Next' : 'Add'}
            </PremiumButton>
          </div>
        </div>
      )}

      {step === 'formula' && (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles size={12} className="text-chart-5" />
            <span>AI prompt for "{name}"</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder='e.g., "Find the CEO name"'
            className="w-full px-2 py-1.5 text-sm border border-border bg-background focus:outline-none focus:border-foreground transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFormulaSubmit()
              if (e.key === 'Escape') onClose()
            }}
          />
          <p className="text-[10px] text-muted-foreground">
            Uses the first column as input for AI enrichment
          </p>
          <div className="flex gap-2">
            <ButtonSecondary size="sm" onClick={() => setStep('name')} className="flex-1">
              Back
            </ButtonSecondary>
            <PremiumButton size="sm" onClick={handleFormulaSubmit} disabled={!formula.trim()} className="flex-1">
              Add Column
            </PremiumButton>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Main worksheet grid component.
 */
export function WorksheetGrid({ worksheetId, columns, rows, userId, isDemo = false }: WorksheetGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const setShowPaywall = useSetShowPaywall()

  // Guard action helper - shows paywall and returns true if blocked
  const guardAction = () => {
    if (isDemo) {
      setShowPaywall(true)
      return true
    }
    return false
  }

  // Mutations
  const addColumn = useMutation(api.workspaces.addColumn)
  const deleteColumn = useMutation(api.workspaces.deleteColumn)
  const addRow = useMutation(api.workspaces.addRow)
  const addRows = useMutation(api.workspaces.addRows)
  const updateCell = useMutation(api.workspaces.updateCell)
  const deleteRows = useMutation(api.workspaces.deleteRows)
  const createBatchJobs = useMutation(api.agents.createBatchJobs)

  // State
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null)
  const [addColumnOpen, setAddColumnOpen] = useState(false)

  // Close menus on outside click
  useEffect(() => {
    const handleClick = () => {
      setColumnMenuOpen(null)
      setAddColumnOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Handlers
  const handleAddColumn = async (
    type: 'text' | 'number' | 'formula',
    name: string,
    formula?: string
  ) => {
    if (guardAction()) return
    await addColumn({
      worksheetId,
      name,
      columnType: type,
      formula: formula ? `=ENRICH("${formula}")` : undefined,
      dataSource: type === 'formula' ? 'llm' : undefined,
      userId,
    })
  }

  const handleDeleteColumn = async (columnId: Id<'worksheetColumns'>) => {
    if (guardAction()) return
    if (!confirm('Delete this column?')) return
    await deleteColumn({ columnId, userId })
    setColumnMenuOpen(null)
  }

  const handleAddRow = async () => {
    if (guardAction()) return
    await addRow({ worksheetId, userId })
  }

  const handleDeleteSelectedRows = async () => {
    if (guardAction()) return
    if (selectedRows.size === 0) return
    if (!confirm(`Delete ${selectedRows.size} row(s)?`)) return

    await deleteRows({
      rowIds: Array.from(selectedRows) as Id<'worksheetRows'>[],
      userId,
    })
    setSelectedRows(new Set())
  }

  const handleCellClick = (rowId: string, colKey: string, value: unknown) => {
    if (guardAction()) return
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
      await updateCell({
        rowId: editingCell.rowId as Id<'worksheetRows'>,
        columnKey: editingCell.colKey,
        value: editValue,
        userId,
      })
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
    if (guardAction()) return
    if (column.columnType !== 'formula' || !column.formula) return

    const inputColKey = columns.length > 0 ? `col_${columns[0].order}` : 'col_0'

    await createBatchJobs({
      worksheetId,
      columnId: column._id,
      prompt: column.formula.replace(/^=ENRICH\(["'](.*)["']\)$/i, '$1'),
      dataSource: column.dataSource || 'llm',
      inputColumnKey: inputColKey,
      userId,
    })
  }

  // SECURITY: Paste validation limits
  const MAX_PASTE_ROWS = 1000
  const MAX_PASTE_COLUMNS = 50
  const MAX_CELL_LENGTH = 10000

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (guardAction()) {
      e.preventDefault()
      return
    }

    const text = e.clipboardData.getData('text')
    if (!text) return

    // SECURITY: Validate paste size to prevent memory issues
    if (text.length > MAX_PASTE_ROWS * MAX_PASTE_COLUMNS * MAX_CELL_LENGTH) {
      console.warn('Paste data too large, ignoring')
      return
    }

    const lines = text.trim().split('\n')

    // SECURITY: Limit number of rows
    if (lines.length > MAX_PASTE_ROWS) {
      console.warn(`Paste truncated from ${lines.length} to ${MAX_PASTE_ROWS} rows`)
      lines.length = MAX_PASTE_ROWS
    }

    const rowsData = lines.map((line) => {
      const values = line.split('\t')
      const cells: Record<string, unknown> = {}

      // SECURITY: Limit columns and sanitize cell values
      const limitedValues = values.slice(0, MAX_PASTE_COLUMNS)
      limitedValues.forEach((val, i) => {
        // Truncate cell content and sanitize
        const sanitized = val
          .trim()
          .slice(0, MAX_CELL_LENGTH)
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
      await addRows({ worksheetId, rowsData: validRows, userId })
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
            checked={selectedRows.size === rows.length && rows.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRows(new Set(rows.map((r) => r._id)))
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
        header: () => (
          <div
            className="flex items-center gap-2 px-2 h-full group relative"
            onClick={(e) => e.stopPropagation()}
          >
            <ColumnTypeIcon type={col.columnType} />
            <span className="flex-1 truncate text-xs font-medium">{col.name}</span>
            {col.columnType === 'formula' && (
              <button
                onClick={() => handleRunColumn(col)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                title="Run AI enrichment"
              >
                <Play size={10} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setColumnMenuOpen(columnMenuOpen === col._id ? null : col._id)
              }}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
            >
              <MoreVertical size={10} />
            </button>
            {columnMenuOpen === col._id && (
              <div
                className="absolute top-full right-0 mt-1 bg-background border border-border shadow-lg z-20 min-w-[120px] animate-in fade-in slide-in-from-top-1 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {col.columnType === 'formula' && (
                  <button
                    onClick={() => handleRunColumn(col)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-left"
                  >
                    <Play size={12} />
                    Run Enrichment
                  </button>
                )}
                <button
                  onClick={() => handleDeleteColumn(col._id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <Trash2 size={12} />
                  Delete Column
                </button>
              </div>
            )}
          </div>
        ),
        cell: ({ row }: CellContext<WorksheetRow, unknown>) => {
          const value = row.original.cells[colKey]
          const status = row.original.cellStatus?.[colKey]
          const error = row.original.cellErrors?.[colKey]
          const isEditing =
            editingCell?.rowId === row.original._id && editingCell?.colKey === colKey
          const isFormulaCol = col.columnType === 'formula'

          if (isEditing) {
            return (
              <input
                type={col.columnType === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleCellBlur}
                onKeyDown={handleKeyDown}
                className="w-full h-full px-2 py-1 text-sm bg-background border-none outline-none ring-2 ring-foreground"
                autoFocus
              />
            )
          }

          return (
            <div
              onClick={() => handleCellClick(row.original._id, colKey, value)}
              className={cn(
                'w-full h-full px-2 py-1 text-sm cursor-cell flex items-center gap-1.5 transition-colors',
                status === 'running' && 'bg-chart-5/5',
                status === 'error' && 'bg-destructive/5',
                status === 'complete' && isFormulaCol && 'bg-success/5',
                col.columnType === 'number' && 'font-mono tabular-nums justify-end'
              )}
            >
              <CellStatusIndicator status={status} error={error} />
              <span className="truncate flex-1">{value != null ? String(value) : ''}</span>
            </div>
          )
        },
      }
    })

    return [selectorColumn, ...dataColumns]
  }, [columns, rows, selectedRows, editingCell, editValue, columnMenuOpen])

  // React Table instance
  const table = useReactTable({
    data: rows,
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
    <div className="flex flex-col h-full" onPaste={handlePaste}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/20">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (guardAction()) return
              setAddColumnOpen(!addColumnOpen)
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
          >
            <Plus size={12} />
            Column
          </button>
          <AddColumnPopover
            isOpen={addColumnOpen}
            onClose={() => setAddColumnOpen(false)}
            onAdd={handleAddColumn}
          />
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={handleAddRow}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
        >
          <Plus size={12} />
          Row
        </button>

        {selectedRows.size > 0 && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={handleDeleteSelectedRows}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={12} />
              Delete ({selectedRows.size})
            </button>
          </>
        )}

        <div className="flex-1" />

        <span className="text-label px-2">
          {rows.length} row{rows.length !== 1 ? 's' : ''} · {columns.length} col{columns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      <div ref={parentRef} className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse min-w-max">
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="h-9 text-left border-b border-r border-border last:border-r-0 bg-muted"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
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
          </tbody>
        </table>

        {/* Empty state */}
        {rows.length === 0 && columns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                className="text-muted-foreground/30"
              >
                <rect x="8" y="8" width="14" height="10" fill="currentColor" />
                <rect x="26" y="8" width="14" height="10" fill="currentColor" fillOpacity="0.6" />
                <rect x="8" y="22" width="14" height="10" fill="currentColor" fillOpacity="0.4" />
                <rect x="26" y="22" width="14" height="10" fill="currentColor" fillOpacity="0.2" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Empty worksheet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Add columns and rows, or paste data from a spreadsheet
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (guardAction()) return
                  setAddColumnOpen(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <Plus size={12} />
                Add Column
              </button>
            </div>
          </div>
        )}

        {/* Has columns but no rows */}
        {rows.length === 0 && columns.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No rows yet. Add data or paste from spreadsheet.
            </p>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <Plus size={12} />
              Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
