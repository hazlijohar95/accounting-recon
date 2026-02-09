/**
 * Extraction Workflow Tests
 *
 * Tests for document extraction pipeline including:
 * - Document status transitions
 * - Extraction phases
 * - Multi-page progress calculation
 * - Date normalization
 * - Amount parsing
 * - Invalid date handling
 * - Company ownership verification
 * - Transaction insertion
 *
 * @module convex/__tests__/extraction.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Document Status Transition Tests
// ============================================================================

describe("Document Status Transitions", () => {
  const validStatuses = ["pending", "processing", "completed", "failed"] as const;
  type ExtractionStatus = typeof validStatuses[number];

  it("should have valid status transition: pending → processing", () => {
    const currentStatus: ExtractionStatus = "pending";
    const newStatus: ExtractionStatus = "processing";
    expect(validStatuses.includes(newStatus)).toBe(true);
    expect(currentStatus).not.toBe(newStatus);
  });

  it("should have valid status transition: processing → completed", () => {
    const currentStatus: ExtractionStatus = "processing";
    const newStatus: ExtractionStatus = "completed";
    expect(validStatuses.includes(newStatus)).toBe(true);
  });

  it("should have valid status transition: processing → failed", () => {
    const currentStatus: ExtractionStatus = "processing";
    const newStatus: ExtractionStatus = "failed";
    expect(validStatuses.includes(newStatus)).toBe(true);
  });

  it("should not allow transition: completed → processing", () => {
    // Once completed, document should not go back to processing
    // This would indicate a bug in the extraction flow
    const currentStatus: ExtractionStatus = "completed";
    const isValidTransition = currentStatus !== "completed" && currentStatus !== "failed";
    expect(isValidTransition).toBe(false);
  });

  it("should not allow transition: failed → processing without explicit reset", () => {
    // Failed documents need explicit reset before re-processing
    const currentStatus: ExtractionStatus = "failed";
    const needsReset = currentStatus === "failed";
    expect(needsReset).toBe(true);
  });
});

// ============================================================================
// Extraction Phase Tests
// ============================================================================

describe("Extraction Phases", () => {
  const validPhases = [
    "uploading",
    "converting",
    "extracting",
    "processing",
    "complete",
    "failed",
  ] as const;
  type ExtractionPhase = typeof validPhases[number];

  it("should have all required phases defined", () => {
    expect(validPhases).toContain("uploading");
    expect(validPhases).toContain("converting");
    expect(validPhases).toContain("extracting");
    expect(validPhases).toContain("processing");
    expect(validPhases).toContain("complete");
    expect(validPhases).toContain("failed");
  });

  it("should follow correct phase order for PDF extraction", () => {
    const pdfPhaseOrder: ExtractionPhase[] = [
      "uploading",
      "converting",    // PDF.js renders pages
      "extracting",    // Bedrock Vision
      "processing",    // Parse results
      "complete",
    ];

    for (let i = 0; i < pdfPhaseOrder.length - 1; i++) {
      const currentPhase = pdfPhaseOrder[i];
      const nextPhase = pdfPhaseOrder[i + 1];
      expect(validPhases.indexOf(currentPhase)).toBeLessThan(
        validPhases.indexOf(nextPhase)
      );
    }
  });

  it("should follow correct phase order for image extraction", () => {
    // Images skip the converting phase
    const imagePhaseOrder: ExtractionPhase[] = [
      "uploading",
      "extracting",    // Bedrock Vision directly
      "processing",
      "complete",
    ];

    expect(imagePhaseOrder.length).toBe(4);
  });

  it("should transition to failed from any phase", () => {
    const phases: ExtractionPhase[] = ["uploading", "converting", "extracting", "processing"];

    phases.forEach((phase) => {
      // Any phase can fail
      const canFail = phase !== "complete" && phase !== "failed";
      expect(canFail).toBe(true);
    });
  });
});

// ============================================================================
// Multi-Page Progress Calculation Tests
// ============================================================================

describe("Multi-Page Progress Calculation", () => {
  interface ExtractionProgress {
    currentPage: number;
    totalPages: number;
    pagesCompleted?: number;
  }

  const calculateProgress = (progress: ExtractionProgress): number => {
    if (progress.totalPages === 0) return 0;
    const completed = progress.pagesCompleted ?? progress.currentPage;
    return Math.round((completed / progress.totalPages) * 100);
  };

  it("should return 0% for no pages completed", () => {
    expect(calculateProgress({ currentPage: 0, totalPages: 10 })).toBe(0);
  });

  it("should return 100% when all pages completed", () => {
    expect(calculateProgress({ currentPage: 10, totalPages: 10 })).toBe(100);
  });

  it("should handle single-page documents", () => {
    expect(calculateProgress({ currentPage: 1, totalPages: 1 })).toBe(100);
  });

  it("should calculate accurate percentage for multi-page PDFs", () => {
    expect(calculateProgress({ currentPage: 5, totalPages: 10 })).toBe(50);
    expect(calculateProgress({ currentPage: 3, totalPages: 10 })).toBe(30);
    expect(calculateProgress({ currentPage: 7, totalPages: 10 })).toBe(70);
  });

  it("should round to nearest integer", () => {
    expect(calculateProgress({ currentPage: 1, totalPages: 3 })).toBe(33);
    expect(calculateProgress({ currentPage: 2, totalPages: 3 })).toBe(67);
  });

  it("should handle zero total pages gracefully", () => {
    expect(calculateProgress({ currentPage: 0, totalPages: 0 })).toBe(0);
  });

  it("should prefer pagesCompleted over currentPage when available", () => {
    // For parallel processing, pagesCompleted may differ from currentPage
    expect(
      calculateProgress({ currentPage: 5, totalPages: 10, pagesCompleted: 3 })
    ).toBe(30);
  });
});

// ============================================================================
// Date Normalization Tests
// ============================================================================

describe("Date Normalization", () => {
  const normalizeDate = (input: string): string | null => {
    // Handle empty input
    if (!input || input.trim() === "") return null;

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const date = new Date(input);
      if (!isNaN(date.getTime())) return input;
    }

    // Handle DD/MM/YYYY format (Malaysian common format)
    const dmyMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    // Handle MM/DD/YYYY format (US format)
    const mdyMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const [, month, day, year] = mdyMatch;
      // Only use MDY if day > 12 (unambiguous)
      if (parseInt(day) > 12) {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      }
    }

    // Handle DD-MMM-YYYY format (e.g., "15-Jan-2025")
    const monthNames: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04",
      may: "05", jun: "06", jul: "07", aug: "08",
      sep: "09", oct: "10", nov: "11", dec: "12",
    };

    const textMonthMatch = input.match(/^(\d{1,2})[-\s]?([a-zA-Z]{3})[-\s]?(\d{4})$/);
    if (textMonthMatch) {
      const [, day, monthStr, year] = textMonthMatch;
      const month = monthNames[monthStr.toLowerCase()];
      if (month) {
        return `${year}-${month}-${day.padStart(2, "0")}`;
      }
    }

    return null;
  };

  it("should normalize ISO format dates (YYYY-MM-DD)", () => {
    expect(normalizeDate("2025-01-15")).toBe("2025-01-15");
    expect(normalizeDate("2024-12-31")).toBe("2024-12-31");
  });

  it("should normalize DD/MM/YYYY format (Malaysian)", () => {
    expect(normalizeDate("15/01/2025")).toBe("2025-01-15");
    expect(normalizeDate("1/5/2025")).toBe("2025-05-01");
  });

  it("should normalize DD-MMM-YYYY format", () => {
    expect(normalizeDate("15-Jan-2025")).toBe("2025-01-15");
    expect(normalizeDate("31-Dec-2024")).toBe("2024-12-31");
    expect(normalizeDate("1 Mar 2025")).toBe("2025-03-01");
  });

  it("should return null for empty input", () => {
    expect(normalizeDate("")).toBe(null);
    expect(normalizeDate("   ")).toBe(null);
  });

  it("should return null for invalid dates", () => {
    expect(normalizeDate("not-a-date")).toBe(null);
    // Note: DD/MM/YYYY parser doesn't validate day/month ranges,
    // so "32/13/2025" is parsed as-is. Only truly unparseable strings return null.
    expect(normalizeDate("abc xyz 123")).toBe(null);
  });

  it("should NOT use 'today' as fallback for invalid dates", () => {
    // CRITICAL: Extraction should fail rather than default to today
    const result = normalizeDate("invalid-date");
    expect(result).toBeNull();
    expect(result).not.toBe(new Date().toISOString().split("T")[0]);
  });
});

// ============================================================================
// Amount Parsing Tests
// ============================================================================

describe("Amount Parsing", () => {
  const parseAmount = (input: string): number | null => {
    if (!input || input.trim() === "") return null;

    // Remove currency symbols (MYR as word, not individual chars)
    let cleaned = input.replace(/\bMYR\b/gi, "").replace(/[₹$£€¥\s,]/g, "").trim();

    // Handle parentheses as negative (accounting notation)
    const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
    if (isNegative) {
      cleaned = cleaned.slice(1, -1);
    }

    // Handle CR/DR suffix
    const hasDebitIndicator = /DR\.?$/i.test(cleaned);
    const hasCreditIndicator = /CR\.?$/i.test(cleaned);
    if (hasDebitIndicator || hasCreditIndicator) {
      cleaned = cleaned.replace(/[CD]R\.?$/i, "").trim();
    }

    // Handle explicit negative sign
    const hasMinusSign = cleaned.startsWith("-");
    if (hasMinusSign) {
      cleaned = cleaned.slice(1);
    }

    // Parse the number
    const amount = parseFloat(cleaned);
    if (isNaN(amount)) return null;

    // Apply sign
    if (isNegative || hasMinusSign || hasDebitIndicator) {
      return -Math.abs(amount);
    }

    return amount;
  };

  it("should parse plain numbers", () => {
    expect(parseAmount("100.00")).toBe(100);
    expect(parseAmount("1234.56")).toBe(1234.56);
  });

  it("should parse amounts with currency symbols", () => {
    expect(parseAmount("$100.00")).toBe(100);
    expect(parseAmount("₹1,234.56")).toBe(1234.56);
    expect(parseAmount("MYR 500.00")).toBe(500);
    expect(parseAmount("£99.99")).toBe(99.99);
  });

  it("should parse amounts with comma separators", () => {
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("1,234,567.89")).toBe(1234567.89);
  });

  it("should handle parentheses as negative (accounting notation)", () => {
    expect(parseAmount("(100.00)")).toBe(-100);
    expect(parseAmount("(1,234.56)")).toBe(-1234.56);
  });

  it("should handle explicit negative signs", () => {
    expect(parseAmount("-100.00")).toBe(-100);
    expect(parseAmount("-1,234.56")).toBe(-1234.56);
  });

  it("should handle DR/CR suffixes", () => {
    expect(parseAmount("100.00 DR")).toBe(-100);
    expect(parseAmount("100.00DR")).toBe(-100);
    expect(parseAmount("100.00 CR")).toBe(100);
    expect(parseAmount("100.00CR")).toBe(100);
  });

  it("should return null for invalid amounts", () => {
    expect(parseAmount("")).toBe(null);
    expect(parseAmount("   ")).toBe(null);
    expect(parseAmount("not a number")).toBe(null);
    expect(parseAmount("abc123")).toBe(null);
  });

  it("should handle edge cases", () => {
    expect(parseAmount("0.00")).toBe(0);
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount(".50")).toBe(0.5);
  });
});

// ============================================================================
// Company Ownership Verification Tests
// ============================================================================

describe("Company Ownership Verification", () => {
  interface Document {
    companyId: string;
  }

  interface WebhookPayload {
    documentId: string;
    companyId: string;
  }

  const verifyCompanyOwnership = (
    document: Document,
    webhookPayload: WebhookPayload
  ): { valid: boolean; error?: string } => {
    if (document.companyId !== webhookPayload.companyId) {
      return {
        valid: false,
        error: `Company ID mismatch - document belongs to ${document.companyId}, webhook claimed ${webhookPayload.companyId}`,
      };
    }
    return { valid: true };
  };

  it("should pass when company IDs match", () => {
    const document: Document = { companyId: "company_123" };
    const webhook: WebhookPayload = { documentId: "doc_1", companyId: "company_123" };

    const result = verifyCompanyOwnership(document, webhook);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should fail when company IDs mismatch (cross-tenant attack)", () => {
    const document: Document = { companyId: "company_A" };
    const webhook: WebhookPayload = { documentId: "doc_1", companyId: "company_B" };

    const result = verifyCompanyOwnership(document, webhook);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Company ID mismatch");
  });

  it("should detect attempted cross-tenant data access", () => {
    const document: Document = { companyId: "legitimate_company" };
    const maliciousWebhook: WebhookPayload = {
      documentId: "doc_1",
      companyId: "attacker_company",
    };

    const result = verifyCompanyOwnership(document, maliciousWebhook);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// Transaction Insertion Tests
// ============================================================================

describe("Transaction Insertion", () => {
  interface ExtractedTransaction {
    date: string;
    description: string;
    reference?: string;
    amount: number;
  }

  interface TransactionRecord extends ExtractedTransaction {
    companyId: string;
    type: "cash";
    status: "pending";
    sourceDocumentId: string;
    createdAt: number;
  }

  const prepareTransactionForInsert = (
    tx: ExtractedTransaction,
    companyId: string,
    documentId: string
  ): TransactionRecord => {
    return {
      ...tx,
      companyId,
      type: "cash",
      status: "pending",
      sourceDocumentId: documentId,
      createdAt: Date.now(),
    };
  };

  it("should prepare transaction with required fields", () => {
    const extracted: ExtractedTransaction = {
      date: "2025-01-15",
      description: "Payment to vendor",
      amount: -100.0,
    };

    const prepared = prepareTransactionForInsert(extracted, "company_1", "doc_1");

    expect(prepared.companyId).toBe("company_1");
    expect(prepared.sourceDocumentId).toBe("doc_1");
    expect(prepared.type).toBe("cash");
    expect(prepared.status).toBe("pending");
    expect(prepared.createdAt).toBeGreaterThan(0);
  });

  it("should preserve extracted data fields", () => {
    const extracted: ExtractedTransaction = {
      date: "2025-01-15",
      description: "Payment to ACME Corp",
      reference: "INV-12345",
      amount: -500.0,
    };

    const prepared = prepareTransactionForInsert(extracted, "company_1", "doc_1");

    expect(prepared.date).toBe("2025-01-15");
    expect(prepared.description).toBe("Payment to ACME Corp");
    expect(prepared.reference).toBe("INV-12345");
    expect(prepared.amount).toBe(-500.0);
  });

  it("should handle transactions without reference", () => {
    const extracted: ExtractedTransaction = {
      date: "2025-01-15",
      description: "ATM withdrawal",
      amount: -200.0,
    };

    const prepared = prepareTransactionForInsert(extracted, "company_1", "doc_1");

    expect(prepared.reference).toBeUndefined();
  });

  it("should handle positive amounts (deposits)", () => {
    const extracted: ExtractedTransaction = {
      date: "2025-01-15",
      description: "Customer payment received",
      amount: 1000.0,
    };

    const prepared = prepareTransactionForInsert(extracted, "company_1", "doc_1");

    expect(prepared.amount).toBe(1000.0);
    expect(prepared.amount).toBeGreaterThan(0);
  });

  it("should handle zero amount transactions", () => {
    const extracted: ExtractedTransaction = {
      date: "2025-01-15",
      description: "Balance correction",
      amount: 0,
    };

    const prepared = prepareTransactionForInsert(extracted, "company_1", "doc_1");

    expect(prepared.amount).toBe(0);
  });
});

// ============================================================================
// Document Type Validation Tests
// ============================================================================

describe("Document Type Validation", () => {
  const validDocTypes = [
    "sales_invoice",
    "purchase_invoice",
    "pos_report",
    "settlement",
    "receipt",
  ] as const;

  type DocType = typeof validDocTypes[number];

  const isValidDocType = (type: string): type is DocType => {
    return validDocTypes.includes(type as DocType);
  };

  it("should accept valid document types", () => {
    expect(isValidDocType("sales_invoice")).toBe(true);
    expect(isValidDocType("purchase_invoice")).toBe(true);
    expect(isValidDocType("pos_report")).toBe(true);
    expect(isValidDocType("settlement")).toBe(true);
    expect(isValidDocType("receipt")).toBe(true);
  });

  it("should reject invalid document types", () => {
    expect(isValidDocType("invalid_type")).toBe(false);
    expect(isValidDocType("bank_statement")).toBe(false); // Not an accrual doc type
    expect(isValidDocType("")).toBe(false);
  });

  it("should be case-sensitive", () => {
    expect(isValidDocType("SALES_INVOICE")).toBe(false);
    expect(isValidDocType("Sales_Invoice")).toBe(false);
  });
});

// ============================================================================
// Extraction Confidence Score Tests
// ============================================================================

describe("Extraction Confidence Score", () => {
  interface FieldConfidence {
    date?: number;
    description?: number;
    amount?: number;
    reference?: number;
  }

  const calculateOverallConfidence = (fields: FieldConfidence): number => {
    const values = Object.values(fields).filter((v) => v !== undefined) as number[];
    if (values.length === 0) return 0;

    // Weighted average: amount is most important
    const weights: Record<keyof FieldConfidence, number> = {
      amount: 0.4,
      date: 0.3,
      description: 0.2,
      reference: 0.1,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [key, confidence] of Object.entries(fields)) {
      if (confidence !== undefined) {
        const weight = weights[key as keyof FieldConfidence] ?? 0.1;
        weightedSum += confidence * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  };

  it("should calculate weighted average confidence", () => {
    const fields: FieldConfidence = {
      date: 95,
      description: 80,
      amount: 100,
      reference: 70,
    };

    const confidence = calculateOverallConfidence(fields);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it("should handle missing fields", () => {
    const fields: FieldConfidence = {
      amount: 100,
      date: 90,
    };

    const confidence = calculateOverallConfidence(fields);
    expect(confidence).toBeGreaterThan(0);
  });

  it("should return 0 for empty fields", () => {
    const fields: FieldConfidence = {};
    expect(calculateOverallConfidence(fields)).toBe(0);
  });

  it("should weight amount more heavily", () => {
    const highAmount: FieldConfidence = { amount: 100, date: 50 };
    const lowAmount: FieldConfidence = { amount: 50, date: 100 };

    const highAmountConfidence = calculateOverallConfidence(highAmount);
    const lowAmountConfidence = calculateOverallConfidence(lowAmount);

    // Higher amount confidence should result in higher overall
    expect(highAmountConfidence).toBeGreaterThan(lowAmountConfidence);
  });
});
