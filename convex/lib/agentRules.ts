/**
 * Agent Rules Engine — Layer 1
 *
 * Pure TypeScript functions that analyze extracted data to produce
 * agent findings. Zero LLM tokens consumed.
 *
 * Functions:
 * - detectDateGaps — Missing months in transaction date ranges
 * - detectDuplicates — Same amount + date + description
 * - validateAmounts — Statistical outlier detection
 * - checkExtractionQuality — Failed/low-confidence extractions
 * - computePeriodCoverage — Which months are covered
 * - validateDocumentTypes — Sanity checks on classification
 * - detectMultiCompany — Multiple companies in one batch
 * - runRulesLayer — Entry point that runs all checks
 *
 * @module convex/lib/agentRules
 */

// ============================================================================
// Re-exports — Types and helpers are defined once in agentUtils.ts.
// Re-exported here so existing consumers don't need to change imports.
// ============================================================================

export type {
  AgentFindingType,
  AgentFinding,
  DocumentInfo,
  TransactionInfo,
  AccrualDocInfo,
} from "./agentUtils";

export {
  normalizeCompanyName,
  parseDate,
  daysBetween,
  charOverlap,
  formatCurrency,
} from "./agentUtils";

// ============================================================================
// Internal imports — what this module's own functions need
// ============================================================================

import type {
  AgentFinding,
  DocumentInfo,
  TransactionInfo,
  AccrualDocInfo,
} from "./agentUtils";

import {
  normalizeCompanyName,
  parseDate,
  daysBetween,
  charOverlap,
  formatCurrency,
} from "./agentUtils";

// ============================================================================
// Private Helpers (date/month formatting — only used by rules in this file)
// ============================================================================

