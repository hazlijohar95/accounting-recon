/**
 * Generic spreadsheet core types
 *
 * These types support a general-purpose Excel-like spreadsheet that can be
 * customized for any use case. Reconciliation-specific features are extracted
 * to the reconciliation plugin.
 */

import type { Id } from '@/convex/_generated/dataModel'

// =============================================================================
// CELL VALUE TYPES
// =============================================================================

/**
 * Cell value - any serializable primitive type
 */
export type CellValue = string | number | boolean | null | undefined

/**
 * Generic row - dynamic columns with string keys
 * Example: { col_0: "John", col_1: 100, col_2: true }
 */
export type SheetRow = Record<string, CellValue>

/**
 * Cell reference in A1 notation or {row, col} object
 */
export type CellReference =
  | string // "A1", "B2", etc.
  | { row: number; col: number }

/**
 * Range reference in A1:B10 notation or object format
 */
export type RangeReference =
  | string // "A1:B10"
  | { startRow: number; startCol: number; endRow: number; endCol: number }

// =============================================================================
// COLUMN DEFINITION TYPES
// =============================================================================

/**
 * Column data type
 */
export type ColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'checkbox'
  | 'formula'
  | 'currency'
  | 'percentage'
  | 'email'
  | 'url'

/**
 * Column definition for generic spreadsheet
 */
export interface ColumnDef {
  /** Unique column identifier */
  id: string
  /** Column key in row data (col_0, col_1, etc.) */
  key: string
  /** Display name/header */
  name: string
  /** Column data type */
  type: ColumnType
  /** Column width in pixels */
  width: number
  /** Excel formula (for formula columns) */
  formula?: string
  /** Whether column is editable */
  editable?: boolean
  /** Number/date format string */
  format?: string
  /** Dropdown options (for dropdown type) */
  options?: string[]
  /** Validation rules */
  validation?: ColumnValidation
  /** Whether this column is hidden */
  hidden?: boolean
  /** Order index (0-based) */
  order: number
}

/**
 * Column validation rules
 */
export interface ColumnValidation {
  type: 'list' | 'number' | 'date' | 'text' | 'custom'
  /** Allowed values for list type */
  allowedValues?: string[]
  /** Minimum value/length */
  min?: number
  /** Maximum value/length */
  max?: number
  /** Regex pattern for text validation */
  pattern?: string
  /** Whether field is required */
  required?: boolean
  /** Custom error message */
  errorMessage?: string
  /** Custom validation function name */
  customValidator?: string
}

// =============================================================================
// SHEET DEFINITION TYPES
// =============================================================================

/**
 * Sheet/worksheet definition
 */
export interface SheetDef {
  /** Unique sheet identifier */
  id: string
  /** Sheet name */
  name: string
  /** Column definitions */
  columns: ColumnDef[]
  /** Row data */
  rows: SheetRow[]
  /** Number of frozen rows */
  frozenRows?: number
  /** Number of frozen columns */
  frozenColumns?: number
  /** Display order (0-based) */
  order: number
  /** Whether sheet is hidden */
  hidden?: boolean
}

/**
 * Workbook definition (collection of sheets)
 */
export interface WorkbookDef {
  /** Workbook name */
  name: string
  /** Sheet definitions */
  sheets: SheetDef[]
  /** Active sheet ID */
  activeSheetId?: string
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

/**
 * Props for GenericSheet component
 */
export interface GenericSheetProps {
  // Data source (pick one)
  /** Convex workspace ID to load data from */
  workspaceId?: Id<'workspaces'>
  /** Local data (no Convex sync) */
  localData?: {
    columns: ColumnDef[]
    rows: SheetRow[]
  }

  // Configuration
  /** Whether spreadsheet is read-only */
  readOnly?: boolean
  /** Allow column operations (insert/delete/rename) */
  allowColumnOps?: boolean
  /** Allow row operations (insert/delete) */
  allowRowOps?: boolean
  /** Enable Excel formula support */
  enableFormulas?: boolean
  /** Show formula bar */
  showFormulaBar?: boolean
  /** Show sheet tabs */
  showSheetTabs?: boolean
  /** Show toolbar */
  showToolbar?: boolean
  /** Container height */
  height?: string | number
  /** Custom class name */
  className?: string

  // Callbacks
  /** Called when cell value changes */
  onCellChange?: (cell: CellReference, value: CellValue, oldValue: CellValue) => void
  /** Called when selection changes */
  onSelectionChange?: (range: RangeReference) => void
  /** Called when column is added/removed/renamed */
  onColumnChange?: (action: 'add' | 'remove' | 'rename', columnId: string) => void
  /** Called when sheet is added/removed/renamed */
  onSheetChange?: (action: 'add' | 'remove' | 'rename', sheetId: string) => void

