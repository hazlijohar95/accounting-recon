/**
 * Layer 3: Reference Match
 *
 * Match based on invoice/reference numbers:
 * - Extract invoice/reference numbers from bank description
 * - Match against accrual document numbers
 * - Confidence: 85-95% based on amount similarity
 *
 * This layer catches cases where the bank description contains
 * the invoice number (e.g., "Payment for INV-2024-001").
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
  amountsMatch,
  amountsWithinVariance,
  extractReferences,
  normalizeDocNumber,
} from "../../utils/matchingUtils";

export class ReferenceMatchLayer implements MatchingLayer {
  readonly name = "reference";
  readonly priority = 3 as const;
  readonly minConfidence = 85;

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

      // Extract references from cash description
      const cashRefs = extractReferences(cash.description);
      if (cash.reference) {
        cashRefs.push(normalizeDocNumber(cash.reference));
      }

      if (cashRefs.length === 0) continue;

      for (const accrual of accrualDocs) {
        if (matchedAccrualIds.has(accrual._id)) continue;

        // Get accrual document number
        const accrualDocNum = normalizeDocNumber(accrual.docNumber);
        if (!accrualDocNum) continue;

        // Check if any reference matches (exact match only)
        const refMatch = cashRefs.some((ref) => ref === accrualDocNum);
        if (!refMatch) continue;

        // Calculate confidence based on amount similarity
        const amountExact = amountsMatch(
          cash.amount,
          accrual.amount,
          config.amountTolerance
        );
        const amountClose = amountsWithinVariance(
          cash.amount,
          accrual.amount,
          5
        );

        let confidence: number;
        let amountNote: string;

        if (amountExact) {
          confidence = 95;
          amountNote = "amounts match exactly";
        } else if (amountClose) {
          confidence = 90;
          amountNote = "amounts within 5%";
        } else {
          confidence = 85;
          amountNote = "reference match only (amounts differ)";
        }

        matches.push({
          cashTransactionId: cash._id,
          accrualDocumentId: accrual._id,
          confidenceScore: confidence,
          matchLayer: 3,
          matchReason: `Reference match: Document #${accrualDocNum} found in bank description, ${amountNote}`,
        });

        matchedCashIds.add(cash._id);
        matchedAccrualIds.add(accrual._id);
        break;
      }
    }

    return matches;
  }
}

/**
 * Standalone function for backward compatibility
 */
export function layer3ReferenceMatch(
  cashTxns: CashTransaction[],
  accrualDocs: AccrualDocument[],
  config: MatchingConfig = DEFAULT_CONFIG
): MatchCandidate[] {
  const layer = new ReferenceMatchLayer();
  return layer.match(cashTxns, accrualDocs, config);
}
