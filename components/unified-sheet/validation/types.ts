import { Id } from "@/convex/_generated/dataModel"

/**
 * Data Validation Types
 *
 * Types for spreadsheet cell validation.
 */

// =============================================================================
// Core Types
// =============================================================================

export type ValidationType = "list" | "number" | "date" | "text"

export interface ValidationRule {
  type: ValidationType
  /** Allowed values for list type */
  allowedValues?: string[]
  /** Minimum value for number/date/text length */
  min?: number
  /** Maximum value for number/date/text length */
  max?: number
  /** Regex pattern for text validation */
  pattern?: string
  /** Whether the field is required (non-empty) */
  required?: boolean
  /** Custom error message */
  errorMessage?: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

// =============================================================================
// Preset Validation Lists
// =============================================================================

/**
 * Common preset lists for reconciliation workflows
 */
export const PRESET_VALIDATION_LISTS = {
  matchStatus: {
    name: "Match Status",
    values: ["Pending", "Approved", "Rejected"],
  },
  suspenseStatus: {
    name: "Suspense Status",
    values: ["Open", "Queried", "Resolved"],
  },
  matchLayer: {
    name: "Match Layer",
    values: ["Exact", "Window", "Reference", "Fuzzy", "Semantic", "Manual"],
  },
  confidenceBand: {
    name: "Confidence Band",
    values: ["High", "Medium", "Low"],
  },
  yesNo: {
    name: "Yes/No",
    values: ["Yes", "No"],
  },
  priority: {
    name: "Priority",
    values: ["High", "Medium", "Low"],
  },
} as const

export type PresetValidationKey = keyof typeof PRESET_VALIDATION_LISTS

// =============================================================================
// UI Component Props
// =============================================================================

export interface DropdownCellProps {
  /** Current cell value */
  value: string
  /** List of allowed values */
  options: string[]
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Position for dropdown overlay */
  position: { x: number; y: number; width: number; height: number }
  /** Whether the dropdown is open */
  isOpen: boolean
  /** Callback to close dropdown */
  onClose: () => void
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Allow clearing the value */
  allowClear?: boolean
}

export interface ValidationEditorProps {
  /** Current validation rule */
  validation?: ValidationRule
  /** Callback when validation changes */
  onChange: (validation: ValidationRule | undefined) => void
  /** Column ID being edited */
  columnId: Id<"worksheetColumns">
}

// =============================================================================
// Hook Types
// =============================================================================

export interface UseValidationOptions {
  worksheetId: Id<"worksheets">
  workosUserId: string
}

export interface UseValidationReturn {
  /** Get validation rule for a column */
  getColumnValidation: (columnIndex: number) => ValidationRule | undefined
  /** Validate a cell value against a column's rules */
  validateCell: (columnIndex: number, value: unknown) => ValidationResult
  /** Update validation for a column */
  setColumnValidation: (columnId: Id<"worksheetColumns">, validation: ValidationRule | undefined) => Promise<void>
  /** All columns with their metadata */
  columns: Array<{
    _id: Id<"worksheetColumns">
    name: string
    order: number
    validation?: ValidationRule
  }>
  /** Map of column index to column ID */
  columnIdMap: Map<number, Id<"worksheetColumns">>
  /** Whether columns are still loading */
  isLoading: boolean
}
