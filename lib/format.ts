/**
 * Formatting utilities for currency and numbers.
 *
 * @module lib/format
 */

/** Currency symbol lookup. Add entries as you support more currencies. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  MYR: "RM",
  EUR: "\u20AC",
  GBP: "\u00A3",
  SGD: "S$",
};

/**
 * Get the symbol for a currency code.
 *
 * @param currencyCode - ISO 4217 code (e.g. "USD", "MYR")
 * @returns The symbol string, or the code itself as fallback
 */
export function getCurrencySymbol(currencyCode: string = "USD"): string {
  return CURRENCY_SYMBOLS[currencyCode] || `${currencyCode} `;
}

/**
 * Format a numeric amount as a currency string.
 *
 * @param amount - The amount to format (positive or negative)
 * @param options.showSign - If true, prefix negative amounts with a minus sign
 * @param options.currency - ISO 4217 currency code (default: "USD")
 * @returns Formatted string like "$1,234.56" or "-RM1,234.56"
 *
 * @example
 * formatCurrency(1234.5)                                    // "$1,234.50"
 * formatCurrency(-500, { showSign: true })                  // "-$500.00"
 * formatCurrency(1234.5, { currency: "MYR" })               // "RM1,234.50"
 * formatCurrency(-500, { showSign: true, currency: "MYR" }) // "-RM500.00"
 */
export function formatCurrency(
  amount: number,
  options?: { showSign?: boolean; currency?: string },
): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = getCurrencySymbol(options?.currency);
  if (options?.showSign && amount < 0) return `-${symbol}${formatted}`;
  return `${symbol}${formatted}`;
}