/** Get YYYY-MM string from a Date. */
function toYearMonth(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Get human-readable month name: "January 2024" */
function formatMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

/** Generate all YYYY-MM values between two months (inclusive). */
function monthRange(startYM: string, endYM: string): string[] {
  const result: string[] = [];
  const [sy, sm] = startYM.split("-").map(Number);
  const [ey, em] = endYM.split("-").map(Number);

  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

// ============================================================================
// Rule 1: Date Gap Detection
// ============================================================================

/**
 * Detect missing months in transaction date ranges.
 *
 * Uses both transaction dates and bank statement period metadata
 * to determine the expected date range, then finds gaps.
 */
export function detectDateGaps(
  transactions: TransactionInfo[],
  documents: DocumentInfo[],
): AgentFinding[] {
  if (transactions.length === 0) return [];

  // Collect all transaction months
  const txMonths = new Set<string>();
  for (const tx of transactions) {
    const d = parseDate(tx.date);
    if (d) txMonths.add(toYearMonth(d));
  }

  // Determine expected range from bank statement period metadata
  let minMonth: string | null = null;
  let maxMonth: string | null = null;

  for (const doc of documents) {
    if (doc.documentType !== "bank_statement") continue;
    if (doc.periodStart) {
      const d = parseDate(doc.periodStart);
      if (d) {
        const ym = toYearMonth(d);
        if (!minMonth || ym < minMonth) minMonth = ym;
      }
    }
    if (doc.periodEnd) {
      const d = parseDate(doc.periodEnd);
      if (d) {
        const ym = toYearMonth(d);
        if (!maxMonth || ym > maxMonth) maxMonth = ym;
      }
    }
  }

  // Fall back to transaction date range if no period metadata
  if (!minMonth || !maxMonth) {
    const sorted = [...txMonths].sort();
    if (sorted.length < 2) return []; // Can't detect gaps with < 2 months
    minMonth = minMonth || sorted[0];
    maxMonth = maxMonth || sorted[sorted.length - 1];
  }

  // Find gaps
  const expectedMonths = monthRange(minMonth, maxMonth);
  const gaps = expectedMonths.filter((ym) => !txMonths.has(ym));

  if (gaps.length === 0) return [];

  const gapNames = gaps.map(formatMonth);
  const isPlural = gaps.length > 1;

  return [{
    type: "period_gap",
    severity: "warning",
    title: `Missing ${isPlural ? `${gaps.length} Months` : formatMonth(gaps[0])} of Transactions`,
    description: isPlural
      ? `I have bank transactions for ${formatMonth(minMonth)} through ${formatMonth(maxMonth)}, but nothing for ${gapNames.join(", ")}. This could mean some transactions won't match during reconciliation.`
      : `I have bank transactions for ${formatMonth(minMonth)} through ${formatMonth(maxMonth)}, but nothing for ${gapNames[0]}. You might want to upload the missing statement.`,
    details: {
      gaps,
      gapNames,
      rangeStart: minMonth,
      rangeEnd: maxMonth,
      coveredMonths: [...txMonths].sort(),
    },
  }];
}

// ============================================================================
// Rule 2: Duplicate Detection
// ============================================================================

/**
 * Detect potential duplicate transactions.
 *
 * Matches on: same signed amount AND date within ±1 day AND
 * description overlap >= 80%. Debit/credit pairs are NOT flagged.
 */
export function detectDuplicates(
  transactions: TransactionInfo[],
): AgentFinding[] {
  if (transactions.length < 2) return [];

  // Group by signed amount (cents) for efficiency — don't flag debit/credit pairs as duplicates
  const byAmount = new Map<number, TransactionInfo[]>();
  for (const tx of transactions) {
    const key = Math.round(tx.amount * 100); // signed cents as integer key
    const group = byAmount.get(key) || [];
    group.push(tx);
    byAmount.set(key, group);
  }

  const MAX_GROUP_SIZE = 50; // Cap to avoid O(n²) with large same-amount groups (e.g. payroll)
  const duplicatePairs: Array<{ a: TransactionInfo; b: TransactionInfo }> = [];
  const seen = new Set<string>();

  for (const group of byAmount.values()) {
    if (group.length < 2) continue;
    if (group.length > MAX_GROUP_SIZE) continue; // Skip oversized groups — likely not duplicates

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const pairKey = [a._id, b._id].sort().join("|");
        if (seen.has(pairKey)) continue;

        // Check date proximity (±1 day)
        if (daysBetween(a.date, b.date) > 1) continue;

        // Check description similarity (>= 80%)
        if (charOverlap(a.description, b.description) < 0.8) continue;

        seen.add(pairKey);
        duplicatePairs.push({ a, b });
      }
    }
  }

  if (duplicatePairs.length === 0) return [];

  const isPlural = duplicatePairs.length > 1;
  const relatedIds = new Set<string>();
  const pairDetails = duplicatePairs.slice(0, 10).map((p) => {
    relatedIds.add(p.a._id);
    relatedIds.add(p.b._id);
    return {
      amount: p.a.amount,
      dateA: p.a.date,
      dateB: p.b.date,
      descriptionA: p.a.description.substring(0, 80),
      descriptionB: p.b.description.substring(0, 80),
    };
  });

  return [{
    type: "duplicate_transactions",
    severity: "warning",
    title: `${duplicatePairs.length} Potential Duplicate${isPlural ? "s" : ""} Found`,
    description: isPlural
      ? `I found ${duplicatePairs.length} pairs of transactions that look very similar — same amount, close dates, and matching descriptions. These might be actual duplicates from overlapping statements.`
      : `I found a pair of transactions that look very similar — same amount, close date, and matching description. This might be a duplicate from overlapping statements.`,
    details: {
      pairCount: duplicatePairs.length,
      pairs: pairDetails,
    },
    relatedTransactionIds: [...relatedIds],
  }];
}

// ============================================================================
// Rule 3: Amount Validation
// ============================================================================

/**
 * Flag transactions with statistically unusual amounts.
 *
 * Uses standard deviation to detect outliers (>3σ from mean).
 * Only runs with enough data points (>= 10 transactions).
 */
export function validateAmounts(
  transactions: TransactionInfo[],
): AgentFinding[] {
  if (transactions.length < 10) return [];

  const absAmounts = transactions.map((tx) => Math.abs(tx.amount));
  const mean = absAmounts.reduce((sum, v) => sum + v, 0) / absAmounts.length;
  const variance = absAmounts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / absAmounts.length;
  const stddev = Math.sqrt(variance);

  // Avoid flagging when all amounts are similar (low variance)
  if (stddev < 1) return [];

  const threshold = mean + 3 * stddev;
  const outliers = transactions.filter((tx) => Math.abs(tx.amount) > threshold);

  if (outliers.length === 0) return [];

  const isPlural = outliers.length > 1;
  return [{
    type: "unusual_amounts",
    severity: "info",
    title: `${outliers.length} Unusually Large Transaction${isPlural ? "s" : ""}`,
    description: `Most of your transactions average around ${formatCurrency(mean)}. ${isPlural ? `These ${outliers.length} transactions` : "This transaction"} ${isPlural ? "are" : "is"} significantly larger than usual — worth a quick check to make sure the amounts were extracted correctly.`,
    details: {
      mean: Math.round(mean * 100) / 100,
      threshold: Math.round(threshold * 100) / 100,
      outliers: outliers.slice(0, 5).map((tx) => ({
        id: tx._id,
        amount: tx.amount,
        date: tx.date,
        description: tx.description.substring(0, 60),
      })),
    },
    relatedTransactionIds: outliers.map((tx) => tx._id),
  }];
}

