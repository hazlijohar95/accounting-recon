/**
 * Upload Analysis Utilities
 *
 * Prompt builder and response parser for the AI upload analysis feature.
 * Uses Gemini Flash via Vertex AI for document classification and company verification
 * (same model pipeline as extraction — already configured server-side).
 *
 * @module convex/lib/analysisUtils
 */

import { Doc } from "../_generated/dataModel";

// ============================================================================
// Types
// ============================================================================

export interface CompanyContext {
  name: string;
  tradingAs?: string;
  registrationNumber?: string;
  primaryBank?: string;
  primaryAccountNumber?: string;
}

export interface DocumentContext {
  documentId: string;
  fileName: string;
  documentType: string;
  extractedText?: string;
  bankType?: string;
  periodStart?: string;
  periodEnd?: string;
  transactionCount?: number;
  extractionStatus: string;
}

export interface AnalysisResponse {
  companyVerification: {
    detectedName: string;
    registrationNumber?: string;
    bankName?: string;
    accountNumber?: string;
    matchStatus: "match" | "partial_match" | "mismatch" | "unknown";
    matchDetails?: string;
  };
  documents: Array<{
    documentId: string;
    classification: string;
    basisType: "cash" | "accrual";
    confidence: number;
    reason?: string;
  }>;
}

// ============================================================================
// Classification Constants
// ============================================================================

/** Document types that are cash basis */
const CASH_TYPES = new Set([
  "bank_statement",
  "cash_book",
  "payment_voucher",
]);

/** Document types that are accrual basis */
const ACCRUAL_TYPES = new Set([
  "invoice",
  "receipt",
  "credit_note",
  "pos_report",
  "settlement",
  "sales_invoice",
  "purchase_invoice",
]);

/**
 * Determine basis type from a classification string.
 */
export function getBasisType(classification: string): "cash" | "accrual" {
  if (CASH_TYPES.has(classification)) return "cash";
  if (ACCRUAL_TYPES.has(classification)) return "accrual";
  // Default heuristic: if it has "bank" or "cash" in the name, it's cash
  if (classification.includes("bank") || classification.includes("cash")) return "cash";
  return "accrual";
}

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build the analysis prompt for Haiku.
 *
 * @param company - Company context (name, bank, registration)
 * @param documents - Array of document contexts with extracted text
 * @returns The full prompt string
 */
export function buildAnalysisPrompt(
  company: CompanyContext,
  documents: DocumentContext[],
): string {
  const companySection = [
    `Name: ${company.name}`,
    company.tradingAs ? `Trading As: ${company.tradingAs}` : null,
    company.registrationNumber ? `Registration: ${company.registrationNumber}` : null,
    company.primaryBank ? `Bank: ${company.primaryBank}` : null,
    company.primaryAccountNumber ? `Account: ${company.primaryAccountNumber}` : null,
  ].filter(Boolean).join(" | ");

  const docSections = documents.map((doc, i) => {
    const metadata = [
      doc.documentType !== "other" ? `currentType=${doc.documentType}` : null,
      doc.bankType ? `bank=${doc.bankType}` : null,
      doc.transactionCount ? `transactions=${doc.transactionCount}` : null,
      doc.periodStart ? `period=${doc.periodStart} to ${doc.periodEnd || "?"}` : null,
    ].filter(Boolean).join(", ");

    // Truncate extracted text to first 500 chars for efficiency
    const textPreview = doc.extractedText
      ? doc.extractedText.substring(0, 500).replace(/[\n\r]+/g, " ")
      : "(no extracted text)";

    return `[Doc ${i + 1}] ID: ${doc.documentId}
Filename: ${doc.fileName}
${metadata ? `Metadata: ${metadata}` : ""}
Text preview: ${textPreview}`;
  }).join("\n\n");

  return `You are an accounting document classifier. Analyze the documents below and return a JSON response.

COMPANY CONTEXT:
${companySection}

DOCUMENTS:
${docSections}

TASKS:
1. COMPANY VERIFICATION: Do these documents belong to "${company.name}"? Look for account holder names in bank statements, company names in invoices, and compare against the company context above.
2. DOCUMENT CLASSIFICATION: Classify each document. Valid classifications:
   - Cash basis: bank_statement, cash_book, payment_voucher
   - Accrual basis: invoice, receipt, credit_note, pos_report, settlement
3. For each document, explain your reasoning briefly.

RESPOND WITH ONLY THIS JSON (no markdown, no explanation outside JSON):
{
  "companyVerification": {
    "detectedName": "name found in documents",
    "registrationNumber": "if found",
    "bankName": "if found",
    "accountNumber": "if found",
    "matchStatus": "match|partial_match|mismatch|unknown",
    "matchDetails": "brief explanation"
  },
  "documents": [
    {
      "documentId": "the ID from above",
      "classification": "bank_statement|invoice|receipt|etc",
      "basisType": "cash|accrual",
      "confidence": 85,
      "reason": "brief reason"
    }
  ]
}`;
}

