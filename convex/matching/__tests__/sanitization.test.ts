/**
 * Tests for sanitization functions in llm.ts
 * Covers basic functionality, edge cases, and security tests
 * Run with: pnpm test convex/matching/__tests__/sanitization.test.ts
 */

import { describe, it, expect } from "vitest";
import { sanitizeForPrompt, sanitizeAmount, SANITIZE_LIMITS } from "../llm";

// ============ SANITIZE_LIMITS CONSTANT TESTS ============

describe("SANITIZE_LIMITS", () => {
  it("has expected limit values", () => {
    expect(SANITIZE_LIMITS.ID).toBe(50);
    expect(SANITIZE_LIMITS.DATE).toBe(20);
    expect(SANITIZE_LIMITS.DOC_NUMBER).toBe(50);
    expect(SANITIZE_LIMITS.COUNTERPARTY).toBe(100);
    expect(SANITIZE_LIMITS.DESCRIPTION).toBe(200);
    expect(SANITIZE_LIMITS.REFERENCE).toBe(100);
    expect(SANITIZE_LIMITS.DEFAULT).toBe(500);
  });

  it("is readonly (const assertion)", () => {
    // TypeScript prevents this at compile time, but we can verify the values are as expected
    const limits = { ...SANITIZE_LIMITS };
    expect(Object.keys(limits)).toHaveLength(7);
  });
});

// ============ SANITIZE FOR PROMPT TESTS ============

