/**
 * Agent Cross-Reference Engine — Layer 2
 *
 * Pure TypeScript functions that analyze relationships between
 * cash and accrual data. Zero LLM tokens consumed.
 *
 * Functions:
 * - companyNameSimilarity — Fuzzy company name matching (0.0–1.0)
 * - checkAccrualCompanyReference — Do invoices reference the right company?
 * - previewMatchability — Estimate auto-match rate before reconciliation
 * - detectOrphanedDocuments — Documents with 0 extracted items
 * - validateBasisConsistency — Classification sanity checks
 * - runCrossRefLayer — Entry point that runs all cross-checks
 *
 * @module convex/lib/agentCrossRef
 */

import type {
  AgentFinding,
  DocumentInfo,
  TransactionInfo,
  AccrualDocInfo,
} from "./agentUtils";

import { normalizeCompanyName } from "./agentUtils";

// Re-export types and normalizeCompanyName for convenience
// (existing consumers import from here)
export type { AgentFinding, DocumentInfo, TransactionInfo, AccrualDocInfo };
export { normalizeCompanyName };

/**
 * Compute similarity between two company names.
 *
 * Returns 0.0–1.0 where:
 * - 1.0 = normalized exact match
 * - 0.9 = one name contains the other
 * - 0.0–0.9 = Dice coefficient on bigrams
 *
 * Threshold for "match" in the cross-ref engine: >= 0.7
 */
export function companyNameSimilarity(a: string, b: string): number {
  const normA = normalizeCompanyName(a);
  const normB = normalizeCompanyName(b);

  if (normA.length === 0 || normB.length === 0) return 0.0;
  if (normA === normB) return 1.0;

  // Containment check — only if shorter name is at least half the longer name's length
  // (prevents "AN Corp" falsely matching "Anderson Trading")
  const shorter = Math.min(normA.length, normB.length);
  const longer = Math.max(normA.length, normB.length);
  if ((normA.includes(normB) || normB.includes(normA)) && shorter / longer >= 0.5) {
    return 0.9;
  }

  // Bigram Dice coefficient
  const bigramsA = getBigrams(normA);
  const bigramsB = getBigrams(normB);

  if (bigramsA.size === 0 || bigramsB.size === 0) return 0.0;

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/** Extract character bigrams from a string. */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}

/** Threshold for considering two company names as "matching". */
const COMPANY_MATCH_THRESHOLD = 0.7;

// ============================================================================
// Cross-Check 1: Accrual Company Reference
// ============================================================================

/**
 * Check if accrual documents (invoices/receipts) reference the target company.
 *
 * For each accrual doc, the company should appear as either:
 * - The issuer (extractedCompanyName on source document matches company)
 * - The counterparty (accrual doc's counterparty matches company)
 *
 * Documents where the company is neither issuer nor counterparty are flagged.
 */
export function checkAccrualCompanyReference(
  companyName: string,
  companyTradingAs: string | undefined,
  accrualDocs: AccrualDocInfo[],
  documents: DocumentInfo[],
): AgentFinding[] {
  if (accrualDocs.length === 0) return [];

  // Build lookup: sourceDocumentId → DocumentInfo
  const docLookup = new Map<string, DocumentInfo>();
  for (const doc of documents) {
    docLookup.set(doc._id, doc);
  }

  const namesToCheck = [companyName];
  if (companyTradingAs) namesToCheck.push(companyTradingAs);

  const mismatched: Array<{
    accrualDoc: AccrualDocInfo;
    sourceDoc?: DocumentInfo;
    issuerName?: string;
    counterpartyName?: string;
  }> = [];

  for (const accrualDoc of accrualDocs) {
    const sourceDoc = accrualDoc.sourceDocumentId
      ? docLookup.get(accrualDoc.sourceDocumentId)
      : undefined;

    const issuerName = sourceDoc?.extractedCompanyName;
    const counterpartyName = accrualDoc.counterparty;

    // Check if company matches as issuer
    let matchesAsIssuer = false;
    if (issuerName) {
      matchesAsIssuer = namesToCheck.some(
        (name) => companyNameSimilarity(name, issuerName) >= COMPANY_MATCH_THRESHOLD,
      );
    }

    // Check if company matches as counterparty (recipient)
    let matchesAsCounterparty = false;
    if (counterpartyName) {
      matchesAsCounterparty = namesToCheck.some(
        (name) => companyNameSimilarity(name, counterpartyName) >= COMPANY_MATCH_THRESHOLD,
      );
    }

    if (!matchesAsIssuer && !matchesAsCounterparty) {
      mismatched.push({
        accrualDoc,
        sourceDoc,
        issuerName,
        counterpartyName,
      });
    }
  }

  if (mismatched.length === 0) return [];

  const allMismatch = mismatched.length === accrualDocs.length;
  const isPlural = mismatched.length > 1;

  return [{
    type: "accrual_company_mismatch",
    severity: allMismatch ? "critical" : "warning",
    title: `${mismatched.length} Invoice${isPlural ? "s" : ""} ${isPlural ? "Don't" : "Doesn't"} Reference ${companyName}`,
    description: allMismatch
      ? `None of your invoices or receipts mention ${companyName} as either the issuer or recipient. They might belong to a different company, or the company name might appear differently on these documents.`
      : `${mismatched.length} of your ${accrualDocs.length} invoices/receipts don't mention ${companyName} as either the issuer or recipient. The rest look fine — these might belong to a different company.`,
    details: {
      totalAccrualDocs: accrualDocs.length,
      mismatchedCount: mismatched.length,
      mismatched: mismatched.slice(0, 10).map((m) => ({
        docNumber: m.accrualDoc.docNumber,
        docDate: m.accrualDoc.docDate,
        amount: m.accrualDoc.amount,
        issuerName: m.issuerName || "(not detected)",
        counterpartyName: m.counterpartyName || "(not detected)",
        sourceFileName: m.sourceDoc?.fileName,
        sourceDocumentId: m.accrualDoc.sourceDocumentId,
      })),
    },
    relatedDocumentIds: mismatched
      .filter((m) => m.accrualDoc.sourceDocumentId)
      .map((m) => m.accrualDoc.sourceDocumentId!),
  }];
}

