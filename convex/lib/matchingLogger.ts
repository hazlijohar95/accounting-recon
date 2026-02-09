/**
 * Matching Decision Logger Module
 *
 * Structured logging for matching engine decisions.
 * Provides detailed logging per layer with confidence factors and reasoning.
 *
 * @module convex/lib/matchingLogger
 */

import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================================================
// Type Definitions
// ============================================================================

export type MatchLayer = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type MatchDecision = "match" | "skip" | "suspense";

export interface MatchingFactors {
  amountMatch: boolean;
  amountDifference?: number;
  amountVariance?: number; // Percentage variance
  dateWithinWindow: boolean;
  dateDifferenceDay?: number;
  referenceMatch?: boolean;
  referenceSource?: "description" | "reference_field";
  similarityScore?: number;
  counterpartyMatch?: boolean;
  llmConfidence?: number;
  llmReasoning?: string;
}

export interface MatchingDecisionLog {
  sessionId: string;
  layer: MatchLayer;
  cashTransactionId: string;
  accrualDocumentId?: string;
  confidenceScore: number;
  factors: MatchingFactors;
  decision: MatchDecision;
  reason: string;
  timestamp: number;
  processingTimeMs?: number;
}

// ============================================================================
// In-Memory Log Buffer
// ============================================================================

const MAX_BUFFER_SIZE = 2000;
const decisionBuffer: MatchingDecisionLog[] = [];

function addToBuffer(entry: MatchingDecisionLog): void {
  decisionBuffer.push(entry);
  if (decisionBuffer.length > MAX_BUFFER_SIZE) {
    decisionBuffer.shift();
  }
}

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * Log a matching decision with full context
 */
export function logMatchingDecision(
  sessionId: string,
  layer: MatchLayer,
  decision: {
    cashTransactionId: string;
    accrualDocumentId?: string;
    confidenceScore: number;
    factors: MatchingFactors;
    decision: MatchDecision;
    reason: string;
    processingTimeMs?: number;
  }
): void {
  const entry: MatchingDecisionLog = {
    sessionId,
    layer,
    ...decision,
    timestamp: Date.now(),
  };

  // Add to buffer
  addToBuffer(entry);

  // Log to console with structured format
  const layerName = getLayerName(layer);
  const prefix = `[Matching:L${layer}:${layerName}]`;
  const sessionPrefix = `[${sessionId.slice(0, 8)}...]`;

  if (decision.decision === "match") {
    console.info(
      `${prefix} ${sessionPrefix} MATCH`,
      `cash=${decision.cashTransactionId.slice(0, 8)}`,
      `accrual=${decision.accrualDocumentId?.slice(0, 8) ?? "N/A"}`,
      `confidence=${decision.confidenceScore}%`,
      `reason: ${decision.reason}`
    );
  } else if (decision.decision === "skip") {
    console.debug(
      `${prefix} ${sessionPrefix} SKIP`,
      `cash=${decision.cashTransactionId.slice(0, 8)}`,
      `reason: ${decision.reason}`
    );
  } else {
    console.warn(
      `${prefix} ${sessionPrefix} SUSPENSE`,
      `cash=${decision.cashTransactionId.slice(0, 8)}`,
      `reason: ${decision.reason}`
    );
  }
}

/**
 * Get human-readable layer name
 */
export function getLayerName(layer: MatchLayer): string {
  const names: Record<MatchLayer, string> = {
    1: "Exact",
    2: "Window",
    3: "Reference",
    4: "Fuzzy",
    5: "Semantic",
    6: "Manual",
    7: "Partial",
  };
  return names[layer];
}

/**
 * Log layer processing start
 */
export function logLayerStart(
  sessionId: string,
  layer: MatchLayer,
  cashCount: number,
  accrualCount: number
): void {
  const layerName = getLayerName(layer);
  console.info(
    `[Matching:L${layer}:${layerName}] Starting layer processing`,
    `session=${sessionId.slice(0, 8)}...`,
    `cash=${cashCount}`,
    `accrual=${accrualCount}`
  );
}

/**
 * Log layer processing complete
 */
export function logLayerComplete(
  sessionId: string,
  layer: MatchLayer,
  stats: {
    matchesFound: number;
    skipped: number;
    processingTimeMs: number;
    remainingCash: number;
    remainingAccrual: number;
  }
): void {
  const layerName = getLayerName(layer);
  console.info(
    `[Matching:L${layer}:${layerName}] Layer complete`,
    `session=${sessionId.slice(0, 8)}...`,
    `matches=${stats.matchesFound}`,
    `skipped=${stats.skipped}`,
    `remaining: cash=${stats.remainingCash} accrual=${stats.remainingAccrual}`,
    `time=${stats.processingTimeMs}ms`
  );
}

/**
 * Log matching engine start
 */
export function logEngineStart(
  sessionId: string,
  totalCash: number,
  totalAccrual: number
): void {
  console.info(
    `[Matching:Engine] Starting matching engine`,
    `session=${sessionId.slice(0, 8)}...`,
    `total: cash=${totalCash} accrual=${totalAccrual}`
  );
}

