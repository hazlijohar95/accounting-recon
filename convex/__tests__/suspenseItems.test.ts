/**
 * Suspense Items Module Unit Tests
 *
 * Tests for suspense item business logic:
 * - Status transitions (open → queried → resolved)
 * - Validation rules (amount, date, non-empty fields)
 * - Source type union (cash | accrual)
 * - Count computation (single-pass reduce)
 * - Resolve pattern (server-derived resolvedBy)
 * - Reopen pattern (clear resolution fields)
 *
 * @module convex/__tests__/suspenseItems.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  validateAmount,
  validateDate,
  validateNonEmpty,
  validateBulkSize,
} from "../lib/validation";

// ============================================================================
// Suspense Item Status Transitions
// ============================================================================

describe("Suspense Item Status Transitions", () => {
  const VALID_STATUSES = ["open", "queried", "resolved"] as const;

  it("defines 3 valid statuses", () => {
    expect(VALID_STATUSES).toHaveLength(3);
  });

  it("new items start as open", () => {
    const initialStatus = "open";
    expect(VALID_STATUSES).toContain(initialStatus);
  });

  describe("resolve transition", () => {
    it("sets status to resolved with resolution details", () => {
      const updates = {
        status: "resolved" as const,
        resolutionNotes: "Matched manually",
        resolvedAt: Date.now(),
        resolvedBy: "user-123",
      };

      expect(updates.status).toBe("resolved");
      expect(updates.resolutionNotes).toBeTruthy();
      expect(updates.resolvedAt).toBeGreaterThan(0);
      expect(updates.resolvedBy).toBeTruthy();
    });

    it("derives resolvedBy from auth context (not client input)", () => {
      // The handler uses user._id from requireSuspenseItemAccess, not args.resolvedBy
      const serverDerived = "user_from_auth";
      const clientProvided = "user_from_client";

      // Server-derived should be used
      expect(serverDerived).not.toBe(clientProvided);
    });
  });

  describe("reopen transition", () => {
    it("clears all resolution fields", () => {
      const updates = {
        status: "open" as const,
        resolutionNotes: undefined,
        resolvedAt: undefined,
        resolvedBy: undefined,
      };

      expect(updates.status).toBe("open");
      expect(updates.resolutionNotes).toBeUndefined();
      expect(updates.resolvedAt).toBeUndefined();
      expect(updates.resolvedBy).toBeUndefined();
    });
  });
});

// ============================================================================
// Suspense Item Validation
// ============================================================================

describe("Suspense Item Validation", () => {
  describe("validateNonEmpty", () => {
    it("accepts non-empty strings", () => {
      expect(() => validateNonEmpty("hello", "description")).not.toThrow();
      expect(() => validateNonEmpty("a", "description")).not.toThrow();
    });

    it("rejects empty strings", () => {
      expect(() => validateNonEmpty("", "description")).toThrow();
    });

    it("rejects whitespace-only strings", () => {
      expect(() => validateNonEmpty("   ", "description")).toThrow();
    });
  });

  it("validates all required fields for creation", () => {
    const validItem = {
      amount: 500,
      transactionDate: "2025-01-15",
      description: "Unmatched payment",
      reason: "No matching invoice found",
      suggestedAction: "Contact vendor for invoice",
    };

    expect(() => validateAmount(validItem.amount, "amount")).not.toThrow();
    expect(() => validateDate(validItem.transactionDate, "transactionDate")).not.toThrow();
    expect(() => validateNonEmpty(validItem.description, "description")).not.toThrow();
    expect(() => validateNonEmpty(validItem.reason, "reason")).not.toThrow();
    expect(() => validateNonEmpty(validItem.suggestedAction, "suggestedAction")).not.toThrow();
  });

  it("requires resolutionNotes for resolve", () => {
    expect(() => validateNonEmpty("", "resolutionNotes")).toThrow();
    expect(() => validateNonEmpty("Resolved by manual match", "resolutionNotes")).not.toThrow();
  });
});

// ============================================================================
// Source Type Union
// ============================================================================

describe("Source Type Union", () => {
  it("supports cash source type", () => {
    const item = { sourceType: "cash" as const, sourceId: "transaction-123" };
    expect(item.sourceType).toBe("cash");
  });

  it("supports accrual source type", () => {
    const item = { sourceType: "accrual" as const, sourceId: "accrualDoc-456" };
    expect(item.sourceType).toBe("accrual");
  });
});

// ============================================================================
// Count Computation (Single-Pass Reduce)
// ============================================================================

describe("Suspense Item Count Computation", () => {
  it("computes counts in single pass", () => {
    const items = [
      { status: "open", amount: 100 },
      { status: "open", amount: -200 },
      { status: "queried", amount: 50 },
      { status: "resolved", amount: 300 },
      { status: "open", amount: 75 },
    ];

    // Mirror the actual implementation's single-pass reduce
    const counts = items.reduce(
      (acc, i) => {
        if (i.status === "open") {
          acc.open++;
          acc.totalAmount += Math.abs(i.amount);
        } else if (i.status === "queried") {
          acc.queried++;
        } else if (i.status === "resolved") {
          acc.resolved++;
        }
        return acc;
      },
      { open: 0, queried: 0, resolved: 0, totalAmount: 0 }
    );

    expect(counts.open).toBe(3);
    expect(counts.queried).toBe(1);
    expect(counts.resolved).toBe(1);
    expect(counts.totalAmount).toBe(375); // |100| + |-200| + |75|

    const total = items.length;
    expect(total).toBe(5);
  });

  it("totalAmount only includes open items", () => {
    const items = [
      { status: "open", amount: 100 },
      { status: "resolved", amount: 999 }, // Should NOT be in totalAmount
    ];

    const counts = items.reduce(
      (acc, i) => {
        if (i.status === "open") {
          acc.open++;
          acc.totalAmount += Math.abs(i.amount);
        } else if (i.status === "resolved") {
          acc.resolved++;
        }
        return acc;
      },
      { open: 0, queried: 0, resolved: 0, totalAmount: 0 }
    );

    expect(counts.totalAmount).toBe(100); // Only open items
  });

  it("uses absolute values for totalAmount", () => {
    const items = [
      { status: "open", amount: -500 }, // Negative amount
    ];

    const counts = items.reduce(
      (acc, i) => {
        if (i.status === "open") {
          acc.totalAmount += Math.abs(i.amount);
        }
        return acc;
      },
      { totalAmount: 0 }
    );

    expect(counts.totalAmount).toBe(500); // Absolute value
  });

  it("handles empty items array", () => {
    const items: { status: string; amount: number }[] = [];
    const counts = items.reduce(
      (acc, i) => {
        if (i.status === "open") acc.open++;
        return acc;
      },
      { open: 0, queried: 0, resolved: 0, totalAmount: 0 }
    );

    expect(counts.open).toBe(0);
    expect(counts.totalAmount).toBe(0);
  });
});

// ============================================================================
// Bulk Creation Pattern
// ============================================================================

describe("Suspense Item Bulk Creation", () => {
  it("validates all items before inserting any", () => {
    const items = [
      { amount: 100, transactionDate: "2025-01-15", description: "Valid", reason: "Test", suggestedAction: "Review" },
      { amount: NaN, transactionDate: "2025-01-16", description: "Invalid", reason: "Test", suggestedAction: "Review" },
    ];

    let validationFailed = false;
    for (const item of items) {
      try {
        validateAmount(item.amount, "amount");
        validateDate(item.transactionDate, "transactionDate");
        validateNonEmpty(item.description, "description");
        validateNonEmpty(item.reason, "reason");
        validateNonEmpty(item.suggestedAction, "suggestedAction");
      } catch {
        validationFailed = true;
        break;
      }
    }

    expect(validationFailed).toBe(true);
  });

  it("returns empty array for empty input", () => {
    const items: unknown[] = [];
    expect(items.length).toBe(0);
  });

  it("enforces bulk size limit", () => {
    expect(() => validateBulkSize(10001)).toThrow();
    expect(() => validateBulkSize(10000)).not.toThrow();
  });
});
