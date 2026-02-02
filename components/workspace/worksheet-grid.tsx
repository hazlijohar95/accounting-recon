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
  IconLoader,
  IconWarningCircle,
  IconCheck,
  IconMoreVertical,
  IconTrash,
  IconSparkle,
  IconHash,
  IconText,
  IconDownload,
  IconRefresh,
  IconX,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import { PremiumButton, ButtonSecondary, ButtonDanger } from '@/components/brand'
import { useSetShowPaywall } from '@/lib/store'
import { WorksheetChat } from './worksheet-chat'

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
 * Cell status indicator with brand-consistent styling
 */
function CellStatusIndicator({ status, error }: { status?: string; error?: string }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!status || status === 'idle') return null

  // Format error message for display (show more context)
  const formatError = (err?: string) => {
    if (!err) return 'An error occurred'
    // Truncate very long errors but show more than before
    if (err.length > 500) return err.slice(0, 500) + '...'
    return err
  }

  // Copy full error to clipboard
  const handleCopyError = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!error) return
    try {
      await navigator.clipboard.writeText(error)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = error
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative flex items-center justify-center shrink-0">
      {status === 'pending' && (
        <span title="Pending - waiting to process">
          <div className="w-2 h-2 bg-muted-foreground/40 animate-pulse" />
        </span>
      )}
      {status === 'running' && (
        <span title="Running - AI enrichment in progress">
          <IconLoader size={12} className="text-chart-5 animate-spin" />
        </span>
      )}
      {status === 'complete' && (
        <span title="Complete - enrichment successful">
          <IconCheck size={12} className="text-success" />
        </span>
      )}
      {status === 'error' && (
        <span
          className="cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={(e) => {
            e.stopPropagation()
            setShowTooltip(!showTooltip)
          }}
        >
          <IconWarningCircle size={12} className="text-destructive" />
          {showTooltip && (
            <div className="absolute z-50 left-0 top-full mt-1 max-w-md p-3 text-xs bg-background border border-destructive/30 shadow-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-medium text-destructive">Enrichment Error</span>
                <button
                  onClick={handleCopyError}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title={copied ? "Copied!" : "Copy error"}
                >
                  {copied ? (
                    <IconCheck size={12} className="text-success" />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 4h8v8H4z" fillOpacity="0.3" />
                      <path d="M2 2h8v8H2z" fill="currentColor" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {formatError(error)}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t border-border">
                Right-click the cell to retry
              </p>
            </div>
          )}
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
      return <IconHash size={12} className="text-muted-foreground" />
    case 'formula':
      return <IconSparkle size={12} className="text-chart-5" />
    default:
      return <IconText size={12} className="text-muted-foreground" />
  }
}

/**
 * Step indicator for multi-step wizard
 */
function StepIndicator({
  currentStep,
  totalSteps
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
      <span className="text-[10px] text-muted-foreground font-medium">
        Step {currentStep} of {totalSteps}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-1.5 h-1.5 transition-colors',
              i < currentStep ? 'bg-foreground' : 'bg-muted-foreground/30'
            )}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Custom select dropdown matching design system
 */
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  autoFocus?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Auto focus
  useEffect(() => {
    if (autoFocus) {
      setIsOpen(true)
    }
  }, [autoFocus])

  const selectedOption = options.find(o => o.value === value)
  const displayValue = selectedOption?.label || placeholder || 'Select...'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={cn(
          'w-full px-2 py-1.5 text-sm text-left border border-border bg-background',
          'focus:outline-none focus:border-foreground transition-colors',
          'flex items-center justify-between gap-2',
          !selectedOption && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{displayValue}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg z-30 max-h-[200px] overflow-y-auto">
          {placeholder && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-2 py-1.5 text-sm text-left hover:bg-secondary transition-colors',
                value === '' && 'bg-secondary'
              )}
            >
              {placeholder}
            </button>
          )}
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-2 py-1.5 text-sm text-left hover:bg-secondary transition-colors',
                value === option.value && 'bg-secondary'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Add column popover
 */
