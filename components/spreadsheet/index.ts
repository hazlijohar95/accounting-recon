/**
 * Spreadsheet components using Jspreadsheet CE
 *
 * Migrated from Univer to Jspreadsheet CE for React 19 compatibility.
 *
 * @example Generic Spreadsheet (Excel-like)
 * ```tsx
 * import { GenericSheet } from '@/components/spreadsheet'
 *
 * function SpreadsheetPage() {
 *   return (
 *     <GenericSheet
 *       showFormulaBar
 *       showToolbar
 *       enableFormulas
 *       height="800px"
 *     />
 *   )
 * }
 * ```
 *
 * @example Reconciliation Spreadsheet (with plugin)
 * ```tsx
 * import { GenericSheet, createReconciliationPlugin } from '@/components/spreadsheet'
 *
 * function ReconciliationPage() {
 *   const reconciliationPlugin = createReconciliationPlugin()
 *   return (
 *     <GenericSheet
 *       plugins={[reconciliationPlugin]}
 *       localData={{ columns, rows }}
 *       height="800px"
 *     />
 *   )
 * }
 * ```
 */

// NEW: Generic spreadsheet components (Excel-like)
export { GenericSheet, FormulaBar, SheetTabs } from './core'
export type {
  CellValue as GenericCellValue,
  SheetRow,
  ColumnDef,
  SheetDef,
  WorkbookDef,
  GenericSheetProps,
  SpreadsheetPlugin,
  ColumnPreset,
  CellStyle,
  ToolbarItem,
  ContextMenuItem,
  SpreadsheetAPI,
  SheetTemplate,
  BuiltInTemplateId,
  CellReference,
  RangeReference,
  ColumnType,
  ColumnValidation,
} from './core'
export {
  columnIndexToLetter,
  columnLetterToIndex,
  parseA1Notation,
  toA1Notation,
  generateDefaultColumns,
  generateEmptyRows,
} from './core'

// NEW: Reconciliation plugin
export { createReconciliationPlugin, reconciliationPlugin } from './plugins/reconciliation'
export type {
  MatchStatus as ReconciliationMatchStatus,
  MatchLayer as ReconciliationMatchLayer,
  ReconciliationPluginConfig,
  TransactionRow as ReconciliationTransactionRow,
  InvoiceRow as ReconciliationInvoiceRow,
  ReconciliationSheetData as ReconciliationData,
} from './plugins/reconciliation'
export {
  getStatusStyle,
  getLayerStyle,
  getConfidenceStyle,
  formatConfidence as formatReconciliationConfidence,
  CONFIDENCE_THRESHOLDS as RECONCILIATION_THRESHOLDS,
  RECONCILIATION_PRESETS,
  TRANSACTION_COLUMN_DEFS,
  INVOICE_COLUMN_DEFS,
} from './plugins/reconciliation'

// Main component (Jspreadsheet-based, React 19 compatible)
export { JspreadsheetSheet, JspreadsheetSheetReadOnly } from './jspreadsheet-sheet'

// Legacy exports - now powered by Jspreadsheet
// Keeping UniverSheet exports for backwards compatibility
export { UniverSheet, UniverSheetReadOnly } from './univer-sheet'

// Safe dynamic wrapper (recommended for production use)
export { UniverSheetSafe, UniverSheetSafeReadOnly } from './univer-sheet-dynamic'

// Loading and error states
export { UniverSheetLoading } from './univer-sheet-loading'
export { UniverSheetError } from './univer-sheet-error'

// Shared components
export { SpreadsheetToolbar } from './SpreadsheetToolbar'
export type { SpreadsheetToolbarProps } from './SpreadsheetToolbar'
export { SpreadsheetFooter } from './SpreadsheetFooter'

// Hook for programmatic manipulation
export { useUniverAPI } from './use-univer-api'
export type {
  UniverAPIHook,
  CellChangeEvent,
  CellChangeCallback,
} from './use-univer-api'

// Excel utilities
export {
  parseUploadedFile,
  exportToExcel,
  downloadBlob,
  downloadReconciliationReport,
  toCSV,
} from './excel-utils'

// Data transformation
export { transformToSpreadsheetData } from './data-transform'

// Row formatters (for spreadsheet display)
export {
  formatTransactionRow,
  formatInvoiceRow,
  formatTransactionData,
  formatInvoiceData,
} from './formatters'
export type { CellArray } from './formatters'

// Theme utilities
export {
  getThemeColors,
  getStatusColor,
  getLayerColor,
  getConfidenceThemeColor,
} from './theme'
export type { ThemeColors } from './theme'

// Types
export type {
  // Univer facade types
  FUniver,
  FWorkbook,
  FWorksheet,
  FRange,
  WorkbookConfig,
  CellValue,
  // Match types
  MatchStatus,
  MatchLayer,
  MatchLayerNumber,
  // Cell types
  CellMatchMetadata,
  EnrichedCellValue,
  CellNote,
  // Data row types
  TransactionRow,
  InvoiceRow,
  ReconciliationSheetData,
  // Component props
  UniverSheetProps,
  UniverSheetLoadingProps,
  UniverSheetErrorProps,
  // Other types
  CreateSpreadsheetOptions,
  UniverAPIContext,
  CellSelection,
  MatchSuggestion,
  ColumnConfig,
} from './types'

// Constants
export {
  TRANSACTION_COLUMNS,
  INVOICE_COLUMNS,
  STATUS_COLORS,
  LAYER_COLORS,
  DEFAULT_SHEET_CONFIG,
  CONFIDENCE_THRESHOLDS,
  formatConfidence,
  getConfidenceColor,
} from './constants'
