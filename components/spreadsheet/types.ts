/**
 * Type definitions for Univer spreadsheet integration
 */

// =============================================================================
// UNIVER FACADE TYPES
// =============================================================================
// These are runtime-resolved types from the Univer library.
// We use 'any' types since the Univer facade types aren't fully compatible
// with our custom interfaces at compile time.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type FUniver = any
export type FWorkbook = any
export type FWorksheet = any
export type FRange = any
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Cell value types supported by Univer
 */
export type CellValue = string | number | boolean | null | undefined

/**
 * Workbook creation configuration
 */
export interface WorkbookConfig {
  name: string
  sheets: Record<string, {
    name: string
    rowCount: number
    columnCount: number
  }>
}

// =============================================================================
// MATCH STATUS & LAYER TYPES
// =============================================================================

/**
 * Match status for reconciliation cells
 */
export type MatchStatus = 'matched' | 'suggested' | 'pending' | 'suspense' | 'manual'

/**
 * Match layer that produced the match
 * Layers 1-7 correspond to matching algorithm layers:
 * 1: Exact match
 * 2: Date window match
 * 3: Reference match
 * 4: Fuzzy match
 * 5: Semantic/AI match
 * 6: Manual match
 * 7: Partial match
 */
export type MatchLayer = 'exact' | 'window' | 'reference' | 'fuzzy' | 'semantic' | 'manual' | 'partial'

/**
 * Match layer number (1-7)
 */
export type MatchLayerNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

// =============================================================================
// CELL METADATA TYPES
// =============================================================================

/**
 * Custom cell metadata for AI-matched cells
 */
export interface CellMatchMetadata {
  matchConfidence: number
  matchedBy: MatchLayer
  matchedAt?: string
  relatedTransactionId?: string
  relatedInvoiceId?: string
}

/**
 * Cell value with optional metadata
 */
export interface EnrichedCellValue {
  v: CellValue
  custom?: CellMatchMetadata
}

/**
 * Cell annotation/note for AI explanations
 */
export interface CellNote {
  note: string
  width?: number
  height?: number
  show?: boolean
}

// =============================================================================
// DATA ROW TYPES
// =============================================================================

/**
 * Transaction row for display in spreadsheet
 */
export interface TransactionRow {
  id: string
  date: string
  description: string
  amount: number
  reference?: string
  matchStatus: MatchStatus
  matchConfidence?: number
  matchedBy?: MatchLayer
  matchedInvoiceId?: string
}

/**
 * Invoice row for display in spreadsheet
 */
export interface InvoiceRow {
  id: string
  invoiceNumber: string
  date: string
  description: string
  amount: number
  dueDate?: string
  matchStatus: MatchStatus
  matchConfidence?: number
  matchedBy?: MatchLayer
  matchedTransactionId?: string
}

/**
 * Spreadsheet data structure for reconciliation
 */
export interface ReconciliationSheetData {
  transactions: TransactionRow[]
  invoices: InvoiceRow[]
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

/**
 * Props for the main spreadsheet component
 */
export interface UniverSheetProps {
  /** Initial data to populate the sheet */
  data?: ReconciliationSheetData
  /** Whether the sheet is read-only */
  readOnly?: boolean
  /** Custom class name */
  className?: string
  /** Height of the container */
  height?: string | number
}

/**
 * Props for loading skeleton
 */
export interface UniverSheetLoadingProps {
  height?: string | number
  className?: string
  columns?: number
  rows?: number
}

/**
 * Props for error state
 */
export interface UniverSheetErrorProps {
  error?: Error | null
  onRetry?: () => void
  height?: string | number
  className?: string
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Options for creating a new spreadsheet
 */
export interface CreateSpreadsheetOptions {
  sheetName?: string
  data?: ReconciliationSheetData
  readOnly?: boolean
}

/**
 * Univer API context type
 */
export interface UniverAPIContext {
  univerAPI: FUniver | null
  workbook: FWorkbook | null
  activeSheet: FWorksheet | null
  isReady: boolean
}

/**
 * Cell range selection
 */
export interface CellSelection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

/**
 * Match suggestion from AI
 */
export interface MatchSuggestion {
  transactionId: string
  invoiceId: string
  confidence: number
  layer: MatchLayer
  reasoning?: string
}

/**
 * Column configuration for spreadsheet
 */
export interface ColumnConfig {
  key: string
  header: string
  width?: number
  type: 'text' | 'number' | 'date' | 'status' | 'confidence'
  editable?: boolean
}