// ============================================================================
// Cross-Check 2: Match Preview
// ============================================================================

/**
 * Estimate the auto-match rate before reconciliation.
 *
 * Quick heuristic: for each accrual amount, check if there's a cash transaction
 * with a matching absolute amount (within ±0.01). This gives a rough estimate
 * of how many items will auto-match.
 */
export function previewMatchability(
  cashTransactions: TransactionInfo[],
  accrualDocs: AccrualDocInfo[],
): AgentFinding[] {
  if (cashTransactions.length === 0 || accrualDocs.length === 0) return [];

  // Build a set of cash amounts (absolute, rounded to cents)
  const cashAmountCents = new Map<number, number>(); // cents → count
  for (const tx of cashTransactions) {
    const cents = Math.round(Math.abs(tx.amount) * 100);
    cashAmountCents.set(cents, (cashAmountCents.get(cents) || 0) + 1);
  }

  // Count accrual docs with a matching cash amount
  const usedCashCounts = new Map<number, number>();
  let matchedAccrual = 0;

  for (const doc of accrualDocs) {
    const cents = Math.round(Math.abs(doc.amount) * 100);
    const available = (cashAmountCents.get(cents) || 0) - (usedCashCounts.get(cents) || 0);
    if (available > 0) {
      matchedAccrual++;
      usedCashCounts.set(cents, (usedCashCounts.get(cents) || 0) + 1);
    }
  }

  const totalItems = Math.max(cashTransactions.length, accrualDocs.length);
  const estimatedMatchRate = Math.round((matchedAccrual / totalItems) * 100);

  // Determine description based on match rate
  let description: string;
  if (estimatedMatchRate >= 80) {
    description = `Looking good — about ${estimatedMatchRate}% of your transactions have matching amounts on both sides. The reconciliation should go smoothly.`;
  } else if (estimatedMatchRate >= 50) {
    description = `About ${estimatedMatchRate}% of your transactions have matching amounts on both sides. Some items may need manual matching or could be partial payments.`;
  } else if (estimatedMatchRate > 0) {
    description = `Only about ${estimatedMatchRate}% of your transactions have matching amounts. This could mean different date ranges, missing documents, or many partial payments.`;
  } else {
    description = `I couldn't find any matching amounts between your bank transactions and invoices. The documents might cover different periods or different companies.`;
  }

  return [{
    type: "matching_preview",
    severity: "info",
    title: `Estimated Match Rate: ~${estimatedMatchRate}%`,
    description,
    details: {
      estimatedMatchRate,
      cashTransactionCount: cashTransactions.length,
      accrualDocCount: accrualDocs.length,
      matchedByAmountCount: matchedAccrual,
    },
  }];
}

// ============================================================================
// Cross-Check 3: Orphaned Documents
// ============================================================================

/**
 * Detect documents that completed extraction but produced zero items.
 *
 * These might be cover pages, summary sheets, or non-transactional documents
 * that slipped through classification.
 */
