/**
 * Unified Sheet Module
 *
 * Full-featured spreadsheet component with:
 * - Cell editing
 * - Convex persistence
 * - AI integration (coming soon)
 * - Real-time sync
 *
 * @module components/unified-sheet
 */

// Main component
export { UnifiedSheet, UnifiedSheetReadOnly } from './unified-sheet'
export type { UnifiedSheetProps } from './unified-sheet'

// Sync adapter
export {
  ConvexSyncAdapter,
  createSyncAdapter,
  DEFAULT_SYNC_CONFIG,
} from './sync/convex-sync-adapter'
export type {
  SyncConfig,
  SyncStatus,
  PendingChange,
  SyncEventListener,
} from './sync/convex-sync-adapter'

// Hooks
export { useConvexSync } from './hooks/use-convex-sync'
export { useFormulaExecution, useFormulaJobStatus } from './hooks/use-formula-execution'

// Formula system
export {
  FormulaRegistry,
  getFormulaRegistry,
  isCustomFormula,
  FORMULA_PLACEHOLDERS,
} from './formulas/formula-registry'
export type {
  FormulaResult,
  FormulaDefinition,
  FormulaContext,
} from './formulas/formula-registry'

// AI components
export { AIContextMenu, useAIContextMenu } from './ai/ai-context-menu'
export {
  CellStatusBadge,
  CellOverlayIndicator,
  JobStatsSummary,
  useCellStatusClasses,
  getCellStatusStyle,
  CELL_STATUS_COLORS,
} from './ai/ai-cell-status'
export type { CellStatus } from './ai/ai-cell-status'

// Data sources (Phase 3)
export {
  ImportDialog,
  useImportReconciliation,
  useDataRefresh,
  fetchReconciliationData,
  getReconciliationLinkedColumns,
  reconciliationRowsToCells,
  RECONCILIATION_COLUMNS,
  MATCH_LAYER_NAMES,
} from './data-sources'
export type {
  ReconciliationSourceConfig,
  ReconciliationSheetRow,
  DataSourceType,
  DataSourceConfig,
  ReconciliationColumnDef,
  ReconciliationDataResult,
} from './data-sources'

// Conditional Formatting (Phase 4)
export {
  useConditionalFormatting,
  formattingToStyle,
  RuleBuilderDialog,
  ConditionalRulesPanel,
  FormatToolbarButton,
  OPERATOR_LABELS,
  RULE_TYPE_LABELS,
  PRESET_DESCRIPTIONS,
} from './formatting'
export type {
  ConditionalFormatRule,
  CellFormatting,
  FormatCondition,
  FormatRange,
  RuleType,
  PresetType,
  ConditionOperator,
  UseConditionalFormattingOptions,
  UseConditionalFormattingReturn,
} from './formatting'

// Charts (Phase 4)
export {
  useCharts,
  ChartPanel,
  ChartToolbarButton,
  ChartBuilderDialog,
  BarChartRenderer,
  LineChartRenderer,
  PieChartRenderer,
  AreaChartRenderer,
  DEFAULT_CHART_COLORS,
  FALLBACK_CHART_COLORS,
} from './charts'
export type {
  WorksheetChart,
  ChartType,
  ChartOptions,
  ChartDataPoint,
  ChartPanelProps,
  ChartBuilderDialogProps,
  UseChartsOptions,
  UseChartsReturn,
} from './charts'

// Data Validation (Phase 4)
export {
  useValidation,
  validateValue,
  DropdownCell,
  DropdownTrigger,
  ValidationEditorDialog,
  PRESET_VALIDATION_LISTS,
} from './validation'
export type {
  ValidationType,
  ValidationRule,
  ValidationResult,
  PresetValidationKey,
  DropdownCellProps,
  ValidationEditorProps,
  UseValidationOptions,
  UseValidationReturn,
} from './validation'
