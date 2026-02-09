/**
 * Layer 7: Partial Match Algorithm
 *
 * Finds combinations of accrual documents (invoices) that together match
 * a single cash transaction amount. Uses subset sum with tolerance.
 *
 * Example: RM 5,000 payment matching INV-001 (RM 2,000) + INV-002 (RM 1,500) + INV-003 (RM 1,500)
 */

import {
  CashTransaction,
  AccrualDocument,
  PartialMatchingConfig,
  PartialMatchResult,
  DEFAULT_PARTIAL_CONFIG,
} from "./types";

/**
 * Find the best combination of accrual documents that match a cash transaction amount
 *
 * @param cashTxn The cash transaction to match
 * @param accrualDocs Available accrual documents to combine
 * @param config Partial matching configuration
 * @returns Best matching combination or null if none found
 */
export function findPartialMatchCombination(
  cashTxn: CashTransaction,
  accrualDocs: AccrualDocument[],
  config: PartialMatchingConfig = DEFAULT_PARTIAL_CONFIG
): PartialMatchResult | null {
  const targetAmount = Math.abs(cashTxn.amount);

  // Skip if below minimum amount threshold
  if (targetAmount < config.minCashAmount) {
    return null;
  }

  // Filter candidates: must be smaller than target and pending status
  const candidates = accrualDocs
    .filter((doc) => {
      const docAmount = Math.abs(doc.amount);
      // Document must be smaller than target (partial payment)
      // and have pending status (not already matched)
      return docAmount < targetAmount && doc.status === "pending";
    })
    // Sort by amount descending for greedy preference (fewer invoices = better)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  if (candidates.length === 0) {
    return null;
  }

  // Calculate tolerance thresholds
  const absoluteTolerance = config.toleranceAbsolute;
  const percentTolerance = targetAmount * config.tolerancePercent;
  const tolerance = Math.max(absoluteTolerance, percentTolerance);

  // Find all valid combinations using subset sum with memoization
  const validCombinations: AccrualDocument[][] = [];

  findSubsetSums(
    candidates,
    targetAmount,
    tolerance,
    config.maxInvoicesPerMatch,
    [],
    0,
    validCombinations
  );

  if (validCombinations.length === 0) {
    return null;
  }

  // Score and select the best combination
  const scoredCombinations = validCombinations.map((docs) => {
    const totalAmount = docs.reduce((sum, d) => sum + Math.abs(d.amount), 0);
    const variance = Math.abs(targetAmount - totalAmount);
    const variancePercent = targetAmount > 0 ? variance / targetAmount : 0;
    const isExact = variance < 0.01;
    const confidence = calculateConfidence(docs, variancePercent, isExact);

    return {
      documents: docs,
      totalAmount,
      variance,
      variancePercent,
      isExact,
      confidence,
      matchReason: buildMatchReason(docs, variancePercent, isExact),
    };
  });

  // Sort by score: exact matches first, then by confidence (desc), then by doc count (asc)
  scoredCombinations.sort((a, b) => {
    if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    return a.documents.length - b.documents.length;
  });

  const best = scoredCombinations[0];

  // Only return if meets minimum confidence threshold
  if (best.confidence < config.minConfidence) {
    return null;
  }

  return best;
}

/**
 * Recursive subset sum finder with early termination
 * Finds all combinations of documents that sum to target within tolerance
 */
