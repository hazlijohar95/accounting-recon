/**
 * Layer 4: Fuzzy Name Match
 *
 * Fuzzy matching based on payee/counterparty names:
 * - Compare payee name in bank tx to counterparty in accrual
 * - String similarity > 60%
 * - Amount within 10% variance (partial payments)
 * - Confidence: 70-85% based on similarity
 *
 * This layer catches cases where names are slightly different
 * (e.g., "ABC Corp" vs "ABC Corporation").
 */

import {
  CashTransaction,
  AccrualDocument,
  MatchCandidate,
  MatchingConfig,
  MatchingLayer,
  DEFAULT_CONFIG,
} from "./types";
import {
  stringSimilarity,
  normalizeString,
  normalizeCompanyName,
  dateDiffDays,
  amountsMatch,
  amountsWithinVariance,
} from "../../utils/matchingUtils";

export class FuzzyMatchLayer implements MatchingLayer {
  readonly name = "fuzzy";
  readonly priority = 4 as const;
  readonly minConfidence = 70;

  match(
    cashTxns: CashTransaction[],
    accrualDocs: AccrualDocument[],
    config: MatchingConfig = DEFAULT_CONFIG
  ): MatchCandidate[] {
    const matches: MatchCandidate[] = [];
    const matchedCashIds = new Set<string>();
    const matchedAccrualIds = new Set<string>();

    for (const cash of cashTxns) {
      if (matchedCashIds.has(cash._id)) continue;

      const cashDesc = normalizeString(cash.description);
      if (!cashDesc) continue;

      let bestMatch: MatchCandidate | null = null;
      let bestScore = 0;

      for (const accrual of accrualDocs) {
        if (matchedAccrualIds.has(accrual._id)) continue;

        // Check amount is within variance
        if (
          !amountsWithinVariance(
            cash.amount,
            accrual.amount,
            config.amountVariancePercent
          )
        ) {
          continue;
        }

        // Check date is within extended window
        const daysDiff = dateDiffDays(cash.date, accrual.docDate);
        if (daysDiff === null || daysDiff > config.fuzzyDateWindow) {
          continue;
        }

        // Compare names/descriptions with company name normalization
        const accrualName = normalizeCompanyName(
          accrual.counterparty || accrual.description || ""
        );
        if (!accrualName) continue;

        // Normalize company name for cash description as well
        const cashDescNormalized = normalizeCompanyName(cashDesc);
        const similarity = stringSimilarity(cashDescNormalized, accrualName);

        if (similarity < config.minFuzzySimilarity) continue;

        // Calculate confidence (70-85% based on similarity and amount match)
        const amountMatch = amountsMatch(
          cash.amount,
          accrual.amount,
          config.amountTolerance
        );
        const baseConfidence = 70 + (similarity - 60) * 0.375; // Scale 60-100% to 70-85%
        const confidence = Math.round(
          amountMatch ? Math.min(baseConfidence + 5, 85) : baseConfidence
        );

        // Track best match
        const combinedScore = similarity + (amountMatch ? 20 : 0);
        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMatch = {
            cashTransactionId: cash._id,
            accrualDocumentId: accrual._id,
            confidenceScore: confidence,
            matchLayer: 4,
            matchReason: `Fuzzy match: "${cashDesc.slice(0, 30)}..." ~ "${accrualName.slice(0, 30)}..." (${similarity}% similar), ${amountMatch ? "amounts match" : "amounts within " + config.amountVariancePercent + "%"}`,
          };
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        matchedCashIds.add(bestMatch.cashTransactionId);
        matchedAccrualIds.add(bestMatch.accrualDocumentId);
      }
    }

    return matches;
  }
}

/**
 * Standalone function for backward compatibility
 */
export function layer4FuzzyMatch(
  cashTxns: CashTransaction[],
  accrualDocs: AccrualDocument[],
  config: MatchingConfig = DEFAULT_CONFIG
): MatchCandidate[] {
  const layer = new FuzzyMatchLayer();
  return layer.match(cashTxns, accrualDocs, config);
}