/**
 * Log matching engine complete
 */
export function logEngineComplete(
  sessionId: string,
  stats: {
    totalMatches: number;
    matchesByLayer: Record<number, number>;
    suspenseCount: number;
    totalTimeMs: number;
  }
): void {
  console.info(
    `[Matching:Engine] Matching complete`,
    `session=${sessionId.slice(0, 8)}...`,
    `total matches=${stats.totalMatches}`,
    `suspense=${stats.suspenseCount}`,
    `time=${stats.totalTimeMs}ms`
  );
  console.info(`[Matching:Engine] Matches by layer:`, stats.matchesByLayer);
}

// ============================================================================
// Match Reason Builders
// ============================================================================

/**
 * Build reason string for exact match (Layer 1)
 */
export function buildExactMatchReason(
  amountDiff: number,
  dateDiff: number
): string {
  const parts: string[] = [];

  if (amountDiff === 0) {
    parts.push("exact amount");
  } else {
    parts.push(`amount within $${amountDiff.toFixed(2)} tolerance`);
  }

  if (dateDiff === 0) {
    parts.push("same date");
  } else {
    parts.push(`${dateDiff} day${dateDiff === 1 ? "" : "s"} apart`);
  }

  return `Exact match: ${parts.join(", ")}`;
}

/**
 * Build reason string for window match (Layer 2)
 */
export function buildWindowMatchReason(dateDiff: number): string {
  return `Window match: amount match within ${dateDiff}-day window`;
}

/**
 * Build reason string for reference match (Layer 3)
 */
export function buildReferenceMatchReason(
  reference: string,
  source: "description" | "reference_field"
): string {
  const sourceText = source === "description" ? "in description" : "in reference field";
  return `Reference match: "${reference}" found ${sourceText}`;
}

/**
 * Build reason string for fuzzy match (Layer 4)
 */
export function buildFuzzyMatchReason(
  similarityScore: number,
  amountVariance: number
): string {
  return `Fuzzy match: ${similarityScore.toFixed(0)}% text similarity, ${amountVariance.toFixed(1)}% amount variance`;
}

/**
 * Build reason string for semantic match (Layer 5)
 */
export function buildSemanticMatchReason(
  llmConfidence: number,
  reasoning: string
): string {
  return `LLM semantic match (${llmConfidence}%): ${reasoning}`;
}

/**
 * Build reason string for manual match (Layer 6)
 */
export function buildManualMatchReason(userId?: string): string {
  if (userId) {
    return `Manual match created by user ${userId.slice(0, 8)}...`;
  }
  return "Manual user match";
}

/**
 * Build reason string for partial match (Layer 7)
 */
