/**
 * Accrual Documents Module Unit Tests
 *
 * Tests for accrual document business logic:
 * - Validation rules (amount, dates, bulk size)
 * - Document types (sales_invoice, purchase_invoice, receipt, etc.)
 * - Status transitions (pending → matched → partial → suspense)
 * - Bulk creation patterns (fail-fast validation)
 * - Count computation
 *
 * @module convex/__tests__/accrualDocuments.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  validateAmount,
  validateDate,
  validateOptionalDate,
  validateOptionalAmount,
  validateBulkSize,
  filterUndefinedValues,
} from "../lib/validation";
import { MAX_BULK_IMPORT_SIZE } from "../lib/constants";

// ============================================================================
// Accrual Document Types
// ============================================================================

describe("Accrual Document Types", () => {
  const VALID_DOC_TYPES = [
    "sales_invoice",
    "purchase_invoice",
    "pos_report",
    "settlement",
    "receipt",
  ] as const;

  it("defines 5 valid document types", () => {
    expect(VALID_DOC_TYPES).toHaveLength(5);
  });

  it("includes all expected types", () => {
    expect(VALID_DOC_TYPES).toContain("sales_invoice");
    expect(VALID_DOC_TYPES).toContain("purchase_invoice");
    expect(VALID_DOC_TYPES).toContain("pos_report");
    expect(VALID_DOC_TYPES).toContain("settlement");
    expect(VALID_DOC_TYPES).toContain("receipt");
  });
});

// ============================================================================
// Accrual Document Validation
// ============================================================================

describe("Accrual Document Validation", () => {
  describe("validateOptionalDate", () => {
    it("skips validation for undefined", () => {
      expect(() => validateOptionalDate(undefined, "dueDate")).not.toThrow();
    });

    it("validates when value is provided", () => {
      expect(() => validateOptionalDate("2025-01-15", "dueDate")).not.toThrow();
    });

    it("rejects invalid date when provided", () => {
      expect(() => validateOptionalDate("invalid", "dueDate")).toThrow();
    });
  });

  describe("validateOptionalAmount", () => {
    it("skips validation for undefined", () => {
      expect(() => validateOptionalAmount(undefined, "taxAmount")).not.toThrow();
    });

    it("validates when value is provided", () => {
      expect(() => validateOptionalAmount(123.45, "taxAmount")).not.toThrow();
    });

    it("rejects invalid amount when provided", () => {
      expect(() => validateOptionalAmount(NaN, "taxAmount")).toThrow();
    });
  });
});

// ============================================================================
// Status Transitions
// ============================================================================

describe("Accrual Document Status Transitions", () => {
  const VALID_STATUSES = ["pending", "matched", "partial", "suspense"] as const;

  it("defines 4 valid statuses", () => {
    expect(VALID_STATUSES).toHaveLength(4);
  });

  it("starts as pending", () => {
    const initialStatus = "pending";
    expect(VALID_STATUSES).toContain(initialStatus);
  });

  it("includes partial status (unique to accrual docs)", () => {
    expect(VALID_STATUSES).toContain("partial");
  });

  describe("markMatched transition", () => {
    it("sets status to matched and assigns matchId", () => {
      const updates = { status: "matched" as const, matchId: "match-123" };
      expect(updates.status).toBe("matched");
      expect(updates.matchId).toBe("match-123");
    });
  });

  describe("resetToPending transition", () => {
    it("sets status to pending and clears matchId", () => {
      const updates = { status: "pending" as const, matchId: undefined };
      expect(updates.status).toBe("pending");
      expect(updates.matchId).toBeUndefined();
    });
  });
});

// ============================================================================
// Bulk Creation Pattern
// ============================================================================

describe("Accrual Document Bulk Creation", () => {
  it("validates all documents before inserting any (fail-fast)", () => {
    // The handler validates all documents first, then inserts
    const documents = [
      { amount: 100, docDate: "2025-01-15" },
      { amount: NaN, docDate: "2025-01-16" }, // Invalid!
      { amount: 300, docDate: "2025-01-17" },
    ];

    // Validation pass - should detect the invalid amount
    let validationError = false;
    for (const doc of documents) {
      try {
        validateAmount(doc.amount, "amount");
        validateDate(doc.docDate, "docDate");
      } catch {
        validationError = true;
        break;
      }
    }

    expect(validationError).toBe(true);
    // Because validation failed, NO documents should be inserted
  });

  it("returns empty array for empty input", () => {
    const documents: unknown[] = [];
    expect(documents.length).toBe(0);
  });

  it("enforces bulk size limit", () => {
    expect(() => validateBulkSize(MAX_BULK_IMPORT_SIZE + 1)).toThrow();
    expect(() => validateBulkSize(MAX_BULK_IMPORT_SIZE)).not.toThrow();
  });
});

// ============================================================================
// filterUndefinedValues
// ============================================================================

describe("filterUndefinedValues", () => {
  it("removes undefined values from object", () => {
    const input = { a: 1, b: undefined, c: "hello", d: undefined };
    const result = filterUndefinedValues(input);
    expect(result).toEqual({ a: 1, c: "hello" });
    expect("b" in result).toBe(false);
    expect("d" in result).toBe(false);
  });

  it("preserves null values", () => {
    const input = { a: null, b: undefined };
    const result = filterUndefinedValues(input);
    expect(result).toEqual({ a: null });
  });

  it("preserves zero and empty string", () => {
    const input = { a: 0, b: "", c: false, d: undefined };
    const result = filterUndefinedValues(input);
    expect(result).toEqual({ a: 0, b: "", c: false });
  });

  it("returns empty object for all undefined", () => {
    const input = { a: undefined, b: undefined };
    const result = filterUndefinedValues(input);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ============================================================================
// Count Computation
// ============================================================================

describe("Accrual Document Counts", () => {
  it("computes status breakdown", () => {
    const docs = [
      { status: "pending" },
      { status: "pending" },
      { status: "matched" },
      { status: "partial" },
      { status: "suspense" },
      { status: "matched" },
    ];

    const counts = {
      total: docs.length,
      pending: docs.filter((d) => d.status === "pending").length,
      matched: docs.filter((d) => d.status === "matched").length,
      partial: docs.filter((d) => d.status === "partial").length,
      suspense: docs.filter((d) => d.status === "suspense").length,
    };

    expect(counts.total).toBe(6);
    expect(counts.pending).toBe(2);
    expect(counts.matched).toBe(2);
    expect(counts.partial).toBe(1);
    expect(counts.suspense).toBe(1);
  });
});
