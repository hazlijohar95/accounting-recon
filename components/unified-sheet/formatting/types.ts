import { Id } from "@/convex/_generated/dataModel"

/**
 * Conditional Formatting Types
 *
 * Types for managing visual formatting rules based on cell values.
 */

// =============================================================================
// Core Types
// =============================================================================

export type ConditionOperator =
  | "gt"       // >
  | "gte"      // >=
  | "lt"       // <
  | "lte"      // <=
  | "eq"       // ==
  | "neq"      // !=
  | "contains"
  | "startsWith"
  | "endsWith"
  | "between"

export type RuleType =
  | "threshold"
  | "between"
  | "equals"
  | "contains"
  | "confidenceBand"
  | "statusColor"
  | "matchLayer"

export type PresetType = "confidenceBand" | "statusColor" | "matchLayer"

export interface CellFormatting {
  backgroundColor?: string
  textColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
}

export interface FormatCondition {
  operator: ConditionOperator
  value: string | number | boolean
  value2?: string | number | boolean
  formatting: CellFormatting
}

export interface FormatRange {
  startCell?: string
  endCell?: string
  columnIndex?: number
  rowIndex?: number
}

export interface ConditionalFormatRule {
  _id: Id<"worksheetConditionalFormats">
  worksheetId: Id<"worksheets">
  name: string
  range: FormatRange
  ruleType: RuleType
  conditions: FormatCondition[]
  priority: number
  enabled: boolean
  createdAt: number
  updatedAt: number
}

// =============================================================================
// UI Component Props
// =============================================================================

export interface RuleBuilderDialogProps {
  worksheetId: Id<"worksheets">
  workosUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing rule to edit, or undefined for new rule */
  editingRule?: ConditionalFormatRule
  /** Available columns for selection */
  columns: Array<{ index: number; name: string }>
  onSave?: (ruleId: Id<"worksheetConditionalFormats">) => void
}

export interface ConditionalRulesPanelProps {
  worksheetId: Id<"worksheets">
  workosUserId: string
  /** Whether the panel is open/visible */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Available columns for rule builder */
  columns: Array<{ index: number; name: string }>
}

export interface PresetSelectorProps {
  worksheetId: Id<"worksheets">
  workosUserId: string
  columns: Array<{ index: number; name: string }>
  onApply?: (ruleId: Id<"worksheetConditionalFormats">) => void
}

// =============================================================================
// Hook Types
// =============================================================================

export interface UseConditionalFormattingOptions {
  worksheetId: Id<"worksheets">
  workosUserId: string
  /** Whether to only fetch enabled rules */
  enabledOnly?: boolean
}

export interface UseConditionalFormattingReturn {
  /** List of all formatting rules */
  rules: ConditionalFormatRule[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Create a new custom rule */
  createRule: (rule: Omit<ConditionalFormatRule, "_id" | "worksheetId" | "createdAt" | "updatedAt">) => Promise<Id<"worksheetConditionalFormats">>
  /** Create a preset rule */
  createPreset: (preset: PresetType, columnIndex: number, name?: string) => Promise<Id<"worksheetConditionalFormats">>
  /** Update an existing rule */
  updateRule: (id: Id<"worksheetConditionalFormats">, updates: Partial<ConditionalFormatRule>) => Promise<void>
  /** Toggle a rule on/off */
  toggleRule: (id: Id<"worksheetConditionalFormats">) => Promise<boolean>
  /** Delete a rule */
  deleteRule: (id: Id<"worksheetConditionalFormats">) => Promise<void>
  /** Reorder rules */
  reorderRules: (ruleIds: Id<"worksheetConditionalFormats">[]) => Promise<void>
  /** Get formatting for a specific cell */
  getCellFormatting: (rowIndex: number, columnIndex: number, cellValue: unknown) => CellFormatting | null
}

// =============================================================================
// Evaluation Helpers
// =============================================================================

/**
 * Labels for condition operators
 */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  gt: "Greater than",
  gte: "Greater than or equal to",
  lt: "Less than",
  lte: "Less than or equal to",
  eq: "Equal to",
  neq: "Not equal to",
  contains: "Contains",
  startsWith: "Starts with",
  endsWith: "Ends with",
  between: "Between",
}

/**
 * Labels for rule types
 */
export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  threshold: "Threshold",
  between: "Between Range",
  equals: "Exact Match",
  contains: "Text Contains",
  confidenceBand: "Confidence Band (Preset)",
  statusColor: "Status Colors (Preset)",
  matchLayer: "Match Layer Colors (Preset)",
}

/**
 * Preset descriptions
 */
export const PRESET_DESCRIPTIONS: Record<PresetType, string> = {
  confidenceBand: "Colors cells based on confidence score: green (≥90%), yellow (70-89%), red (<70%)",
  statusColor: "Colors cells based on match status: matched, pending, rejected, suspense",
  matchLayer: "Colors cells based on match layer: exact, window, reference, fuzzy, semantic, manual",
}
