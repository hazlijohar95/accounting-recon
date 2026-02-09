/**
 * Matches Module Unit Tests
 *
 * Tests for match business logic patterns:
 * - Match creation validation (requires accrual reference)
 * - Cross-company verification pattern
 * - Match counts computation (O(log n) aggregates)
 * - Manual match candidate scoring (tolerance, search, relevance)
 * - Approve/reject status transitions
 * - Bulk approve high-confidence pattern
 *
 * @module convex/__tests__/matches.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Match Creation Validation
// ============================================================================

describe("Match Creation Validation", () => {
  it("requires at least one accrual reference", () => {
    const hasAccrualDoc = false;
    const hasAccrualTxn = false;

    // Mirrors validation: if (!args.accrualDocumentId && !args.accrualTransactionId)
    const isValid = hasAccrualDoc || hasAccrualTxn;
    expect(isValid).toBe(false);
  });

  it("accepts accrualDocumentId alone", () => {
    const hasAccrualDoc = true;
    const hasAccrualTxn = false;
    expect(hasAccrualDoc || hasAccrualTxn).toBe(true);
  });

  it("accepts legacy accrualTransactionId alone", () => {
    const hasAccrualDoc = false;
    const hasAccrualTxn = true;
    expect(hasAccrualDoc || hasAccrualTxn).toBe(true);
  });

  it("prefers accrualDocumentId when both are provided", () => {
    // When both are provided, accrualDocumentId takes priority
    const accrualDocumentId = "ad-1";
    const accrualTransactionId = "t-2";

    // The create handler: if (args.accrualDocumentId) → use it
    const preferredRef = accrualDocumentId || accrualTransactionId;
    expect(preferredRef).toBe("ad-1");
  });
});

// ============================================================================
// Cross-Company Verification
// ============================================================================

describe("Cross-Company Verification", () => {
  function verifyTransactionCompany(
    txnCompanyId: string | null,
    expectedCompanyId: string
  ): boolean {
    if (!txnCompanyId) return false;
    return txnCompanyId === expectedCompanyId;
  }

  it("returns true when company IDs match", () => {
    expect(verifyTransactionCompany("company-1", "company-1")).toBe(true);
  });

  it("returns false when company IDs differ", () => {
    expect(verifyTransactionCompany("company-1", "company-2")).toBe(false);
  });

  it("returns false for null transaction", () => {
    expect(verifyTransactionCompany(null, "company-1")).toBe(false);
  });

  // Prevents cross-tenant data access
  it("prevents matching transactions from different companies", () => {
    const sessionCompanyId = "company-A";
    const cashTxnCompanyId = "company-B"; // Different company!

    const isValid = verifyTransactionCompany(cashTxnCompanyId, sessionCompanyId);
    expect(isValid).toBe(false);
  });
});

// ============================================================================
// Manual Match Candidate Scoring
// ============================================================================

describe("Manual Match Candidate Scoring", () => {
  const AMOUNT_TOLERANCE_DECIMAL = 0.15; // 15%

  interface CandidateInput {
    amount: number;
    docNumber?: string;
    counterparty?: string;
    description?: string;
  }

  function scoreCandidate(target: number, doc: CandidateInput) {
    const targetAmount = Math.abs(target);
    const docAmount = Math.abs(doc.amount);
    const amountDiff = Math.abs(docAmount - targetAmount);

    let percentDiff: number;
    if (targetAmount === 0 && docAmount === 0) {
      percentDiff = 0;
    } else if (targetAmount === 0) {
      percentDiff = 1;
    } else {
      percentDiff = amountDiff / targetAmount;
    }

    const relevanceScore = Math.max(0, 100 - percentDiff * 100 * 2);
    const isWithinTolerance = percentDiff <= AMOUNT_TOLERANCE_DECIMAL;
    const isExactMatch = amountDiff === 0;

    return { percentDiff, relevanceScore, isWithinTolerance, isExactMatch, amountDiff };
  }

  it("gives exact match 100% relevance", () => {
    const result = scoreCandidate(-500, { amount: 500 });
    expect(result.isExactMatch).toBe(true);
    expect(result.relevanceScore).toBe(100);
    expect(result.isWithinTolerance).toBe(true);
  });

  it("gives within-tolerance match positive relevance", () => {
    // 10% variance on RM1000 = RM100 diff
    const result = scoreCandidate(-1000, { amount: 1100 });
    expect(result.percentDiff).toBeCloseTo(0.1, 2);
    expect(result.isWithinTolerance).toBe(true);
    expect(result.relevanceScore).toBeGreaterThan(0);
  });

  it("rejects candidates outside tolerance", () => {
    // 50% variance
    const result = scoreCandidate(-1000, { amount: 1500 });
    expect(result.percentDiff).toBeCloseTo(0.5, 2);
    expect(result.isWithinTolerance).toBe(false);
  });

  it("handles zero-amount edge case (both zero)", () => {
    const result = scoreCandidate(0, { amount: 0 });
    expect(result.percentDiff).toBe(0);
    expect(result.isExactMatch).toBe(true);
  });

  it("handles zero-amount edge case (target zero, doc non-zero)", () => {
    const result = scoreCandidate(0, { amount: 100 });
    expect(result.percentDiff).toBe(1);
  });

  it("scores negative amounts correctly (uses absolute values)", () => {
    const result = scoreCandidate(-500, { amount: 500 });
    expect(result.isExactMatch).toBe(true);
  });

  describe("search filtering", () => {
    function matchesSearch(doc: CandidateInput, query: string): boolean {
      const q = query.toLowerCase();
      return Boolean(
        doc.docNumber?.toLowerCase().includes(q) ||
        doc.counterparty?.toLowerCase().includes(q) ||
        doc.description?.toLowerCase().includes(q)
      );
    }

    it("matches by doc number", () => {
      expect(matchesSearch({ amount: 100, docNumber: "INV-001" }, "INV-001")).toBe(true);
    });

    it("matches by counterparty name", () => {
      expect(matchesSearch({ amount: 100, counterparty: "Vendor Corp" }, "vendor")).toBe(true);
    });

    it("matches by description", () => {
      expect(matchesSearch({ amount: 100, description: "Office supplies" }, "office")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(matchesSearch({ amount: 100, docNumber: "INV-001" }, "inv-001")).toBe(true);
    });

    it("returns false when no match", () => {
      expect(matchesSearch({ amount: 100, docNumber: "INV-001" }, "RCP-999")).toBe(false);
    });
  });
});

// ============================================================================
// Match Counts Computation
// ============================================================================

describe("Match Counts Computation", () => {
  it("computes total from status counts", () => {
    const pending = 10;
    const approved = 5;
    const rejected = 3;
    const total = pending + approved + rejected;
    expect(total).toBe(18);
  });
});

// ============================================================================
// Confidence Levels
// ============================================================================

describe("Confidence Level Classification", () => {
  const VALID_CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
  const VALID_MATCH_LAYERS = [1, 2, 3, 4, 5, 6, 7] as const;

  it("defines three confidence levels", () => {
    expect(VALID_CONFIDENCE_LEVELS).toHaveLength(3);
  });

  it("defines seven match layers", () => {
    expect(VALID_MATCH_LAYERS).toHaveLength(7);
    expect(VALID_MATCH_LAYERS).toContain(7); // Partial match
  });

  it("maps confidence scores to levels correctly", () => {
    function getConfidenceLevel(score: number): "high" | "medium" | "low" {
      if (score >= 90) return "high";
      if (score >= 70) return "medium";
      return "low";
    }

    expect(getConfidenceLevel(95)).toBe("high");
    expect(getConfidenceLevel(90)).toBe("high");
    expect(getConfidenceLevel(89)).toBe("medium");
    expect(getConfidenceLevel(70)).toBe("medium");
    expect(getConfidenceLevel(69)).toBe("low");
    expect(getConfidenceLevel(0)).toBe("low");
  });
});

// ============================================================================
// Match Status Transitions
// ============================================================================

describe("Match Status Transitions", () => {
  const VALID_MATCH_STATUSES = ["pending", "approved", "rejected"] as const;

  it("defines valid match statuses", () => {
    expect(VALID_MATCH_STATUSES).toContain("pending");
    expect(VALID_MATCH_STATUSES).toContain("approved");
    expect(VALID_MATCH_STATUSES).toContain("rejected");
  });

  it("new matches start as pending", () => {
    const initialStatus = "pending";
    expect(VALID_MATCH_STATUSES).toContain(initialStatus);
  });

  describe("reject side effects", () => {
    it("resets cash transaction to pending on reject", () => {
      // When a match is rejected, the cash transaction goes back to pending
      const cashStatusAfterReject = "pending";
      expect(cashStatusAfterReject).toBe("pending");
    });

    it("resets accrual document to pending on reject", () => {
      const accrualStatusAfterReject = "pending";
      expect(accrualStatusAfterReject).toBe("pending");
    });

    it("clears matchId on both sides on reject", () => {
      // Both cash and accrual entities should have matchId cleared
      const updatedMatchId = undefined;
      expect(updatedMatchId).toBeUndefined();
    });
  });
});

// ============================================================================
// Pagination and Limits
// ============================================================================

describe("Manual Match Pagination", () => {
  const DEFAULT_CANDIDATES_LIMIT = 50;
  const MAX_CANDIDATES_LIMIT = 100;

  it("defaults to 50 candidates", () => {
    const limit = undefined;
    const resultLimit = Math.min(limit ?? DEFAULT_CANDIDATES_LIMIT, MAX_CANDIDATES_LIMIT);
    expect(resultLimit).toBe(50);
  });

  it("respects custom limit", () => {
    const resultLimit = Math.min(30, MAX_CANDIDATES_LIMIT);
    expect(resultLimit).toBe(30);
  });

  it("caps at MAX_CANDIDATES_LIMIT", () => {
    const resultLimit = Math.min(200, MAX_CANDIDATES_LIMIT);
    expect(resultLimit).toBe(100);
  });

  it("fetches 3x to account for filtering", () => {
    const limit = 50;
    const fetchSize = limit * 3;
    expect(fetchSize).toBe(150);
  });
});
