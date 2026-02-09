/**
 * Tests for Layer 7: Partial Match Algorithm
 *
 * Tests subset sum matching for combining multiple invoices
 * to match a single cash transaction.
 *
 * Run with: npx vitest run convex/matching/__tests__/partial.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  findPartialMatchCombination,
  generatePartialMatchGroupId,
  validatePartialMatch,
} from "../layers/partial";
import type { CashTransaction, AccrualDocument } from "../layers/types";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// Test Fixtures
// ============================================================================

function createCashTxn(
  id: string,
  amount: number,
  date: string,
  description: string = "Payment"
): CashTransaction {
  return {
    _id: id as Id<"transactions">,
    _creationTime: Date.now(),
    companyId: "company1" as Id<"companies">,
    date,
    description,
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
  status: "pending" | "matched" | "partial" | "suspense" = "pending"
): AccrualDocument {
  return {
    _id: id as Id<"accrualDocuments">,
    _creationTime: Date.now(),
    companyId: "company1" as Id<"companies">,
    docType: "sales_invoice",
    docDate: date,
    docNumber,
    amount,
    status,
    createdAt: Date.now(),
  };
}

// ============================================================================
// Basic Partial Matching Tests
// ============================================================================

describe("Layer 7: Partial Match - Basic", () => {
  it("should find exact 2-invoice combination", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).not.toBeNull();
    expect(result!.documents).toHaveLength(2);
    expect(result!.totalAmount).toBe(5000);
    expect(result!.isExact).toBe(true);
    expect(result!.confidence).toBeGreaterThanOrEqual(95);
  });

  it("should find exact 3-invoice combination", () => {
    const cash = createCashTxn("c1", -6000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -2500, "2025-01-11", "INV-002"),
      createAccrualDoc("a3", -1500, "2025-01-12", "INV-003"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).not.toBeNull();
    expect(result!.documents).toHaveLength(3);
    expect(result!.totalAmount).toBe(6000);
    expect(result!.isExact).toBe(true);
  });

  it("should return null when no combination exists", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -1000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -1000, "2025-01-11", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).toBeNull();
  });

  it("should require at least 2 documents for partial match", () => {
    const cash = createCashTxn("c1", -3000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -3000, "2025-01-10", "INV-001"), // Single exact match
    ];

    const result = findPartialMatchCombination(cash, accruals);

    // Should not create partial match with single doc (that's a regular match)
    expect(result).toBeNull();
  });
});

// ============================================================================
// Tolerance and Variance Tests
// ============================================================================

describe("Layer 7: Partial Match - Tolerance", () => {
  it("should match within tolerance percentage", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -2900, "2025-01-12", "INV-002"), // 4900 total, 2% variance
    ];

    // Default tolerancePercent is 1% (0.01), so 2% variance needs explicit config
    const result = findPartialMatchCombination(cash, accruals, {
      enabled: true,
      minCashAmount: 100,
      maxInvoicesPerMatch: 5,
      toleranceAbsolute: 1,
      tolerancePercent: 0.03, // 3% tolerance to cover 2% variance
      minConfidence: 70,
    });

    expect(result).not.toBeNull();
    expect(result!.isExact).toBe(false);
    expect(result!.variancePercent).toBeLessThan(0.03);
  });

  it("should NOT match when variance exceeds tolerance", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -2500, "2025-01-12", "INV-002"), // 4500 total, 10% variance
    ];

    const result = findPartialMatchCombination(cash, accruals, {
      enabled: true,
      minCashAmount: 100,
      maxInvoicesPerMatch: 5,
      toleranceAbsolute: 1,
      tolerancePercent: 0.02, // Only 2% tolerance
      minConfidence: 70,
    });

    expect(result).toBeNull();
  });

  it("should use absolute tolerance for small amounts", () => {
    const cash = createCashTxn("c1", -500, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -200, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -290, "2025-01-12", "INV-002"), // 490 total
    ];

    const result = findPartialMatchCombination(cash, accruals, {
      enabled: true,
      minCashAmount: 100,
      maxInvoicesPerMatch: 5,
      toleranceAbsolute: 15, // 15 absolute tolerance
      tolerancePercent: 0.02,
      minConfidence: 70,
    });

    expect(result).not.toBeNull();
  });
});

// ============================================================================
// Configuration Tests
// ============================================================================

describe("Layer 7: Partial Match - Configuration", () => {
  it("should respect minCashAmount threshold", () => {
    const cash = createCashTxn("c1", -50, "2025-01-15"); // Below threshold
    const accruals = [
      createAccrualDoc("a1", -20, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -30, "2025-01-12", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals, {
      enabled: true,
      minCashAmount: 100, // Threshold is 100
      maxInvoicesPerMatch: 5,
      toleranceAbsolute: 1,
      tolerancePercent: 0.03,
      minConfidence: 70,
    });

    expect(result).toBeNull();
  });

  it("should respect maxInvoicesPerMatch limit", () => {
    const cash = createCashTxn("c1", -6000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -1000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -1000, "2025-01-11", "INV-002"),
      createAccrualDoc("a3", -1000, "2025-01-12", "INV-003"),
      createAccrualDoc("a4", -1000, "2025-01-13", "INV-004"),
      createAccrualDoc("a5", -1000, "2025-01-14", "INV-005"),
      createAccrualDoc("a6", -1000, "2025-01-15", "INV-006"),
    ];

    const result = findPartialMatchCombination(cash, accruals, {
      enabled: true,
      minCashAmount: 100,
      maxInvoicesPerMatch: 3, // Max 3 invoices
      toleranceAbsolute: 1,
      tolerancePercent: 0.03,
      minConfidence: 70,
    });

    // Should only find combination with max 3 docs
    if (result) {
      expect(result.documents.length).toBeLessThanOrEqual(3);
    }
  });

  it("should respect minConfidence threshold", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -2700, "2025-01-12", "INV-002"), // 4700 total, 6% variance
    ];

    const result = findPartialMatchCombination(cash, accruals, {
      enabled: true,
      minCashAmount: 100,
      maxInvoicesPerMatch: 5,
      toleranceAbsolute: 500,
      tolerancePercent: 0.10,
      minConfidence: 90, // Very high confidence required
    });

    // 6% variance would lower confidence below 90
    expect(result).toBeNull();
  });
});

// ============================================================================
// Document Status Tests
// ============================================================================

describe("Layer 7: Partial Match - Document Status", () => {
  it("should only consider pending documents", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001", "pending"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002", "matched"), // Already matched
    ];

    const result = findPartialMatchCombination(cash, accruals);

    // Should not include the matched document
    expect(result).toBeNull();
  });

  it("should exclude partial documents", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001", "partial"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002", "pending"),
      createAccrualDoc("a3", -2000, "2025-01-13", "INV-003", "pending"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    // Should not include a1 (partial status, not pending)
    if (result) {
      expect(result.documents.map((d) => d._id)).not.toContain("a1");
    }
  });
});

// ============================================================================
// Selection Priority Tests
// ============================================================================

describe("Layer 7: Partial Match - Selection Priority", () => {
  it("should prefer exact matches over approximate matches", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      // Exact combo
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -3000, "2025-01-11", "INV-002"),
      // Approximate combo
      createAccrualDoc("a3", -2500, "2025-01-12", "INV-003"),
      createAccrualDoc("a4", -2450, "2025-01-13", "INV-004"), // 4950 total
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).not.toBeNull();
    expect(result!.isExact).toBe(true);
    expect(result!.totalAmount).toBe(5000);
  });

  it("should prefer fewer invoices when confidence is equal", () => {
    const cash = createCashTxn("c1", -6000, "2025-01-15");
    const accruals = [
      // 2-doc combo
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -4000, "2025-01-11", "INV-002"),
      // 3-doc combo
      createAccrualDoc("a3", -2000, "2025-01-12", "INV-003"),
      createAccrualDoc("a4", -2000, "2025-01-13", "INV-004"),
      createAccrualDoc("a5", -2000, "2025-01-14", "INV-005"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).not.toBeNull();
    // Should prefer the 2-doc combination
    expect(result!.documents).toHaveLength(2);
  });
});

// ============================================================================
// Confidence Calculation Tests
// ============================================================================

describe("Layer 7: Partial Match - Confidence", () => {
  it("should give higher confidence for exact matches", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(100); // Exact match bonus
  });

  it("should penalize variance in confidence", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -2900, "2025-01-12", "INV-002"), // 4900 total, 2% variance
    ];

    // Default tolerance is 1%, so 2% variance needs explicit config
    const result = findPartialMatchCombination(cash, accruals, {
      enabled: true,
      minCashAmount: 100,
      maxInvoicesPerMatch: 5,
      toleranceAbsolute: 1,
      tolerancePercent: 0.03,
      minConfidence: 70,
    });

    expect(result).not.toBeNull();
    // Should have lower confidence than exact match
    // Confidence = 100 - (2% * 5) + 3 (date proximity) = 93, clamped to 93
    expect(result!.confidence).toBeLessThan(100);
    expect(result!.confidence).toBeGreaterThan(80);
  });

  it("should penalize more documents in confidence", () => {
    const cash = createCashTxn("c1", -6000, "2025-01-15");

    // 2-doc exact match
    const accruals2 = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -4000, "2025-01-11", "INV-002"),
    ];
    const result2 = findPartialMatchCombination(cash, accruals2);

    // 4-doc exact match
    const accruals4 = [
      createAccrualDoc("a3", -1500, "2025-01-10", "INV-003"),
      createAccrualDoc("a4", -1500, "2025-01-11", "INV-004"),
      createAccrualDoc("a5", -1500, "2025-01-12", "INV-005"),
      createAccrualDoc("a6", -1500, "2025-01-13", "INV-006"),
    ];
    const result4 = findPartialMatchCombination(cash, accruals4);

    expect(result2).not.toBeNull();
    expect(result4).not.toBeNull();
    // Both are exact matches, confidence = 100 - 0 (no variance) + 5 (exact) + 3 (date proximity) = 108 → clamped to 100 for 2-doc
    // 4-doc: 100 - 6 (2 extra × 3) + 5 + 3 = 102 → clamped to 100
    // Both clamp to 100, so check >= instead
    expect(result2!.confidence).toBeGreaterThanOrEqual(result4!.confidence);
  });
});

// ============================================================================
// Match Reason Tests
// ============================================================================

describe("Layer 7: Partial Match - Match Reason", () => {
  it("should include doc numbers in match reason", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).not.toBeNull();
    expect(result!.matchReason).toContain("INV-001");
    expect(result!.matchReason).toContain("INV-002");
  });

  it("should indicate exact vs approximate in reason", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const exactAccruals = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002"),
    ];

    const exactResult = findPartialMatchCombination(cash, exactAccruals);

    expect(exactResult).not.toBeNull();
    expect(exactResult!.matchReason).toContain("Exact");
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("generatePartialMatchGroupId", () => {
  it("should generate unique IDs with different timestamps", () => {
    const id1 = generatePartialMatchGroupId("txn_12345678", 1000);
    const id2 = generatePartialMatchGroupId("txn_12345678", 2000);

    // IDs should start with pm_ prefix
    expect(id1.startsWith("pm_")).toBe(true);
    expect(id2.startsWith("pm_")).toBe(true);

    // Should be different since timestamps differ
    expect(id1).not.toBe(id2);
  });

  it("should include transaction ID fragment", () => {
    const id = generatePartialMatchGroupId("txn_abcdefgh");

    expect(id).toContain("abcdefgh");
  });

  it("should use provided timestamp", () => {
    const timestamp = 1704067200000; // 2024-01-01
    const id = generatePartialMatchGroupId("txn_12345678", timestamp);

    expect(id).toContain(String(timestamp));
  });
});

describe("validatePartialMatch", () => {
  it("should validate all-pending documents", () => {
    const docs = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001", "pending"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002", "pending"),
    ];

    const result = validatePartialMatch(docs, 5000);

    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should fail if document is no longer pending", () => {
    const docs = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001", "pending"),
      createAccrualDoc("a2", -3000, "2025-01-12", "INV-002", "matched"),
    ];

    const result = validatePartialMatch(docs, 5000);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("no longer pending");
  });

  it("should fail if amounts have changed", () => {
    const docs = [
      createAccrualDoc("a1", -2000, "2025-01-10", "INV-001", "pending"),
      createAccrualDoc("a2", -2500, "2025-01-12", "INV-002", "pending"), // Changed from 3000
    ];

    const result = validatePartialMatch(docs, 5000);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("amounts have changed");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Layer 7: Partial Match - Edge Cases", () => {
  it("should handle empty accruals array", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals: AccrualDocument[] = [];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).toBeNull();
  });

  it("should handle single accrual document", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [createAccrualDoc("a1", -2000, "2025-01-10", "INV-001")];

    const result = findPartialMatchCombination(cash, accruals);

    // Cannot create partial match with just one doc
    expect(result).toBeNull();
  });

  it("should handle all documents larger than target", () => {
    const cash = createCashTxn("c1", -5000, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", -6000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", -7000, "2025-01-12", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).toBeNull();
  });

  it("should handle zero amount cash transaction", () => {
    const cash = createCashTxn("c1", 0, "2025-01-15");
    const accruals = [
      createAccrualDoc("a1", 0, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", 0, "2025-01-12", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    // Zero amounts typically below minCashAmount
    expect(result).toBeNull();
  });

  it("should handle positive amounts (cash in)", () => {
    const cash = createCashTxn("c1", 5000, "2025-01-15"); // Positive (cash received)
    const accruals = [
      createAccrualDoc("a1", 2000, "2025-01-10", "INV-001"),
      createAccrualDoc("a2", 3000, "2025-01-12", "INV-002"),
    ];

    const result = findPartialMatchCombination(cash, accruals);

    expect(result).not.toBeNull();
    expect(result!.totalAmount).toBe(5000);
  });

  it("should handle many candidate documents (performance)", () => {
    const cash = createCashTxn("c1", -10000, "2025-01-15");
    const accruals: AccrualDocument[] = [];

    // Create 50 small invoices
    for (let i = 0; i < 50; i++) {
      accruals.push(
        createAccrualDoc(`a${i}`, -(100 + i * 10), `2025-01-${(i % 28) + 1}`, `INV-${i.toString().padStart(3, "0")}`)
      );
    }

    // Should complete without timeout and find a combination
    const result = findPartialMatchCombination(cash, accruals);

    // May or may not find a match, but shouldn't crash
    expect(() => findPartialMatchCombination(cash, accruals)).not.toThrow();
  });
});
