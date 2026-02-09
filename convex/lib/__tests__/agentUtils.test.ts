/**
 * Agent Shared Utilities — Unit Tests
 *
 * Tests for the pure helper functions in agentUtils.ts:
 * - normalizeCompanyName
 * - parseDate
 * - daysBetween
 * - charOverlap
 * - formatCurrency
 *
 * These functions are re-exported from agentRules.ts and agentCrossRef.ts.
 * Testing them here against the canonical source avoids duplication.
 *
 * Run with: pnpm test convex/lib/__tests__/agentUtils.test.ts
 *
 * @module convex/lib/__tests__/agentUtils.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  normalizeCompanyName,
  parseDate,
  daysBetween,
  charOverlap,
  formatCurrency,
} from "../agentUtils";

// ============================================================================
// normalizeCompanyName
// ============================================================================

describe("normalizeCompanyName", () => {
  // Malaysian company suffixes
  it("strips 'Sdn Bhd' suffix", () => {
    expect(normalizeCompanyName("ABC Sdn Bhd")).toBe("abc");
  });

  it("strips 'SDN. BHD.' suffix (case insensitive)", () => {
    expect(normalizeCompanyName("ABC SDN. BHD.")).toBe("abc");
  });

  it("strips 'Sendirian Berhad'", () => {
    expect(normalizeCompanyName("ABC Sendirian Berhad")).toBe("abc");
  });

  it("strips 'Plt'", () => {
    expect(normalizeCompanyName("ABC Plt")).toBe("abc");
  });

  it("strips 'Berhad'", () => {
    expect(normalizeCompanyName("ABC Berhad")).toBe("abc");
  });

  // International suffixes
  it("strips 'Inc.'", () => {
    expect(normalizeCompanyName("ABC Inc.")).toBe("abc");
  });

  it("strips 'Ltd.'", () => {
    expect(normalizeCompanyName("ABC Ltd.")).toBe("abc");
  });

  it("strips 'Pte Ltd'", () => {
    expect(normalizeCompanyName("ABC Pte Ltd")).toBe("abc");
  });

  it("strips 'Corporation'", () => {
    expect(normalizeCompanyName("ABC Corporation")).toBe("abc");
  });

  it("strips 'LLC'", () => {
    expect(normalizeCompanyName("ABC LLC")).toBe("abc");
  });

  // Normalization behavior
  it("normalizes whitespace and punctuation", () => {
    expect(normalizeCompanyName("  A.B.C  Company  ")).toBe("a b c company");
  });

  it("strips ampersands and normalizes", () => {
    expect(normalizeCompanyName("  A & B  Co.  ")).toBe("a b");
  });

  it("returns empty for empty input", () => {
    expect(normalizeCompanyName("")).toBe("");
    expect(normalizeCompanyName("  ")).toBe("");
  });

  it("only strips one suffix (greedy, longest first)", () => {
    // "Sdn Bhd" ends with "bhd" but the longer "sdn bhd" should be matched first
    expect(normalizeCompanyName("ABC Sdn Bhd")).toBe("abc");
  });
});

// ============================================================================
// parseDate
// ============================================================================

describe("parseDate", () => {
  it("parses valid ISO dates", () => {
    const d = parseDate("2024-06-15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2024);
    expect(d!.getUTCMonth()).toBe(5); // 0-indexed
    expect(d!.getUTCDate()).toBe(15);
  });

  it("returns null for short strings", () => {
    expect(parseDate("2024")).toBeNull();
    expect(parseDate("")).toBeNull();
  });

  it("returns null for invalid dates", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });
});

// ============================================================================
// daysBetween
// ============================================================================

describe("daysBetween", () => {
  it("returns 0 for same date", () => {
    expect(daysBetween("2024-01-15", "2024-01-15")).toBe(0);
  });

  it("returns 1 for adjacent dates", () => {
    expect(daysBetween("2024-01-15", "2024-01-16")).toBe(1);
  });

  it("returns correct value for dates in different order", () => {
    expect(daysBetween("2024-01-20", "2024-01-15")).toBe(5);
  });

  it("returns Infinity for invalid dates", () => {
    expect(daysBetween("invalid", "2024-01-15")).toBe(Infinity);
    expect(daysBetween("2024-01-15", "bad")).toBe(Infinity);
  });

  it("handles year boundaries", () => {
    expect(daysBetween("2023-12-31", "2024-01-01")).toBe(1);
  });

  it("returns Infinity when both dates invalid", () => {
    expect(daysBetween("abc", "xyz")).toBe(Infinity);
  });
});

// ============================================================================
// charOverlap
// ============================================================================

describe("charOverlap", () => {
  it("returns 1.0 for identical strings", () => {
    expect(charOverlap("hello", "hello")).toBe(1.0);
  });

  it("handles empty strings", () => {
    expect(charOverlap("", "")).toBe(1.0);
    expect(charOverlap("abc", "")).toBe(0.0);
    expect(charOverlap("", "abc")).toBe(0.0);
  });

  it("is case-insensitive", () => {
    expect(charOverlap("Hello", "HELLO")).toBe(1.0);
  });

  it("returns proportional overlap for partial matches", () => {
    const score = charOverlap("abcd", "abef");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("returns high score for very similar descriptions", () => {
    expect(charOverlap(
      "PAYMENT TO SUPPLIER ABC TRADING",
      "PAYMENT TO SUPPLIER ABC TRADING",
    )).toBe(1.0);
  });

  it("returns low score for completely different descriptions", () => {
    expect(charOverlap("SALARY PAYMENT", "UTILITY BILL")).toBeLessThan(0.5);
  });

  it("handles single-character strings", () => {
    expect(charOverlap("a", "a")).toBe(1.0);
    expect(charOverlap("a", "b")).toBe(0.0);
  });
});

// ============================================================================
// formatCurrency
// ============================================================================

describe("formatCurrency", () => {
  it("formats positive numbers with 2 decimal places", () => {
    expect(formatCurrency(1234.56)).toBe("1,234.56");
  });

  it("formats negative numbers as absolute value", () => {
    expect(formatCurrency(-500)).toBe("500.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0.00");
  });

  it("formats very large numbers", () => {
    expect(formatCurrency(1234567.89)).toBe("1,234,567.89");
  });

  it("rounds fractional amounts correctly", () => {
    expect(formatCurrency(0.1)).toBe("0.10");
    expect(formatCurrency(0.005)).toBe("0.01");
  });
});
