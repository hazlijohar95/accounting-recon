'use client'

/**
 * Grid Selection Hook
 *
 * Provides spreadsheet-native cell selection with:
 * - Range selection via click-drag
 * - Extend selection via Shift+click
 * - Toggle selection via Cmd/Ctrl+click
 * - Row selection via row number click
 * - Column selection via header click
 *
 * @module hooks/useGridSelection
 */

import { useState, useCallback, useRef } from 'react'
import { CellPosition, SelectionRange } from '@/types/grid'
import { cellKey as makeCellKey, getCellsInRange as getRange } from '@/lib/grid-utils'

// Re-export types for backward compatibility
export type { CellPosition, SelectionRange } from '@/types/grid'

export interface UseGridSelectionOptions {
  /** Total number of rows */
  rowCount: number
  /** Total number of columns */
  colCount: number
  /** Callback when selection changes */
  onSelectionChange?: (cells: Set<string>) => void
}

export interface UseGridSelectionReturn {
  /** Currently selected cells as set of "rowIndex:colIndex" strings */
  selectedCells: Set<string>
  /** The anchor cell (start of selection range) */
  anchorCell: CellPosition | null
  /** Whether we're currently dragging a selection */
  isDragging: boolean
  /** Check if a specific cell is selected */
  isCellSelected: (position: CellPosition) => boolean
  /** Handle mouse down on a cell (starts selection) */
  handleCellMouseDown: (position: CellPosition, e: React.MouseEvent) => void
  /** Handle mouse enter on a cell (extends selection during drag) */
  handleCellMouseEnter: (position: CellPosition) => void
  /** Handle mouse up (ends selection drag) */
  handleMouseUp: () => void
  /** Select entire row */
  selectRow: (rowIndex: number, addToSelection?: boolean) => void
  /** Select entire column */
  selectColumn: (colIndex: number, addToSelection?: boolean) => void
  /** Select all cells */
  selectAll: () => void
  /** Clear selection */
  clearSelection: () => void
  /** Get all cells in a range */
  getCellsInRange: (start: CellPosition, end: CellPosition) => Set<string>
}

// Re-export utility functions for backward compatibility
export { cellKey, parseKey } from '@/lib/grid-utils'

export function useGridSelection({
  rowCount,
  colCount,
  onSelectionChange,
}: UseGridSelectionOptions): UseGridSelectionReturn {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [anchorCell, setAnchorCell] = useState<CellPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const lastCell = useRef<CellPosition | null>(null)

  // Use shared utility for getting cells in range
  const getCellsInRange = useCallback((start: CellPosition, end: CellPosition): Set<string> => {
    return getRange(start, end)
  }, [])

  // Update selection and notify
  const updateSelection = useCallback((newSelection: Set<string>) => {
    setSelectedCells(newSelection)
    onSelectionChange?.(newSelection)
  }, [onSelectionChange])

  // Check if a cell is selected
  const isCellSelected = useCallback((position: CellPosition): boolean => {
    return selectedCells.has(makeCellKey(position))
  }, [selectedCells])

  // Handle mouse down on a cell
  const handleCellMouseDown = useCallback((position: CellPosition, e: React.MouseEvent) => {
    const isShift = e.shiftKey
    const isMod = e.metaKey || e.ctrlKey

    if (isShift && anchorCell) {
      // Extend selection from anchor to clicked cell
      const rangeCells = getCellsInRange(anchorCell, position)
      if (isMod) {
        // Add to existing selection
        const newSelection = new Set(selectedCells)
        rangeCells.forEach(cell => newSelection.add(cell))
        updateSelection(newSelection)
      } else {
        // Replace selection
        updateSelection(rangeCells)
      }
    } else if (isMod) {
      // Toggle individual cell
      const key = makeCellKey(position)
      const newSelection = new Set(selectedCells)
      if (newSelection.has(key)) {
        newSelection.delete(key)
      } else {
        newSelection.add(key)
      }
      updateSelection(newSelection)
      setAnchorCell(position)
    } else {
      // Start new selection
      setAnchorCell(position)
      updateSelection(new Set([makeCellKey(position)]))
      setIsDragging(true)
      lastCell.current = position
    }
  }, [anchorCell, selectedCells, getCellsInRange, updateSelection])

  // Handle mouse enter during drag
  const handleCellMouseEnter = useCallback((position: CellPosition) => {
    if (!isDragging || !anchorCell) return
    if (lastCell.current &&
        lastCell.current.rowIndex === position.rowIndex &&
        lastCell.current.colIndex === position.colIndex) {
      return // Same cell, no update needed
    }
    lastCell.current = position
    const rangeCells = getCellsInRange(anchorCell, position)
    updateSelection(rangeCells)
  }, [isDragging, anchorCell, getCellsInRange, updateSelection])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Select entire row
  const selectRow = useCallback((rowIndex: number, addToSelection = false) => {
    const rowCells = new Set<string>()
    for (let col = 0; col < colCount; col++) {
      rowCells.add(makeCellKey({ rowIndex, colIndex: col }))
    }

    if (addToSelection) {
      const newSelection = new Set(selectedCells)
      rowCells.forEach(cell => newSelection.add(cell))
      updateSelection(newSelection)
    } else {
      updateSelection(rowCells)
    }
    setAnchorCell({ rowIndex, colIndex: 0 })
  }, [colCount, selectedCells, updateSelection])

  // Select entire column
  const selectColumn = useCallback((colIndex: number, addToSelection = false) => {
    const colCells = new Set<string>()
    for (let row = 0; row < rowCount; row++) {
      colCells.add(makeCellKey({ rowIndex: row, colIndex }))
    }

    if (addToSelection) {
      const newSelection = new Set(selectedCells)
      colCells.forEach(cell => newSelection.add(cell))
      updateSelection(newSelection)
    } else {
      updateSelection(colCells)
    }
    setAnchorCell({ rowIndex: 0, colIndex })
  }, [rowCount, selectedCells, updateSelection])

  // Select all cells
  const selectAll = useCallback(() => {
    const allCells = new Set<string>()
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        allCells.add(makeCellKey({ rowIndex: row, colIndex: col }))
      }
    }
    updateSelection(allCells)
    setAnchorCell({ rowIndex: 0, colIndex: 0 })
  }, [rowCount, colCount, updateSelection])

  // Clear selection
  const clearSelection = useCallback(() => {
    updateSelection(new Set())
    setAnchorCell(null)
  }, [updateSelection])

  return {
    selectedCells,
    anchorCell,
    isDragging,
    isCellSelected,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    selectRow,
    selectColumn,
    selectAll,
    clearSelection,
    getCellsInRange,
  }
}
