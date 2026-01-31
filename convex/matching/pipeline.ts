/**
 * Matching Pipeline - Orchestrates all matching layers
 *
 * Provides optimized execution with:
 * - Early exit when 90%+ matched
 * - Per-layer progress tracking
 * - Efficient item removal between layers
 */

import {
  CashTransaction,
  AccrualDocument,
  MatchCandidate,
  MatchingConfig,
  PipelineResult,
  LayerResult,
  DEFAULT_CONFIG,
  getNonLLMLayers,
} from "./layers/index";

/**
 * Run the full matching pipeline (layers 1-4)
 *
 * Executes each layer in sequence, removing matched items
 * between layers to prevent duplicate matches.
 *
 * Features:
 * - Early exit when 90%+ of cash transactions are matched
 * - Early exit when one side is exhausted
 * - Per-layer timing and statistics
 *
 * @param cashTxns Cash transactions to match
 * @param accrualDocs Accrual documents to match against
 * @param config Matching configuration
 * @returns Pipeline result with matches and statistics
 */
export function runMatchingPipeline(
  cashTxns: CashTransaction[],
  accrualDocs: AccrualDocument[],
  config: MatchingConfig = DEFAULT_CONFIG
): PipelineResult {
  const startTime = Date.now();
  const layers = getNonLLMLayers();

  const allMatches: MatchCandidate[] = [];
  const layerResults: LayerResult[] = [];

  let remainingCash = [...cashTxns];
  let remainingAccrual = [...accrualDocs];
  let earlyExit = false;
  let earlyExitReason: string | undefined;

  // Process each layer
  for (const layer of layers) {
    // Early exit if nothing left to match
    if (remainingCash.length === 0 || remainingAccrual.length === 0) {
      earlyExit = true;
      earlyExitReason =
        remainingCash.length === 0
          ? "All cash transactions matched"
          : "All accrual documents matched";
      break;
    }

    // Run this layer
    const layerStart = Date.now();
    const matches = layer.match(remainingCash, remainingAccrual, config);
    const layerDuration = Date.now() - layerStart;

    // Record layer result
    layerResults.push({
      layer: layer.priority,
      matches,
      duration: layerDuration,
      cacheHit: false, // Cache integration would be added here
    });

    // Add matches to results
    allMatches.push(...matches);

    // Remove matched items from pools
    const matchedCashIds = new Set(matches.map((m) => m.cashTransactionId));
    const matchedAccrualIds = new Set(matches.map((m) => m.accrualDocumentId));

    remainingCash = remainingCash.filter((t) => !matchedCashIds.has(t._id));
    remainingAccrual = remainingAccrual.filter(
      (d) => !matchedAccrualIds.has(d._id)
    );

    // Early exit if 90%+ matched
    const matchRate = allMatches.length / cashTxns.length;
    if (matchRate >= 0.9) {
      earlyExit = true;
      earlyExitReason = `90%+ match rate achieved (${Math.round(matchRate * 100)}%)`;
      break;
    }
  }

  return {
    matches: allMatches,
    unmatchedCash: remainingCash,
    unmatchedAccrual: remainingAccrual,
    layerResults,
    totalDuration: Date.now() - startTime,
    earlyExit,
    earlyExitReason,
  };
}

/**
 * Get pipeline statistics
 */
export function getPipelineStats(result: PipelineResult) {
  const byLayer: Record<number, number> = {};
  const byConfidence: Record<string, number> = { high: 0, medium: 0, low: 0 };

  for (const m of result.matches) {
    byLayer[m.matchLayer] = (byLayer[m.matchLayer] || 0) + 1;

    if (m.confidenceScore >= 90) byConfidence.high++;
    else if (m.confidenceScore >= 70) byConfidence.medium++;
    else byConfidence.low++;
  }

  return {
    totalMatches: result.matches.length,
    byLayer,
    byConfidence,
    unmatchedCash: result.unmatchedCash.length,
    unmatchedAccrual: result.unmatchedAccrual.length,
    totalDuration: result.totalDuration,
    earlyExit: result.earlyExit,
  };
}
