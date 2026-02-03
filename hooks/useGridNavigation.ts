'use client'

/**
 * Grid Navigation Hook
 *
 * Provides spreadsheet-native keyboard navigation with:
 * - Arrow key cell focus movement
 * - Tab/Shift+Tab horizontal navigation (with row wrap)
 * - Enter to edit/confirm, Escape to cancel
 * - F2 to start editing (Excel pattern)
 * - Type-to-edit for quick data entry
 * - Delete/Backspace to clear cells
 *
 * @module hooks/useGridNavigation
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { CellPosition } from '@/types/grid'
import { clampPosition } from '@/lib/grid-utils'

// Re-export CellPosition for backward compatibility
export type { CellPosition } from '@/types/grid'

export interface GridNavigationOptions {
  /** Total number of rows */
  rowCount: number
  /** Total number of columns (excluding selector column) */
  colCount: number
  /** Callback when a cell should enter edit mode */
  onEditStart: (position: CellPosition, initialValue?: string) => void
  /** Callback when edit is confirmed (Enter) */
  onEditConfirm: () => void
  /** Callback when edit is cancelled (Escape) */
  onEditCancel: () => void
  /** Callback to clear a cell value */
  onClearCell: (position: CellPosition) => void
  /** Callback when a new row should be added. Returns Promise to allow waiting for row creation. */
  onAddRow?: () => void | Promise<void>
  /** Whether the grid is currently in edit mode */
  isEditing: boolean
  /** Currently editing cell position */
  editingPosition: CellPosition | null
}

export interface GridNavigationReturn {
  /** Currently focused cell (separate from editing) */
  focusedCell: CellPosition | null
  /** Set focused cell position */
  setFocusedCell: (cell: CellPosition | null) => void
  /** Keyboard event handler for the grid container (async for row addition) */
  handleKeyDown: (e: React.KeyboardEvent) => void | Promise<void>
  /** Handle cell click to set focus */
  handleCellFocus: (position: CellPosition) => void
  /** Handle cell double-click to start editing */
  handleCellDoubleClick: (position: CellPosition) => void
  /** Check if a cell is focused */
  isCellFocused: (position: CellPosition) => boolean
  /** Ref for the grid container (for focus management) */
  gridRef: React.RefObject<HTMLDivElement | null>
}

export function useGridNavigation({
  rowCount,
  colCount,
  onEditStart,
  onEditConfirm,
  onEditCancel,
  onClearCell,
  onAddRow,
  isEditing,
  editingPosition,
}: GridNavigationOptions): GridNavigationReturn {
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  // Clamp position to valid bounds using shared utility
  const clampPos = useCallback((pos: CellPosition): CellPosition => {
    return clampPosition(pos, rowCount, colCount)
  }, [rowCount, colCount])

  // Move focus in a direction
  const moveFocus = useCallback(async (
    direction: 'up' | 'down' | 'left' | 'right',
    wrap: boolean = false
  ) => {
    if (!focusedCell && rowCount > 0 && colCount > 0) {
      // If no cell focused, focus first cell
      setFocusedCell({ rowIndex: 0, colIndex: 0 })
      return
    }

    if (!focusedCell) return

    let { rowIndex, colIndex } = focusedCell

    switch (direction) {
      case 'up':
        rowIndex = Math.max(0, rowIndex - 1)
        break
      case 'down':
        rowIndex = Math.min(rowCount - 1, rowIndex + 1)
        break
      case 'left':
        if (wrap && colIndex === 0 && rowIndex > 0) {
          // Wrap to end of previous row
          colIndex = colCount - 1
          rowIndex -= 1
        } else {
          colIndex = Math.max(0, colIndex - 1)
        }
        break
      case 'right':
        if (wrap && colIndex === colCount - 1) {
          if (rowIndex < rowCount - 1) {
            // Wrap to start of next row
            colIndex = 0
            rowIndex += 1
          } else if (onAddRow) {
            // At last cell of last row - add new row and wait for it
            await Promise.resolve(onAddRow())
            // After row is added, focus the first cell of the new row
            // Use rowCount (current) + 1 since the new row was just added
            setFocusedCell({ rowIndex: rowCount, colIndex: 0 })
            return
          }
        } else {
          colIndex = Math.min(colCount - 1, colIndex + 1)
        }
        break
    }

    setFocusedCell(clampPos({ rowIndex, colIndex }))
  }, [focusedCell, rowCount, colCount, clampPos, onAddRow])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    // Special handling when editing
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onEditConfirm()
        // Move focus down after confirming
        if (editingPosition) {
          const nextRow = editingPosition.rowIndex + 1
          if (nextRow < rowCount) {
            setFocusedCell({ rowIndex: nextRow, colIndex: editingPosition.colIndex })
          } else if (onAddRow) {
            // At last row, add new row and wait for it before focusing
            await Promise.resolve(onAddRow())
            setFocusedCell({ rowIndex: nextRow, colIndex: editingPosition.colIndex })
          }
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onEditCancel()
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        onEditConfirm()
        // Move to next/prev cell
        if (editingPosition) {
          moveFocus(e.shiftKey ? 'left' : 'right', true)
        }
        return
      }
      // Let other keys pass through to the input
      return
    }

    // Navigation when not editing
    if (!focusedCell && rowCount > 0 && colCount > 0) {
      // Initialize focus on any navigation key
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
        e.preventDefault()
        setFocusedCell({ rowIndex: 0, colIndex: 0 })
        return
      }
    }

    if (!focusedCell) return

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        moveFocus('up')
        break
      case 'ArrowDown':
        e.preventDefault()
        moveFocus('down')
        break
      case 'ArrowLeft':
        e.preventDefault()
        moveFocus('left')
        break
      case 'ArrowRight':
        e.preventDefault()
        moveFocus('right')
        break
      case 'Tab':
        e.preventDefault()
        moveFocus(e.shiftKey ? 'left' : 'right', true)
        break
      case 'Enter':
        e.preventDefault()
        onEditStart(focusedCell)
        break
      case 'F2':
        e.preventDefault()
        onEditStart(focusedCell)
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        onClearCell(focusedCell)
        break
      default:
        // Type-to-edit: start editing with the pressed character
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          onEditStart(focusedCell, e.key)
        }
        break
    }
  }, [
    isEditing,
    focusedCell,
    rowCount,
    colCount,
    moveFocus,
    onEditStart,
    onEditConfirm,
    onEditCancel,
    onClearCell,
    editingPosition,
    onAddRow,
  ])

  // Handle cell focus on click
  const handleCellFocus = useCallback((position: CellPosition) => {
    setFocusedCell(clampPos(position))
  }, [clampPos])

  // Handle double-click to edit
  const handleCellDoubleClick = useCallback((position: CellPosition) => {
    setFocusedCell(clampPos(position))
    onEditStart(position)
  }, [clampPos, onEditStart])

  // Check if a cell is focused
  const isCellFocused = useCallback((position: CellPosition): boolean => {
    if (!focusedCell) return false
    return focusedCell.rowIndex === position.rowIndex && focusedCell.colIndex === position.colIndex
  }, [focusedCell])

  // Focus the grid container when focused cell changes (for keyboard events)
  useEffect(() => {
    if (focusedCell && gridRef.current && !isEditing) {
      gridRef.current.focus()
    }
  }, [focusedCell, isEditing])

  return {
    focusedCell,
    setFocusedCell,
    handleKeyDown,
    handleCellFocus,
    handleCellDoubleClick,
    isCellFocused,
    gridRef,
  }
}
