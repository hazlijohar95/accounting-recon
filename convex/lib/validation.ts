/**
 * Shared validation helpers for Convex mutations
 * Used to validate input data before database operations
 */
import { ValidationErrors } from "./errors";
import { MAX_BULK_IMPORT_SIZE } from "./constants";

/**
 * Validates that an amount is a finite number (not NaN or Infinity)
 */
export function validateAmount(amount: number, fieldName = "amount"): void {
  if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
    ValidationErrors.invalidAmount(fieldName);
  }
}

/**
 * Validates date format is YYYY-MM-DD
 */
export function validateDate(date: string, fieldName = "date"): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    ValidationErrors.invalidDateFormat(fieldName);
  }
  // Also check it's a valid date
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    ValidationErrors.invalidDate(fieldName);
  }
}

/**
 * Validates a string is non-empty after trimming
 */
export function validateNonEmpty(value: string, fieldName: string): void {
  if (!value || !value.trim()) {
    ValidationErrors.cannotBeEmpty(fieldName);
  }
}

/**
 * Validates currency is a 3-letter code (ISO 4217)
 */
export function validateCurrency(currency: string): void {
  if (!/^[A-Z]{3}$/.test(currency.toUpperCase())) {
    ValidationErrors.invalidCurrency(currency);
  }
}

/**
 * Validates optional date - only validates if provided
 */
export function validateOptionalDate(date: string | undefined, fieldName: string): void {
  if (date !== undefined) {
    validateDate(date, fieldName);
  }
}

/**
 * Validates optional amount - only validates if provided
 */
export function validateOptionalAmount(amount: number | undefined, fieldName: string): void {
  if (amount !== undefined) {
    validateAmount(amount, fieldName);
  }
}


/**
 * Filter out undefined values from an object before passing to ctx.db.patch()
 * Convex doesn't accept undefined values in patch operations.
 *
 * @example
 * ```ts
 * const updates = filterUndefinedValues({
 *   name: args.name, // might be undefined
 *   description: args.description, // might be undefined
 * });
 * await ctx.db.patch(id, updates);
 * ```
 */
export function filterUndefinedValues<T extends Record<string, unknown>>(
  obj: T
): Partial<{ [K in keyof T]: Exclude<T[K], undefined> }> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<{ [K in keyof T]: Exclude<T[K], undefined> }>;
}

/**
 * Validates that a bulk import size is within allowed limits.
 * Throws ValidationError if exceeded.
 *
 * @param itemCount - Number of items in the bulk operation
 * @param maxSize - Maximum allowed size (defaults to MAX_BULK_IMPORT_SIZE)
 *
 * @example
 * ```ts
 * validateBulkSize(args.transactions.length);
 * ```
 */
export function validateBulkSize(
  itemCount: number,
  maxSize: number = MAX_BULK_IMPORT_SIZE
): void {
  if (itemCount > maxSize) {
    ValidationErrors.bulkLimitExceeded(maxSize, itemCount);
  }
}

/**
 * Validates that an array is non-empty
 */
export function validateNonEmptyArray<T>(arr: T[], fieldName: string): void {
  if (!arr || arr.length === 0) {
    ValidationErrors.cannotBeEmpty(fieldName);
  }
}
