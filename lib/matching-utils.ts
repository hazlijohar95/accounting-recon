/**
 * Matching Utility Functions (Client-side)
 * Re-exports shared utilities plus additional client-specific helpers
 * 
 * IMPORTANT: Core utilities are defined in convex/utils/matchingUtils.ts
 * This file re-exports them for client-side use and adds client-only helpers
 */

// Re-export shared utilities from convex
// Note: These imports work because Next.js can resolve convex/ paths
export {
  levenshteinDistance,
  stringSimilarity,
  normalizeString,
  dateDiffDays,
  amountsMatch,
  amountsWithinVariance,
  extractReferences,
  normalizeDocNumber,
  REFERENCE_PATTERNS,
} from "@/convex/utils/matchingUtils";

// ============ CLIENT-ONLY UTILITIES ============

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if two dates are within a tolerance window
 */
export function datesWithinWindow(
  date1: string,
  date2: string,
  windowDays: number
): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);

  // Return false if either date is invalid
  if (!d1 || !d2) return false;

  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  const diff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diff <= windowDays;
}

/**
 * Check if any reference from one set matches any in another set
 */
export function referencesMatch(refs1: string[], refs2: string[]): boolean {
  if (refs1.length === 0 || refs2.length === 0) return false;

  return refs1.some((r1) => refs2.some((r2) => r1 === r2));
}

// ============ CONFIDENCE SCORING ============

/**
 * Confidence thresholds for categorization
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,
  MEDIUM: 70,
} as const;

/**
 * Display percentages for confidence levels
 * Used in UI components to show confidence scores
 */
export const CONFIDENCE_DISPLAY_VALUES = {
  high: 95,
  medium: 78,
  low: 55,
} as const;

/**
 * Convert numeric confidence to category
 */
export function confidenceCategory(
  score: number
): "high" | "medium" | "low" {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}

/**
 * Convert confidence category to display percentage
 */
export function confidenceToPercent(confidence: "high" | "medium" | "low" | string): number {
  if (confidence === "high") return CONFIDENCE_DISPLAY_VALUES.high;
  if (confidence === "medium") return CONFIDENCE_DISPLAY_VALUES.medium;
  if (confidence === "low") return CONFIDENCE_DISPLAY_VALUES.low;
  return 0;
}

// ============ BATCH UTILITIES ============

/**
 * Chunk an array into smaller batches
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
