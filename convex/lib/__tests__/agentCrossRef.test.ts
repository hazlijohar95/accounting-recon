/**
 * Agent Cross-Reference Engine — Unit Tests
 *
 * Tests for the cross-reference analysis layer (Layer 2).
 * Run with: pnpm test convex/lib/__tests__/agentCrossRef.test.ts
 *
 * @module convex/lib/__tests__/agentCrossRef.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  companyNameSimilarity,
  checkAccrualCompanyReference,
  previewMatchability,
  detectOrphanedDocuments,
  validateBasisConsistency,
  runCrossRefLayer,
} from "../agentCrossRef";
import type { DocumentInfo, TransactionInfo, AccrualDocInfo } from "../agentRules";

// ============================================================================
// Test Fixtures
// ============================================================================

function createDoc(
  id: string,
  overrides: Partial<DocumentInfo> = {},
): DocumentInfo {
  return {
    _id: id,
    fileName: `doc_${id}.pdf`,
    documentType: "bank_statement",
    extractionStatus: "completed",
    ...overrides,
  };
}

function createTx(
  id: string,
  amount: number,
  date: string,
  overrides: Partial<TransactionInfo> = {},
): TransactionInfo {
  return {
    _id: id,
    date,
    description: "Payment",
    amount,
    ...overrides,
  };
}

function createAccrualDoc(
  id: string,
  amount: number,
  date: string,
  overrides: Partial<AccrualDocInfo> = {},
): AccrualDocInfo {
  return {
    _id: id,
    docType: "sales_invoice",
    docDate: date,
    amount,
    ...overrides,
  };
}

// normalizeCompanyName tests are in agentUtils.test.ts (canonical source).

// ============================================================================
// companyNameSimilarity
// ============================================================================

describe("companyNameSimilarity", () => {
  it("returns 1.0 for exact match after normalization", () => {
    expect(companyNameSimilarity("ABC Sdn Bhd", "ABC SDN. BHD.")).toBe(1.0);
  });

  it("returns 0.9 for containment when names are similar length", () => {
    // "abc global" (10 chars) is contained in "abc global tech" (15 chars) — ratio 10/15 ≈ 0.67 > 0.5
    expect(companyNameSimilarity("ABC Global", "ABC Global Tech")).toBe(0.9);
  });

  it("returns less than 0.9 for short name contained in long name", () => {
    // "ABC" (3 chars) in "ABC Enterprises" (15 chars) — ratio < 0.5, falls through to Dice
    const score = companyNameSimilarity("ABC", "ABC Enterprises");
    expect(score).toBeLessThan(0.9);
    expect(score).toBeGreaterThan(0); // still some similarity via bigrams
  });

  it("returns 0.0 for empty strings", () => {
    expect(companyNameSimilarity("", "ABC")).toBe(0.0);
    expect(companyNameSimilarity("ABC", "")).toBe(0.0);
  });

  it("returns low score for completely different names", () => {
    const score = companyNameSimilarity("ABC Trading", "XYZ Holdings");
    expect(score).toBeLessThan(0.5);
  });

  it("returns high score for similar names", () => {
    const score = companyNameSimilarity("ABC Trading Sdn Bhd", "ABC Trading Corp");
    expect(score).toBeGreaterThan(0.7);
  });
});

// ============================================================================
// checkAccrualCompanyReference
// ============================================================================

describe("checkAccrualCompanyReference", () => {
  it("returns no findings when there are no accrual docs", () => {
    const findings = checkAccrualCompanyReference("ABC Sdn Bhd", undefined, [], []);
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when company matches as issuer", () => {
    const docs = [createDoc("d1", { extractedCompanyName: "ABC Sdn Bhd" })];
    const accrualDocs = [createAccrualDoc("a1", 1000, "2024-01-15", {
      sourceDocumentId: "d1",
      counterparty: "XYZ Corp",
    })];
    const findings = checkAccrualCompanyReference("ABC Sdn Bhd", undefined, accrualDocs, docs);
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when company matches as counterparty", () => {
    const docs = [createDoc("d1", { extractedCompanyName: "Some Other Company" })];
    const accrualDocs = [createAccrualDoc("a1", 1000, "2024-01-15", {
      sourceDocumentId: "d1",
      counterparty: "ABC Sdn Bhd",
    })];
    const findings = checkAccrualCompanyReference("ABC Sdn Bhd", undefined, accrualDocs, docs);
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when company matches via trading-as name", () => {
    const docs = [createDoc("d1", { extractedCompanyName: "Some Company" })];
    const accrualDocs = [createAccrualDoc("a1", 1000, "2024-01-15", {
      sourceDocumentId: "d1",
      counterparty: "ABC Trading",
    })];
    const findings = checkAccrualCompanyReference(
      "ABC Holdings Sdn Bhd", "ABC Trading", accrualDocs, docs,
    );
    expect(findings).toHaveLength(0);
  });

  it("flags accrual docs that don't reference the company", () => {
    const docs = [createDoc("d1", { extractedCompanyName: "XYZ Corp" })];
    const accrualDocs = [createAccrualDoc("a1", 1000, "2024-01-15", {
      sourceDocumentId: "d1",
      counterparty: "DEF Ltd",
    })];
    const findings = checkAccrualCompanyReference("ABC Sdn Bhd", undefined, accrualDocs, docs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("accrual_company_mismatch");
    // All mismatched = critical
    expect(findings[0].severity).toBe("critical");
  });

  it("sets warning severity when only some docs mismatch", () => {
    const docs = [
      createDoc("d1", { extractedCompanyName: "ABC Sdn Bhd" }),
      createDoc("d2", { extractedCompanyName: "XYZ Corp" }),
    ];
    const accrualDocs = [
      createAccrualDoc("a1", 1000, "2024-01-15", {
        sourceDocumentId: "d1",
        counterparty: "Some Vendor",
      }),
      createAccrualDoc("a2", 2000, "2024-01-20", {
        sourceDocumentId: "d2",
        counterparty: "DEF Ltd",
      }),
    ];
    const findings = checkAccrualCompanyReference("ABC Sdn Bhd", undefined, accrualDocs, docs);
    expect(findings).toHaveLength(1);
    // Only 1 of 2 mismatched = warning
    expect(findings[0].severity).toBe("warning");
  });

  it("handles fuzzy company name matching", () => {
    const docs = [createDoc("d1", { extractedCompanyName: "ABC SDN. BHD." })];
    const accrualDocs = [createAccrualDoc("a1", 1000, "2024-01-15", {
      sourceDocumentId: "d1",
      counterparty: "Some Vendor",
    })];
    // "ABC SDN. BHD." should match "ABC Sdn Bhd" via normalization
    const findings = checkAccrualCompanyReference("ABC Sdn Bhd", undefined, accrualDocs, docs);
    expect(findings).toHaveLength(0);
  });
});

// ============================================================================
// previewMatchability
// ============================================================================

describe("previewMatchability", () => {
  it("returns no findings when either side is empty", () => {
    expect(previewMatchability([], [createAccrualDoc("a1", 100, "2024-01-15")])).toHaveLength(0);
    expect(previewMatchability([createTx("t1", -100, "2024-01-15")], [])).toHaveLength(0);
  });

  it("estimates 100% match rate for perfectly matching amounts", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15"),
      createTx("t2", -200, "2024-01-20"),
    ];
    const accrualDocs = [
      createAccrualDoc("a1", 100, "2024-01-15"),
      createAccrualDoc("a2", 200, "2024-01-20"),
    ];
    const findings = previewMatchability(txns, accrualDocs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("matching_preview");
    const details = findings[0].details as Record<string, unknown>;
    expect(details.estimatedMatchRate).toBe(100);
  });

  it("estimates 50% match rate when half match", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15"),
      createTx("t2", -200, "2024-01-20"),
    ];
    const accrualDocs = [
      createAccrualDoc("a1", 100, "2024-01-15"),
      createAccrualDoc("a2", 999, "2024-01-20"), // Different amount
    ];
    const findings = previewMatchability(txns, accrualDocs);
    expect(findings).toHaveLength(1);
    const details = findings[0].details as Record<string, unknown>;
    expect(details.estimatedMatchRate).toBe(50);
  });

  it("estimates 0% when no amounts match", () => {
    const txns = [createTx("t1", -100, "2024-01-15")];
    const accrualDocs = [createAccrualDoc("a1", 999, "2024-01-15")];
    const findings = previewMatchability(txns, accrualDocs);
    expect(findings).toHaveLength(1);
    const details = findings[0].details as Record<string, unknown>;
    expect(details.estimatedMatchRate).toBe(0);
  });
});

// ============================================================================
// detectOrphanedDocuments
// ============================================================================

describe("detectOrphanedDocuments", () => {
  it("returns no findings when all docs have linked data", () => {
    const docs = [createDoc("d1")];
    const txns = [createTx("t1", -100, "2024-01-15", { sourceDocumentId: "d1" })];
    expect(detectOrphanedDocuments(docs, txns, [])).toHaveLength(0);
  });

  it("returns no findings for docs still processing", () => {
    const docs = [createDoc("d1", { extractionStatus: "processing" })];
    expect(detectOrphanedDocuments(docs, [], [])).toHaveLength(0);
  });

  it("flags completed docs with no linked data", () => {
    const docs = [createDoc("d1")];
    const findings = detectOrphanedDocuments(docs, [], []);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("orphaned_documents");
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].relatedDocumentIds).toContain("d1");
  });

  it("does not flag docs with accrual data", () => {
    const docs = [createDoc("d1", { documentType: "invoice" })];
    const accrualDocs = [createAccrualDoc("a1", 100, "2024-01-15", { sourceDocumentId: "d1" })];
    expect(detectOrphanedDocuments(docs, [], accrualDocs)).toHaveLength(0);
  });
});

// ============================================================================
// validateBasisConsistency
// ============================================================================

describe("validateBasisConsistency", () => {
  it("returns no findings for consistent classification", () => {
    const docs = [createDoc("d1", { documentType: "bank_statement" })];
    const txns = [createTx("t1", -100, "2024-01-15", { sourceDocumentId: "d1" })];
    expect(validateBasisConsistency(docs, txns, [])).toHaveLength(0);
  });

  it("flags cash-classified doc producing only accrual data", () => {
    const docs = [createDoc("d1", { documentType: "bank_statement" })];
    const accrualDocs = [createAccrualDoc("a1", 100, "2024-01-15", { sourceDocumentId: "d1" })];
    const findings = validateBasisConsistency(docs, [], accrualDocs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("basis_inconsistency");
    expect(findings[0].severity).toBe("warning");
  });

  it("flags accrual-classified doc producing only cash data", () => {
    const docs = [createDoc("d1", { documentType: "invoice" })];
    const txns = [createTx("t1", -100, "2024-01-15", { sourceDocumentId: "d1" })];
    const findings = validateBasisConsistency(docs, txns, []);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("basis_inconsistency");
  });

  it("does not flag 'other' type documents", () => {
    const docs = [createDoc("d1", { documentType: "other" })];
    const txns = [createTx("t1", -100, "2024-01-15", { sourceDocumentId: "d1" })];
    expect(validateBasisConsistency(docs, txns, [])).toHaveLength(0);
  });
});

// ============================================================================
// runCrossRefLayer (integration)
// ============================================================================

describe("runCrossRefLayer", () => {
  it("returns empty findings for empty inputs", () => {
    expect(runCrossRefLayer("ABC Sdn Bhd", undefined, [], [], [])).toHaveLength(0);
  });

  it("produces findings from multiple checks", () => {
    const docs = [
      createDoc("d1", { extractedCompanyName: "ABC Sdn Bhd" }),
      createDoc("d2", { documentType: "invoice", extractedCompanyName: "XYZ Corp" }),
    ];
    const txns = [
      createTx("t1", -100, "2024-01-15", { sourceDocumentId: "d1" }),
    ];
    const accrualDocs = [
      createAccrualDoc("a1", 100, "2024-01-15", {
        sourceDocumentId: "d2",
        counterparty: "DEF Ltd",
      }),
    ];

    const findings = runCrossRefLayer("ABC Sdn Bhd", undefined, docs, txns, accrualDocs);

    // Should have: accrual_company_mismatch (XYZ Corp + DEF Ltd != ABC)
    // and matching_preview
    const types = findings.map((f) => f.type);
    expect(types).toContain("accrual_company_mismatch");
    expect(types).toContain("matching_preview");
  });
});

// ============================================================================
// companyNameSimilarity — edge cases
// ============================================================================

describe("companyNameSimilarity edge cases", () => {
  it("returns 0 when both strings are empty", () => {
    expect(companyNameSimilarity("", "")).toBe(0);
  });

  it("handles single-character names", () => {
    // Single chars produce no bigrams, so Dice = 0 unless exact match
    const score = companyNameSimilarity("A", "A");
    expect(score).toBeGreaterThan(0);
  });

  it("differentiates names with same suffix but different prefixes", () => {
    const score = companyNameSimilarity("ABC Sdn Bhd", "XYZ Pte Ltd");
    expect(score).toBeLessThan(0.5);
  });
});

// ============================================================================
// previewMatchability — edge cases
// ============================================================================

describe("previewMatchability edge cases", () => {
  it("handles multiple cash transactions with same amount (deduplication)", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15"),
      createTx("t2", -100, "2024-01-16"),
    ];
    const accruals = [
      createAccrualDoc("a1", 100, "2024-01-15"),
    ];
    const findings = previewMatchability(txns, accruals);
    expect(findings).toHaveLength(1);
    // Only one accrual should match one cash txn, not both
    const details = findings[0].details as Record<string, unknown>;
    // Match rate should be based on max(2 cash, 1 accrual) = 2
    // 1 match out of 2 = 50%
    expect(details.estimatedMatchRate).toBe(50);
  });

  it("handles negative amounts on cash side vs positive on accrual side", () => {
    const txns = [createTx("t1", -500, "2024-01-15")];
    const accruals = [createAccrualDoc("a1", 500, "2024-01-15")];
    const findings = previewMatchability(txns, accruals);
    expect(findings).toHaveLength(1);
    const details = findings[0].details as Record<string, unknown>;
    expect(details.estimatedMatchRate).toBe(100);
  });
});

// ============================================================================
// detectOrphanedDocuments — edge cases
// ============================================================================

describe("detectOrphanedDocuments edge cases", () => {
  it("does not flag failed documents as orphaned", () => {
    const docs = [createDoc("d1", { extractionStatus: "failed" })];
    const findings = detectOrphanedDocuments(docs, [], []);
    expect(findings).toHaveLength(0);
  });

  it("handles multiple orphaned documents", () => {
    const docs = [
      createDoc("d1", { documentType: "invoice" }),
      createDoc("d2", { documentType: "invoice" }),
    ];
    const findings = detectOrphanedDocuments(docs, [], []);
    expect(findings).toHaveLength(1);
    expect(findings[0].description).toContain("2");
  });
});
