// Shared types for all export modules.
// Single source of truth -- eliminates 7x duplication of ExportData interface.

import type { Doc, Id } from "../_generated/dataModel";

/** Match layers supported by the matching engine. */
export type MatchLayerNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** An enriched match with linked transaction/document data, as returned by getExportData. */
export interface EnrichedMatch {
  _id: Id<"matchedPairs">;
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  matchLayer: MatchLayerNumber;
  matchReason?: string;
  status: "pending" | "approved" | "rejected";
  cashTransaction: Doc<"transactions"> | null;
  accrualDocument: Doc<"accrualDocuments"> | null;
  accrualTransaction: Doc<"transactions"> | null;
}

/** Full session data bundle used by all export generators. */
export interface ExportData {
  session: Doc<"reconciliationSessions">;
  company: Doc<"companies">;
  matches: EnrichedMatch[];
  transactions: Doc<"transactions">[];
  accrualDocuments: Doc<"accrualDocuments">[];
  suspenseItems: Doc<"suspenseItems">[];
}

/** Filtering options for CSV/XLSX exports. */
export interface ExportOptions {
  includeMatched: boolean;
  includePending: boolean;
  includeSuspense: boolean;
}

/** Options for accounting software exports. */
export interface AccountingOptions {
  accountCodes?: {
    bankAccount?: string;
    receivables?: string;
    payables?: string;
    revenue?: string;
    expenses?: string;
  };
  includeJournalEntries?: boolean;
}

/** Match layer human-readable descriptions (single source of truth). */
export const MATCH_LAYER_DESCRIPTIONS: Record<number, string> = {
  1: "Exact Match",
  2: "Date Window Match",
  3: "Reference Match",
  4: "Fuzzy Match",
  5: "LLM Semantic Match",
  6: "Manual Match",
  7: "Partial Match",
};

/** Get a human-readable description for a match layer number. */
export function getMatchLayerDescription(layer: number): string {
  return MATCH_LAYER_DESCRIPTIONS[layer] || `Layer ${layer}`;
}

/** Suspense reason human-readable descriptions (single source of truth). */
export const SUSPENSE_REASON_DESCRIPTIONS: Record<string, string> = {
  no_match: "No matching document found",
  amount_mismatch: "Amount does not match",
  date_outside_range: "Transaction date outside reconciliation period",
  duplicate: "Possible duplicate transaction",
  duplicate_detected: "Possible duplicate transaction",
  partial_match: "Partial match - review required",
};

/** Get a human-readable description for a suspense reason. */
export function formatSuspenseReason(reason: string): string {
  return SUSPENSE_REASON_DESCRIPTIONS[reason] || reason;
}
