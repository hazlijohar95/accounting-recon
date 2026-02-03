/**
 * Grid Utilities
 *
 * Shared utility functions for grid operations.
 * Used by useGridNavigation, useGridSelection, and worksheet-grid.
 *
 * @module lib/grid-utils
 */

import { CellPosition } from '@/types/grid'

/**
 * Create a unique string key from a cell position.
 * Format: "rowIndex:colIndex"
 */
export function cellKey(position: CellPosition): string {
  return `${position.rowIndex}:${position.colIndex}`
}

/**
 * Parse a cell key string back to a CellPosition.
 * @param key - String in format "rowIndex:colIndex"
 */
export function parseKey(key: string): CellPosition {
  const [rowIndex, colIndex] = key.split(':').map(Number)
  return { rowIndex, colIndex }
}

/**
 * Clamp a position to valid grid bounds.
 * @param position - The position to clamp
 * @param rowCount - Total number of rows
 * @param colCount - Total number of columns
 */
export function clampPosition(
  position: CellPosition,
  rowCount: number,
  colCount: number
): CellPosition {
  return {
    rowIndex: Math.max(0, Math.min(position.rowIndex, rowCount - 1)),
    colIndex: Math.max(0, Math.min(position.colIndex, colCount - 1)),
  }
}

/**
 * Check if a position is within valid grid bounds.
 * @param position - The position to check
 * @param rowCount - Total number of rows
 * @param colCount - Total number of columns
 */
export function isValidPosition(
  position: CellPosition,
  rowCount: number,
  colCount: number
): boolean {
  return (
    position.rowIndex >= 0 &&
    position.rowIndex < rowCount &&
    position.colIndex >= 0 &&
    position.colIndex < colCount
  )
}

/**
 * Get all cells within a rectangular range (inclusive).
 * @param start - Start corner of the range
 * @param end - End corner of the range
 */
export function getCellsInRange(
  start: CellPosition,
  end: CellPosition
): Set<string> {
  const cells = new Set<string>()
  const minRow = Math.min(start.rowIndex, end.rowIndex)
  const maxRow = Math.max(start.rowIndex, end.rowIndex)
  const minCol = Math.min(start.colIndex, end.colIndex)
  const maxCol = Math.max(start.colIndex, end.colIndex)

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      cells.add(cellKey({ rowIndex: row, colIndex: col }))
    }
  }
  return cells
}

/**
 * Check if two cell positions are equal.
 */
export function positionsEqual(a: CellPosition | null, b: CellPosition | null): boolean {
  if (a === null || b === null) return a === b
  return a.rowIndex === b.rowIndex && a.colIndex === b.colIndex
}
