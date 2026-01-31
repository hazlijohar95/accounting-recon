/**
 * Shared Matching Utility Functions
 * Used by both convex/matching/layers.ts and lib/matching-utils.ts
 * SINGLE SOURCE OF TRUTH - do not duplicate these functions
 */

// ============ STRING SIMILARITY ============

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Calculate string similarity ratio (0-100)
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 100;
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 100;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(s1, s2);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Normalize a string for comparison
 */
export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/^(payment|transfer|debit|credit|wire|eft|ach)\s*/i, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize company name for fuzzy matching
 * Expands common abbreviations and removes noise words to improve similarity scores
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  return normalizeString(name)
    .replace(/\b(to|from|for)\b\s*/gi, "") // Remove common prepositions
    .replace(/\bcorp\b/gi, "corporation")
    .replace(/\binc\b/gi, "incorporated")
    .replace(/\bltd\b/gi, "limited")
    .replace(/\bllc\b/gi, "")
    .replace(/\bco\b/gi, "company")
    .replace(/\bsdn\b/gi, "sendirian")
    .replace(/\bbhd\b/gi, "berhad")
    .replace(/\s+/g, " ")
    .trim();
}

// ============ DATE UTILITIES ============

/**
 * Calculate the absolute difference in days between two dates
 */
export function dateDiffDays(date1: string, date2: string): number | null {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============ AMOUNT UTILITIES ============

/**
 * Check if two amounts match within tolerance
 * Uses rounding to avoid floating-point precision issues
 */
export function amountsMatch(
  amount1: number,
  amount2: number,
  tolerance: number = 0.01
): boolean {
  // Round to 2 decimal places to avoid floating-point precision issues
  const diff = Math.abs(
    Math.round(Math.abs(amount1) * 100) / 100 -
    Math.round(Math.abs(amount2) * 100) / 100
  );
  return diff <= tolerance + 0.001; // Small epsilon for remaining precision issues
}

/**
 * Check if two amounts are within a percentage variance
 */
export function amountsWithinVariance(
  amount1: number,
  amount2: number,
  variancePercent: number
): boolean {
  const a1 = Math.abs(amount1);
  const a2 = Math.abs(amount2);
  if (a1 === 0 && a2 === 0) return true;
  if (a1 === 0 || a2 === 0) return false;
  const maxAmount = Math.max(a1, a2);
  const diff = Math.abs(a1 - a2);
  return (diff / maxAmount) * 100 <= variancePercent;
}

// ============ REFERENCE EXTRACTION ============

/**
 * Common reference patterns found in bank descriptions
 */
export const REFERENCE_PATTERNS = [
  /\bINV[-#]?(\d{3,})\b/i,
  /\bINVOICE\s*#?\s*(\d{3,})\b/i,
  /\bBILL[-#]?(\d{3,})\b/i,
  /\bREF[-#]?(\d{3,})\b/i,
  /\bREFERENCE\s+#?\s*(\d{3,})\b/i,
  /\bPO[-#]?(\d{3,})\b/i,
  /\bRCPT[-#]?(\d{3,})\b/i,
  /\bTXN[-#]?(\d{3,})\b/i,
  /\bORD[-#]?(\d{3,})\b/i,
  /\bCHK[-#]?(\d{3,})\b/i,
];

/**
 * Extract references from a description string
 */
export function extractReferences(description: string): string[] {
  if (!description) return [];
  const refs: string[] = [];
  for (const pattern of REFERENCE_PATTERNS) {
    const match = description.match(pattern);
    if (match && match[1]) refs.push(match[1]);
  }
  const standaloneNumbers = description.match(/\b(\d{6,})\b/g);
  if (standaloneNumbers) refs.push(...standaloneNumbers);
  return [...new Set(refs)];
}

/**
 * Normalize document number
 */
export function normalizeDocNumber(docNumber: string | undefined): string {
  if (!docNumber) return "";
  const numericMatch = docNumber.match(/(\d+)$/);
  return numericMatch ? numericMatch[1] : docNumber.replace(/[^\d]/g, "");
}