export function buildPartialMatchReason(
  matchedAmount: number,
  totalAmount: number
): string {
  const percentage = ((matchedAmount / totalAmount) * 100).toFixed(1);
  return `Partial match: ${matchedAmount.toFixed(2)} of ${totalAmount.toFixed(2)} (${percentage}%)`;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get matching decision log for a session
 */
export function getMatchingDecisionLog(
  sessionId: string,
  limit: number = 100
): MatchingDecisionLog[] {
  return decisionBuffer
    .filter((log) => log.sessionId === sessionId)
    .slice(-limit);
}

/**
 * Get matching decisions by layer
 */
export function getDecisionsByLayer(
  sessionId: string,
  layer: MatchLayer
): MatchingDecisionLog[] {
  return decisionBuffer.filter(
    (log) => log.sessionId === sessionId && log.layer === layer
  );
}

/**
 * Get matching decisions for a specific cash transaction
 */
export function getDecisionsForTransaction(
  cashTransactionId: string
): MatchingDecisionLog[] {
  return decisionBuffer.filter(
    (log) => log.cashTransactionId === cashTransactionId
  );
}

/**
 * Get suspense decisions
 */
export function getSuspenseDecisions(sessionId: string): MatchingDecisionLog[] {
  return decisionBuffer.filter(
    (log) => log.sessionId === sessionId && log.decision === "suspense"
  );
}

/**
 * Get matching statistics for a session
 */
export function getMatchingStats(sessionId: string): {
  totalDecisions: number;
  matches: number;
  skips: number;
  suspense: number;
  byLayer: Record<number, { matches: number; skips: number }>;
  avgConfidence: number;
} | null {
  const logs = decisionBuffer.filter((log) => log.sessionId === sessionId);

  if (logs.length === 0) return null;

  const matches = logs.filter((log) => log.decision === "match");
  const skips = logs.filter((log) => log.decision === "skip");
  const suspense = logs.filter((log) => log.decision === "suspense");

  const byLayer: Record<number, { matches: number; skips: number }> = {};
  for (let i = 1; i <= 7; i++) {
    const layerLogs = logs.filter((log) => log.layer === i);
    byLayer[i] = {
      matches: layerLogs.filter((log) => log.decision === "match").length,
      skips: layerLogs.filter((log) => log.decision === "skip").length,
    };
  }

  const avgConfidence =
    matches.length > 0
      ? Math.round(
          matches.reduce((sum, log) => sum + log.confidenceScore, 0) /
            matches.length
        )
      : 0;

  return {
    totalDecisions: logs.length,
    matches: matches.length,
    skips: skips.length,
    suspense: suspense.length,
    byLayer,
    avgConfidence,
  };
}

/**
 * Clear decision buffer (for testing)
 */
export function clearDecisionBuffer(): void {
  decisionBuffer.length = 0;
}

// ============================================================================
// Matching Session Logger Class
// ============================================================================

/**
 * Stateful matching logger for tracking a single session's matching
 */
export class SessionMatchingLogger {
  private sessionId: string;
  private startTime: number;
  private matchCount: number = 0;
  private suspenseCount: number = 0;
  private layerStats: Map<MatchLayer, { matches: number; time: number }> = new Map();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
  }

  startLayer(layer: MatchLayer, cashCount: number, accrualCount: number): void {
    logLayerStart(this.sessionId, layer, cashCount, accrualCount);
  }

  logDecision(
    layer: MatchLayer,
    decision: Omit<Parameters<typeof logMatchingDecision>[2], "timestamp">
  ): void {
    logMatchingDecision(this.sessionId, layer, decision);

    if (decision.decision === "match") {
      this.matchCount++;
      const layerStat = this.layerStats.get(layer) || { matches: 0, time: 0 };
      layerStat.matches++;
      this.layerStats.set(layer, layerStat);
    } else if (decision.decision === "suspense") {
      this.suspenseCount++;
    }
  }

  completeLayer(
    layer: MatchLayer,
    stats: Parameters<typeof logLayerComplete>[2]
  ): void {
    logLayerComplete(this.sessionId, layer, stats);

    const layerStat = this.layerStats.get(layer) || { matches: 0, time: 0 };
    layerStat.time = stats.processingTimeMs;
    this.layerStats.set(layer, layerStat);
  }

  complete(): void {
    const matchesByLayer: Record<number, number> = {};
    this.layerStats.forEach((stat, layer) => {
      matchesByLayer[layer] = stat.matches;
    });

    logEngineComplete(this.sessionId, {
      totalMatches: this.matchCount,
      matchesByLayer,
      suspenseCount: this.suspenseCount,
      totalTimeMs: Date.now() - this.startTime,
    });
  }

  getStats(): {
    sessionId: string;
    matchCount: number;
    suspenseCount: number;
    elapsedMs: number;
  } {
    return {
      sessionId: this.sessionId,
      matchCount: this.matchCount,
      suspenseCount: this.suspenseCount,
      elapsedMs: Date.now() - this.startTime,
    };
  }
}

// ============================================================================
// Factor Builders
// ============================================================================

/**
 * Create factors object for exact match
 */
export function createExactMatchFactors(
  amountDiff: number,
  dateDiff: number
): MatchingFactors {
  return {
    amountMatch: amountDiff <= 0.01,
    amountDifference: amountDiff,
    dateWithinWindow: dateDiff <= 3,
    dateDifferenceDay: dateDiff,
  };
}

/**
 * Create factors object for window match
 */
export function createWindowMatchFactors(dateDiff: number): MatchingFactors {
  return {
    amountMatch: true,
    dateWithinWindow: dateDiff <= 7 && dateDiff > 3,
    dateDifferenceDay: dateDiff,
  };
}

/**
 * Create factors object for reference match
 */
export function createReferenceMatchFactors(
  reference: string,
  source: "description" | "reference_field",
  amountVariance: number
): MatchingFactors {
  return {
    amountMatch: amountVariance <= 10,
    amountVariance,
    dateWithinWindow: true, // Reference matches relax date constraint
    referenceMatch: true,
    referenceSource: source,
  };
}

/**
 * Create factors object for fuzzy match
 */
export function createFuzzyMatchFactors(
  similarityScore: number,
  amountVariance: number,
  counterpartyMatch: boolean
): MatchingFactors {
  return {
    amountMatch: amountVariance <= 10,
    amountVariance,
    dateWithinWindow: true,
    similarityScore,
    counterpartyMatch,
  };
}

/**
 * Create factors object for semantic match
 */
export function createSemanticMatchFactors(
  llmConfidence: number,
  llmReasoning: string
): MatchingFactors {
  return {
    amountMatch: true, // LLM already verified
    dateWithinWindow: true,
    llmConfidence,
    llmReasoning,
  };
}

/**
 * Create factors object for partial match
 */
export function createPartialMatchFactors(
  matchedAmount: number,
  totalAmount: number
): MatchingFactors {
  return {
    amountMatch: false, // Partial by definition
    amountDifference: totalAmount - matchedAmount,
    amountVariance: ((totalAmount - matchedAmount) / totalAmount) * 100,
    dateWithinWindow: true,
  };
}
