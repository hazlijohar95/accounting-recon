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

    // Pre-index accrual docs by rounded absolute amount for O(1) lookup.
    // This reduces the inner loop from O(n) to O(bucket_size) which is typically O(1).
    const accrualByAmount = new Map<number, AccrualDocument[]>();
    for (const accrual of accrualDocs) {
      // Round to cents to create amount buckets
      const key = Math.round(Math.abs(accrual.amount) * 100);
      const bucket = accrualByAmount.get(key);
      if (bucket) {
        bucket.push(accrual);
      } else {
        accrualByAmount.set(key, [accrual]);
      }
    }

    for (const cash of cashTxns) {
      if (matchedCashIds.has(cash._id)) continue;

      // Look up potential matches by amount bucket (within tolerance)
      const cashAmountCents = Math.round(Math.abs(cash.amount) * 100);
      const toleranceCents = Math.round(config.amountTolerance * 100);

      // Check the exact bucket and adjacent buckets within tolerance
      for (let offset = -toleranceCents; offset <= toleranceCents; offset++) {
        const bucket = accrualByAmount.get(cashAmountCents + offset);
        if (!bucket) continue;

        for (const accrual of bucket) {
          if (matchedAccrualIds.has(accrual._id)) continue;

          // Verify exact amount match with proper tolerance check
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

        if (matchedCashIds.has(cash._id)) break; // Already found a match for this cash txn
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
