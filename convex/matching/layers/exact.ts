/**
 * Layer 1: Exact Match
 *
 * The highest confidence matching layer that looks for:
 * - Amount within $0.01 tolerance
 * - Date within 3 days
 * - Confidence: 100%
 *
 * This layer catches transactions that are clear matches with
 * minimal ambiguity.
 */

import {
  CashTransaction,
  AccrualDocument,
  MatchCandidate,
  MatchingConfig,
  MatchingLayer,
  DEFAULT_CONFIG,
} from "./types";
import { dateDiffDays, amountsMatch } from "../../utils/matchingUtils";

export class ExactMatchLayer implements MatchingLayer {
  readonly name = "exact";
  readonly priority = 1 as const;
  readonly minConfidence = 100;

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

      for (const accrual of accrualDocs) {
        if (matchedAccrualIds.has(accrual._id)) continue;

        // Check amount match (exact within tolerance)
        if (!amountsMatch(cash.amount, accrual.amount, config.amountTolerance)) {
          continue;
        }

        // Check date match (within exactDateWindow days)
        const daysDiff = dateDiffDays(cash.date, accrual.docDate);
        if (daysDiff === null || daysDiff > config.exactDateWindow) {
          continue;
        }

        // Found exact match
        matches.push({
          cashTransactionId: cash._id,
          accrualDocumentId: accrual._id,
          confidenceScore: 100,
          matchLayer: 1,
          matchReason: `Exact match: Amount $${Math.abs(cash.amount).toFixed(2)} within $${config.amountTolerance}, dates ${daysDiff} days apart`,
        });

        matchedCashIds.add(cash._id);
        matchedAccrualIds.add(accrual._id);
        break; // Move to next cash transaction
      }
    }

    return matches;
  }
}

/**
 * Standalone function for backward compatibility
 */
export function layer1ExactMatch(
  cashTxns: CashTransaction[],
  accrualDocs: AccrualDocument[],
  config: MatchingConfig = DEFAULT_CONFIG
): MatchCandidate[] {
  const layer = new ExactMatchLayer();
  return layer.match(cashTxns, accrualDocs, config);
}
