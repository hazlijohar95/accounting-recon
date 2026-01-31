/**
 * Layer 5: LLM Semantic Match
 *
 * AI-powered matching using LLM analysis:
 * - Semantic understanding of transaction descriptions
 * - Context-aware matching based on business patterns
 * - Confidence: 50-85% based on LLM confidence
 *
 * This layer handles edge cases that rule-based matching misses,
 * such as abbreviated names or different description formats.
 *
 * Note: The actual LLM execution is handled by llm.ts action.
 * This module provides the formatting interface.
 */

import {
  CashTransaction,
  AccrualDocument,
  MatchCandidate,
  LLMInput,
  LLMMatchSuggestion,
  MatchingLayer,
  MatchingConfig,
} from "./types";
import { Id } from "../../_generated/dataModel";

/**
 * Format transactions for LLM processing
 */
export function formatForLLM(
  cashTxns: CashTransaction[],
  accrualDocs: AccrualDocument[]
): LLMInput {
  return {
    cashItems: cashTxns.map((t) => ({
      id: t._id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      reference: t.reference,
    })),
    accrualItems: accrualDocs.map((d) => ({
      id: d._id,
      date: d.docDate,
      docNumber: d.docNumber,
      counterparty: d.counterparty,
      description: d.description,
      amount: d.amount,
    })),
  };
}

/**
 * Convert LLM suggestions to match candidates
 */
export function convertLLMSuggestions(
  suggestions: LLMMatchSuggestion[],
  minConfidence: number = 50
): MatchCandidate[] {
  return suggestions
    .filter((s) => s.confidence >= minConfidence)
    .map((s) => ({
      cashTransactionId: s.cashTransactionId as Id<"transactions">,
      accrualDocumentId: s.accrualDocumentId as Id<"accrualDocuments">,
      confidenceScore: s.confidence,
      matchLayer: 5 as const,
      matchReason: s.reasoning,
    }));
}

/**
 * Semantic match layer placeholder
 *
 * Note: The actual LLM matching is async and requires an action.
 * This class provides a consistent interface but the match()
 * method returns an empty array - use llm.ts for actual matching.
 */
export class SemanticMatchLayer implements MatchingLayer {
  readonly name = "semantic";
  readonly priority = 5 as const;
  readonly minConfidence = 50;

  /**
   * Placeholder - returns empty array.
   * Use llm.ts runLLMMatching action for actual matching.
   */
  match(
    cashTxns: CashTransaction[],
    accrualDocs: AccrualDocument[],
    config: MatchingConfig
  ): MatchCandidate[] {
    // LLM matching requires async action, not available in sync context
    // This is intentionally a no-op; use llm.ts action instead
    return [];
  }
}
