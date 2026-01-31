/**
 * Layer 2: Window Match
 *
 * Extended date window matching for delayed payments:
 * - Amount within $0.01 tolerance
 * - Date within 7 days (extended for delayed payments)
 * - Confidence: 88-95% based on date proximity
 *
 * This layer catches payments that were processed a few days
 * after the invoice/receipt date.
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

export class WindowMatchLayer implements MatchingLayer {
  readonly name = "window";
  readonly priority = 2 as const;
  readonly minConfidence = 88;

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

      let bestMatch: MatchCandidate | null = null;
      let bestDaysDiff = Infinity;

      for (const accrual of accrualDocs) {
        if (matchedAccrualIds.has(accrual._id)) continue;

        // Check amount match (exact within tolerance)
        if (!amountsMatch(cash.amount, accrual.amount, config.amountTolerance)) {
          continue;
        }

        // Check date match (within windowDateWindow days)
        const daysDiff = dateDiffDays(cash.date, accrual.docDate);
        if (daysDiff === null || daysDiff > config.windowDateWindow) {
          continue;
        }

        // Skip if would have been caught by Layer 1
        if (daysDiff <= config.exactDateWindow) {
          continue;
        }

        // Calculate confidence based on date proximity (88-95%)
        const dateProximityBonus =
          Math.max(0, config.windowDateWindow - daysDiff) /
          config.windowDateWindow;
        const confidence = Math.round(88 + dateProximityBonus * 7);

        // Keep best match (closest date)
        if (daysDiff < bestDaysDiff) {
          bestDaysDiff = daysDiff;
          bestMatch = {
            cashTransactionId: cash._id,
            accrualDocumentId: accrual._id,
            confidenceScore: confidence,
            matchLayer: 2,
            matchReason: `Window match: Amount $${Math.abs(cash.amount).toFixed(2)} matches, dates ${daysDiff} days apart (delayed payment likely)`,
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
export function layer2WindowMatch(
  cashTxns: CashTransaction[],
  accrualDocs: AccrualDocument[],
  config: MatchingConfig = DEFAULT_CONFIG
): MatchCandidate[] {
  const layer = new WindowMatchLayer();
  return layer.match(cashTxns, accrualDocs, config);
}
