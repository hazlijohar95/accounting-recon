/**
 * Tests for Matching Utility Functions
 * Run with: npx vitest run convex/utils/__tests__/matchingUtils.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  stringSimilarity,
  normalizeString,
  dateDiffDays,
  amountsMatch,
  amountsWithinVariance,
  extractReferences,
  normalizeDocNumber,
} from "../matchingUtils";

// ============ LEVENSHTEIN DISTANCE TESTS ============

describe("levenshteinDistance", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  it("should return string length for empty vs non-empty", () => {
    expect(levenshteinDistance("", "hello")).toBe(5);
    expect(levenshteinDistance("hello", "")).toBe(5);
  });

  it("should calculate correct distance for single char changes", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1); // substitution
    expect(levenshteinDistance("cat", "cats")).toBe(1); // insertion
    expect(levenshteinDistance("cats", "cat")).toBe(1); // deletion
  });

  it("should handle completely different strings", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
  });
});

// ============ STRING SIMILARITY TESTS ============

describe("stringSimilarity", () => {
  it("should return 100 for identical strings", () => {
    expect(stringSimilarity("hello", "hello")).toBe(100);
  });

  it("should return 100 for both empty strings", () => {
    expect(stringSimilarity("", "")).toBe(100);
  });

  it("should return 0 if one string is empty", () => {
    expect(stringSimilarity("hello", "")).toBe(0);
    expect(stringSimilarity("", "hello")).toBe(0);
  });

  it("should be case insensitive", () => {
    expect(stringSimilarity("Hello", "hello")).toBe(100);
    expect(stringSimilarity("ACME", "acme")).toBe(100);
  });

  it("should calculate partial similarity", () => {
    const similarity = stringSimilarity("hello", "hallo");
    expect(similarity).toBeGreaterThan(50);
    expect(similarity).toBeLessThan(100);
  });
});

// ============ NORMALIZE STRING TESTS ============

describe("normalizeString", () => {
  it("should convert to lowercase", () => {
    expect(normalizeString("HELLO")).toBe("hello");
  });

  it("should trim whitespace", () => {
    expect(normalizeString("  hello  ")).toBe("hello");
  });

  it("should remove payment prefixes", () => {
    expect(normalizeString("PAYMENT ACME Corp")).toBe("acme corp");
    expect(normalizeString("Transfer to vendor")).toBe("to vendor");
    expect(normalizeString("DEBIT Card Purchase")).toBe("card purchase");
  });

  it("should normalize whitespace", () => {
    expect(normalizeString("hello   world")).toBe("hello world");
  });

  it("should remove special characters", () => {
    expect(normalizeString("ACME™ Corp®")).toBe("acme corp");
  });

  it("should handle empty string", () => {
    expect(normalizeString("")).toBe("");
  });
});

// ============ DATE DIFF TESTS ============

describe("dateDiffDays", () => {
  it("should return 0 for same date", () => {
    expect(dateDiffDays("2025-01-15", "2025-01-15")).toBe(0);
  });

  it("should return positive difference for dates apart", () => {
    expect(dateDiffDays("2025-01-15", "2025-01-20")).toBe(5);
    expect(dateDiffDays("2025-01-20", "2025-01-15")).toBe(5);
  });

  it("should return null for invalid dates", () => {
    expect(dateDiffDays("invalid", "2025-01-15")).toBeNull();
    expect(dateDiffDays("2025-01-15", "invalid")).toBeNull();
  });

  it("should handle different months", () => {
    expect(dateDiffDays("2025-01-31", "2025-02-01")).toBe(1);
  });

  it("should handle different years", () => {
    expect(dateDiffDays("2024-12-31", "2025-01-01")).toBe(1);
  });
});

// ============ AMOUNT MATCHING TESTS ============

describe("amountsMatch", () => {
  it("should match exact amounts", () => {
    expect(amountsMatch(100, 100)).toBe(true);
  });

  it("should match within default tolerance ($0.01)", () => {
    expect(amountsMatch(100.0, 100.01)).toBe(true);
    expect(amountsMatch(100.0, 99.99)).toBe(true);
  });

  it("should NOT match outside tolerance", () => {
    expect(amountsMatch(100.0, 100.02)).toBe(false);
    expect(amountsMatch(100.0, 99.98)).toBe(false);
  });

  it("should compare absolute values (ignore sign)", () => {
    expect(amountsMatch(-100, 100)).toBe(true);
    expect(amountsMatch(100, -100)).toBe(true);
  });

  it("should respect custom tolerance", () => {
    expect(amountsMatch(100.0, 100.5, 1.0)).toBe(true);
    expect(amountsMatch(100.0, 101.5, 1.0)).toBe(false);
  });
});

describe("amountsWithinVariance", () => {
  it("should return true for amounts within variance", () => {
    expect(amountsWithinVariance(100, 95, 10)).toBe(true); // 5% diff
    expect(amountsWithinVariance(100, 90, 10)).toBe(true); // 10% diff exactly
  });

  it("should return false for amounts outside variance", () => {
    expect(amountsWithinVariance(100, 89, 10)).toBe(false); // 11% diff
  });

  it("should handle zero amounts", () => {
    expect(amountsWithinVariance(0, 0, 10)).toBe(true);
    expect(amountsWithinVariance(0, 100, 10)).toBe(false);
    expect(amountsWithinVariance(100, 0, 10)).toBe(false);
  });

  it("should compare absolute values", () => {
    expect(amountsWithinVariance(-100, 95, 10)).toBe(true);
  });
});

// ============ REFERENCE EXTRACTION TESTS ============

describe("extractReferences", () => {
  it("should extract invoice numbers with INV prefix", () => {
    expect(extractReferences("Payment INV-12345")).toContain("12345");
    expect(extractReferences("Payment INV#12345")).toContain("12345");
    expect(extractReferences("INVOICE 12345")).toContain("12345");
  });

  it("should extract reference numbers", () => {
    expect(extractReferences("Payment REF-98765")).toContain("98765");
    expect(extractReferences("REFERENCE 98765")).toContain("98765");
  });

  it("should extract PO numbers", () => {
    expect(extractReferences("Payment PO-11111")).toContain("11111");
  });

  it("should extract check numbers", () => {
    expect(extractReferences("CHK#99999 deposit")).toContain("99999");
  });

  it("should extract standalone 8+ digit numbers (reduced from 6 to avoid false positives)", () => {
    expect(extractReferences("Payment 12345678")).toContain("12345678");
    expect(extractReferences("Payment 1234567")).not.toContain("1234567"); // Only 7 digits
    expect(extractReferences("Payment 123456")).not.toContain("123456"); // Only 6 digits - too short, reduces false positives
  });

  it("should return unique references", () => {
    const refs = extractReferences("INV-12345 REF-12345");
    const count = refs.filter((r) => r === "12345").length;
    expect(count).toBe(1);
  });

  it("should return empty array for no matches", () => {
    expect(extractReferences("Regular payment")).toEqual([]);
  });

  it("should handle empty input", () => {
    expect(extractReferences("")).toEqual([]);
  });
});

// ============ DOCUMENT NUMBER NORMALIZATION TESTS ============

describe("normalizeDocNumber", () => {
  it("should preserve prefix + number for typed documents", () => {
    expect(normalizeDocNumber("INV-12345")).toBe("INV12345");
    expect(normalizeDocNumber("PO#99999")).toBe("PO99999");
  });

  it("should extract trailing numeric portion for non-prefixed input", () => {
    // Non-prefix format falls back to numeric extraction
    expect(normalizeDocNumber("ABC-123-DEF")).toBe("123");
  });

  it("should prevent false matches between different document types", () => {
    // INV-001 and PO-001 should NOT normalize to the same value
    expect(normalizeDocNumber("INV-001")).not.toBe(normalizeDocNumber("PO-001"));
  });

  it("should handle purely numeric input", () => {
    expect(normalizeDocNumber("12345")).toBe("12345");
  });

  it("should return empty string for undefined", () => {
    expect(normalizeDocNumber(undefined)).toBe("");
  });

  it("should return empty string for empty input", () => {
    expect(normalizeDocNumber("")).toBe("");
  });
});