  // Plugins
  /**
   * Optional plugins for extended functionality.
   *
   * IMPORTANT: Plugin Stability Requirement
   * ========================================
   * Plugins are only initialized ONCE when the component mounts.
   * They will NOT be re-initialized when the plugins prop changes.
   *
   * To ensure correct behavior:
   * 1. Plugins must be stable references (memoized with useMemo)
   * 2. If you need different plugins based on state, create them
   *    conditionally inside useMemo with appropriate dependencies
   *
   * Example:
   * ```tsx
   * // CORRECT: Memoize plugin with proper dependencies
   * const plugin = useMemo(
   *   () => hasData ? createPlugin() : undefined,
   *   [hasData]
   * )
   *
   * // INCORRECT: Creates new plugin array on every render
   * plugins={hasData ? [createPlugin()] : []}
   * ```
   */
  plugins?: SpreadsheetPlugin[]

  // Initial state
  /** Default number of columns for blank sheet (default: 26 for A-Z) */
  defaultColumnCount?: number
  /** Default number of rows for blank sheet (default: 100) */
  defaultRowCount?: number
}

// =============================================================================
// PLUGIN TYPES
// =============================================================================

/**
 * Spreadsheet plugin interface for extending functionality
 */
export interface SpreadsheetPlugin {
  /** Plugin name */
  name: string
  /** Plugin version */
  version?: string

  /** Column presets provided by this plugin */
  getColumnPresets?: () => ColumnPreset[]

  /** Custom cell styling based on cell value/position */
  getCellStyle?: (
    cell: CellReference,
    value: CellValue,
    row: SheetRow,
    column: ColumnDef
  ) => CellStyle | null

  /** Toolbar items to add */
  getToolbarItems?: () => ToolbarItem[]

  /** Context menu items to add */
  getContextMenuItems?: () => ContextMenuItem[]

  /** Called when plugin is initialized */
  onInit?: (api: SpreadsheetAPI) => void

  /** Called when plugin is destroyed */
  onDestroy?: () => void

  /** Custom cell renderer */
  renderCell?: (
    cell: CellReference,
    value: CellValue,
    row: SheetRow,
    column: ColumnDef
  ) => React.ReactNode | null
}

/**
 * Column preset definition (template columns)
 */
export interface ColumnPreset {
  /** Preset ID */
  id: string
  /** Display name */
  name: string
  /** Description */
  description?: string
  /** Category for grouping */
  category?: string
  /** Column definitions */
  columns: Omit<ColumnDef, 'id' | 'key' | 'order'>[]
}

/**
 * Cell styling from plugins
 */
export interface CellStyle {
  /** Background color */
  backgroundColor?: string
  /** Text color */
  color?: string
  /** Font weight */
  fontWeight?: 'normal' | 'bold'
  /** Font style */
  fontStyle?: 'normal' | 'italic'
  /** Text decoration */
  textDecoration?: 'none' | 'underline' | 'line-through'
  /** Border style */
  border?: string
}

/**
 * Toolbar item definition
 */
export interface ToolbarItem {
  /** Item ID */
  id: string
  /** Display label */
  label: string
  /** Icon name or component */
  icon?: string | React.ComponentType
  /** Tooltip text */
  tooltip?: string
  /** Click handler */
  onClick: () => void
  /** Whether item is disabled */
  disabled?: boolean
  /** Item type */
  type?: 'button' | 'dropdown' | 'separator'
  /** Dropdown items (for type: 'dropdown') */
  dropdownItems?: { label: string; value: string; onClick: () => void }[]
}

/**
 * Context menu item definition
 */
export interface ContextMenuItem {
  /** Item ID */
  id: string
  /** Display label */
  label: string
  /** Icon name */
  icon?: string
  /** Click handler */
  onClick: (selection: RangeReference) => void
  /** Whether item is disabled */
  disabled?: boolean
  /** When to show (row header, column header, cell) */
  showOn?: ('cell' | 'row-header' | 'column-header')[]
}

// =============================================================================
// SPREADSHEET API TYPES
// =============================================================================

/**
 * Spreadsheet API for programmatic control
 */
export interface SpreadsheetAPI {
  // Cell operations
  setCellValue: (cell: CellReference, value: CellValue) => void
  getCellValue: (cell: CellReference) => CellValue
  setRangeValues: (range: RangeReference, values: CellValue[][]) => void
  clearRange: (range: RangeReference) => void