// ============================================================================
// Rule 4: Extraction Quality
// ============================================================================

/**
 * Flag documents with extraction problems.
 *
 * Checks for: failed extractions, low confidence, zero transactions
 * on bank statements.
 */
export function checkExtractionQuality(
  documents: DocumentInfo[],
): AgentFinding[] {
  const findings: AgentFinding[] = [];

  const failedDocs = documents.filter((d) => d.extractionStatus === "failed");
  const lowConfidenceDocs = documents.filter(
    (d) => d.extractionStatus === "completed"
      && d.extractionConfidence !== undefined
      && d.extractionConfidence < 70,
  );

  // Failed extractions — critical
  if (failedDocs.length > 0) {
    const isPlural = failedDocs.length > 1;
    findings.push({
      type: "extraction_errors",
      severity: "critical",
      title: `${failedDocs.length} Document${isPlural ? "s" : ""} Failed to Process`,
      description: isPlural
        ? `I couldn't extract data from ${failedDocs.length} documents. They might be scanned poorly, in an unsupported format, or password-protected. You can retry or remove them.`
        : `I couldn't extract data from "${failedDocs[0].fileName}". It might be scanned poorly, in an unsupported format, or password-protected.`,
      details: {
        documents: failedDocs.map((d) => ({
          id: d._id,
          fileName: d.fileName,
          error: d.errorMessage || "Unknown error",
        })),
      },
      relatedDocumentIds: failedDocs.map((d) => d._id),
    });
  }

  // Low confidence — warning
  if (lowConfidenceDocs.length > 0) {
    const isPlural = lowConfidenceDocs.length > 1;
    findings.push({
      type: "low_confidence_extractions",
      severity: "warning",
      title: `${lowConfidenceDocs.length} Document${isPlural ? "s" : ""} with Low Extraction Confidence`,
      description: isPlural
        ? `${lowConfidenceDocs.length} documents were processed but the extraction confidence is below 70%. Some data might be inaccurate — worth reviewing before reconciliation.`
        : `"${lowConfidenceDocs[0].fileName}" was processed but the extraction confidence is only ${lowConfidenceDocs[0].extractionConfidence}%. Some data might be inaccurate.`,
      details: {
        documents: lowConfidenceDocs.map((d) => ({
          id: d._id,
          fileName: d.fileName,
          confidence: d.extractionConfidence,
        })),
      },
      relatedDocumentIds: lowConfidenceDocs.map((d) => d._id),
    });
  }

  return findings;
}

// ============================================================================
// Rule 5: Period Coverage
// ============================================================================

/**
 * Compute which months/periods are covered by bank statements.
 * Returns an informational finding summarizing the coverage.
 */
export function computePeriodCoverage(
  documents: DocumentInfo[],
  transactions: TransactionInfo[],
): AgentFinding[] {
  const bankStatements = documents.filter((d) => d.documentType === "bank_statement");
  if (bankStatements.length === 0 && transactions.length === 0) return [];

  // Collect covered months from both period metadata and transaction dates
  const coveredMonths = new Set<string>();

  for (const doc of bankStatements) {
    if (doc.periodStart && doc.periodEnd) {
      const start = parseDate(doc.periodStart);
      const end = parseDate(doc.periodEnd);
      if (start && end) {
        const range = monthRange(toYearMonth(start), toYearMonth(end));
        range.forEach((ym) => coveredMonths.add(ym));
      }
    }
  }

  for (const tx of transactions) {
    const d = parseDate(tx.date);
    if (d) coveredMonths.add(toYearMonth(d));
  }

  if (coveredMonths.size === 0) return [];

  const sorted = [...coveredMonths].sort();
  const startMonth = formatMonth(sorted[0]);
  const endMonth = formatMonth(sorted[sorted.length - 1]);
  const range = sorted.length === 1
    ? startMonth
    : `${startMonth} to ${endMonth}`;

  return [{
    type: "period_detected",
    severity: "info",
    title: `Period: ${range}`,
    description: sorted.length === 1
      ? `Your bank statements cover ${startMonth}. I found ${transactions.length} transactions in this period.`
      : `Your bank statements cover ${range} (${sorted.length} month${sorted.length > 1 ? "s" : ""}). I found ${transactions.length} transactions across this period.`,
    details: {
      coveredMonths: sorted,
      monthNames: sorted.map(formatMonth),
      transactionCount: transactions.length,
      bankStatementCount: bankStatements.length,
    },
  }];
}

