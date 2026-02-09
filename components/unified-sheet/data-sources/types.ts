/**
 * Data Source Types
 *
 * Type definitions for worksheet data sources.
 *
 * @module components/unified-sheet/data-sources/types
 */

import type { Id } from '@/convex/_generated/dataModel'

/**
 * Data source types
 */
export type DataSourceType = 'manual' | 'reconciliation' | 'csv_import'

/**
 * Reconciliation source configuration
 */
export interface ReconciliationSourceConfig {
  /** The reconciliation session to import from */
  sessionId: Id<'reconciliationSessions'>
  /** Include matched pairs (default: true) */
  includeMatches?: boolean
  /** Include suspense items (default: true) */
  includeSuspense?: boolean
  /** Filter matches by status */
  matchStatusFilter?: 'pending' | 'approved' | 'rejected'
  /** Filter suspense items by status */
  suspenseStatusFilter?: 'open' | 'queried' | 'resolved'
}

/**
 * CSV import source configuration
 */
export interface CsvImportSourceConfig {
  /** Original filename */
  fileName: string
  /** Column mapping from CSV headers to spreadsheet columns */
  columnMapping: Record<string, number>
  /** When the import was performed */
  importedAt: number
}

/**
 * Manual source configuration (empty - just for completeness)
 */
export interface ManualSourceConfig {
  // No config needed for manual entry
}

/**
 * Union type for all source configurations
 */
export type DataSourceConfig =
  | { type: 'manual'; config: ManualSourceConfig }
  | { type: 'reconciliation'; config: ReconciliationSourceConfig }
  | { type: 'csv_import'; config: CsvImportSourceConfig }

/**
 * Row data from reconciliation source
 */
export interface ReconciliationSheetRow {
  /** Row ID (match ID or suspense ID) */
  id: string
  /** Row type for display */
  rowType: 'match' | 'suspense'
  /** Source type (cash/accrual) */
  sourceType: 'cash' | 'accrual'

  // Cash transaction fields
  cashDate?: string
  cashDescription?: string
  cashAmount?: number
  cashReference?: string

  // Accrual document fields
  accrualDocNumber?: string
  accrualDate?: string
  accrualDescription?: string
  accrualAmount?: number
  accrualCounterparty?: string
  accrualDueDate?: string

  // Match fields
  matchConfidence?: number
  matchLayer?: number
  matchLayerName?: string
  matchReason?: string
  matchStatus?: 'pending' | 'approved' | 'rejected'

  // Suspense fields
  suspenseReason?: string
  suspenseStatus?: 'open' | 'queried' | 'resolved'
  suspenseSuggestedAction?: string
}

/**
 * Column definition for reconciliation data
 */
export interface ReconciliationColumnDef {
  key: string
  name: string
  width: number
  editable: boolean
}

/**
 * Result of fetching reconciliation data
 */
export interface ReconciliationDataResult {
  rows: ReconciliationSheetRow[]
  columns: ReconciliationColumnDef[]
  totalMatches: number
  totalSuspense: number
  sessionName: string
  sessionStatus: string
}

/**
 * Match layer number to name mapping
 */
export const MATCH_LAYER_NAMES: Record<number, string> = {
  1: 'exact',
  2: 'window',
  3: 'reference',
  4: 'fuzzy',
  5: 'semantic',
  6: 'manual',
  7: 'partial',
}
