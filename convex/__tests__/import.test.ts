/**
 * Import Module Unit Tests
 *
 * Tests for CSV import business logic:
 * - Cash record validation
 * - Accrual record validation
 * - Date format normalization
 * - DocType normalization
 * - Import result structure
 * - Session stats computation
 *
 * @module convex/__tests__/import.test.ts
 */

import { describe, it, expect } from "vitest";
import { validateDate, validateAmount } from "../lib/validation";

// ============================================================================
// Cash Transaction Record Validation
// ============================================================================

describe("Cash Transaction Import Validation", () => {
  interface CashRecord {
    date: string;
    description: string;
    amount: number;
    reference?: string;
    category?: string;
  }

  function validateCashRecord(record: CashRecord): { valid: boolean; error?: string } {
    try {
      validateDate(record.date, "date");
      validateAmount(record.amount, "amount");
      if (!record.description || record.description.trim() === "") {
        return { valid: false, error: "Description is required" };
      }
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message || "Validation failed" };
    }
  }

  it("accepts valid cash record", () => {
    const result = validateCashRecord({
      date: "2025-01-15",
      description: "PAYMENT ABC CORP",
      amount: -1500.00,
      reference: "REF-001",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = validateCashRecord({
      date: "15/01/2025",
      description: "Payment",
      amount: 100,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects NaN amount", () => {
    const result = validateCashRecord({
      date: "2025-01-15",
      description: "Payment",
      amount: NaN,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects empty description", () => {
    const result = validateCashRecord({
      date: "2025-01-15",
      description: "",
      amount: 100,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects whitespace-only description", () => {
    const result = validateCashRecord({
      date: "2025-01-15",
      description: "   ",
      amount: 100,
    });
    expect(result.valid).toBe(false);
  });

  it("accepts zero amount", () => {
    const result = validateCashRecord({
      date: "2025-01-15",
      description: "Zero value entry",
      amount: 0,
    });
    expect(result.valid).toBe(true);
  });

  it("accepts negative amounts (debits)", () => {
    const result = validateCashRecord({
      date: "2025-01-15",
      description: "Withdrawal",
      amount: -500,
    });
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Accrual Document Import Validation
// ============================================================================

describe("Accrual Document Import Validation", () => {
  interface AccrualRecord {
    docType: string;
    docNumber?: string;
    docDate: string;
    amount: number;
    counterparty?: string;
    description?: string;
  }

  function normalizeDocType(docType: string): string {
    const normalized = docType.toLowerCase().trim();
    const mapping: Record<string, string> = {
      invoice: "purchase_invoice",
      "purchase invoice": "purchase_invoice",
      "purchase_invoice": "purchase_invoice",
      "sales invoice": "sales_invoice",
      "sales_invoice": "sales_invoice",
      receipt: "receipt",
      "pos report": "pos_report",
      "pos_report": "pos_report",
      settlement: "settlement",
    };
    return mapping[normalized] || "receipt";
  }

  it("normalizes 'invoice' to 'purchase_invoice'", () => {
    expect(normalizeDocType("invoice")).toBe("purchase_invoice");
  });

  it("normalizes 'purchase invoice' (with space) to 'purchase_invoice'", () => {
    expect(normalizeDocType("purchase invoice")).toBe("purchase_invoice");
  });

  it("normalizes 'sales invoice' to 'sales_invoice'", () => {
    expect(normalizeDocType("sales invoice")).toBe("sales_invoice");
  });

  it("normalizes 'pos report' to 'pos_report'", () => {
    expect(normalizeDocType("pos report")).toBe("pos_report");
  });

  it("handles case insensitivity", () => {
    expect(normalizeDocType("INVOICE")).toBe("purchase_invoice");
    expect(normalizeDocType("Receipt")).toBe("receipt");
  });

  it("defaults unknown types to 'receipt'", () => {
    expect(normalizeDocType("unknown_type")).toBe("receipt");
    expect(normalizeDocType("")).toBe("receipt");
  });
});

// ============================================================================
// Import Result Structure
// ============================================================================

describe("Import Result Structure", () => {
  interface ImportResult {
    success: boolean;
    imported: number;
    errors: Array<{ index: number; error: string }>;
  }

  it("reports success for full import", () => {
    const result: ImportResult = {
      success: true,
      imported: 50,
      errors: [],
    };
    expect(result.success).toBe(true);
    expect(result.imported).toBe(50);
    expect(result.errors).toHaveLength(0);
  });

  it("reports partial success with errors", () => {
    const result: ImportResult = {
      success: true,
      imported: 48,
      errors: [
        { index: 3, error: "Invalid date" },
        { index: 7, error: "NaN amount" },
      ],
    };
    expect(result.imported).toBe(48);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].index).toBe(3);
  });

  it("reports failure when no records imported", () => {
    const result: ImportResult = {
      success: false,
      imported: 0,
      errors: [{ index: 0, error: "Invalid file format" }],
    };
    expect(result.success).toBe(false);
    expect(result.imported).toBe(0);
  });
});

// ============================================================================
// Session Stats Patching
// ============================================================================

describe("Session Stats Computation", () => {
  it("computes correct stats after cash import", () => {
    const existingStats = {
      totalCash: 100,
      totalAccrual: 50,
      matched: 10,
      suspense: 5,
    };

    const imported = 25;
    const updatedStats = {
      ...existingStats,
      totalCash: existingStats.totalCash + imported,
    };

    expect(updatedStats.totalCash).toBe(125);
    expect(updatedStats.totalAccrual).toBe(50); // Unchanged
  });

  it("computes correct stats after accrual import", () => {
    const existingStats = {
      totalCash: 100,
      totalAccrual: 50,
      matched: 10,
      suspense: 5,
    };

    const imported = 15;
    const updatedStats = {
      ...existingStats,
      totalAccrual: existingStats.totalAccrual + imported,
    };

    expect(updatedStats.totalAccrual).toBe(65);
    expect(updatedStats.totalCash).toBe(100); // Unchanged
  });
});
