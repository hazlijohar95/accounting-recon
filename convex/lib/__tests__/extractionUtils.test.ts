/**
 * Extraction Utils Unit Tests
 *
 * Tests for shared extraction utilities:
 * - buildExtractionPrompt (per document type)
 * - buildClassificationPrompt
 * - parseClassificationResult (JSON parsing, fallbacks)
 * - parseExtractionResult (bank statement vs invoice routing)
 * - normalizeDate (various formats → YYYY-MM-DD)
 * - mapDocType (document type mapping)
 * - getUserFriendlyError (error message mapping)
 *
 * @module convex/lib/__tests__/extractionUtils.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  buildExtractionPrompt,
  buildClassificationPrompt,
  parseClassificationResult,
  parseExtractionResult,
  normalizeDate,
  mapDocType,
  getUserFriendlyError,
} from "../extractionUtils";

// ============================================================================
// normalizeDate
// ============================================================================

describe("normalizeDate", () => {
  it("returns null for empty/null/undefined inputs", () => {
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate("  ")).toBeNull();
    expect(normalizeDate(null as any)).toBeNull();
    expect(normalizeDate(undefined as any)).toBeNull();
  });

  it("passes through YYYY-MM-DD format unchanged", () => {
    expect(normalizeDate("2025-01-15")).toBe("2025-01-15");
    expect(normalizeDate("2024-12-31")).toBe("2024-12-31");
  });

  it("converts DD/MM/YYYY (Malaysian format) to YYYY-MM-DD", () => {
    expect(normalizeDate("15/01/2025")).toBe("2025-01-15");
    expect(normalizeDate("31/12/2024")).toBe("2024-12-31");
  });

  it("handles DD-MM-YYYY with dashes", () => {
    expect(normalizeDate("15-01-2025")).toBe("2025-01-15");
  });

  it("handles DD.MM.YYYY with dots", () => {
    expect(normalizeDate("15.01.2025")).toBe("2025-01-15");
  });

  it("disambiguates MM/DD/YYYY when first part > 12", () => {
    // 25 > 12, so must be DD/MM/YYYY
    expect(normalizeDate("25/06/2025")).toBe("2025-06-25");
  });

  it("disambiguates when second part > 12 (treats as MM/DD/YYYY)", () => {
    // First part <= 12 but second part > 12 → treated as MM/DD/YYYY: month=06, day=25
    expect(normalizeDate("06/25/2025")).toBe("2025-06-25");
  });

  it("defaults to DD/MM/YYYY for ambiguous dates", () => {
    // Both parts <= 12, defaults to DD/MM/YYYY (Malaysian format)
    expect(normalizeDate("05/06/2025")).toBe("2025-06-05");
  });

  it("handles YYYY/MM/DD format", () => {
    // When first part is 4-digit year, the rest is [year, month, day]
    expect(normalizeDate("2025/01/15")).toBe("2025-01-15");
  });

  it("pads single-digit day and month", () => {
    expect(normalizeDate("1/2/2025")).toBe("2025-02-01");
  });

  it("returns null for two-digit year", () => {
    expect(normalizeDate("15/01/25")).toBeNull();
  });

  it("falls back to native Date parsing for named months", () => {
    const result = normalizeDate("January 15, 2025");
    // Native Date parsing uses UTC, may shift by timezone - just verify it returns a date
    expect(result).toMatch(/^2025-01-1[45]$/);
  });

  it("returns garbage for non-numeric parts (no calendar validation)", () => {
    // normalizeDate does NOT validate calendar correctness - it only does format transformation
    // "not-a-date" splits to ["not", "a", "date"] → "date" is 4 chars → treated as year
    // "abc/def/ghij" splits to ["abc", "def", "ghij"] → "ghij" is 4 chars → treated as year
    // This is a known limitation - the function transforms format, doesn't validate
    const result = normalizeDate("abc/def/ghij");
    expect(typeof result).toBe("string"); // Returns a string (not null)
  });
});

// ============================================================================
// mapDocType
// ============================================================================

describe("mapDocType", () => {
  it("maps 'invoice' to 'purchase_invoice'", () => {
    expect(mapDocType("invoice")).toBe("purchase_invoice");
  });

  it("maps 'purchase_invoice' to 'purchase_invoice'", () => {
    expect(mapDocType("purchase_invoice")).toBe("purchase_invoice");
  });

  it("maps 'sales_invoice' to 'sales_invoice'", () => {
    expect(mapDocType("sales_invoice")).toBe("sales_invoice");
  });

  it("maps 'receipt' to 'receipt'", () => {
    expect(mapDocType("receipt")).toBe("receipt");
  });

  it("maps 'pos_report' to 'pos_report'", () => {
    expect(mapDocType("pos_report")).toBe("pos_report");
  });

  it("maps 'settlement' to 'settlement'", () => {
    expect(mapDocType("settlement")).toBe("settlement");
  });

  it("defaults to 'receipt' for unknown types", () => {
    expect(mapDocType("unknown")).toBe("receipt");
    expect(mapDocType("bank_statement")).toBe("receipt");
    expect(mapDocType("")).toBe("receipt");
  });

  it("does case-insensitive mapping via toLowerCase()", () => {
    // mapDocType uses docType?.toLowerCase(), so it handles mixed case
    expect(mapDocType("Invoice")).toBe("purchase_invoice");
    expect(mapDocType("RECEIPT")).toBe("receipt");
    expect(mapDocType("Purchase_Invoice")).toBe("purchase_invoice");
  });
});

// ============================================================================
// getUserFriendlyError
// ============================================================================

describe("getUserFriendlyError", () => {
  it("handles rate limit / 429 errors", () => {
    expect(getUserFriendlyError("Error 429: Too Many Requests")).toContain("wait a moment");
    expect(getUserFriendlyError("rate limit exceeded")).toContain("wait a moment");
  });

  it("handles timeout errors", () => {
    expect(getUserFriendlyError("Request timeout after 30s")).toContain("timed out");
  });

  it("handles auth/credentials errors", () => {
    expect(getUserFriendlyError("Invalid credentials")).toContain("contact support");
    expect(getUserFriendlyError("Authentication failed")).toContain("contact support");
  });

  it("handles size limit errors", () => {
    expect(getUserFriendlyError("File too large")).toContain("smaller file");
    expect(getUserFriendlyError("Size limit exceeded")).toContain("smaller file");
  });

  it("returns generic message for unknown errors", () => {
    const result = getUserFriendlyError("Something completely unexpected");
    expect(result).toContain("Extraction failed");
  });
});

// ============================================================================
// buildExtractionPrompt
// ============================================================================

describe("buildExtractionPrompt", () => {
  it("returns bank statement prompt for bank_statement type", () => {
    const prompt = buildExtractionPrompt("bank_statement", null, null);
    expect(prompt).toContain("bank statement");
    expect(prompt).toContain("transactions");
    expect(prompt).toContain("YYYY-MM-DD");
  });

  it("returns invoice prompt for invoice type", () => {
    const prompt = buildExtractionPrompt("invoice", null, null);
    expect(prompt).toContain("invoice");
    expect(prompt).toContain("docType");
    expect(prompt).toContain("counterparty");
  });

  it("returns invoice prompt for purchase_invoice type", () => {
    const prompt = buildExtractionPrompt("purchase_invoice", null, null);
    expect(prompt).toContain("invoice");
  });

  it("returns receipt prompt for receipt type", () => {
    const prompt = buildExtractionPrompt("receipt", null, null);
    expect(prompt).toContain("receipt");
    expect(prompt).toContain("docType");
  });

  it("returns auto-detect prompt for unknown type", () => {
    const prompt = buildExtractionPrompt("other", null, null);
    expect(prompt).toContain("financial document extraction specialist");
    expect(prompt).toContain("BANK STATEMENT");
    expect(prompt).toContain("INVOICE");
  });

  it("includes page context for multi-page documents", () => {
    const prompt = buildExtractionPrompt("bank_statement", 2, 5);
    expect(prompt).toContain("page 2 of 5");
  });

  it("includes all-pages note for whole-document extraction", () => {
    const prompt = buildExtractionPrompt("bank_statement", null, null);
    expect(prompt).toContain("ALL pages");
  });

  it("does not include all-pages note for single page", () => {
    const prompt = buildExtractionPrompt("bank_statement", 1, 1);
    expect(prompt).not.toContain("ALL pages");
  });
});

// ============================================================================
// buildClassificationPrompt
// ============================================================================

describe("buildClassificationPrompt", () => {
  it("returns a classification prompt with all document types", () => {
    const prompt = buildClassificationPrompt();
    expect(prompt).toContain("bank_statement");
    expect(prompt).toContain("invoice");
    expect(prompt).toContain("receipt");
    expect(prompt).toContain("other");
  });

  it("includes Malaysian bank names", () => {
    const prompt = buildClassificationPrompt();
    expect(prompt).toContain("Maybank");
    expect(prompt).toContain("CIMB");
    expect(prompt).toContain("Public Bank");
  });

  it("asks for JSON-only response", () => {
    const prompt = buildClassificationPrompt();
    expect(prompt).toContain("ONLY valid JSON");
  });
});

// ============================================================================
// parseClassificationResult
// ============================================================================

describe("parseClassificationResult", () => {
  it("parses valid JSON response", () => {
    const text = '{"documentType": "bank_statement", "confidence": 95, "reason": "Has transactions"}';
    const result = parseClassificationResult(text, "other");
    expect(result.documentType).toBe("bank_statement");
    expect(result.confidence).toBe(95);
  });

  it("extracts JSON from markdown code block", () => {
    const text = '```json\n{"documentType": "invoice", "confidence": 85}\n```';
    const result = parseClassificationResult(text, "other");
    expect(result.documentType).toBe("invoice");
    expect(result.confidence).toBe(85);
  });

  it("extracts JSON from code block without json tag", () => {
    const text = '```\n{"documentType": "receipt", "confidence": 90}\n```';
    const result = parseClassificationResult(text, "other");
    expect(result.documentType).toBe("receipt");
  });

  it("rejects invalid document types and falls back", () => {
    const text = '{"documentType": "spreadsheet", "confidence": 80}';
    const result = parseClassificationResult(text, "other");
    expect(result.documentType).toBe("other");
  });

  it("defaults confidence to 50 if not a number", () => {
    const text = '{"documentType": "invoice", "confidence": "high"}';
    const result = parseClassificationResult(text, "other");
    expect(result.confidence).toBe(50);
  });

  it("falls back to default on invalid JSON", () => {
    const result = parseClassificationResult("not json at all", "bank_statement");
    expect(result.documentType).toBe("bank_statement");
    expect(result.confidence).toBe(0);
  });

  it("falls back when no JSON object found", () => {
    const result = parseClassificationResult("just some text", "invoice");
    expect(result.documentType).toBe("invoice");
    expect(result.confidence).toBe(0);
  });
});

// ============================================================================
// parseExtractionResult
// ============================================================================

describe("parseExtractionResult", () => {
  describe("bank statement extraction", () => {
    it("parses bank statement with transactions array", () => {
      const json = JSON.stringify({
        transactions: [
          { date: "2025-01-15", description: "PAYMENT ABC", amount: -1500.0, reference: "REF123" },
          { date: "2025-01-20", description: "DEPOSIT XYZ", amount: 2000.0 },
        ],
        bankName: "Maybank",
        statementPeriod: { start: "2025-01-01", end: "2025-01-31" },
      });

      const result = parseExtractionResult(json, "bank_statement");
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(80);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions![0].date).toBe("2025-01-15");
      expect(result.transactions![0].amount).toBe(-1500.0);
      expect(result.transactions![0].reference).toBe("REF123");
      expect(result.bankName).toBe("Maybank");
      expect(result.periodStart).toBe("2025-01-01");
      expect(result.periodEnd).toBe("2025-01-31");
    });

    it("skips transactions with missing required fields", () => {
      const json = JSON.stringify({
        transactions: [
          { date: "2025-01-15", description: "Valid", amount: 100 },
          { date: "2025-01-16", description: "Missing amount" }, // no amount
          { date: "2025-01-17", amount: 200 }, // no description
          { description: "No date", amount: 300 }, // no date
        ],
      });

      const result = parseExtractionResult(json, "bank_statement");
      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions![0].description).toBe("Valid");
    });

    it("normalizes dates in transactions", () => {
      const json = JSON.stringify({
        transactions: [
          { date: "15/01/2025", description: "DD/MM/YYYY format", amount: 100 },
        ],
      });

      const result = parseExtractionResult(json, "bank_statement");
      expect(result.transactions![0].date).toBe("2025-01-15");
    });

    it("skips transactions with unparseable dates", () => {
      const json = JSON.stringify({
        transactions: [
          { date: "invalid-date", description: "Bad date", amount: 100 },
        ],
      });

      const result = parseExtractionResult(json, "bank_statement");
      expect(result.success).toBe(false);
      expect(result.transactions).toHaveLength(0);
    });

    it("returns success=false when all transactions are invalid", () => {
      const json = JSON.stringify({
        transactions: [
          { description: "Missing date and amount" },
        ],
      });

      const result = parseExtractionResult(json, "bank_statement");
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe("invoice/receipt extraction", () => {
    it("parses invoice data correctly", () => {
      const json = JSON.stringify({
        docType: "purchase_invoice",
        docNumber: "INV-001",
        docDate: "2025-01-15",
        dueDate: "2025-02-15",
        counterparty: "Vendor Corp",
        amount: 1234.56,
        taxAmount: 123.45,
        description: "Office supplies",
        lineItems: [{ description: "Item 1", quantity: 2, unitPrice: 500, total: 1000 }],
      });

      const result = parseExtractionResult(json, "invoice");
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(85);
      expect(result.invoiceData).toBeDefined();
      expect(result.invoiceData!.docType).toBe("purchase_invoice");
      expect(result.invoiceData!.docNumber).toBe("INV-001");
      expect(result.invoiceData!.docDate).toBe("2025-01-15");
      expect(result.invoiceData!.dueDate).toBe("2025-02-15");
      expect(result.invoiceData!.counterparty).toBe("Vendor Corp");
      expect(result.invoiceData!.amount).toBe(1234.56);
      expect(result.invoiceData!.taxAmount).toBe(123.45);
    });

    it("maps docType using mapDocType", () => {
      const json = JSON.stringify({
        docType: "invoice",
        docDate: "2025-01-15",
        amount: 100,
      });

      const result = parseExtractionResult(json, "invoice");
      expect(result.invoiceData!.docType).toBe("purchase_invoice");
    });

    it("falls back to documentType param when docType missing", () => {
      const json = JSON.stringify({
        docDate: "2025-01-15",
        amount: 100,
      });

      const result = parseExtractionResult(json, "receipt");
      expect(result.invoiceData!.docType).toBe("receipt");
    });

    it("returns failure when docDate is unparseable", () => {
      const json = JSON.stringify({
        docType: "invoice",
        docDate: "not-a-date-at-all",
        amount: 100,
      });

      const result = parseExtractionResult(json, "invoice");
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("parse document date");
    });

    it("defaults amount to 0 when not a number", () => {
      const json = JSON.stringify({
        docType: "receipt",
        docDate: "2025-01-15",
        amount: "not a number",
      });

      const result = parseExtractionResult(json, "receipt");
      expect(result.invoiceData!.amount).toBe(0);
    });

    it("serializes lineItems to JSON string", () => {
      const lineItems = [{ description: "Widget", quantity: 5, total: 50 }];
      const json = JSON.stringify({
        docDate: "2025-01-15",
        amount: 50,
        lineItems,
      });

      const result = parseExtractionResult(json, "receipt");
      expect(result.invoiceData!.lineItems).toBe(JSON.stringify(lineItems));
    });
  });

  describe("JSON extraction from markdown", () => {
    it("extracts JSON from markdown code block", () => {
      const text = 'Some text\n```json\n{"docDate": "2025-01-15", "amount": 100}\n```\nMore text';
      const result = parseExtractionResult(text, "receipt");
      expect(result.success).toBe(true);
    });

    it("returns failure for no JSON in response", () => {
      const result = parseExtractionResult("No JSON here at all!", "invoice");
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain("No JSON object");
    });

    it("returns failure for invalid JSON", () => {
      const result = parseExtractionResult("{invalid json}", "invoice");
      expect(result.success).toBe(false);
    });
  });

  describe("response shape routing", () => {
    it("routes to bank statement parser when transactions array exists", () => {
      // Even if documentType is 'invoice', presence of transactions array triggers bank statement path
      const json = JSON.stringify({
        transactions: [
          { date: "2025-01-15", description: "Payment", amount: -500 },
        ],
      });

      const result = parseExtractionResult(json, "invoice");
      expect(result.transactions).toBeDefined();
      expect(result.invoiceData).toBeUndefined();
    });

    it("routes to invoice parser when no transactions array", () => {
      const json = JSON.stringify({
        docDate: "2025-01-15",
        amount: 500,
        transactions: [], // empty array should NOT trigger bank statement path
      });

      const result = parseExtractionResult(json, "invoice");
      expect(result.invoiceData).toBeDefined();
    });
  });
});
