/**
 * Data Validation Module
 *
 * Provides cell-level validation for spreadsheet columns including:
 * - List validation with dropdown selection
 * - Number validation with min/max constraints
 * - Date validation with range constraints
 * - Text validation with length and pattern constraints
 *
 * @example
 * ```tsx
 * import {
 *   useValidation,
 *   ValidationEditorDialog,
 *   DropdownCell,
 *   PRESET_VALIDATION_LISTS,
 * } from '@/components/unified-sheet/validation'
 *
 * // In your component
 * const { validateCell, getColumnValidation } = useValidation({
 *   worksheetId,
 *   workosUserId,
 * })
 *
 * // Validate a cell value
 * const result = validateCell(columnIndex, "some value")
 * if (!result.valid) {
 *   showError(result.error)
 * }
 * ```
 */

// Types
export type {
  ValidationType,
  ValidationRule,
  ValidationResult,
  PresetValidationKey,
  DropdownCellProps,
  ValidationEditorProps,
  UseValidationOptions,
  UseValidationReturn,
} from './types'

export { PRESET_VALIDATION_LISTS } from './types'

// Hook
export { useValidation, validateValue } from './use-validation'

// Components
export { DropdownCell, DropdownTrigger } from './dropdown-cell'
export { ValidationEditorDialog } from './validation-editor'
