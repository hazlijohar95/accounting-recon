/**
 * Reconciliation plugin types
 *
 * These types are specific to the reconciliation feature and are extracted
 * from the generic spreadsheet core.
 */

import type { ColumnDef, SheetRow } from '../../core/types'

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
// RECONCILIATION ROW TYPES
// =============================================================================

/**
 * Transaction row for reconciliation
 */
export interface TransactionRow extends SheetRow {
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
 * Invoice row for reconciliation
 */
export interface InvoiceRow extends SheetRow {
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
 * Reconciliation sheet data structure
 */
export interface ReconciliationSheetData {
  transactions: TransactionRow[]
  invoices: InvoiceRow[]
}

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

// =============================================================================
// PLUGIN CONFIG TYPES
// =============================================================================

/**
 * Reconciliation plugin configuration
 */
export interface ReconciliationPluginConfig {
  /** Enable match status styling */
  enableStatusStyling?: boolean
  /** Enable confidence styling */
  enableConfidenceStyling?: boolean
  /** Enable layer badge styling */
  enableLayerStyling?: boolean
  /** Auto-match threshold (0-1) */
  autoMatchThreshold?: number
  /** Suggestion threshold (0-1) */
  suggestThreshold?: number
  /** Status column key */
  statusColumnKey?: string
  /** Confidence column key */
  confidenceColumnKey?: string
}

/**
 * Default plugin configuration
 */
export const DEFAULT_PLUGIN_CONFIG: Required<ReconciliationPluginConfig> = {
  enableStatusStyling: true,
  enableConfidenceStyling: true,
  enableLayerStyling: true,
  autoMatchThreshold: 0.90,
  suggestThreshold: 0.70,
  statusColumnKey: 'matchStatus',
  confidenceColumnKey: 'matchConfidence',
}