  // Column operations
  addColumn: (position?: number, columnDef?: Partial<ColumnDef>) => string
  removeColumn: (columnId: string) => void
  renameColumn: (columnId: string, name: string) => void
  setColumnWidth: (columnId: string, width: number) => void

  // Row operations
  addRow: (position?: number, data?: SheetRow) => number
  removeRow: (rowIndex: number) => void
  addRows: (position: number, count: number) => void
  removeRows: (startRow: number, count: number) => void

  // Sheet operations
  getSheets: () => SheetDef[]
  addSheet: (name?: string) => string
  removeSheet: (sheetId: string) => void
  renameSheet: (sheetId: string, name: string) => void
  duplicateSheet: (sheetId: string, newName?: string) => string
  setActiveSheet: (sheetId: string) => void
  getActiveSheet: () => SheetDef | null

  // Selection
  getSelection: () => RangeReference | null
  setSelection: (range: RangeReference) => void

  // Formatting
  setCellStyle: (cell: CellReference, style: CellStyle) => void
  setRangeStyle: (range: RangeReference, style: CellStyle) => void

  // Data
  getData: () => { columns: ColumnDef[]; rows: SheetRow[] }
  setData: (columns: ColumnDef[], rows: SheetRow[]) => void
  exportToJSON: () => string
  importFromJSON: (json: string) => void

  // Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Freeze
  freezeRows: (count: number) => void
  freezeColumns: (count: number) => void
}

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

/**
 * Sheet template definition
 */
export interface SheetTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Description */
  description?: string
  /** Category */
  category: 'blank' | 'reconciliation' | 'accounting' | 'custom'
  /** Whether this is a built-in template */
  isBuiltIn: boolean
  /** Column definitions */
  columns: Omit<ColumnDef, 'id' | 'key'>[]
  /** Sample data rows (optional) */
  sampleData?: SheetRow[]
  /** Thumbnail URL */
  thumbnailUrl?: string
  /** Created by user ID */
  createdBy?: string
  /** Created at timestamp */
  createdAt?: number
}

/**
 * Built-in template IDs
 */
export type BuiltInTemplateId = 'blank' | 'bank-reconciliation' | 'invoice-tracker' | 'expense-report'

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Cell change event
 */
export interface CellChangeEvent {
  cell: CellReference
  value: CellValue
  oldValue: CellValue
  sheetId: string
  timestamp: number
}

/**
 * Selection change event
 */
export interface SelectionChangeEvent {
  range: RangeReference
  sheetId: string
}

/**
 * Spreadsheet event types
 */
export type SpreadsheetEvent =
  | { type: 'cell-change'; data: CellChangeEvent }
  | { type: 'selection-change'; data: SelectionChangeEvent }
  | { type: 'column-add'; data: { columnId: string; position: number } }
  | { type: 'column-remove'; data: { columnId: string } }
  | { type: 'column-rename'; data: { columnId: string; oldName: string; newName: string } }
  | { type: 'sheet-add'; data: { sheetId: string; name: string } }
  | { type: 'sheet-remove'; data: { sheetId: string } }
  | { type: 'sheet-rename'; data: { sheetId: string; oldName: string; newName: string } }

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert column index to Excel-style column letter (0 -> A, 25 -> Z, 26 -> AA)
 */
export function columnIndexToLetter(index: number): string {
  let letter = ''
  let temp = index
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

/**
 * Convert Excel-style column letter to index (A -> 0, Z -> 25, AA -> 26)
 */
export function columnLetterToIndex(letter: string): number {
  let index = 0
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64)
  }
  return index - 1
}

/**
 * Parse A1 notation to row/col indices
 */
export function parseA1Notation(ref: string): { row: number; col: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/)
  if (!match) throw new Error(`Invalid cell reference: ${ref}`)
  return {
    row: parseInt(match[2], 10) - 1,
    col: columnLetterToIndex(match[1]),
  }
}

/**
 * Convert row/col indices to A1 notation
 */
export function toA1Notation(row: number, col: number): string {
  return `${columnIndexToLetter(col)}${row + 1}`
}

/**
 * Generate default columns A-Z (or more)
 */
export function generateDefaultColumns(count: number = 26): ColumnDef[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `col_${i}`,
    key: `col_${i}`,
    name: columnIndexToLetter(i),
    type: 'text' as ColumnType,
    width: 100,
    editable: true,
    order: i,
  }))
}

/**
 * Generate empty rows
 */
export function generateEmptyRows(count: number, columnCount: number): SheetRow[] {
  return Array.from({ length: count }, () => {
    const row: SheetRow = {}
    for (let i = 0; i < columnCount; i++) {
      row[`col_${i}`] = ''
    }
    return row
  })
}