export function detectOrphanedDocuments(
  documents: DocumentInfo[],
  transactions: TransactionInfo[],
  accrualDocs: AccrualDocInfo[],
): AgentFinding[] {
  // Build sets of source document IDs that have linked data
  const docIdsWithTransactions = new Set<string>();
  for (const tx of transactions) {
    if (tx.sourceDocumentId) docIdsWithTransactions.add(tx.sourceDocumentId);
  }
  for (const doc of accrualDocs) {
    if (doc.sourceDocumentId) docIdsWithTransactions.add(doc.sourceDocumentId);
  }

  const orphaned = documents.filter(
    (d) => d.extractionStatus === "completed" && !docIdsWithTransactions.has(d._id),
  );

  if (orphaned.length === 0) return [];

  const isPlural = orphaned.length > 1;
  return [{
    type: "orphaned_documents",
    severity: "warning",
    title: `${orphaned.length} Document${isPlural ? "s" : ""} with No Extracted Data`,
    description: isPlural
      ? `${orphaned.length} documents were processed successfully but no transactions or invoices were extracted. They might be cover pages, summary sheets, or documents in a format I couldn't fully understand.`
      : `"${orphaned[0].fileName}" was processed but no transactions or invoice data was extracted. It might be a cover page, summary sheet, or in an unusual format.`,
    details: {
      documents: orphaned.map((d) => ({
        id: d._id,
        fileName: d.fileName,
        documentType: d.documentType,
      })),
    },
    relatedDocumentIds: orphaned.map((d) => d._id),
  }];
}

// ============================================================================
// Cross-Check 4: Basis Consistency
// ============================================================================

/** Cash basis document types (should have transactions, not invoice data). */
const CASH_DOC_TYPES = new Set(["bank_statement", "cash_book", "payment_voucher"]);

/**
 * Validate that document classifications are consistent with their extracted data.
 */
export function validateBasisConsistency(
  documents: DocumentInfo[],
  transactions: TransactionInfo[],
  accrualDocs: AccrualDocInfo[],
): AgentFinding[] {
  // Build lookup of what data each document produced
  const docsWithCashData = new Set<string>();
  for (const tx of transactions) {
    if (tx.sourceDocumentId) docsWithCashData.add(tx.sourceDocumentId);
  }
  const docsWithAccrualData = new Set<string>();
  for (const doc of accrualDocs) {
    if (doc.sourceDocumentId) docsWithAccrualData.add(doc.sourceDocumentId);
  }

  const inconsistent: Array<{ doc: DocumentInfo; issue: string }> = [];

  for (const doc of documents) {
    if (doc.extractionStatus !== "completed") continue;

    const isCashType = CASH_DOC_TYPES.has(doc.documentType);
    const hasCashData = docsWithCashData.has(doc._id);
    const hasAccrualData = docsWithAccrualData.has(doc._id);

    // Cash-classified doc produced accrual data (unusual)
    if (isCashType && hasAccrualData && !hasCashData) {
      inconsistent.push({
        doc,
        issue: `Classified as "${doc.documentType}" but extracted invoice/receipt data instead of transactions`,
      });
    }

    // Accrual-classified doc produced cash data (unusual)
    if (!isCashType && doc.documentType !== "other" && hasCashData && !hasAccrualData) {
      inconsistent.push({
        doc,
        issue: `Classified as "${doc.documentType}" but extracted bank transactions instead of invoice data`,
      });
    }
  }

  if (inconsistent.length === 0) return [];

  const isPlural = inconsistent.length > 1;
  return [{
    type: "basis_inconsistency",
    severity: "warning",
    title: `${inconsistent.length} Document${isPlural ? "s" : ""} with Mismatched Classification`,
    description: isPlural
      ? `${inconsistent.length} documents have a classification that doesn't match the data that was extracted. The data is still usable, but you might want to review these.`
      : `"${inconsistent[0].doc.fileName}" ${inconsistent[0].issue}. The data is still usable, but you might want to review it.`,
    details: {
      documents: inconsistent.map((item) => ({
        id: item.doc._id,
        fileName: item.doc.fileName,
        documentType: item.doc.documentType,
        issue: item.issue,
      })),
    },
    relatedDocumentIds: inconsistent.map((item) => item.doc._id),
  }];
}

// ============================================================================
// Entry Point
// ============================================================================

/**
 * Run all cross-reference checks.
 *
 * @param companyName - The selected company name
 * @param companyTradingAs - Optional trading-as name
 * @param documents - All documents in the batch
 * @param transactions - All cash transactions extracted
 * @param accrualDocs - All accrual documents extracted
 * @returns Array of findings from all cross-reference checks
 */
export function runCrossRefLayer(
  companyName: string,
  companyTradingAs: string | undefined,
  documents: DocumentInfo[],
  transactions: TransactionInfo[],
  accrualDocs: AccrualDocInfo[],
): AgentFinding[] {
  const findings: AgentFinding[] = [];

  findings.push(
    ...checkAccrualCompanyReference(companyName, companyTradingAs, accrualDocs, documents),
  );
  findings.push(
    ...previewMatchability(transactions, accrualDocs),
  );
  findings.push(
    ...detectOrphanedDocuments(documents, transactions, accrualDocs),
  );
  findings.push(
    ...validateBasisConsistency(documents, transactions, accrualDocs),
  );

  return findings;
}