// ============================================================================
// Rule 6: Document Type Validation
// ============================================================================

/**
 * Sanity-check document classifications against their content.
 */
export function validateDocumentTypes(
  documents: DocumentInfo[],
): AgentFinding[] {
  const findings: AgentFinding[] = [];

  // Bank statements with 0 extracted transactions
  const emptyBankStatements = documents.filter(
    (d) => d.documentType === "bank_statement"
      && d.extractionStatus === "completed"
      && (d.extractedTransactionCount === 0 || d.extractedTransactionCount === undefined),
  );

  if (emptyBankStatements.length > 0) {
    const isPlural = emptyBankStatements.length > 1;
    findings.push({
      type: "zero_transactions",
      severity: "warning",
      title: `${emptyBankStatements.length} Bank Statement${isPlural ? "s" : ""} with No Transactions`,
      description: isPlural
        ? `${emptyBankStatements.length} documents are classified as bank statements but no transactions were extracted. They might be summary pages, cover letters, or misclassified documents.`
        : `"${emptyBankStatements[0].fileName}" is classified as a bank statement but no transactions were extracted. It might be a summary page or misclassified.`,
      details: {
        documents: emptyBankStatements.map((d) => ({
          id: d._id,
          fileName: d.fileName,
        })),
      },
      relatedDocumentIds: emptyBankStatements.map((d) => d._id),
    });
  }

  return findings;
}

// ============================================================================
// Rule 7: Multi-Company Detection
// ============================================================================

/**
 * Detect if documents belong to multiple different companies.
 *
 * Groups by normalized company name from extraction metadata.
 * Returns a finding if multiple distinct companies are detected.
 */
export function detectMultiCompany(
  documents: DocumentInfo[],
): AgentFinding[] {
  // Collect company names from documents
  const companyGroups = new Map<string, { original: string; docIds: string[] }>();

  for (const doc of documents) {
    const companyName = doc.extractedCompanyName || doc.accountHolderName;
    if (!companyName) continue;

    const normalized = normalizeCompanyName(companyName);
    if (normalized.length === 0) continue;

    const existing = companyGroups.get(normalized);
    if (existing) {
      existing.docIds.push(doc._id);
    } else {
      companyGroups.set(normalized, { original: companyName, docIds: [doc._id] });
    }
  }

  // Less than 2 distinct companies — nothing to report
  if (companyGroups.size < 2) return [];

  const groups = [...companyGroups.entries()].map(([normalized, data]) => ({
    companyName: data.original,
    normalizedName: normalized,
    documentCount: data.docIds.length,
    documentIds: data.docIds,
  }));

  // Sort by document count descending (primary company first)
  groups.sort((a, b) => b.documentCount - a.documentCount);

  const companyNames = groups.map((g) => g.companyName);

  return [{
    type: "multi_company_detected",
    severity: "warning",
    title: `Documents from ${groups.length} Different Companies`,
    description: `I found documents that seem to belong to different companies: ${companyNames.join(", ")}. You might want to process them separately to keep your reconciliation clean.`,
    details: {
      groups,
      companyNames,
    },
  }];
}

// ============================================================================
// Entry Point
// ============================================================================

/**
 * Run all rules-based checks on the extracted data.
 *
 * @param documents - All documents in the batch
 * @param transactions - All cash transactions extracted
 * @param _accrualDocs - Reserved for future rules that analyze accrual data
 *   directly (e.g. duplicate invoice detection, amount validation).
 *   Currently unused — all accrual analysis is in the cross-reference layer.
 * @returns Array of findings from all rules
 */
export function runRulesLayer(
  documents: DocumentInfo[],
  transactions: TransactionInfo[],
  _accrualDocs: AccrualDocInfo[],
): AgentFinding[] {
  const findings: AgentFinding[] = [];

  findings.push(...detectDateGaps(transactions, documents));
  findings.push(...detectDuplicates(transactions));
  findings.push(...validateAmounts(transactions));
  findings.push(...checkExtractionQuality(documents));
  findings.push(...computePeriodCoverage(documents, transactions));
  findings.push(...validateDocumentTypes(documents));
  findings.push(...detectMultiCompany(documents));

  return findings;
}
