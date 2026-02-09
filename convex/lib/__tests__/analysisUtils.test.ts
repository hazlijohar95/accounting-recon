/**
 * Analysis Utils Unit Tests
 *
 * Tests for upload analysis utilities:
 * - getBasisType (cash vs accrual classification)
 * - buildAnalysisPrompt (prompt construction)
 * - parseAnalysisResponse (response parsing with fallbacks)
 * - computeStats (aggregate stat computation)
 *
 * @module convex/lib/__tests__/analysisUtils.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  getBasisType,
  buildAnalysisPrompt,
  parseAnalysisResponse,
  computeStats,
  type CompanyContext,
  type DocumentContext,
} from "../analysisUtils";

// ============================================================================
// getBasisType
// ============================================================================

describe("getBasisType", () => {
  it("classifies bank_statement as cash", () => {
    expect(getBasisType("bank_statement")).toBe("cash");
  });

  it("classifies cash_book as cash", () => {
    expect(getBasisType("cash_book")).toBe("cash");
  });

  it("classifies payment_voucher as cash", () => {
    expect(getBasisType("payment_voucher")).toBe("cash");
  });

  it("classifies invoice as accrual", () => {
    expect(getBasisType("invoice")).toBe("accrual");
  });

  it("classifies receipt as accrual", () => {
    expect(getBasisType("receipt")).toBe("accrual");
  });

  it("classifies credit_note as accrual", () => {
    expect(getBasisType("credit_note")).toBe("accrual");
  });

  it("classifies pos_report as accrual", () => {
    expect(getBasisType("pos_report")).toBe("accrual");
  });

  it("classifies settlement as accrual", () => {
    expect(getBasisType("settlement")).toBe("accrual");
  });

  it("classifies sales_invoice as accrual", () => {
    expect(getBasisType("sales_invoice")).toBe("accrual");
  });

  it("classifies purchase_invoice as accrual", () => {
    expect(getBasisType("purchase_invoice")).toBe("accrual");
  });

  it("uses heuristic for 'bank'-containing strings", () => {
    expect(getBasisType("bank_transfer")).toBe("cash");
  });

  it("uses heuristic for 'cash'-containing strings", () => {
    expect(getBasisType("cash_receipt")).toBe("cash");
  });

  it("defaults to accrual for unknown types", () => {
    expect(getBasisType("other")).toBe("accrual");
    expect(getBasisType("unknown")).toBe("accrual");
    expect(getBasisType("")).toBe("accrual");
  });
});

// ============================================================================
// buildAnalysisPrompt
// ============================================================================

describe("buildAnalysisPrompt", () => {
  const baseCompany: CompanyContext = {
    name: "Test Company Sdn Bhd",
  };

  const baseDocuments: DocumentContext[] = [
    {
      documentId: "doc-1",
      fileName: "bank_jan.pdf",
      documentType: "bank_statement",
      extractedText: "Account holder: Test Company Sdn Bhd\nBalance: RM 10,000",
      extractionStatus: "completed",
    },
  ];

  it("includes company name in prompt", () => {
    const prompt = buildAnalysisPrompt(baseCompany, baseDocuments);
    expect(prompt).toContain("Test Company Sdn Bhd");
  });

  it("includes optional company context when provided", () => {
    const company: CompanyContext = {
      name: "Test Corp",
      tradingAs: "TC Trading",
      registrationNumber: "REG-123",
      primaryBank: "Maybank",
      primaryAccountNumber: "1234567890",
    };
    const prompt = buildAnalysisPrompt(company, baseDocuments);
    expect(prompt).toContain("Trading As: TC Trading");
    expect(prompt).toContain("Registration: REG-123");
    expect(prompt).toContain("Bank: Maybank");
    expect(prompt).toContain("Account: 1234567890");
  });

  it("includes document metadata", () => {
    const prompt = buildAnalysisPrompt(baseCompany, baseDocuments);
    expect(prompt).toContain("doc-1");
    expect(prompt).toContain("bank_jan.pdf");
    expect(prompt).toContain("currentType=bank_statement");
  });

  it("truncates extracted text to 500 chars", () => {
    const longText = "A".repeat(1000);
    const docs: DocumentContext[] = [{
      documentId: "doc-2",
      fileName: "long.pdf",
      documentType: "invoice",
      extractedText: longText,
      extractionStatus: "completed",
    }];

    const prompt = buildAnalysisPrompt(baseCompany, docs);
    // Should contain at most 500 A's from the text
    const textPreviewMatch = prompt.match(/Text preview: (A+)/);
    expect(textPreviewMatch).toBeTruthy();
    expect(textPreviewMatch![1].length).toBeLessThanOrEqual(500);
  });

  it("shows '(no extracted text)' when text is absent", () => {
    const docs: DocumentContext[] = [{
      documentId: "doc-3",
      fileName: "empty.pdf",
      documentType: "receipt",
      extractionStatus: "completed",
    }];

    const prompt = buildAnalysisPrompt(baseCompany, docs);
    expect(prompt).toContain("(no extracted text)");
  });

  it("includes document metadata fields", () => {
    const docs: DocumentContext[] = [{
      documentId: "doc-4",
      fileName: "statement.pdf",
      documentType: "bank_statement",
      bankType: "Maybank",
      periodStart: "2025-01-01",
      periodEnd: "2025-01-31",
      transactionCount: 50,
      extractionStatus: "completed",
    }];

    const prompt = buildAnalysisPrompt(baseCompany, docs);
    expect(prompt).toContain("bank=Maybank");
    expect(prompt).toContain("transactions=50");
    expect(prompt).toContain("period=2025-01-01 to 2025-01-31");
  });

  it("asks for JSON-only response", () => {
    const prompt = buildAnalysisPrompt(baseCompany, baseDocuments);
    expect(prompt).toContain("ONLY THIS JSON");
  });
});

// ============================================================================
// parseAnalysisResponse
// ============================================================================

describe("parseAnalysisResponse", () => {
  const docIds = ["doc-1", "doc-2"];

  it("parses valid JSON response correctly", () => {
    const response = JSON.stringify({
      companyVerification: {
        detectedName: "Test Corp",
        registrationNumber: "REG-123",
        bankName: "Maybank",
        accountNumber: "1234567890",
        matchStatus: "match",
        matchDetails: "Company name matches",
      },
      documents: [
        {
          documentId: "doc-1",
          classification: "bank_statement",
          basisType: "cash",
          confidence: 95,
          reason: "Contains transaction list",
        },
        {
          documentId: "doc-2",
          classification: "invoice",
          basisType: "accrual",
          confidence: 85,
          reason: "Has invoice number",
        },
      ],
    });

    const result = parseAnalysisResponse(response, docIds);

    expect(result.companyVerification.detectedName).toBe("Test Corp");
    expect(result.companyVerification.matchStatus).toBe("match");
    expect(result.companyVerification.bankName).toBe("Maybank");
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].classification).toBe("bank_statement");
    expect(result.documents[0].basisType).toBe("cash");
    expect(result.documents[0].confidence).toBe(95);
    expect(result.documents[1].classification).toBe("invoice");
  });

  it("strips markdown code fences", () => {
    const response = '```json\n{"companyVerification":{"detectedName":"Corp","matchStatus":"match"},"documents":[{"documentId":"doc-1","classification":"invoice","basisType":"accrual","confidence":80}]}\n```';
    const result = parseAnalysisResponse(response, ["doc-1"]);
    expect(result.companyVerification.detectedName).toBe("Corp");
    expect(result.documents[0].classification).toBe("invoice");
  });

  it("provides fallback for documents the AI missed", () => {
    const response = JSON.stringify({
      companyVerification: { detectedName: "Corp", matchStatus: "match" },
      documents: [
        { documentId: "doc-1", classification: "bank_statement", basisType: "cash", confidence: 90 },
        // doc-2 is missing from AI response
      ],
    });

    const result = parseAnalysisResponse(response, docIds);
    expect(result.documents).toHaveLength(2);
    expect(result.documents[1].documentId).toBe("doc-2");
    expect(result.documents[1].classification).toBe("other");
    expect(result.documents[1].confidence).toBe(0);
    expect(result.documents[1].reason).toContain("Not classified");
  });

  it("clamps confidence to 0-100", () => {
    const response = JSON.stringify({
      companyVerification: { detectedName: "Corp", matchStatus: "match" },
      documents: [
        { documentId: "doc-1", classification: "invoice", confidence: 150 },
        { documentId: "doc-2", classification: "receipt", confidence: -10 },
      ],
    });

    const result = parseAnalysisResponse(response, docIds);
    expect(result.documents[0].confidence).toBe(100);
    expect(result.documents[1].confidence).toBe(0);
  });

  it("validates match status to allowed values", () => {
    const response = JSON.stringify({
      companyVerification: { detectedName: "Corp", matchStatus: "invalid_status" },
      documents: [],
    });

    const result = parseAnalysisResponse(response, []);
    expect(result.companyVerification.matchStatus).toBe("unknown");
  });

  it("accepts all valid match statuses", () => {
    for (const status of ["match", "partial_match", "mismatch", "unknown"]) {
      const response = JSON.stringify({
        companyVerification: { detectedName: "Corp", matchStatus: status },
        documents: [],
      });
      const result = parseAnalysisResponse(response, []);
      expect(result.companyVerification.matchStatus).toBe(status);
    }
  });

  it("derives basisType from classification when not provided", () => {
    const response = JSON.stringify({
      companyVerification: { detectedName: "Corp", matchStatus: "match" },
      documents: [
        { documentId: "doc-1", classification: "bank_statement" },
      ],
    });

    const result = parseAnalysisResponse(response, ["doc-1"]);
    expect(result.documents[0].basisType).toBe("cash");
  });

  it("returns complete fallback on JSON parse error", () => {
    const result = parseAnalysisResponse("not valid json {{{", docIds);

    expect(result.companyVerification.detectedName).toBe("Unknown");
    expect(result.companyVerification.matchStatus).toBe("unknown");
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].confidence).toBe(0);
    expect(result.documents[0].reason).toContain("failed");
  });

  it("defaults confidence to 50 when not a number", () => {
    const response = JSON.stringify({
      companyVerification: { detectedName: "Corp", matchStatus: "match" },
      documents: [
        { documentId: "doc-1", classification: "invoice", confidence: "high" },
      ],
    });

    const result = parseAnalysisResponse(response, ["doc-1"]);
    expect(result.documents[0].confidence).toBe(50);
  });
});

// ============================================================================
// computeStats
// ============================================================================

describe("computeStats", () => {
  it("computes stats for mixed cash and accrual documents", () => {
    const classifications = [
      { basisType: "cash" as const, transactionCount: 50, pageCount: 3, extractionStatus: "completed" },
      { basisType: "cash" as const, transactionCount: 30, pageCount: 2, extractionStatus: "completed" },
      { basisType: "accrual" as const, transactionCount: 1, pageCount: 1, extractionStatus: "completed" },
      { basisType: "accrual" as const, pageCount: 1, extractionStatus: "completed" }, // no transactionCount
    ];

    const stats = computeStats(classifications);
    expect(stats.totalDocuments).toBe(4);
    expect(stats.totalPages).toBe(7);
    expect(stats.cashDocuments).toBe(2);
    expect(stats.accrualDocuments).toBe(2);
    expect(stats.cashTransactions).toBe(80); // 50 + 30
    expect(stats.accrualItems).toBe(2); // 1 + 1 (default)
    expect(stats.failedDocuments).toBe(0);
  });

  it("counts failed documents separately", () => {
    const classifications = [
      { basisType: "cash" as const, transactionCount: 50, extractionStatus: "completed" },
      { basisType: "accrual" as const, extractionStatus: "failed" },
      { basisType: "cash" as const, extractionStatus: "failed" },
    ];

    const stats = computeStats(classifications);
    expect(stats.totalDocuments).toBe(3);
    expect(stats.cashDocuments).toBe(1);
    expect(stats.accrualDocuments).toBe(0);
    expect(stats.failedDocuments).toBe(2);
  });

  it("respects user overrides for basis type", () => {
    const classifications = [
      {
        basisType: "cash" as const,
        transactionCount: 50,
        extractionStatus: "completed",
        userOverride: { basisType: "accrual" as const }, // Override cash to accrual
      },
    ];

    const stats = computeStats(classifications);
    expect(stats.cashDocuments).toBe(0);
    expect(stats.accrualDocuments).toBe(1);
    expect(stats.accrualItems).toBe(50);
  });

  it("defaults pageCount to 1 when not provided", () => {
    const classifications = [
      { basisType: "cash" as const, extractionStatus: "completed" },
    ];

    const stats = computeStats(classifications);
    expect(stats.totalPages).toBe(1);
  });

  it("handles empty array", () => {
    const stats = computeStats([]);
    expect(stats.totalDocuments).toBe(0);
    expect(stats.totalPages).toBe(0);
    expect(stats.cashDocuments).toBe(0);
    expect(stats.accrualDocuments).toBe(0);
    expect(stats.failedDocuments).toBe(0);
  });

  it("defaults transactionCount to 0 for cash, 1 for accrual", () => {
    const classifications = [
      { basisType: "cash" as const, extractionStatus: "completed" },
      { basisType: "accrual" as const, extractionStatus: "completed" },
    ];

    const stats = computeStats(classifications);
    expect(stats.cashTransactions).toBe(0);
    expect(stats.accrualItems).toBe(1);
  });

  it("ignores user override when null", () => {
    const classifications = [
      {
        basisType: "cash" as const,
        transactionCount: 10,
        extractionStatus: "completed",
        userOverride: null,
      },
    ];

    const stats = computeStats(classifications);
    expect(stats.cashDocuments).toBe(1);
  });
});
