/**
 * Agent Shared Utilities
 *
 * Shared types, constants, and helper functions used by the agent
 * intelligence layers (Rules, Cross-Reference, LLM).
 *
 * Single source of truth for:
 * - AgentFindingType union literal (matches schema exactly)
 * - AgentFinding interface and related data types
 * - Company name normalization (shared by Rules L1 and Cross-Ref L2)
 * - Date and string helpers used across layers
 *
 * Zero Convex imports — pure TypeScript, fully unit-testable.
 *
 * @module convex/lib/agentUtils
 */

// ============================================================================
// Finding Type — Union Literal (must match schema's agentFindings.type)
// ============================================================================

/**
 * All possible finding types produced by the agent engine.
 *
 * This union must stay in sync with the `type` field in the
 * `agentFindings` table in `convex/schema.ts`. If you add a new
 * finding type, add it to both this union and the schema.
 */
export type AgentFindingType =
  // Company verification
  | "company_verified"
  | "company_mismatch"
  | "multi_company_detected"
  // Period analysis
  | "period_detected"
  | "period_gap"
  // Data quality
  | "duplicate_transactions"
  | "extraction_errors"
  | "low_confidence_extractions"
  | "unusual_amounts"
  | "zero_transactions"
  // Accrual cross-checks
  | "accrual_company_mismatch"
  | "orphaned_documents"
  | "basis_inconsistency"
  // Summary findings
  | "cash_basis_summary"
  | "accrual_basis_summary"
  | "matching_preview";

// ============================================================================
// Core Types — Lightweight interfaces decoupled from Convex's Doc<> types
// ============================================================================

export interface AgentFinding {
  type: AgentFindingType;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  details?: Record<string, unknown>;
  relatedDocumentIds?: string[];
  relatedTransactionIds?: string[];
}

export interface DocumentInfo {
  _id: string;
  fileName: string;
  documentType: string;
  extractionStatus: string;
  extractionConfidence?: number;
  extractedTransactionCount?: number;
  extractedCompanyName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  extractedCounterparties?: string[];
  extractedCurrency?: string;
  errorMessage?: string;
}

export interface TransactionInfo {
  _id: string;
  date: string;
  description: string;
  amount: number;
  reference?: string;
  sourceDocumentId?: string;
}

export interface AccrualDocInfo {
  _id: string;
  docType: string;
  docDate: string;
  docNumber?: string;
  counterparty?: string;
  amount: number;
  description?: string;
  sourceDocumentId?: string;
}

// ============================================================================
// Company Name Normalization — Single Source of Truth
// ============================================================================

/**
 * Common company suffixes to strip for comparison.
 * Covers Malaysian (Sdn Bhd, Plt, Berhad), UK (Ltd, Plc),
 * US (Inc, Corp, LLC), and Singapore (Pte Ltd) conventions.
 */
const COMPANY_SUFFIXES = [
  "sendirian berhad", "sdn. bhd.", "sdn bhd.", "sdn bhd",
  "berhad", "bhd.", "bhd",
  "plt.", "plt",
  "incorporated", "inc.", "inc",
  "limited", "ltd.", "ltd",
  "llc.", "llc",
  "corporation", "corp.", "corp",
  "pte ltd", "pte.", "pte",
  "co.", "co",
];

/** Pre-sorted by length (longest first) for correct greedy suffix stripping. */
const SORTED_COMPANY_SUFFIXES = [...COMPANY_SUFFIXES].sort(
  (a, b) => b.length - a.length,
);

/**
 * Normalize a company name for comparison.
 *
 * 1. Lowercases
 * 2. Strips the longest matching company suffix
 * 3. Removes punctuation (. , - ( ) &) and collapses whitespace
 *
 * Used by both the Rules layer (multi-company detection) and the
 * Cross-Reference layer (company name similarity).
 */
export function normalizeCompanyName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove common suffixes (longest first to avoid partial matches)
  for (const suffix of SORTED_COMPANY_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length).trim();
      break; // Only strip one suffix
    }
  }

  // Remove punctuation and normalize whitespace
  normalized = normalized.replace(/[.,\-()&]/g, " ").replace(/\s+/g, " ").trim();

  return normalized;
}

// ============================================================================
// Date Helpers
// ============================================================================

/** Parse "YYYY-MM-DD" to a Date object. Returns null if invalid. */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.length < 10) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

/** Days between two date strings. Returns Infinity if either is invalid. */
export function daysBetween(dateA: string, dateB: string): number {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  if (!a || !b) return Infinity;
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

// ============================================================================
// String Helpers
// ============================================================================

/**
 * Simple character-level overlap ratio between two strings.
 * Returns 0.0–1.0 using Dice-style normalization.
 *
 * Note: This is a bag-of-characters match, not positional.
 * "ABC" vs "CBA" returns 1.0. For duplicate detection this is
 * acceptable because the 80% threshold is combined with same-amount
 * and same-date guards, making anagram false positives extremely unlikely
 * in real bank transaction descriptions.
 */
export function charOverlap(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1.0;
  if (aLower.length === 0 || bLower.length === 0) return 0.0;

  const shorter = aLower.length <= bLower.length ? aLower : bLower;
  const longer = aLower.length > bLower.length ? aLower : bLower;

  let matches = 0;
  const used = new Set<number>();
  for (const ch of shorter) {
    for (let i = 0; i < longer.length; i++) {
      if (!used.has(i) && longer[i] === ch) {
        matches++;
        used.add(i);
        break;
      }
    }
  }
  return (2 * matches) / (shorter.length + longer.length);
}

/** Format a number as a currency string (no symbol, just formatting). */
export function formatCurrency(amount: number): string {
  return Math.abs(amount).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