// ============================================================================
// Response Parser
// ============================================================================

/**
 * Parse the AI analysis response.
 * Handles malformed JSON gracefully with fallbacks.
 */
export function parseAnalysisResponse(
  rawText: string,
  documentIds: string[],
): AnalysisResponse {
  // Try to extract JSON from the response
  let jsonStr = rawText.trim();

  // Strip markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    const response: AnalysisResponse = {
      companyVerification: {
        detectedName: parsed.companyVerification?.detectedName || "Unknown",
        registrationNumber: parsed.companyVerification?.registrationNumber,
        bankName: parsed.companyVerification?.bankName,
        accountNumber: parsed.companyVerification?.accountNumber,
        matchStatus: validateMatchStatus(parsed.companyVerification?.matchStatus),
        matchDetails: parsed.companyVerification?.matchDetails,
      },
      documents: [],
    };

    // Map parsed documents, ensuring all document IDs are covered
    const parsedDocMap = new Map<string, (typeof parsed.documents)[number]>();
    if (Array.isArray(parsed.documents)) {
      for (const doc of parsed.documents) {
        if (doc.documentId) {
          parsedDocMap.set(doc.documentId, doc);
        }
      }
    }

    for (const docId of documentIds) {
      const parsedDoc = parsedDocMap.get(docId);
      if (parsedDoc) {
        response.documents.push({
          documentId: docId,
          classification: parsedDoc.classification || "other",
          basisType: parsedDoc.basisType === "cash" ? "cash" : parsedDoc.basisType === "accrual" ? "accrual" : getBasisType(parsedDoc.classification || "other"),
          confidence: typeof parsedDoc.confidence === "number" ? Math.min(100, Math.max(0, parsedDoc.confidence)) : 50,
          reason: parsedDoc.reason,
        });
      } else {
        // Fallback for documents the AI missed
        response.documents.push({
          documentId: docId,
          classification: "other",
          basisType: "accrual",
          confidence: 0,
          reason: "Not classified by AI",
        });
      }
    }

    return response;
  } catch {
    // Complete fallback if JSON parsing fails
    return {
      companyVerification: {
        detectedName: "Unknown",
        matchStatus: "unknown",
        matchDetails: "AI analysis could not parse document content",
      },
      documents: documentIds.map((docId) => ({
        documentId: docId,
        classification: "other",
        basisType: "accrual" as const,
        confidence: 0,
        reason: "AI classification failed",
      })),
    };
  }
}

/**
 * Validate match status string to allowed literals.
 */
function validateMatchStatus(
  status: string | undefined,
): "match" | "partial_match" | "mismatch" | "unknown" {
  const valid = ["match", "partial_match", "mismatch", "unknown"];
  if (status && valid.includes(status)) {
    return status as "match" | "partial_match" | "mismatch" | "unknown";
  }
  return "unknown";
}

// ============================================================================
// Stats Computation
// ============================================================================

/**
 * Compute aggregate stats from document classifications.
 */
export function computeStats(
  classifications: Array<{
    basisType: "cash" | "accrual";
    transactionCount?: number;
    pageCount?: number;
    extractionStatus: string;
    userOverride?: { basisType: "cash" | "accrual" } | null;
  }>,
): {
  totalDocuments: number;
  totalPages: number;
  cashDocuments: number;
  accrualDocuments: number;
  cashTransactions: number;
  accrualItems: number;
  failedDocuments: number;
} {
  let totalPages = 0;
  let cashDocuments = 0;
  let accrualDocuments = 0;
  let cashTransactions = 0;
  let accrualItems = 0;
  let failedDocuments = 0;

  for (const doc of classifications) {
    const effectiveBasis = doc.userOverride?.basisType ?? doc.basisType;
    totalPages += doc.pageCount ?? 1;

    if (doc.extractionStatus === "failed") {
      failedDocuments++;
      continue;
    }

    if (effectiveBasis === "cash") {
      cashDocuments++;
      cashTransactions += doc.transactionCount ?? 0;
    } else {
      accrualDocuments++;
      accrualItems += doc.transactionCount ?? 1;
    }
  }

  return {
    totalDocuments: classifications.length,
    totalPages,
    cashDocuments,
    accrualDocuments,
    cashTransactions,
    accrualItems,
    failedDocuments,
  };
}
