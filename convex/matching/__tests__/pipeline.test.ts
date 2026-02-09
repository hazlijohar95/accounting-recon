/**
 * Matching Pipeline Unit Tests
 *
 * Tests for the matching pipeline orchestrator:
 * - runMatchingPipeline (layer execution, early exit, item removal)
 * - getPipelineStats (aggregate statistics)
 *
 * @module convex/matching/__tests__/pipeline.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import { runMatchingPipeline, getPipelineStats } from "../pipeline";
import type {
  CashTransaction,
  AccrualDocument,
  MatchCandidate,
  MatchingConfig,
  PipelineResult,
} from "../layers/types";
import { DEFAULT_CONFIG } from "../layers/types";

// ============================================================================
// Test Helpers
// ============================================================================

function makeCashTxn(id: string, amount: number, date: string, description: string = "Test"): CashTransaction {
  return {
    _id: id as any,
    _creationTime: Date.now(),
    companyId: "company-1" as any,
    date,
    description,
    amount,
    type: "cash",
    status: "pending",
    createdAt: Date.now(),
  } as CashTransaction;
}

function makeAccrualDoc(id: string, amount: number, date: string, docNumber?: string): AccrualDocument {
  return {
    _id: id as any,
    _creationTime: Date.now(),
    companyId: "company-1" as any,
    docType: "purchase_invoice",
    docDate: date,
    amount,
    status: "pending",
    createdAt: Date.now(),
    docNumber,
  } as AccrualDocument;
}

// ============================================================================
// runMatchingPipeline
// ============================================================================

describe("runMatchingPipeline", () => {
  it("returns empty results for empty inputs", () => {
    const result = runMatchingPipeline([], []);
    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedCash).toHaveLength(0);
    expect(result.unmatchedAccrual).toHaveLength(0);
    expect(result.earlyExit).toBe(true);
    expect(result.earlyExitReason).toContain("All cash transactions matched");
  });

  it("returns early when cash is empty", () => {
    const accrual = [makeAccrualDoc("ad-1", 100, "2025-01-15")];
    const result = runMatchingPipeline([], accrual);
    expect(result.earlyExit).toBe(true);
    expect(result.earlyExitReason).toContain("All cash transactions matched");
    expect(result.unmatchedAccrual).toHaveLength(1);
  });

  it("returns early when accrual is empty", () => {
    const cash = [makeCashTxn("t-1", -100, "2025-01-15")];
    const result = runMatchingPipeline(cash, []);
    expect(result.earlyExit).toBe(true);
    expect(result.earlyExitReason).toContain("All accrual documents matched");
    expect(result.unmatchedCash).toHaveLength(1);
  });

  it("matches exact amount and close date pairs", () => {
    const cash = [makeCashTxn("t-1", -500, "2025-01-15", "PAYMENT TO VENDOR")];
    const accrual = [makeAccrualDoc("ad-1", 500, "2025-01-15", "INV-001")];

    const result = runMatchingPipeline(cash, accrual);

    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.matches[0].cashTransactionId).toBe("t-1");
    expect(result.matches[0].accrualDocumentId).toBe("ad-1");
  });

  it("removes matched items from subsequent layers", () => {
    // Create items that will match in Layer 1 (exact)
    const cash = [
      makeCashTxn("t-1", -100, "2025-01-15"),
      makeCashTxn("t-2", -200, "2025-01-20"),
    ];
    const accrual = [
      makeAccrualDoc("ad-1", 100, "2025-01-15"),
      makeAccrualDoc("ad-2", 200, "2025-01-20"),
    ];

    const result = runMatchingPipeline(cash, accrual);

    // Should match both - and each match should appear only once
    const cashIds = result.matches.map(m => m.cashTransactionId);
    const uniqueCashIds = new Set(cashIds);
    expect(uniqueCashIds.size).toBe(cashIds.length);
  });

  it("does not shallow-mutate the input arrays", () => {
    const cash = [makeCashTxn("t-1", -100, "2025-01-15")];
    const accrual = [makeAccrualDoc("ad-1", 100, "2025-01-15")];

    const cashLenBefore = cash.length;
    const accrualLenBefore = accrual.length;

    runMatchingPipeline(cash, accrual);

    expect(cash.length).toBe(cashLenBefore);
    expect(accrual.length).toBe(accrualLenBefore);
  });

  it("tracks per-layer results", () => {
    const cash = [makeCashTxn("t-1", -100, "2025-01-15")];
    const accrual = [makeAccrualDoc("ad-1", 100, "2025-01-15")];

    const result = runMatchingPipeline(cash, accrual);

    // Should have results from at least 1 layer
    expect(result.layerResults.length).toBeGreaterThan(0);
    for (const lr of result.layerResults) {
      expect(lr).toHaveProperty("layer");
      expect(lr).toHaveProperty("matches");
      expect(lr).toHaveProperty("duration");
      expect(lr.duration).toBeGreaterThanOrEqual(0);
    }
  });

  it("reports totalDuration", () => {
    const cash = [makeCashTxn("t-1", -100, "2025-01-15")];
    const accrual = [makeAccrualDoc("ad-1", 100, "2025-01-15")];

    const result = runMatchingPipeline(cash, accrual);
    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
  });

  it("uses default config when none provided", () => {
    const cash = [makeCashTxn("t-1", -100, "2025-01-15")];
    const accrual = [makeAccrualDoc("ad-1", 100, "2025-01-15")];

    // Should not throw when no config is passed
    expect(() => runMatchingPipeline(cash, accrual)).not.toThrow();
  });

  it("handles unmatched items correctly", () => {
    // Amounts that won't match
    const cash = [
      makeCashTxn("t-1", -100, "2025-01-15"),
      makeCashTxn("t-2", -999, "2025-06-01"),
    ];
    const accrual = [
      makeAccrualDoc("ad-1", 100, "2025-01-15"),
      makeAccrualDoc("ad-2", 777, "2025-09-01"),
    ];

    const result = runMatchingPipeline(cash, accrual);

    // At least one should match (t-1 ↔ ad-1), the others won't
    const allAccountedFor =
      result.matches.length + result.unmatchedCash.length + result.unmatchedAccrual.length;
    // Total items should be >= original count minus matched
    expect(result.matches.length + result.unmatchedCash.length).toBeLessThanOrEqual(2);
    expect(result.matches.length + result.unmatchedAccrual.length).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// getPipelineStats
// ============================================================================

describe("getPipelineStats", () => {
  it("aggregates by layer", () => {
    const result: PipelineResult = {
      matches: [
        { cashTransactionId: "t-1" as any, accrualDocumentId: "ad-1" as any, confidenceScore: 95, matchLayer: 1, matchReason: "" },
        { cashTransactionId: "t-2" as any, accrualDocumentId: "ad-2" as any, confidenceScore: 92, matchLayer: 1, matchReason: "" },
        { cashTransactionId: "t-3" as any, accrualDocumentId: "ad-3" as any, confidenceScore: 80, matchLayer: 2, matchReason: "" },
      ],
      unmatchedCash: [],
      unmatchedAccrual: [],
      layerResults: [],
      totalDuration: 100,
      earlyExit: false,
    };

    const stats = getPipelineStats(result);
    expect(stats.totalMatches).toBe(3);
    expect(stats.byLayer[1]).toBe(2);
    expect(stats.byLayer[2]).toBe(1);
  });

  it("aggregates by confidence band", () => {
    const result: PipelineResult = {
      matches: [
        { cashTransactionId: "t-1" as any, accrualDocumentId: "ad-1" as any, confidenceScore: 95, matchLayer: 1, matchReason: "" },
        { cashTransactionId: "t-2" as any, accrualDocumentId: "ad-2" as any, confidenceScore: 75, matchLayer: 2, matchReason: "" },
        { cashTransactionId: "t-3" as any, accrualDocumentId: "ad-3" as any, confidenceScore: 50, matchLayer: 4, matchReason: "" },
        { cashTransactionId: "t-4" as any, accrualDocumentId: "ad-4" as any, confidenceScore: 90, matchLayer: 1, matchReason: "" },
      ],
      unmatchedCash: [makeCashTxn("t-5", -100, "2025-01-15")],
      unmatchedAccrual: [makeAccrualDoc("ad-5", 200, "2025-01-15"), makeAccrualDoc("ad-6", 300, "2025-01-15")],
      layerResults: [],
      totalDuration: 200,
      earlyExit: false,
    };

    const stats = getPipelineStats(result);
    expect(stats.byConfidence.high).toBe(2);   // 95, 90
    expect(stats.byConfidence.medium).toBe(1);  // 75
    expect(stats.byConfidence.low).toBe(1);     // 50
    expect(stats.unmatchedCash).toBe(1);
    expect(stats.unmatchedAccrual).toBe(2);
    expect(stats.totalDuration).toBe(200);
  });

  it("handles empty results", () => {
    const result: PipelineResult = {
      matches: [],
      unmatchedCash: [],
      unmatchedAccrual: [],
      layerResults: [],
      totalDuration: 0,
      earlyExit: false,
    };

    const stats = getPipelineStats(result);
    expect(stats.totalMatches).toBe(0);
    expect(stats.byConfidence.high).toBe(0);
    expect(stats.byConfidence.medium).toBe(0);
    expect(stats.byConfidence.low).toBe(0);
  });

  it("reports earlyExit status", () => {
    const result: PipelineResult = {
      matches: [],
      unmatchedCash: [],
      unmatchedAccrual: [],
      layerResults: [],
      totalDuration: 0,
      earlyExit: true,
      earlyExitReason: "Test",
    };

    const stats = getPipelineStats(result);
    expect(stats.earlyExit).toBe(true);
  });

  it("correctly classifies boundary confidence scores", () => {
    const result: PipelineResult = {
      matches: [
        { cashTransactionId: "t-1" as any, accrualDocumentId: "ad-1" as any, confidenceScore: 90, matchLayer: 1, matchReason: "" },  // exactly 90 = high
        { cashTransactionId: "t-2" as any, accrualDocumentId: "ad-2" as any, confidenceScore: 89, matchLayer: 2, matchReason: "" },  // just below = medium
        { cashTransactionId: "t-3" as any, accrualDocumentId: "ad-3" as any, confidenceScore: 70, matchLayer: 3, matchReason: "" },  // exactly 70 = medium
        { cashTransactionId: "t-4" as any, accrualDocumentId: "ad-4" as any, confidenceScore: 69, matchLayer: 4, matchReason: "" },  // just below = low
      ],
      unmatchedCash: [],
      unmatchedAccrual: [],
      layerResults: [],
      totalDuration: 0,
      earlyExit: false,
    };

    const stats = getPipelineStats(result);
    expect(stats.byConfidence.high).toBe(1);    // 90
    expect(stats.byConfidence.medium).toBe(2);   // 89, 70
    expect(stats.byConfidence.low).toBe(1);      // 69
  });
});