function AddColumnPopover({
  isOpen,
  onClose,
  onAdd,
  existingColumns,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (type: 'text' | 'number' | 'formula', name: string, formula?: string, inputColumnId?: Id<'worksheetColumns'>) => void
  existingColumns: WorksheetColumn[]
}) {
  const [step, setStep] = useState<'type' | 'name' | 'formula' | 'input'>('type')
  const [selectedType, setSelectedType] = useState<'text' | 'number' | 'formula'>('text')
  const [name, setName] = useState('')
  const [formula, setFormula] = useState('')
  const [selectedInputColumnId, setSelectedInputColumnId] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter to only show non-formula columns as input options
  const inputColumnOptions = existingColumns.filter(c => c.columnType !== 'formula')

  useEffect(() => {
    if (isOpen) {
      setStep('type')
      setName('')
      setFormula('')
      setSelectedInputColumnId('')
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
    // Show input selection step if there are input column options
    if (inputColumnOptions.length > 0) {
      setStep('input')
    } else {
      // No input columns available, just add the formula column
      onAdd('formula', name.trim(), formula.trim())
      onClose()
    }
  }

  const handleInputSubmit = () => {
    onAdd(
      'formula',
      name.trim(),
      formula.trim(),
      selectedInputColumnId ? selectedInputColumnId as Id<'worksheetColumns'> : undefined
    )
    onClose()
  }

  return (
    <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg z-20 min-w-[220px] animate-in fade-in slide-in-from-top-1 duration-150">
      {step === 'type' && (
        <div className="p-3">
          <StepIndicator currentStep={1} totalSteps={selectedType === 'formula' && inputColumnOptions.length > 0 ? 4 : selectedType === 'formula' ? 3 : 2} />
          <div className="space-y-1">
            <button
              onClick={() => handleTypeSelect('text')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
            >
              <IconText size={14} />
              Text Column
            </button>
            <button
              onClick={() => handleTypeSelect('number')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
            >
              <IconHash size={14} />
              Number Column
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={() => handleTypeSelect('formula')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
            >
              <IconSparkle size={14} className="text-chart-5" />
              AI Formula Column
            </button>
          </div>
        </div>
      )}

      {step === 'name' && (
        <div className="p-3 space-y-3">
          <StepIndicator currentStep={2} totalSteps={selectedType === 'formula' && inputColumnOptions.length > 0 ? 4 : selectedType === 'formula' ? 3 : 2} />
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
            <ButtonSecondary size="sm" onClick={() => setStep('type')} className="flex-1">
              Back
            </ButtonSecondary>
            <PremiumButton size="sm" onClick={handleNameSubmit} disabled={!name.trim()} className="flex-1">
              {selectedType === 'formula' ? 'Next' : 'Add'}
            </PremiumButton>
          </div>
        </div>
      )}

      {step === 'formula' && (
        <div className="p-3 space-y-3">
          <StepIndicator currentStep={3} totalSteps={inputColumnOptions.length > 0 ? 4 : 3} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconSparkle size={12} className="text-chart-5" />
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
          <div className="flex gap-2">
            <ButtonSecondary size="sm" onClick={() => setStep('name')} className="flex-1">
              Back
            </ButtonSecondary>
            <PremiumButton size="sm" onClick={handleFormulaSubmit} disabled={!formula.trim()} className="flex-1">
              {inputColumnOptions.length > 0 ? 'Next' : 'Add Column'}
            </PremiumButton>
          </div>
        </div>
      )}

      {step === 'input' && (
        <div className="p-3 space-y-3">
          <StepIndicator currentStep={4} totalSteps={4} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconSparkle size={12} className="text-chart-5" />
            <span>Select input column</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Choose which column provides the input data for AI enrichment
          </p>
          <CustomSelect
            value={selectedInputColumnId}
            onChange={setSelectedInputColumnId}
            options={inputColumnOptions.map(col => ({ value: col._id, label: col.name }))}
            placeholder="First column (default)"
            autoFocus
          />
          <div className="flex gap-2">
            <ButtonSecondary size="sm" onClick={() => setStep('formula')} className="flex-1">
              Back
            </ButtonSecondary>
            <PremiumButton size="sm" onClick={handleInputSubmit} className="flex-1">
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
  const createBatchJobs = useMutation(api.agents.createBatchJobs)
  const createJob = useMutation(api.agents.createJob)

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
    setTimeout(() => setToast(null), type === 'error' ? 8000 : 4000)
  }, [])

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

  const handleAddRow = async () => {
    if (guardAction('edit')) return
    await addRow({ worksheetId, workosUserId })
  }

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
      await updateCell({
        rowId: editingCell.rowId as Id<'worksheetRows'>,
        columnKey: editingCell.colKey,
        value: editValue,
        workosUserId,
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

  // SECURITY: Paste validation limits
  const MAX_PASTE_ROWS = 1000
  const MAX_PASTE_COLUMNS = 50
  const MAX_CELL_LENGTH = 10000

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (guardAction('edit')) {
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
            <>
              <div
                onClick={() => handleCellClick(row.original._id, colKey, value)}
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
  }, [columns, rowsWithLiveStatus, selectedRows, editingCell, editValue, columnMenuOpen])

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
        {rowsWithLiveStatus.length === 0 && columns.length === 0 && (
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
                  if (guardAction('edit')) return
                  setAddColumnOpen(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <IconPlus size={12} />
                Add Column
              </button>
            </div>
          </div>
        )}

        {/* Has columns but no rows */}
        {rowsWithLiveStatus.length === 0 && columns.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No rows yet. Add data or paste from spreadsheet.
            </p>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <IconPlus size={12} />
              Add Row
            </button>
          </div>
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
