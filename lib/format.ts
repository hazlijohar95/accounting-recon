/**
 * Formatting utilities for currency and numbers.
 *
 * @module lib/format
 */

/**
 * Format a numeric amount as a USD currency string.
 *
 * @param amount - The amount to format (positive or negative)
 * @param options.showSign - If true, prefix negative amounts with a minus sign
 * @returns Formatted string like "$1,234.56" or "-$1,234.56"
 *
 * @example
 * formatCurrency(1234.5)                        // "$1,234.50"
 * formatCurrency(-500, { showSign: true })       // "-$500.00"
 * formatCurrency(-500)                           // "$500.00"
 */
export function formatCurrency(amount: number, options?: { showSign?: boolean }): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (options?.showSign && amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}
