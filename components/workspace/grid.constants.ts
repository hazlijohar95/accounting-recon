/**
 * Grid Constants
 *
 * Constants for the worksheet grid component.
 * Centralizes limits and configuration values.
 *
 * @module components/workspace/grid.constants
 */

/**
 * Security limits for paste operations to prevent DoS
 */
export const GRID_LIMITS = {
  /** Maximum number of rows that can be pasted at once */
  MAX_PASTE_ROWS: 1000,
  /** Maximum number of columns that can be pasted at once */
  MAX_PASTE_COLUMNS: 50,
  /** Maximum character length for a single cell value */
  MAX_CELL_LENGTH: 10_000,
} as const

/**
 * Default column dimensions
 */
export const COLUMN_DEFAULTS = {
  /** Default column width in pixels */
  WIDTH: 160,
  /** Minimum column width in pixels */
  MIN_WIDTH: 40,
  /** Maximum column width in pixels */
  MAX_WIDTH: 1000,
} as const

/**
 * Row dimensions
 */
export const ROW_DIMENSIONS = {
  /** Default row height in pixels */
  HEIGHT: 36,
  /** Row selector column width */
  SELECTOR_WIDTH: 40,
} as const

/**
 * Virtual scrolling configuration
 */
export const VIRTUALIZATION = {
  /** Number of rows to render outside the visible viewport */
  OVERSCAN: 10,
} as const

/**
 * Toast notification durations in milliseconds
 */
export const TOAST_DURATIONS = {
  /** Duration for success and info toasts */
  DEFAULT: 4000,
  /** Duration for error toasts */
  ERROR: 8000,
} as const
