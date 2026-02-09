'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id, Doc } from '@/convex/_generated/dataModel'
import type {
  ValidationRule,
  ValidationResult,
  UseValidationOptions,
  UseValidationReturn,
} from './types'

/**
 * Hook for managing cell validation
 *
 * Provides validation checking and rule management integrated with Convex.
 *
 * @example
 * ```tsx
 * const { validateCell, getColumnValidation, setColumnValidation, isLoading } = useValidation({
 *   worksheetId,
 *   workosUserId,
 * })
 *
 * const result = validateCell(0, "approved")
 * if (!result.valid) {
 *   showError(result.error)
 * }
 *
 * // Update column validation
 * await setColumnValidation(columnId, { type: 'list', allowedValues: ['A', 'B'] })
 * ```
 */
export function useValidation(
  options: UseValidationOptions
): UseValidationReturn {
  const { worksheetId, workosUserId } = options

  // Query columns with their validation settings
  const columns = useQuery(
    api.worksheetColumns.listByWorksheet,
    { worksheetId, workosUserId }
  )

  // Mutation to update validation
  const updateValidationMutation = useMutation(api.worksheetColumns.updateValidation)

  // Build a map of column index to validation rule for efficient lookup
  const validationMap = useMemo(() => {
    const map = new Map<number, ValidationRule>()
    if (columns) {
      columns.forEach((col: Doc<'worksheetColumns'>, index: number) => {
        if (col.validation) {
          // Cast to ValidationRule since schema types match
          map.set(index, col.validation as ValidationRule)
        }
      })
    }
    return map
  }, [columns])

  // Build a map of column index to column ID
  const columnIdMap = useMemo(() => {
    const map = new Map<number, Id<'worksheetColumns'>>()
    if (columns) {
      columns.forEach((col: Doc<'worksheetColumns'>, index: number) => {
        map.set(index, col._id)
      })
    }
    return map
  }, [columns])

  // Get validation rule for a column by index
  const getColumnValidation = useCallback(
    (columnIndex: number): ValidationRule | undefined => {
      return validationMap.get(columnIndex)
    },
    [validationMap]
  )

  // Validate a cell value against a column's rules
  const validateCell = useCallback(
    (columnIndex: number, value: unknown): ValidationResult => {
      const rule = validationMap.get(columnIndex)

      // No validation rule = always valid
      if (!rule) {
        return { valid: true }
      }

      return validateValue(value, rule)
    },
    [validationMap]
  )

  // Update validation for a column
  const setColumnValidation = useCallback(
    async (
      columnId: Id<'worksheetColumns'>,
      validation: ValidationRule | undefined
    ): Promise<void> => {
      await updateValidationMutation({
        id: columnId,
        workosUserId,
        validation,
      })
    },
    [updateValidationMutation, workosUserId]
  )

  return {
    getColumnValidation,
    validateCell,
    setColumnValidation,
    // Additional useful properties
    columns: columns ?? [],
    columnIdMap,
    isLoading: columns === undefined,
  }
}

/**
 * Validate a value against a validation rule
 */
export function validateValue(
  value: unknown,
  rule: ValidationRule
): ValidationResult {
  const strValue = String(value ?? '')

  // Check required
  if (rule.required && strValue.trim() === '') {
    return {
      valid: false,
      error: rule.errorMessage ?? 'This field is required',
    }
  }

  // Empty values pass if not required
  if (strValue.trim() === '' && !rule.required) {
    return { valid: true }
  }

  switch (rule.type) {
    case 'list':
      return validateList(strValue, rule)
    case 'number':
      return validateNumber(value, rule)
    case 'date':
      return validateDate(strValue, rule)
    case 'text':
      return validateText(strValue, rule)
    default:
      return { valid: true }
  }
}

/**
 * Validate against a list of allowed values
 */
function validateList(value: string, rule: ValidationRule): ValidationResult {
  if (!rule.allowedValues || rule.allowedValues.length === 0) {
    return { valid: true }
  }

  // Case-insensitive comparison
  const isValid = rule.allowedValues.some(
    (allowed) => allowed.toLowerCase() === value.toLowerCase()
  )

  if (!isValid) {
    return {
      valid: false,
      error:
        rule.errorMessage ??
        `Value must be one of: ${rule.allowedValues.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate a numeric value
 */
function validateNumber(value: unknown, rule: ValidationRule): ValidationResult {
  const numValue =
    typeof value === 'number' ? value : parseFloat(String(value))

  if (isNaN(numValue)) {
    return {
      valid: false,
      error: rule.errorMessage ?? 'Value must be a number',
    }
  }

  if (rule.min !== undefined && numValue < rule.min) {
    return {
      valid: false,
      error: rule.errorMessage ?? `Value must be at least ${rule.min}`,
    }
  }

  if (rule.max !== undefined && numValue > rule.max) {
    return {
      valid: false,
      error: rule.errorMessage ?? `Value must be at most ${rule.max}`,
    }
  }

  return { valid: true }
}

/**
 * Validate a date value
 */
function validateDate(value: string, rule: ValidationRule): ValidationResult {
  const date = new Date(value)

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: rule.errorMessage ?? 'Invalid date format',
    }
  }

  // Min/max as timestamps
  if (rule.min !== undefined && date.getTime() < rule.min) {
    return {
      valid: false,
      error:
        rule.errorMessage ??
        `Date must be after ${new Date(rule.min).toLocaleDateString()}`,
    }
  }

  if (rule.max !== undefined && date.getTime() > rule.max) {
    return {
      valid: false,
      error:
        rule.errorMessage ??
        `Date must be before ${new Date(rule.max).toLocaleDateString()}`,
    }
  }

  return { valid: true }
}

/**
 * Validate a text value (length, pattern)
 */
function validateText(value: string, rule: ValidationRule): ValidationResult {
  // Check length constraints
  if (rule.min !== undefined && value.length < rule.min) {
    return {
      valid: false,
      error:
        rule.errorMessage ?? `Text must be at least ${rule.min} characters`,
    }
  }

  if (rule.max !== undefined && value.length > rule.max) {
    return {
      valid: false,
      error:
        rule.errorMessage ?? `Text must be at most ${rule.max} characters`,
    }
  }

  // Check pattern
  if (rule.pattern) {
    try {
      const regex = new RegExp(rule.pattern)
      if (!regex.test(value)) {
        return {
          valid: false,
          error: rule.errorMessage ?? 'Value does not match required format',
        }
      }
    } catch {
      // Invalid regex, skip pattern check
    }
  }

  return { valid: true }
}
