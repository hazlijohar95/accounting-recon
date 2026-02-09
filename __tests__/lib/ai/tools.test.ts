/**
 * AI Tools Schema Unit Tests
 *
 * Tests for Zod schema definitions used by AI tool parameters.
 * Validates schema constraints, defaults, and type inference.
 *
 * @module __tests__/lib/ai/tools.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  explainMatchSchema,
  findMatchForSuspenseSchema,
  expenseInsightsSchema,
  createCompanyProfileSchema,
  suggestMatchActionSchema,
} from "@/lib/ai/tools";

// ============================================================================
// explainMatchSchema
// ============================================================================

describe("explainMatchSchema", () => {
  it("accepts valid input with matchId only", () => {
    const result = explainMatchSchema.safeParse({ matchId: "match-123" });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with includeAlternatives", () => {
    const result = explainMatchSchema.safeParse({ matchId: "match-123", includeAlternatives: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeAlternatives).toBe(true);
    }
  });

  it("rejects missing matchId", () => {
    const result = explainMatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string matchId", () => {
    const result = explainMatchSchema.safeParse({ matchId: 123 });
    expect(result.success).toBe(false);
  });

  it("includeAlternatives is optional", () => {
    const result = explainMatchSchema.safeParse({ matchId: "match-123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeAlternatives).toBeUndefined();
    }
  });
});

// ============================================================================
// findMatchForSuspenseSchema
// ============================================================================

describe("findMatchForSuspenseSchema", () => {
  it("accepts valid input with transactionId", () => {
    const result = findMatchForSuspenseSchema.safeParse({ transactionId: "txn-456" });
    expect(result.success).toBe(true);
  });

  it("defaults maxResults to 5", () => {
    const result = findMatchForSuspenseSchema.safeParse({ transactionId: "txn-456" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxResults).toBe(5);
    }
  });

  it("accepts custom maxResults", () => {
    const result = findMatchForSuspenseSchema.safeParse({ transactionId: "txn-456", maxResults: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxResults).toBe(10);
    }
  });

  it("rejects missing transactionId", () => {
    const result = findMatchForSuspenseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// expenseInsightsSchema
// ============================================================================

describe("expenseInsightsSchema", () => {
  it("accepts empty object (all optional)", () => {
    const result = expenseInsightsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts dateRange with start and end", () => {
    const result = expenseInsightsSchema.safeParse({
      dateRange: { start: "2025-01-01", end: "2025-01-31" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts category filter", () => {
    const result = expenseInsightsSchema.safeParse({ category: "Office Supplies" });
    expect(result.success).toBe(true);
  });

  it("rejects dateRange with missing start", () => {
    const result = expenseInsightsSchema.safeParse({
      dateRange: { end: "2025-01-31" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects dateRange with missing end", () => {
    const result = expenseInsightsSchema.safeParse({
      dateRange: { start: "2025-01-01" },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// createCompanyProfileSchema
// ============================================================================

describe("createCompanyProfileSchema", () => {
  const validInput = {
    companyName: "Test Corp Sdn Bhd",
    industryCategory: "F&B" as const,
    taxRegistered: true,
    taxNumber: "TAX-123",
    primaryBank: "Maybank" as const,
    fiscalYearEnd: "December" as const,
  };

  it("accepts valid complete input", () => {
    const result = createCompanyProfileSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts without optional taxNumber", () => {
    const { taxNumber, ...input } = validInput;
    const result = createCompanyProfileSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates industryCategory enum", () => {
    const invalid = { ...validInput, industryCategory: "InvalidCategory" };
    const result = createCompanyProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates primaryBank enum", () => {
    const invalid = { ...validInput, primaryBank: "Unknown Bank" };
    const result = createCompanyProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates fiscalYearEnd enum", () => {
    const invalid = { ...validInput, fiscalYearEnd: "January" };
    const result = createCompanyProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts all valid industry categories", () => {
    for (const category of ["F&B", "Retail", "Services", "Manufacturing", "Tech", "Other"]) {
      const result = createCompanyProfileSchema.safeParse({ ...validInput, industryCategory: category });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid primary banks", () => {
    for (const bank of ["Maybank", "CIMB", "Public Bank", "RHB", "Hong Leong", "Other"]) {
      const result = createCompanyProfileSchema.safeParse({ ...validInput, primaryBank: bank });
      expect(result.success).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    const result = createCompanyProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// suggestMatchActionSchema
// ============================================================================

describe("suggestMatchActionSchema", () => {
  it("accepts valid input", () => {
    const result = suggestMatchActionSchema.safeParse({
      matchId: "match-789",
      action: "approve",
      reason: "High confidence exact match",
      confidence: 95,
    });
    expect(result.success).toBe(true);
  });

  it("validates action enum", () => {
    for (const action of ["approve", "reject", "review"]) {
      const result = suggestMatchActionSchema.safeParse({
        matchId: "match-1",
        action,
        reason: "test",
        confidence: 50,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid action", () => {
    const result = suggestMatchActionSchema.safeParse({
      matchId: "match-1",
      action: "delete",
      reason: "test",
      confidence: 50,
    });
    expect(result.success).toBe(false);
  });

  it("enforces confidence 0-100 range", () => {
    const makeInput = (confidence: number) => ({
      matchId: "match-1",
      action: "approve",
      reason: "test",
      confidence,
    });

    expect(suggestMatchActionSchema.safeParse(makeInput(0)).success).toBe(true);
    expect(suggestMatchActionSchema.safeParse(makeInput(100)).success).toBe(true);
    expect(suggestMatchActionSchema.safeParse(makeInput(-1)).success).toBe(false);
    expect(suggestMatchActionSchema.safeParse(makeInput(101)).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(suggestMatchActionSchema.safeParse({ matchId: "m" }).success).toBe(false);
    expect(suggestMatchActionSchema.safeParse({ action: "approve" }).success).toBe(false);
  });
});
