/**
 * Agent Rules Engine — Unit Tests
 *
 * Tests for the rules-based analysis layer (Layer 1).
 * Run with: pnpm test convex/lib/__tests__/agentRules.test.ts
 *
 * @module convex/lib/__tests__/agentRules.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  detectDateGaps,
  detectDuplicates,
  validateAmounts,
  checkExtractionQuality,
  computePeriodCoverage,
  validateDocumentTypes,
  detectMultiCompany,
  runRulesLayer,
} from "../agentRules";
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
  description: string = "Payment",
  overrides: Partial<TransactionInfo> = {},
): TransactionInfo {
  return {
    _id: id,
    date,
    description,
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

// ============================================================================
// detectDateGaps
// ============================================================================

describe("detectDateGaps", () => {
  it("returns no findings when there are no transactions", () => {
    const findings = detectDateGaps([], []);
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when only one month of data", () => {
    const txns = [
      createTx("t1", -100, "2024-01-05"),
      createTx("t2", -200, "2024-01-15"),
      createTx("t3", -300, "2024-01-25"),
    ];
    const findings = detectDateGaps(txns, []);
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when all months are covered", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15"),
      createTx("t2", -200, "2024-02-15"),
      createTx("t3", -300, "2024-03-15"),
    ];
    const findings = detectDateGaps(txns, []);
    expect(findings).toHaveLength(0);
  });

  it("detects a single month gap", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15"),
      createTx("t2", -300, "2024-03-15"),
    ];
    const findings = detectDateGaps(txns, []);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("period_gap");
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].title).toContain("February 2024");
  });

  it("detects multiple month gaps", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15"),
      createTx("t2", -300, "2024-04-15"),
    ];
    const findings = detectDateGaps(txns, []);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("2 Months");
    const details = findings[0].details as Record<string, unknown>;
    expect(details.gaps).toEqual(["2024-02", "2024-03"]);
  });

  it("uses period metadata from bank statements to detect gaps", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15"),
    ];
    const docs = [
      createDoc("d1", { periodStart: "2024-01-01", periodEnd: "2024-03-31" }),
    ];
    const findings = detectDateGaps(txns, docs);
    expect(findings).toHaveLength(1);
    const details = findings[0].details as Record<string, unknown>;
    expect(details.gaps).toEqual(["2024-02", "2024-03"]);
  });
});

// ============================================================================
// detectDuplicates
// ============================================================================

describe("detectDuplicates", () => {
  it("returns no findings for empty input", () => {
    expect(detectDuplicates([])).toHaveLength(0);
  });

  it("returns no findings for a single transaction", () => {
    expect(detectDuplicates([createTx("t1", -100, "2024-01-15")])).toHaveLength(0);
  });

  it("returns no findings when amounts differ", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15", "Payment to vendor"),
      createTx("t2", -200, "2024-01-15", "Payment to vendor"),
    ];
    expect(detectDuplicates(txns)).toHaveLength(0);
  });

  it("detects exact duplicates (same amount, date, description)", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15", "PAYMENT ABC COMPANY"),
      createTx("t2", -100, "2024-01-15", "PAYMENT ABC COMPANY"),
    ];
    const findings = detectDuplicates(txns);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("duplicate_transactions");
    expect(findings[0].relatedTransactionIds).toContain("t1");
    expect(findings[0].relatedTransactionIds).toContain("t2");
  });

  it("detects near-duplicates within 1 day", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15", "PAYMENT ABC COMPANY"),
      createTx("t2", -100, "2024-01-16", "PAYMENT ABC COMPANY"),
    ];
    const findings = detectDuplicates(txns);
    expect(findings).toHaveLength(1);
  });

  it("does NOT flag transactions 2+ days apart", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15", "PAYMENT ABC COMPANY"),
      createTx("t2", -100, "2024-01-17", "PAYMENT ABC COMPANY"),
    ];
    expect(detectDuplicates(txns)).toHaveLength(0);
  });

  it("does NOT flag transactions with different descriptions", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15", "PAYMENT ABC COMPANY"),
      createTx("t2", -100, "2024-01-15", "TRANSFER TO XYZ CORP"),
    ];
    expect(detectDuplicates(txns)).toHaveLength(0);
  });
});

// ============================================================================
// validateAmounts
// ============================================================================

describe("validateAmounts", () => {
  it("returns no findings for fewer than 10 transactions", () => {
    const txns = Array.from({ length: 9 }, (_, i) =>
      createTx(`t${i}`, -100 * (i + 1), "2024-01-15"),
    );
    expect(validateAmounts(txns)).toHaveLength(0);
  });

  it("returns no findings when all amounts are similar", () => {
    const txns = Array.from({ length: 15 }, (_, i) =>
      createTx(`t${i}`, -100 + (i % 3), `2024-01-${String(i + 1).padStart(2, "0")}`),
    );
    expect(validateAmounts(txns)).toHaveLength(0);
  });

  it("flags statistical outliers", () => {
    // 14 normal transactions around 100, then one at 10000
    const txns = Array.from({ length: 14 }, (_, i) =>
      createTx(`t${i}`, -(90 + i * 2), `2024-01-${String(i + 1).padStart(2, "0")}`),
    );
    txns.push(createTx("outlier", -50000, "2024-01-20"));

    const findings = validateAmounts(txns);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("unusual_amounts");
    expect(findings[0].severity).toBe("info");
    expect(findings[0].relatedTransactionIds).toContain("outlier");
  });
});

// ============================================================================
// checkExtractionQuality
// ============================================================================

describe("checkExtractionQuality", () => {
  it("returns no findings when all documents are healthy", () => {
    const docs = [
      createDoc("d1", { extractionConfidence: 90, extractedTransactionCount: 10 }),
      createDoc("d2", { extractionConfidence: 85, extractedTransactionCount: 5 }),
    ];
    expect(checkExtractionQuality(docs)).toHaveLength(0);
  });

  it("flags failed extractions as critical", () => {
    const docs = [
      createDoc("d1", { extractionStatus: "failed", errorMessage: "Parse error" }),
    ];
    const findings = checkExtractionQuality(docs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("extraction_errors");
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].relatedDocumentIds).toContain("d1");
  });

  it("flags low confidence extractions as warning", () => {
    const docs = [
      createDoc("d1", { extractionConfidence: 50 }),
    ];
    const findings = checkExtractionQuality(docs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("low_confidence_extractions");
    expect(findings[0].severity).toBe("warning");
  });

  it("flags both failed and low confidence separately", () => {
    const docs = [
      createDoc("d1", { extractionStatus: "failed", errorMessage: "Error" }),
      createDoc("d2", { extractionConfidence: 40 }),
    ];
    const findings = checkExtractionQuality(docs);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.type)).toContain("extraction_errors");
    expect(findings.map((f) => f.type)).toContain("low_confidence_extractions");
  });
});

// ============================================================================
// computePeriodCoverage
// ============================================================================

describe("computePeriodCoverage", () => {
  it("returns no findings when no bank statements or transactions", () => {
    expect(computePeriodCoverage([], [])).toHaveLength(0);
  });

  it("returns period from bank statement metadata", () => {
    const docs = [
      createDoc("d1", { periodStart: "2024-01-01", periodEnd: "2024-03-31" }),
    ];
    const findings = computePeriodCoverage(docs, []);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("period_detected");
    expect(findings[0].title).toContain("January 2024");
    expect(findings[0].title).toContain("March 2024");
  });

  it("returns period from transaction dates", () => {
    const txns = [
      createTx("t1", -100, "2024-06-15"),
      createTx("t2", -200, "2024-06-20"),
    ];
    const findings = computePeriodCoverage([], txns);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("June 2024");
  });
});

// ============================================================================
// validateDocumentTypes
// ============================================================================

describe("validateDocumentTypes", () => {
  it("returns no findings for healthy documents", () => {
    const docs = [
      createDoc("d1", { extractedTransactionCount: 25 }),
    ];
    expect(validateDocumentTypes(docs)).toHaveLength(0);
  });

  it("flags bank statements with zero transactions", () => {
    const docs = [
      createDoc("d1", { extractedTransactionCount: 0 }),
    ];
    const findings = validateDocumentTypes(docs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("zero_transactions");
    expect(findings[0].severity).toBe("warning");
  });

  it("flags bank statements with undefined transaction count", () => {
    const docs = [
      createDoc("d1", { extractedTransactionCount: undefined }),
    ];
    const findings = validateDocumentTypes(docs);
    expect(findings).toHaveLength(1);
  });
});

// ============================================================================
// detectMultiCompany
// ============================================================================

describe("detectMultiCompany", () => {
  it("returns no findings when no company names", () => {
    const docs = [createDoc("d1"), createDoc("d2")];
    expect(detectMultiCompany(docs)).toHaveLength(0);
  });

  it("returns no findings for single company", () => {
    const docs = [
      createDoc("d1", { extractedCompanyName: "ABC Sdn Bhd" }),
      createDoc("d2", { extractedCompanyName: "ABC Sdn Bhd" }),
    ];
    expect(detectMultiCompany(docs)).toHaveLength(0);
  });

  it("returns no findings for name variants that normalize to same", () => {
    const docs = [
      createDoc("d1", { extractedCompanyName: "ABC Sdn Bhd" }),
      createDoc("d2", { extractedCompanyName: "ABC SDN. BHD." }),
      createDoc("d3", { accountHolderName: "abc" }),
    ];
    expect(detectMultiCompany(docs)).toHaveLength(0);
  });

  it("detects two different companies", () => {
    const docs = [
      createDoc("d1", { extractedCompanyName: "ABC Sdn Bhd" }),
      createDoc("d2", { extractedCompanyName: "DEF Holdings Sdn Bhd" }),
    ];
    const findings = detectMultiCompany(docs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("multi_company_detected");
    expect(findings[0].severity).toBe("warning");
    const details = findings[0].details as Record<string, unknown>;
    expect(details.companyNames).toHaveLength(2);
  });

  it("uses accountHolderName as fallback", () => {
    const docs = [
      createDoc("d1", { accountHolderName: "ABC Sdn Bhd" }),
      createDoc("d2", { accountHolderName: "XYZ Corp" }),
    ];
    const findings = detectMultiCompany(docs);
    expect(findings).toHaveLength(1);
  });
});

// ============================================================================
// runRulesLayer (integration)
// ============================================================================

describe("runRulesLayer", () => {
  it("returns empty findings for empty inputs", () => {
    expect(runRulesLayer([], [], [])).toHaveLength(0);
  });

  it("produces findings from multiple rules in one pass", () => {
    const docs = [
      createDoc("d1", {
        extractedCompanyName: "ABC Sdn Bhd",
        extractedTransactionCount: 25,
        periodStart: "2024-01-01",
        periodEnd: "2024-03-31",
      }),
      createDoc("d2", {
        extractionStatus: "failed",
        errorMessage: "Parse error",
      }),
    ];
    const txns = [
      createTx("t1", -100, "2024-01-15", "Payment", { sourceDocumentId: "d1" }),
      createTx("t2", -200, "2024-03-15", "Transfer", { sourceDocumentId: "d1" }),
    ];
    const accrualDocs: AccrualDocInfo[] = [];

    const findings = runRulesLayer(docs, txns, accrualDocs);

    // Should have at least: extraction_errors (d2 failed), period_gap (Feb missing), period_detected
    const types = findings.map((f) => f.type);
    expect(types).toContain("extraction_errors");
    expect(types).toContain("period_gap");
    expect(types).toContain("period_detected");
  });
});

// ============================================================================
// charOverlap, daysBetween, parseDate, formatCurrency tests have been
// moved to agentUtils.test.ts (canonical source for shared utilities).
// ============================================================================

// ============================================================================
// detectDuplicates — sign handling
// ============================================================================

describe("detectDuplicates sign handling", () => {
  it("does not flag debit/credit pair as duplicate", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15", "PAYMENT ABC TRADING"),
      createTx("t2", 100, "2024-01-15", "PAYMENT ABC TRADING"),
    ];
    const findings = detectDuplicates(txns);
    expect(findings).toHaveLength(0);
  });

  it("flags same-sign duplicates", () => {
    const txns = [
      createTx("t1", -100, "2024-01-15", "PAYMENT ABC TRADING"),
      createTx("t2", -100, "2024-01-15", "PAYMENT ABC TRADING"),
    ];
    const findings = detectDuplicates(txns);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].type).toBe("duplicate_transactions");
  });
});

// ============================================================================
// validateAmounts — edge cases
// ============================================================================

describe("validateAmounts edge cases", () => {
  it("returns no findings with exactly 10 transactions (boundary)", () => {
    const txns = Array.from({ length: 10 }, (_, i) =>
      createTx(`t${i}`, 100, `2024-01-${String(i + 1).padStart(2, "0")}`),
    );
    const findings = validateAmounts(txns);
    // All same amount = no outliers
    expect(findings).toHaveLength(0);
  });

  it("returns no findings when all amounts are zero", () => {
    const txns = Array.from({ length: 15 }, (_, i) =>
      createTx(`t${i}`, 0, `2024-01-${String(i + 1).padStart(2, "0")}`),
    );
    const findings = validateAmounts(txns);
    expect(findings).toHaveLength(0);
  });
});

// ============================================================================
// checkExtractionQuality — boundary edge case
// ============================================================================

describe("checkExtractionQuality edge cases", () => {
  it("does NOT flag confidence exactly at 70 (boundary is < 70)", () => {
    const docs = [createDoc("d1", { extractionConfidence: 70 })];
    const findings = checkExtractionQuality(docs);
    // Confidence of 70 should NOT trigger low_confidence finding
    const lowConfidence = findings.filter(f => f.type === "low_confidence_extractions");
    expect(lowConfidence).toHaveLength(0);
  });

  it("flags confidence at 69 (just below threshold)", () => {
    const docs = [createDoc("d1", { extractionConfidence: 69 })];
    const findings = checkExtractionQuality(docs);
    const lowConfidence = findings.filter(f => f.type === "low_confidence_extractions");
    expect(lowConfidence).toHaveLength(1);
  });
});

// ============================================================================
// detectMultiCompany — edge cases
// ============================================================================

describe("detectMultiCompany edge cases", () => {
  it("handles three distinct companies", () => {
    const docs = [
      createDoc("d1", { extractedCompanyName: "Company A" }),
      createDoc("d2", { extractedCompanyName: "Company B" }),
      createDoc("d3", { extractedCompanyName: "Company C" }),
    ];
    const findings = detectMultiCompany(docs);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("multi_company_detected");
    expect(findings[0].severity).toBe("warning");
  });
});