describe("sanitizeForPrompt", () => {
  describe("basic functionality", () => {
    it("returns empty string for null", () => {
      expect(sanitizeForPrompt(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(sanitizeForPrompt(undefined)).toBe("");
    });

    it("removes control characters", () => {
      // ASCII control characters 0x00-0x1F
      expect(sanitizeForPrompt("hello\x00world")).toBe("helloworld");
      expect(sanitizeForPrompt("test\x1Fvalue")).toBe("testvalue");
      expect(sanitizeForPrompt("tab\there")).toBe("tabhere"); // \t is 0x09
      expect(sanitizeForPrompt("new\nline")).toBe("newline"); // \n is 0x0A
      expect(sanitizeForPrompt("carriage\rreturn")).toBe("carriagereturn"); // \r is 0x0D
      // DEL character 0x7F
      expect(sanitizeForPrompt("delete\x7Fchar")).toBe("deletechar");
    });

    it("replaces JSON-breaking characters with spaces", () => {
      expect(sanitizeForPrompt("{test}")).toBe("test");
      expect(sanitizeForPrompt("[array]")).toBe("array");
      expect(sanitizeForPrompt('"quoted"')).toBe("quoted");
      expect(sanitizeForPrompt("`backtick`")).toBe("backtick");
      expect(sanitizeForPrompt("back\\slash")).toBe("back slash");
    });

    it("normalizes multiple whitespace to single space", () => {
      expect(sanitizeForPrompt("hello    world")).toBe("hello world");
      expect(sanitizeForPrompt("multiple   spaces   here")).toBe("multiple spaces here");
      // Tabs are control characters and get removed, then whitespace normalized
      expect(sanitizeForPrompt("tab\t\tspaces")).toBe("tabspaces");
    });

    it("trims leading and trailing whitespace", () => {
      expect(sanitizeForPrompt("  leading")).toBe("leading");
      expect(sanitizeForPrompt("trailing  ")).toBe("trailing");
      expect(sanitizeForPrompt("  both  ")).toBe("both");
    });

    it("limits output to maxLength", () => {
      const longString = "a".repeat(1000);
      expect(sanitizeForPrompt(longString, 100)).toBe("a".repeat(100));
      expect(sanitizeForPrompt(longString, 50)).toBe("a".repeat(50));
    });

    it("uses DEFAULT limit when maxLength not specified", () => {
      const longString = "a".repeat(1000);
      const result = sanitizeForPrompt(longString);
      expect(result.length).toBe(SANITIZE_LIMITS.DEFAULT);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(sanitizeForPrompt("")).toBe("");
    });

    it("handles string shorter than maxLength", () => {
      expect(sanitizeForPrompt("short", 100)).toBe("short");
    });

    it("handles string exactly at maxLength", () => {
      expect(sanitizeForPrompt("exactly", 7)).toBe("exactly");
    });

    it("handles string with only special characters", () => {
      expect(sanitizeForPrompt("{}[]\"\\`")).toBe("");
    });

    it("handles string with only whitespace", () => {
      expect(sanitizeForPrompt("     ")).toBe("");
      expect(sanitizeForPrompt("\t\t\t")).toBe("");
      expect(sanitizeForPrompt("\n\n\n")).toBe("");
    });

    it("handles unicode characters", () => {
      expect(sanitizeForPrompt("café")).toBe("café");
      expect(sanitizeForPrompt("日本語")).toBe("日本語");
      expect(sanitizeForPrompt("émojis 🎉")).toBe("émojis 🎉");
      expect(sanitizeForPrompt("αβγδ")).toBe("αβγδ");
    });

    it("handles mixed unicode and special characters", () => {
      expect(sanitizeForPrompt("{日本語}")).toBe("日本語");
      expect(sanitizeForPrompt("[café]")).toBe("café");
    });

    it("handles very long strings with special characters", () => {
      const input = "{".repeat(500) + "data" + "}".repeat(500);
      const result = sanitizeForPrompt(input, 100);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).not.toContain("{");
      expect(result).not.toContain("}");
    });
  });

  describe("security tests", () => {
    it("prevents JSON injection via curly braces", () => {
      const malicious = '{"inject": true}';
      const result = sanitizeForPrompt(malicious);
      expect(result).not.toContain("{");
      expect(result).not.toContain("}");
      // Result should be sanitized
      expect(result).toBe("inject : true");
    });

    it("prevents array injection via square brackets", () => {
      const malicious = '["item1", "item2"]';
      const result = sanitizeForPrompt(malicious);
      expect(result).not.toContain("[");
      expect(result).not.toContain("]");
    });

    it("prevents quote escaping attacks", () => {
      const malicious = 'value", "malicious": "injected';
      const result = sanitizeForPrompt(malicious);
      expect(result).not.toContain('"');
    });

    it("prevents backslash escaping attacks", () => {
      const malicious = 'value\\", "malicious": "injected';
      const result = sanitizeForPrompt(malicious);
      expect(result).not.toContain("\\");
    });

    it("prevents prompt injection via control characters", () => {
      // Attempt to use control characters to break formatting
      const malicious = "normal\x00\x01\x02hidden command";
      const result = sanitizeForPrompt(malicious);
      expect(result).toBe("normalhidden command");
    });

    it("prevents token abuse via length limits", () => {
      // Attempt to send excessive data
      const hugePayload = "x".repeat(100000);
      const result = sanitizeForPrompt(hugePayload, SANITIZE_LIMITS.DESCRIPTION);
      expect(result.length).toBe(SANITIZE_LIMITS.DESCRIPTION);
    });

    it("handles nested injection attempts", () => {
      const malicious = '{{{"deeply": {"nested": "payload"}}}}';
      const result = sanitizeForPrompt(malicious);
      expect(result).not.toContain("{");
      expect(result).not.toContain("}");
    });

    it("handles base64-like strings safely", () => {
      // Base64 encoded payloads shouldn't cause issues
      const base64Like = "SGVsbG8gV29ybGQ=";
      const result = sanitizeForPrompt(base64Like);
      expect(result).toBe("SGVsbG8gV29ybGQ=");
    });

    it("handles SQL-like strings (defense in depth)", () => {
      const sqlLike = "'; DROP TABLE users; --";
      const result = sanitizeForPrompt(sqlLike);
      // Should be passed through (LLM sanitization, not SQL sanitization)
      // But special chars handled
      expect(result).toBe("'; DROP TABLE users; --");
    });
  });
});

// ============ SANITIZE AMOUNT TESTS ============

describe("sanitizeAmount", () => {
  describe("basic functionality", () => {
    it("returns 0 for NaN", () => {
      expect(sanitizeAmount(NaN)).toBe(0);
    });

    it("returns 0 for Infinity", () => {
      expect(sanitizeAmount(Infinity)).toBe(0);
    });

    it("returns 0 for -Infinity", () => {
      expect(sanitizeAmount(-Infinity)).toBe(0);
    });

    it("rounds to 2 decimal places", () => {
      expect(sanitizeAmount(123.456)).toBe(123.46);
      expect(sanitizeAmount(123.454)).toBe(123.45);
      expect(sanitizeAmount(99.995)).toBe(100);
    });

    it("handles negative numbers", () => {
      expect(sanitizeAmount(-100)).toBe(-100);
      expect(sanitizeAmount(-99.999)).toBe(-100);
      // Very small negative numbers round to -0 in JavaScript
      // Use == 0 check since -0 === 0 but Object.is(-0, 0) is false
      expect(sanitizeAmount(-0.001) === 0).toBe(true);
    });

    it("handles zero", () => {
      expect(sanitizeAmount(0)).toBe(0);
      // -0 is functionally equivalent to 0 in arithmetic
      expect(sanitizeAmount(-0) === 0).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles very large numbers", () => {
      expect(sanitizeAmount(1e15)).toBe(1e15);
      expect(sanitizeAmount(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("handles very small decimals", () => {
      expect(sanitizeAmount(0.001)).toBe(0);
      expect(sanitizeAmount(0.004)).toBe(0);
      expect(sanitizeAmount(0.005)).toBe(0.01);
      expect(sanitizeAmount(0.009)).toBe(0.01);
    });

    it("handles typical currency values", () => {
      expect(sanitizeAmount(19.99)).toBe(19.99);
      expect(sanitizeAmount(100.00)).toBe(100);
      expect(sanitizeAmount(1234.56)).toBe(1234.56);
    });

    it("handles floating point precision issues", () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(sanitizeAmount(0.1 + 0.2)).toBe(0.3);
      // Other common floating point issues
      expect(sanitizeAmount(0.7 + 0.1)).toBe(0.8);
    });

    it("handles scientific notation input", () => {
      expect(sanitizeAmount(1e-3)).toBe(0);
      expect(sanitizeAmount(1e2)).toBe(100);
      expect(sanitizeAmount(1.5e3)).toBe(1500);
    });
  });

  describe("security considerations", () => {
    it("rejects non-finite special values", () => {
      // All non-finite values should return 0
      expect(sanitizeAmount(Number.POSITIVE_INFINITY)).toBe(0);
      expect(sanitizeAmount(Number.NEGATIVE_INFINITY)).toBe(0);
      expect(sanitizeAmount(Number.NaN)).toBe(0);
    });

    it("handles edge integer boundaries", () => {
      // Ensure large integers don't cause issues
      expect(sanitizeAmount(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
      expect(sanitizeAmount(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER);
    });
  });
});
