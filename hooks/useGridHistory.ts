'use client'

/**
 * Grid History Hook - Undo/Redo System
 *
 * Provides undo/redo functionality for spreadsheet operations with:
 * - Cell edits
 * - Row additions/deletions
 * - Column additions/deletions
 * - Keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
 * - Toast notifications for user feedback
 *
 * @module hooks/useGridHistory
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export type ActionType =
  | 'cell_edit'
  | 'row_add'
  | 'row_delete'
  | 'column_add'
  | 'column_delete'
  | 'rows_delete'
  | 'column_reorder'

export interface GridAction {
  type: ActionType
  timestamp: number
  description: string
  /**
   * Function to undo this action
   * Returns a Promise that resolves when the undo is complete
   */
  undo: () => Promise<void>
  /**
   * Function to redo this action
   * Returns a Promise that resolves when the redo is complete
   */
  redo: () => Promise<void>
}

export interface UseGridHistoryOptions {
  /** Maximum number of actions to keep in history */
  maxStackSize?: number
  /** Callback when an action is undone */
  onUndo?: (action: GridAction) => void
  /** Callback when an action is redone */
  onRedo?: (action: GridAction) => void
}

export interface UseGridHistoryReturn {
  /** Add an action to the history */
  pushAction: (action: Omit<GridAction, 'timestamp'>) => void
  /** Undo the last action */
  undo: () => Promise<void>
  /** Redo the last undone action */
  redo: () => Promise<void>
  /** Whether undo is available */
  canUndo: boolean
  /** Whether redo is available */
  canRedo: boolean
  /** Description of the last action (for UI display) */
  lastActionDescription: string | null
  /** Keyboard event handler */
  handleKeyDown: (e: KeyboardEvent) => void
}

const DEFAULT_MAX_STACK_SIZE = 50

export function useGridHistory({
  maxStackSize = DEFAULT_MAX_STACK_SIZE,
  onUndo,
  onRedo,
}: UseGridHistoryOptions = {}): UseGridHistoryReturn {
  const [undoStack, setUndoStack] = useState<GridAction[]>([])
  const [redoStack, setRedoStack] = useState<GridAction[]>([])
  // isProcessing state for reactive UI updates (canUndo/canRedo)
  // processingRef for synchronous checks during async operations
  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)

  // Add an action to the history
  const pushAction = useCallback((action: Omit<GridAction, 'timestamp'>) => {
    const fullAction: GridAction = {
      ...action,
      timestamp: Date.now(),
    }

    setUndoStack(prev => {
      const newStack = [...prev, fullAction]
      // Trim to max size
      if (newStack.length > maxStackSize) {
        return newStack.slice(-maxStackSize)
      }
      return newStack
    })

    // Clear redo stack when a new action is performed
    setRedoStack([])
  }, [maxStackSize])

  // Undo the last action
  const undo = useCallback(async () => {
    if (processingRef.current) return
    if (undoStack.length === 0) return

    processingRef.current = true
    setIsProcessing(true)

    try {
      const action = undoStack[undoStack.length - 1]
      await action.undo()

      // Move action from undo to redo stack
      setUndoStack(prev => prev.slice(0, -1))
      setRedoStack(prev => [...prev, action])

      onUndo?.(action)
    } catch (error) {
      console.error('Undo failed:', error)
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }, [undoStack, onUndo])

  // Redo the last undone action
  const redo = useCallback(async () => {
    if (processingRef.current) return
    if (redoStack.length === 0) return

    processingRef.current = true
    setIsProcessing(true)

    try {
      const action = redoStack[redoStack.length - 1]
      await action.redo()

      // Move action from redo to undo stack
      setRedoStack(prev => prev.slice(0, -1))
      setUndoStack(prev => [...prev, action])

      onRedo?.(action)
    } catch (error) {
      console.error('Redo failed:', error)
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }, [redoStack, onRedo])

  // Keyboard handler for Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey

    if (isMod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (isMod && e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      redo()
    } else if (isMod && e.key === 'y') {
      // Alternative redo shortcut
      e.preventDefault()
      redo()
    }
  }, [undo, redo])

  // Register global keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    pushAction,
    undo,
    redo,
    canUndo: undoStack.length > 0 && !isProcessing,
    canRedo: redoStack.length > 0 && !isProcessing,
    lastActionDescription: undoStack.length > 0 ? undoStack[undoStack.length - 1].description : null,
    handleKeyDown,
  }
}

/**
 * Helper to create a cell edit action for the history
 */
export function createCellEditAction(
  rowId: string,
  columnKey: string,
  previousValue: unknown,
  newValue: unknown,
  updateCell: (rowId: string, columnKey: string, value: unknown) => Promise<void>
): Omit<GridAction, 'timestamp'> {
  return {
    type: 'cell_edit',
    description: 'Cell edited',
    undo: async () => {
      await updateCell(rowId, columnKey, previousValue)
    },
    redo: async () => {
      await updateCell(rowId, columnKey, newValue)
    },
  }
}

/**
 * Helper to create a row delete action for the history
 * Note: Row restoration requires storing the row data
 */
export function createRowDeleteAction(
  rowId: string,
  rowData: Record<string, unknown>,
  worksheetId: string,
  addRow: (worksheetId: string, cells: Record<string, unknown>) => Promise<string>,
  deleteRow: (rowId: string) => Promise<void>
): Omit<GridAction, 'timestamp'> {
  let restoredRowId: string | null = null

  return {
    type: 'row_delete',
    description: 'Row deleted',
    undo: async () => {
      // Re-add the row with the same data
      restoredRowId = await addRow(worksheetId, rowData)
    },
    redo: async () => {
      // Delete the restored row (may fail if row was already deleted by other means)
      if (restoredRowId) {
        try {
          await deleteRow(restoredRowId)
        } catch (error) {
          // Row may have been deleted by another operation, log and continue
          console.warn('Row delete redo failed (row may already be deleted):', error)
        }
      }
    },
  }
}
