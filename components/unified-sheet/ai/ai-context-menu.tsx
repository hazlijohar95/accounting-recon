'use client'

/**
 * AI Context Menu for Spreadsheet Cells
 *
 * Provides right-click context menu options for AI operations:
 * - Run AI enrichment on selected cell(s)
 * - Retry failed AI operations
 * - Clear AI results
 *
 * @module components/unified-sheet/ai/ai-context-menu
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import type { Id } from '@/convex/_generated/dataModel'
import { useFormulaExecution } from '../hooks/use-formula-execution'

/**
 * Context menu props
 */
export interface AIContextMenuProps {
  /** Whether the menu is open */
  isOpen: boolean
  /** Position of the menu */
  position: { x: number; y: number }
  /** Selected cell information */
  selectedCell: {
    row: number
    col: number
    value: unknown
    rowId?: Id<'worksheetRows'>
    columnId?: Id<'worksheetColumns'>
  } | null
  /** Worksheet ID */
  worksheetId: Id<'worksheets'> | null
  /** User ID */
  userId: Id<'users'> | null
  /** Callback to close the menu */
  onClose: () => void
  /** Callback when AI operation is triggered */
  onAIOperation?: (operation: string, result?: unknown) => void
}

/**
 * Prompt input dialog props
 */
interface PromptDialogProps {
  isOpen: boolean
  title: string
  placeholder: string
  inputValue: string
  onConfirm: (prompt: string) => void
  onCancel: () => void
}

/**
 * Prompt input dialog component
 */
function PromptDialog({
  isOpen,
  title,
  placeholder,
  inputValue,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      // Focus input when dialog opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg p-4 w-[400px] max-w-[90vw] shadow-lg">
        <h3 className="text-sm font-medium mb-3">{title}</h3>

        {inputValue && (
          <div className="mb-3 p-2 bg-muted rounded text-xs">
            <span className="text-muted-foreground">Input value: </span>
            <span className="font-mono">{String(inputValue).slice(0, 100)}</span>
            {String(inputValue).length > 100 && '...'}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="w-full h-24 px-3 py-2 text-sm bg-background border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              if (prompt.trim()) {
                onConfirm(prompt.trim())
              }
            }
            if (e.key === 'Escape') {
              onCancel()
            }
          }}
        />

        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-muted-foreground">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => prompt.trim() && onConfirm(prompt.trim())}
              disabled={!prompt.trim()}
              className="px-3 py-1.5 text-xs bg-foreground text-background rounded hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run AI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * AI Context Menu component
 *
 * Shows a context menu with AI operations when right-clicking on a cell.
 */
export function AIContextMenu({
  isOpen,
  position,
  selectedCell,
  worksheetId,
  userId,
  onClose,
  onAIOperation,
}: AIContextMenuProps) {
  const [showPromptDialog, setShowPromptDialog] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { executeFormula } = useFormulaExecution({
    worksheetId,
    userId,
    onExecutionComplete: (row, col, result) => {
      onAIOperation?.('enrich_complete', result)
    },
    onExecutionError: (row, col, error) => {
      onAIOperation?.('enrich_error', error)
    },
  })

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleRunAI = useCallback(() => {
    setShowPromptDialog(true)
  }, [])

  const handlePromptConfirm = useCallback(async (prompt: string) => {
    setShowPromptDialog(false)
    onClose()

    if (!selectedCell || !worksheetId || !userId) return

    // Create ENRICH formula
    const formula = `=ENRICH("${String(selectedCell.value).replace(/"/g, '\\"')}", "${prompt}")`

    // Execute the formula
    await executeFormula(
      formula,
      selectedCell.row,
      selectedCell.col,
      selectedCell.rowId,
      selectedCell.columnId
    )

    onAIOperation?.('enrich_started', { cell: selectedCell, prompt })
  }, [selectedCell, worksheetId, userId, executeFormula, onClose, onAIOperation])

  const handlePromptCancel = useCallback(() => {
    setShowPromptDialog(false)
  }, [])

  if (!isOpen || !selectedCell) return null

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 150),
  }

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
          Cell {String.fromCharCode(65 + selectedCell.col)}{selectedCell.row + 1}
        </div>

        <button
          onClick={handleRunAI}
          className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
        >
          <span className="text-base">✨</span>
          <span>Run AI on this cell</span>
        </button>

        <button
          onClick={() => {
            onClose()
            onAIOperation?.('fill_down', selectedCell)
          }}
          className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
        >
          <span className="text-base">⬇️</span>
          <span>Fill down with AI</span>
        </button>

        <div className="border-t border-border my-1" />

        <button
          onClick={() => {
            onClose()
            // Copy cell reference to clipboard
            navigator.clipboard.writeText(
              `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
            )
            onAIOperation?.('copy_ref', selectedCell)
          }}
          className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
        >
          <span className="text-base">📋</span>
          <span>Copy cell reference</span>
        </button>

        {selectedCell.value !== undefined && selectedCell.value !== null && selectedCell.value !== '' && (
          <button
            onClick={() => {
              onClose()
              navigator.clipboard.writeText(String(selectedCell.value))
              onAIOperation?.('copy_value', selectedCell)
            }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
          >
            <span className="text-base">📄</span>
            <span>Copy value</span>
          </button>
        )}
      </div>

      <PromptDialog
        isOpen={showPromptDialog}
        title="Run AI Enrichment"
        placeholder="Enter instructions for the AI (e.g., 'Find the CEO name for this company')"
        inputValue={String(selectedCell?.value ?? '')}
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />
    </>
  )
}

/**
 * Hook to manage AI context menu state
 */
export function useAIContextMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [selectedCell, setSelectedCell] = useState<AIContextMenuProps['selectedCell']>(null)

  const openMenu = useCallback((
    e: MouseEvent | React.MouseEvent | { clientX: number; clientY: number },
    cell: NonNullable<AIContextMenuProps['selectedCell']>
  ) => {
    if ('preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault()
    }
    setPosition({ x: e.clientX, y: e.clientY })
    setSelectedCell(cell)
    setIsOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setSelectedCell(null)
  }, [])

  return {
    isOpen,
    position,
    selectedCell,
    openMenu,
    closeMenu,
  }
}
