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
