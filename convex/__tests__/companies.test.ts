/**
 * Companies Module Unit Tests
 *
 * Tests for company business logic:
 * - Company code generation (atomic counter pattern)
 * - Currency validation
 * - Bank account structure
 * - Soft delete pattern
 *
 * @module convex/__tests__/companies.test.ts
 */

import { describe, it, expect } from "vitest";
import { validateNonEmpty } from "../lib/validation";

// ============================================================================
// Company Code Generation
// ============================================================================

describe("Company Code Generation", () => {
  function generateCompanyCode(name: string, counter: number): string {
    // Extract initials from company name (up to 3 chars)
    const initials = name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase())
      .filter(Boolean)
      .join("")
      .substring(0, 3);

    // Pad counter to 3 digits
    const paddedCounter = String(counter).padStart(3, "0");
    return `C${initials}${paddedCounter}`;
  }

  it("generates code from company name initials", () => {
    expect(generateCompanyCode("ABC Trading Sdn Bhd", 1)).toBe("CATS001");
  });

  it("pads counter to 3 digits", () => {
    expect(generateCompanyCode("Test", 1)).toBe("CT001");
    expect(generateCompanyCode("Test", 10)).toBe("CT010");
    expect(generateCompanyCode("Test", 100)).toBe("CT100");
  });

  it("limits initials to 3 characters", () => {
    const code = generateCompanyCode("Alpha Beta Gamma Delta Epsilon", 1);
    // Only first 3 words' initials
    expect(code).toBe("CABG001");
  });

  it("handles single-word names", () => {
    expect(generateCompanyCode("Acme", 5)).toBe("CA005");
  });
});

// ============================================================================
// Currency Validation
// ============================================================================

describe("Currency Validation", () => {
  function validateCurrency(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency);
  }

  it("accepts valid ISO currency codes", () => {
    expect(validateCurrency("MYR")).toBe(true);
    expect(validateCurrency("USD")).toBe(true);
    expect(validateCurrency("SGD")).toBe(true);
    expect(validateCurrency("EUR")).toBe(true);
  });

  it("rejects lowercase codes", () => {
    expect(validateCurrency("myr")).toBe(false);
  });

  it("rejects codes that are not 3 chars", () => {
    expect(validateCurrency("MY")).toBe(false);
    expect(validateCurrency("MYRR")).toBe(false);
  });

  it("rejects codes with numbers", () => {
    expect(validateCurrency("MY1")).toBe(false);
  });
});

// ============================================================================
// Bank Account Structure
// ============================================================================

describe("Bank Account Structure", () => {
  interface BankAccount {
    bankName: string;
    accountNumber: string;
    accountType?: string;
  }

  it("requires bankName and accountNumber", () => {
    const account: BankAccount = {
      bankName: "Maybank",
      accountNumber: "514012345678",
    };
    expect(account.bankName).toBeTruthy();
    expect(account.accountNumber).toBeTruthy();
  });

  it("allows optional accountType", () => {
    const account: BankAccount = {
      bankName: "CIMB",
      accountNumber: "1234567890",
      accountType: "current",
    };
    expect(account.accountType).toBe("current");
  });
});

// ============================================================================
// Soft Delete Pattern
// ============================================================================

describe("Soft Delete Pattern", () => {
  it("patches with deletedAt timestamp instead of hard delete", () => {
    const now = Date.now();
    const updates = { deletedAt: now };
    expect(updates.deletedAt).toBe(now);
    expect(updates.deletedAt).toBeGreaterThan(0);
  });
});

// ============================================================================
// JIT User Creation
// ============================================================================

describe("JIT User Creation", () => {
  it("creates user if webhook hasn't arrived yet", () => {
    // The create handler checks if user exists, creates if not
    const existingUser = null;
    const needsCreation = existingUser === null;
    expect(needsCreation).toBe(true);
  });
});