function findSubsetSums(
  candidates: AccrualDocument[],
  targetAmount: number,
  tolerance: number,
  maxDocs: number,
  currentSet: AccrualDocument[],
  startIndex: number,
  results: AccrualDocument[][]
): void {
  // Early termination: too many documents
  if (currentSet.length > maxDocs) {
    return;
  }

  // Early termination: found enough results (limit to prevent combinatorial explosion)
  if (results.length >= 10) {
    return;
  }

  const currentSum = currentSet.reduce((sum, d) => sum + Math.abs(d.amount), 0);

  // Check if current set is within tolerance
  if (currentSet.length >= 2) { // Need at least 2 docs for partial match
    const variance = Math.abs(targetAmount - currentSum);
    if (variance <= tolerance) {
      results.push([...currentSet]);
    }
  }

  // Early termination: already exceeded target by more than tolerance
  if (currentSum > targetAmount + tolerance) {
    return;
  }

  // Try adding each remaining candidate
  for (let i = startIndex; i < candidates.length; i++) {
    const candidate = candidates[i];
    const newSum = currentSum + Math.abs(candidate.amount);

    // Skip if adding this would exceed target + tolerance significantly
    if (newSum > targetAmount + tolerance * 2) {
      continue;
    }

    currentSet.push(candidate);
    findSubsetSums(
      candidates,
      targetAmount,
      tolerance,
      maxDocs,
      currentSet,
      i + 1,
      results
    );
    currentSet.pop();
  }
}

/**
 * Calculate confidence score for a partial match
 *
 * Scoring:
 * - Start at 100%
 * - -5 per 1% variance from target
 * - -3 for each invoice beyond 2
 * - +5 bonus for exact match
 * - Clamp to 0-100
 */
function calculateConfidence(
  docs: AccrualDocument[],
  variancePercent: number,
  isExact: boolean
): number {
  let confidence = 100;

  // Penalty for variance: -5 per 1% variance
  confidence -= variancePercent * 100 * 5;

  // Penalty for too many documents: -3 per doc beyond 2
  const extraDocs = Math.max(0, docs.length - 2);
  confidence -= extraDocs * 3;

  // Bonus for exact match
  if (isExact) {
    confidence += 5;
  }

  // Check for date proximity bonus (if all docs are within reasonable date range)
  const dates = docs.map((d) => new Date(d.docDate).getTime());
  const dateRange = Math.max(...dates) - Math.min(...dates);
  const dayRange = dateRange / (1000 * 60 * 60 * 24);

  // Bonus if all docs are within 30 days of each other
  if (dayRange <= 30) {
    confidence += 3;
  }

  // Clamp to valid range
  return Math.round(Math.max(0, Math.min(100, confidence)));
}

/**
 * Build a human-readable match reason
 */
function buildMatchReason(
  docs: AccrualDocument[],
  variancePercent: number,
  isExact: boolean
): string {
  const docCount = docs.length;
  const docNumbers = docs
    .map((d) => d.docNumber || `Doc#${d._id.slice(-4)}`)
    .join(", ");

  if (isExact) {
    return `Exact partial match: ${docCount} invoices (${docNumbers}) combine to payment amount`;
  }

  const variancePctStr = (variancePercent * 100).toFixed(1);
  return `Partial match: ${docCount} invoices (${docNumbers}) within ${variancePctStr}% of payment amount`;
}

/**
 * Generate a unique partial match group ID
 */
export function generatePartialMatchGroupId(
  cashTransactionId: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Date.now();
  return `pm_${cashTransactionId.slice(-8)}_${ts}`;
}

/**
 * Validate that a partial match combination is still valid
 * (documents still pending and amounts haven't changed)
 */
export function validatePartialMatch(
  documents: AccrualDocument[],
  originalTotalAmount: number
): { valid: boolean; reason?: string } {
  // Check all documents are still pending
  const nonPending = documents.filter((d) => d.status !== "pending");
  if (nonPending.length > 0) {
    return {
      valid: false,
      reason: `${nonPending.length} document(s) are no longer pending`,
    };
  }

  // Check total amount hasn't changed
  const currentTotal = documents.reduce((sum, d) => sum + Math.abs(d.amount), 0);
  if (Math.abs(currentTotal - originalTotalAmount) > 0.01) {
    return {
      valid: false,
      reason: "Document amounts have changed since match was created",
    };
  }

  return { valid: true };
}
