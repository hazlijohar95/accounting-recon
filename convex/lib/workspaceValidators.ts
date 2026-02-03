/**
 * Workspace Validation Helpers
 *
 * Centralized validation functions for workspace operations.
 * Used by: workspaces.ts, agents.ts
 *
 * @module convex/lib/workspace-validators
 */

import { WORKSPACE_LIMITS } from "./constants";
import { ValidationErrors } from "./errors";

/**
 * Validate name length for workspace, worksheet, or column names.
 */
export function validateNameLength(
  name: string,
  fieldName: string = "name"
): void {
  if (name.length > WORKSPACE_LIMITS.MAX_NAME_LENGTH) {
    ValidationErrors.outOfRange(fieldName, undefined, WORKSPACE_LIMITS.MAX_NAME_LENGTH);
  }
}

/**
 * Validate description length.
 */
export function validateDescriptionLength(
  description: string,
  fieldName: string = "description"
): void {
  if (description.length > WORKSPACE_LIMITS.MAX_DESCRIPTION_LENGTH) {
    ValidationErrors.outOfRange(fieldName, undefined, WORKSPACE_LIMITS.MAX_DESCRIPTION_LENGTH);
  }
}

/**
 * Validate formula length.
 */
export function validateFormulaLength(
  formula: string,
  fieldName: string = "formula"
): void {
  if (formula.length > WORKSPACE_LIMITS.MAX_FORMULA_LENGTH) {
    ValidationErrors.outOfRange(fieldName, undefined, WORKSPACE_LIMITS.MAX_FORMULA_LENGTH);
  }
}

/**
 * Validate cell value to prevent DoS attacks.
 * Returns true if valid, false otherwise.
 */
export function validateCellValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    return value.length <= WORKSPACE_LIMITS.MAX_CELL_VALUE_LENGTH;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  // For objects/arrays, stringify and check length
  try {
    const str = JSON.stringify(value);
    return str.length <= WORKSPACE_LIMITS.MAX_CELL_VALUE_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Validate a cells object (multiple cell values).
 * Returns validation result with optional error message.
 */
export function validateCells(
  cells: Record<string, unknown>
): { valid: boolean; error?: string } {
  const keys = Object.keys(cells);
  if (keys.length > WORKSPACE_LIMITS.MAX_CELLS_PER_ROW) {
    return {
      valid: false,
      error: `Too many cells (max ${WORKSPACE_LIMITS.MAX_CELLS_PER_ROW})`,
    };
  }
  for (const [key, value] of Object.entries(cells)) {
    if (!key.match(/^col_\d+$/)) {
      return { valid: false, error: `Invalid column key: ${key}` };
    }
    if (!validateCellValue(value)) {
      return { valid: false, error: `Cell value too large for ${key}` };
    }
  }
  return { valid: true };
}

/**
 * Validate column key format (e.g., "col_0", "col_1").
 */
export function validateColumnKeyFormat(columnKey: string): boolean {
  return /^col_\d+$/.test(columnKey);
}

/**
 * Validate batch size for bulk operations.
 * Throws if size exceeds limit.
 */
export function validateBatchSize(
  size: number,
  operation: string = "batch"
): void {
  if (size > WORKSPACE_LIMITS.MAX_BATCH_SIZE) {
    ValidationErrors.bulkLimitExceeded(WORKSPACE_LIMITS.MAX_BATCH_SIZE, size);
  }
}

/**
 * Validate column width is within bounds.
 * Returns clamped width value.
 */
export function clampColumnWidth(width: number): number {
  return Math.max(
    WORKSPACE_LIMITS.MIN_COLUMN_WIDTH,
    Math.min(WORKSPACE_LIMITS.MAX_COLUMN_WIDTH, width)
  );
}
