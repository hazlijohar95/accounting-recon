/**
 * Data Sources Module
 *
 * Provides adapters for importing data from various sources into the unified spreadsheet.
 *
 * @module components/unified-sheet/data-sources
 */

// Types
export type {
  ReconciliationSourceConfig,
  ReconciliationSheetRow,
  DataSourceType,
  DataSourceConfig,
  ReconciliationColumnDef,
  ReconciliationDataResult,
} from './types'

export { MATCH_LAYER_NAMES } from './types'

// Reconciliation source
export {
  fetchReconciliationData,
  getReconciliationLinkedColumns,
  reconciliationRowsToCells,
  RECONCILIATION_COLUMNS,
} from './reconciliation-source'

// Hooks
export { useDataRefresh } from './use-data-refresh'
export { useImportReconciliation } from './use-import-reconciliation'

// Components
export { ImportDialog } from './import-dialog'
