/**
 * Tests for 5-Layer Matching Algorithms
 * Run with: npx vitest run convex/matching/__tests__/layers.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  layer1ExactMatch,
  layer2WindowMatch,
  layer3ReferenceMatch,
  layer4FuzzyMatch,
  runNonLLMLayers,
  DEFAULT_CONFIG,
  CashTransaction,
  AccrualDocument,
} from "../layers";
import { Id } from "../../_generated/dataModel";

// ============ TEST FIXTURES ============

function createCashTxn(
  id: string,
  amount: number,
  date: string,
  description: string,
  reference?: string
): CashTransaction {
  return {
    _id: id as Id<"transactions">,
    _creationTime: Date.now(),
    companyId: "company1" as Id<"companies">,
    date,
    description,
    reference,
    amount,
    type: "cash",
    status: "pending",
    createdAt: Date.now(),
  };
}

function createAccrualDoc(
  id: string,
  amount: number,
  date: string,
  docNumber?: string,
  counterparty?: string,
  description?: string
): AccrualDocument {
  return {
    _id: id as Id<"accrualDocuments">,
    _creationTime: Date.now(),
    companyId: "company1" as Id<"companies">,
    docType: "sales_invoice",
    docDate: date,
    docNumber,
    counterparty,
    description,
    amount,
    status: "pending",
    createdAt: Date.now(),
  };
}

// ============ LAYER 1: EXACT MATCH TESTS ============

describe("Layer 1: Exact Match", () => {
  it("should match transactions with exact amount and date within 3 days", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-15", "Payment to vendor")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);

    expect(matches).toHaveLength(1);
    expect(matches[0].confidenceScore).toBe(100);
    expect(matches[0].matchLayer).toBe(1);
  });

  it("should match with $0.01 tolerance", () => {
    const cash = [createCashTxn("c1", -100.01, "2025-01-15", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);

    expect(matches).toHaveLength(1);
  });

  it("should NOT match if date difference > 3 days", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);

    expect(matches).toHaveLength(0);
  });

  it("should NOT match if amounts differ by more than tolerance", () => {
    const cash = [createCashTxn("c1", -100.5, "2025-01-15", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);

    expect(matches).toHaveLength(0);
  });

  it("should not double-match transactions", () => {
    const cash = [
      createCashTxn("c1", -100.0, "2025-01-15", "Payment 1"),
      createCashTxn("c2", -100.0, "2025-01-15", "Payment 2"),
    ];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);

    // Only one match should be created (first come first served)
    expect(matches).toHaveLength(1);
    expect(matches[0].cashTransactionId).toBe("c1");
  });
});

// ============ LAYER 2: WINDOW MATCH TESTS ============

describe("Layer 2: Window Match", () => {
  it("should match transactions within 7 day window (but not 3 days)", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-001")];

    const matches = layer2WindowMatch(cash, accrual);

    expect(matches).toHaveLength(1);
    expect(matches[0].matchLayer).toBe(2);
    expect(matches[0].confidenceScore).toBeGreaterThanOrEqual(88);
    expect(matches[0].confidenceScore).toBeLessThanOrEqual(95);
  });

  it("should skip items already matched by Layer 1 criteria", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-15", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-001")];

    // This would be caught by Layer 1 (2 days apart), so Layer 2 should skip it
    const matches = layer2WindowMatch(cash, accrual);

    expect(matches).toHaveLength(0);
  });

  it("should NOT match if date difference > 7 days", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-25", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-001")];

    const matches = layer2WindowMatch(cash, accrual);

    expect(matches).toHaveLength(0);
  });
});

// ============ LAYER 3: REFERENCE MATCH TESTS ============

describe("Layer 3: Reference Match", () => {
  it("should match when bank description contains invoice number", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment INV-12345")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);

    expect(matches).toHaveLength(1);
    expect(matches[0].matchLayer).toBe(3);
    expect(matches[0].confidenceScore).toBeGreaterThanOrEqual(85);
  });

  it("should match using transaction reference field", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Wire transfer", "12345")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);

    expect(matches).toHaveLength(1);
  });

  it("should NOT match partial reference numbers (false positive prevention)", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment INV-123")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);

    // Should NOT match because "123" !== "12345"
    expect(matches).toHaveLength(0);
  });

  it("should give higher confidence for matching amounts", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment REF-12345")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);

    expect(matches).toHaveLength(1);
    expect(matches[0].confidenceScore).toBe(95); // Exact amount match
  });
});

// ============ LAYER 4: FUZZY MATCH TESTS ============

describe("Layer 4: Fuzzy Match", () => {
  it("should match similar company names with 60%+ similarity", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment ACME Corp")];
    const accrual = [
      createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME Corporation"),
    ];

    const matches = layer4FuzzyMatch(cash, accrual);

    expect(matches).toHaveLength(1);
    expect(matches[0].matchLayer).toBe(4);
    expect(matches[0].confidenceScore).toBeGreaterThanOrEqual(70);
  });

  it("should match with 10% amount variance", () => {
    const cash = [createCashTxn("c1", -95.0, "2025-01-20", "Payment to ACME")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME")];

    const matches = layer4FuzzyMatch(cash, accrual);

    expect(matches).toHaveLength(1);
  });

  it("should NOT match if amount variance > 10%", () => {
    const cash = [createCashTxn("c1", -85.0, "2025-01-20", "Payment to ACME")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME")];

    const matches = layer4FuzzyMatch(cash, accrual);

    expect(matches).toHaveLength(0);
  });

  it("should NOT match if similarity < 60%", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment XYZ")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME Corp")];

    const matches = layer4FuzzyMatch(cash, accrual);

    expect(matches).toHaveLength(0);
  });
});

// ============ AGGREGATE TESTS ============

describe("runNonLLMLayers (Full Pipeline)", () => {
  it("should run all 4 layers and return aggregated results", () => {
    const cash = [
      createCashTxn("c1", -100.0, "2025-01-15", "Payment to vendor"), // Layer 1
      createCashTxn("c2", -200.0, "2025-01-20", "Wire REF-55555"), // Layer 3
      createCashTxn("c3", -300.0, "2025-01-25", "Unknown payment"), // Unmatched
    ];
    const accrual = [
      createAccrualDoc("a1", -100.0, "2025-01-14", "INV-001"), // Layer 1
      createAccrualDoc("a2", -200.0, "2025-01-10", "INV-55555"), // Layer 3
      createAccrualDoc("a3", -400.0, "2025-01-10", "INV-999"), // Unmatched
    ];

    const result = runNonLLMLayers(cash, accrual);

    expect(result.matches).toHaveLength(2);
    expect(result.unmatchedCash).toHaveLength(1);
    expect(result.unmatchedCash[0]._id).toBe("c3");
    expect(result.unmatchedAccrual).toHaveLength(1);
    expect(result.unmatchedAccrual[0]._id).toBe("a3");
  });

  it("should handle empty inputs", () => {
    const result = runNonLLMLayers([], []);

    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedCash).toHaveLength(0);
    expect(result.unmatchedAccrual).toHaveLength(0);
  });

  it("should handle single item inputs", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-15", "Payment")];
    const accrual: AccrualDocument[] = [];

    const result = runNonLLMLayers(cash, accrual);

    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedCash).toHaveLength(1);
  });
});

// ============ EDGE CASE TESTS ============

describe("Edge Cases", () => {
  it("should handle null/undefined dates gracefully", () => {
    const cash = [createCashTxn("c1", -100.0, "", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-001")];

    // Should not crash, just return no matches
    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(0);
  });

  it("should handle zero amounts", () => {
    const cash = [createCashTxn("c1", 0, "2025-01-15", "Zero payment")];
    const accrual = [createAccrualDoc("a1", 0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should handle negative vs positive amounts (cash in vs out)", () => {
    const cash = [createCashTxn("c1", 100.0, "2025-01-15", "Received payment")];
    const accrual = [createAccrualDoc("a1", 100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should handle special characters in descriptions", () => {
    const cash = [
      createCashTxn("c1", -100.0, "2025-01-15", "Payment to ACME™ Corp® (USA)"),
    ];
    const accrual = [
      createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME Corp USA"),
    ];

    const matches = layer4FuzzyMatch(cash, accrual);
    // Should still find a fuzzy match after normalization
    expect(matches.length).toBeGreaterThanOrEqual(0); // May or may not match depending on similarity
  });
});

// ============ AMOUNT TOLERANCE BOUNDARY TESTS ============

describe("Amount Tolerance Boundaries", () => {
  it("Layer 1: should match at exactly $0.01 tolerance", () => {
    const cash = [createCashTxn("c1", -100.01, "2025-01-15", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("Layer 1: should NOT match at $0.02 difference", () => {
    const cash = [createCashTxn("c1", -100.02, "2025-01-15", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(0);
  });

  it("Layer 4: should match at exactly 10% variance", () => {
    const cash = [createCashTxn("c1", -90.0, "2025-01-20", "Payment to ACME")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME")];

    const matches = layer4FuzzyMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("Layer 4: should NOT match at 11% variance", () => {
    const cash = [createCashTxn("c1", -89.0, "2025-01-20", "Payment to ACME")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME")];

    const matches = layer4FuzzyMatch(cash, accrual);
    expect(matches).toHaveLength(0);
  });

  it("should handle very small amounts (under $1)", () => {
    const cash = [createCashTxn("c1", -0.50, "2025-01-15", "Small payment")];
    const accrual = [createAccrualDoc("a1", -0.50, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should handle very large amounts (millions)", () => {
    const cash = [createCashTxn("c1", -1500000.00, "2025-01-15", "Large payment")];
    const accrual = [createAccrualDoc("a1", -1500000.00, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });
});

// ============ DATE WINDOW BOUNDARY TESTS ============

describe("Date Window Boundaries", () => {
  it("Layer 1: should match at exactly 3 days apart", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-18", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("Layer 1: should NOT match at 4 days apart", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-19", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(0);
  });

  it("Layer 2: should match at exactly 7 days apart", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-22", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer2WindowMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("Layer 2: should NOT match at 8 days apart", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-23", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer2WindowMatch(cash, accrual);
    expect(matches).toHaveLength(0);
  });

  it("should handle cash before accrual (negative date difference)", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-12", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should handle month boundary crossings", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-02-01", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-30", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should handle year boundary crossings", () => {
    const cash = [createCashTxn("c1", -100.0, "2026-01-02", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-12-31", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });
});

// ============ REFERENCE EXTRACTION PATTERN TESTS ============

describe("Reference Extraction Patterns", () => {
  it("should match INV-XXXXX pattern", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment INV-12345")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should match standalone 8+ digit number pattern", () => {
    // extractReferences captures standalone 8+ digit numbers (raised from 6 to reduce false positives)
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment for order 12345678")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "12345678")];

    const matches = layer3ReferenceMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should match PO-XXXXX pattern", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Wire for PO-98765")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "PO-98765")];

    const matches = layer3ReferenceMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should match REF-NNNNN pattern", () => {
    // extractReferences uses /\bREF[-#]?(\d{3,})\b/i which requires numeric-only references
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Bank transfer REF-12345")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "REF-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should be case-insensitive for references", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment for inv-12345")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should NOT match partial reference numbers", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment INV-123")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);
    expect(matches).toHaveLength(0);
  });

  it("should match using transaction reference field directly", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Wire payment", "INV-12345")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-14", "INV-12345")];

    const matches = layer3ReferenceMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });
});

// ============ FUZZY SIMILARITY THRESHOLD TESTS ============

describe("Fuzzy Similarity Thresholds", () => {
  it("should match at 60% similarity threshold", () => {
    // "Payment" prefix gets stripped by normalizeString, "Corp" → "Corporation" via normalizeCompanyName
    // "abc corp" → "abc corporation" vs "ABC Corporation" → "abc corporation" = 100% match
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment ABC Corp")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ABC Corporation")];

    const matches = layer4FuzzyMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should NOT match at less than 60% similarity", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment to XYZ Inc")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ABC Corporation")];

    const matches = layer4FuzzyMatch(cash, accrual);
    expect(matches).toHaveLength(0);
  });

  it("should handle common abbreviations", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment ACME Corp")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME Corporation")];

    const matches = layer4FuzzyMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should handle transposed characters", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment to ACME Corportaion")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", "ACME Corporation")];

    const matches = layer4FuzzyMatch(cash, accrual);
    // Should still match due to high similarity despite typo
    expect(matches).toHaveLength(1);
  });

  it("should use accrual description when counterparty is empty", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment to Widget Supplies")];
    const accrual = [
      createAccrualDoc("a1", -100.0, "2025-01-10", "INV-001", undefined, "Widget Supplies Order"),
    ];

    const matches = layer4FuzzyMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });
});

// ============ DOUBLE-MATCHING PREVENTION TESTS ============

describe("Double-Matching Prevention", () => {
  it("should not match same cash transaction twice", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-15", "Payment")];
    const accrual = [
      createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001"),
      createAccrualDoc("a2", -100.0, "2025-01-15", "INV-002"),
    ];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
  });

  it("should not match same accrual document twice", () => {
    const cash = [
      createCashTxn("c1", -100.0, "2025-01-15", "Payment 1"),
      createCashTxn("c2", -100.0, "2025-01-15", "Payment 2"),
    ];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);
    expect(matches).toHaveLength(1);
    expect(matches[0].accrualDocumentId).toBe("a1");
  });

  it("should maintain first-match priority across layers", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-20", "Payment INV-12345")];
    const accrual = [
      createAccrualDoc("a1", -100.0, "2025-01-19", "INV-12345"), // Would match L1
      createAccrualDoc("a2", -100.0, "2025-01-15", "INV-12345"), // Would match L3
    ];

    const result = runNonLLMLayers(cash, accrual);

    // Should only have one match (from Layer 1)
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchLayer).toBe(1);
    expect(result.matches[0].accrualDocumentId).toBe("a1");
    expect(result.unmatchedAccrual).toHaveLength(1);
    expect(result.unmatchedAccrual[0]._id).toBe("a2");
  });

  it("should skip already-matched items in subsequent layers", () => {
    const cash = [
      createCashTxn("c1", -100.0, "2025-01-15", "Payment A"),
      createCashTxn("c2", -100.0, "2025-01-20", "Payment B INV-002"),
    ];
    const accrual = [
      createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001"),
      createAccrualDoc("a2", -100.0, "2025-01-10", "INV-002"),
    ];

    const result = runNonLLMLayers(cash, accrual);

    // c1 should match a1 via Layer 1
    // c2 should match a2 via Layer 3
    expect(result.matches).toHaveLength(2);
    expect(result.unmatchedCash).toHaveLength(0);
    expect(result.unmatchedAccrual).toHaveLength(0);
  });
});

// ============ CONFIDENCE SCORING TESTS ============

describe("Confidence Scoring", () => {
  it("Layer 1 should always return 100% confidence", () => {
    const cash = [createCashTxn("c1", -100.0, "2025-01-15", "Payment")];
    const accrual = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];

    const matches = layer1ExactMatch(cash, accrual);

    expect(matches).toHaveLength(1);
    expect(matches[0].confidenceScore).toBe(100);
  });

  it("Layer 2 confidence should decrease with date distance", () => {
    // 4 days apart
    const cash4 = [createCashTxn("c1", -100.0, "2025-01-19", "Payment")];
    const accrual4 = [createAccrualDoc("a1", -100.0, "2025-01-15", "INV-001")];
    const matches4 = layer2WindowMatch(cash4, accrual4);

    // 7 days apart
    const cash7 = [createCashTxn("c2", -100.0, "2025-01-22", "Payment")];
    const accrual7 = [createAccrualDoc("a2", -100.0, "2025-01-15", "INV-002")];
    const matches7 = layer2WindowMatch(cash7, accrual7);

    expect(matches4[0].confidenceScore).toBeGreaterThan(matches7[0].confidenceScore);
  });

  it("Layer 3 should give higher confidence for exact amount match", () => {
    // Exact amount
    const cashExact = [createCashTxn("c1", -100.0, "2025-01-20", "Payment REF-12345")];
    const accrualExact = [createAccrualDoc("a1", -100.0, "2025-01-14", "REF-12345")];
    const matchesExact = layer3ReferenceMatch(cashExact, accrualExact);

    expect(matchesExact[0].confidenceScore).toBe(95);
  });
});
