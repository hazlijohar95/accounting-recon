/**
 * Shared Grid Types
 *
 * Common types used across grid-related hooks and components.
 * Eliminates duplication between useGridNavigation, useGridSelection, etc.
 *
 * @module types/grid
 */

/**
 * Represents a cell position in the grid.
 * Used for navigation, selection, and cell identification.
 */
export interface CellPosition {
  rowIndex: number
  colIndex: number
}

/**
 * Represents a rectangular selection range in the grid.
 * The start and end positions define the corners of the selection.
 */
export interface SelectionRange {
  start: CellPosition
  end: CellPosition
}

/**
 * Cell status for AI enrichment operations
 */
export type CellStatus = 'idle' | 'pending' | 'running' | 'complete' | 'error'

/**
 * Cell data with optional status and error information
 */
export interface CellData {
  value: unknown
  status?: CellStatus
  error?: string
}
