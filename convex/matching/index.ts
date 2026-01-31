/**
 * Matching Module Exports
 * Re-exports all matching functionality
 */

// Engine actions
export {
  runMatchingEngine,
  previewMatching,
  getUnmatchedCashTransactions,
  getUnmatchedAccrualDocuments,
  getSessionWithCompany,
  createMatchedPair,
  createSuspenseItem,
  updateSessionStats,
} from "./engine";

// LLM actions
export { runLLMMatching, runMockLLMMatching } from "./llm";

// Layer functions and types (import from directory to avoid cycles)
export {
  layer1ExactMatch,
  layer2WindowMatch,
  layer3ReferenceMatch,
  layer4FuzzyMatch,
  formatForLLM,
  DEFAULT_CONFIG,
  type MatchCandidate,
  type MatchingConfig,
  type CashTransaction,
  type AccrualDocument,
  type LLMMatchSuggestion,
} from "./layers/index";

// Backward compatibility function
export { runNonLLMLayers } from "./layers";

// Pipeline functions
export { runMatchingPipeline, getPipelineStats } from "./pipeline";
