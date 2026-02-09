/**
 * Shared types for the matching layer system
 */

import { Doc, Id } from "../../_generated/dataModel";

/**
 * Cash transaction type (bank statement entry)
 */
export type CashTransaction = Doc<"transactions"> & {
  _id: Id<"transactions">;
};

/**
 * Accrual document type (invoice, receipt, etc.)
 */
export type AccrualDocument = Doc<"accrualDocuments"> & {
  _id: Id<"accrualDocuments">;
};

/**
 * Match candidate produced by matching layers
 */
export interface MatchCandidate {
  cashTransactionId: Id<"transactions">;
  accrualDocumentId: Id<"accrualDocuments">;
  confidenceScore: number;
  matchLayer: 1 | 2 | 3 | 4 | 5 | 7; // 7 = partial match (6 is manual)
  matchReason: string;
}

/**
 * Configuration for matching algorithms
 */
export interface MatchingConfig {
  /** Days tolerance for Layer 1 exact match */
  exactDateWindow: number;
  /** Days tolerance for Layer 2 window match */
  windowDateWindow: number;
  /** Days tolerance for Layer 4 fuzzy match */
  fuzzyDateWindow: number;
  /** Dollar tolerance for exact amount match */
  amountTolerance: number;
  /** Percentage variance for fuzzy amount match */
  amountVariancePercent: number;
  /** Minimum string similarity % for fuzzy name match */
  minFuzzySimilarity: number;
}

/**
 * Default matching configuration
 */
export const DEFAULT_CONFIG: MatchingConfig = {
  exactDateWindow: 3,
  windowDateWindow: 7,
  fuzzyDateWindow: 14,
  amountTolerance: 0.01,
  amountVariancePercent: 10,
  minFuzzySimilarity: 60,
};

/**
 * Result from a single matching layer
 */
export interface LayerResult {
  layer: 1 | 2 | 3 | 4 | 5;
  matches: MatchCandidate[];
  duration: number;
  cacheHit: boolean;
}

/**
 * Result from the entire matching pipeline
 */
export interface PipelineResult {
  matches: MatchCandidate[];
  unmatchedCash: CashTransaction[];
  unmatchedAccrual: AccrualDocument[];
  layerResults: LayerResult[];
  totalDuration: number;
  earlyExit: boolean;
  earlyExitReason?: string;
}

/**
 * Interface that all matching layers must implement
 */
export interface MatchingLayer {
  /** Unique layer identifier */
  readonly name: string;

  /** Layer priority (1-5) */
  readonly priority: 1 | 2 | 3 | 4 | 5;

  /** Minimum confidence threshold for this layer */
  readonly minConfidence: number;

  /**
   * Execute matching for this layer
   *
   * @param cashTxns Cash transactions to match
   * @param accrualDocs Accrual documents to match against
   * @param config Matching configuration
   * @returns Array of match candidates
   */
  match(
    cashTxns: CashTransaction[],
    accrualDocs: AccrualDocument[],
    config: MatchingConfig
  ): MatchCandidate[];
}

/**
 * LLM match suggestion format
 */
export interface LLMMatchSuggestion {
  cashTransactionId: string;
  accrualDocumentId: string;
  confidence: number;
  reasoning: string;
}

/**
 * Configuration for partial (one-to-many) matching
 * Used when a single bank transaction covers multiple invoices
 */
export interface PartialMatchingConfig {
  /** Whether partial matching is enabled (default: true) */
  enabled: boolean;
  /** Minimum cash transaction amount to attempt partial matching (default: 500) */
  minCashAmount: number;
  /** Maximum number of invoices to combine per match (default: 5) */
  maxInvoicesPerMatch: number;
  /** Absolute tolerance for amount matching in dollars (default: 0.01) */
  toleranceAbsolute: number;
  /** Percentage tolerance for amount matching (default: 0.01 = 1%) */
  tolerancePercent: number;
  /** Minimum confidence score to auto-match (default: 85) */
  minConfidence: number;
}

/**
 * Default partial matching configuration
 */
export const DEFAULT_PARTIAL_CONFIG: PartialMatchingConfig = {
  enabled: true,
  minCashAmount: 500,
  maxInvoicesPerMatch: 5,
  toleranceAbsolute: 0.01,
  tolerancePercent: 0.01,
  minConfidence: 85,
};

/**
 * Result from partial match algorithm
 * Represents a combination of accrual documents that match a cash transaction
 */
export interface PartialMatchResult {
  /** Accrual documents that combine to match the payment */
  documents: AccrualDocument[];
  /** Total amount of all documents combined */
  totalAmount: number;
  /** Variance between cash amount and document total */
  variance: number;
  /** Variance as percentage of cash amount */
  variancePercent: number;
  /** Whether this is an exact match (variance = 0) */
  isExact: boolean;
  /** Calculated confidence score (0-100) */
  confidence: number;
  /** Reason explaining the match */
  matchReason: string;
}

/**
 * Extended match candidate for partial matches
 */
export interface PartialMatchCandidate extends MatchCandidate {
  /** ID linking related partial matches together */
  partialMatchGroupId: string;
  /** Amount attributed to this specific match */
  matchedAmount: number;
  /** Whether this is part of a partial match */
  isPartialMatch: true;
}

/**
 * Format transactions for LLM processing
 */
export interface LLMInput {
  cashItems: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    reference?: string;
  }>;
  accrualItems: Array<{
    id: string;
    date: string;
    docNumber?: string;
    counterparty?: string;
    description?: string;
    amount: number;
  }>;
}
