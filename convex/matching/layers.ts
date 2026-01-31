/**
 * 5-Layer Matching Algorithms
 *
 * This file re-exports from the decoupled layer implementations
 * for backward compatibility. New code should import from ./layers/ directly.
 *
 * @see ./layers/index.ts for the modular implementation
 */

// Re-export types
export type {
  CashTransaction,
  AccrualDocument,
  MatchCandidate,
  MatchingConfig,
  LayerResult,
  PipelineResult,
  MatchingLayer,
  LLMMatchSuggestion,
  LLMInput,
} from "./layers/index";

// Re-export values
export {
  DEFAULT_CONFIG,
  // Layer implementations
  ExactMatchLayer,
  WindowMatchLayer,
  ReferenceMatchLayer,
  FuzzyMatchLayer,
  SemanticMatchLayer,
  // Standalone functions
  layer1ExactMatch,
  layer2WindowMatch,
  layer3ReferenceMatch,
  layer4FuzzyMatch,
  // LLM helpers
  formatForLLM,
  convertLLMSuggestions,
  // Layer factory
  getNonLLMLayers,
} from "./layers/index";

// Import for the runNonLLMLayers backward compatibility function
import {
  CashTransaction,
  AccrualDocument,
  MatchCandidate,
  MatchingConfig,
  DEFAULT_CONFIG,
  getNonLLMLayers,
} from "./layers/index";

// Note: Individual layer functions are now in ./layers/ directory
// The functions below are re-exported from there for backward compatibility

// ============ AGGREGATE FUNCTION (BACKWARD COMPATIBILITY) ============
/**
 * Run all non-LLM layers in sequence
 * Returns all matches found across layers 1-4
 *
 * @deprecated Use runMatchingPipeline from ./pipeline.ts for better performance
 */
export function runNonLLMLayers(
  cashTxns: CashTransaction[],
  accrualDocs: AccrualDocument[],
  config: MatchingConfig = DEFAULT_CONFIG
): {
  matches: MatchCandidate[];
  unmatchedCash: CashTransaction[];
  unmatchedAccrual: AccrualDocument[];
} {
  // Run layers directly to avoid circular dependency with pipeline
  const layers = getNonLLMLayers();
  const allMatches: MatchCandidate[] = [];
  let remainingCash = [...cashTxns];
  let remainingAccrual = [...accrualDocs];

  for (const layer of layers) {
    if (remainingCash.length === 0 || remainingAccrual.length === 0) break;

    const matches = layer.match(remainingCash, remainingAccrual, config);
    allMatches.push(...matches);

    const matchedCashIds = new Set(matches.map((m) => m.cashTransactionId));
    const matchedAccrualIds = new Set(matches.map((m) => m.accrualDocumentId));

    remainingCash = remainingCash.filter((t) => !matchedCashIds.has(t._id));
    remainingAccrual = remainingAccrual.filter((d) => !matchedAccrualIds.has(d._id));
  }

  return {
    matches: allMatches,
    unmatchedCash: remainingCash,
    unmatchedAccrual: remainingAccrual,
  };
}
