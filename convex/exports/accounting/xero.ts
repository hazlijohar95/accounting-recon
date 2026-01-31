// Xero CSV Bank Statement Import Format
import { formatDate } from "../utils/excel";
import { escapeCSVField, cleanDescription, generateFileName } from "../utils/formatting";
import type { Doc, Id } from "../../_generated/dataModel";

interface ExportData {
  session: Doc<"reconciliationSessions">;
  company: Doc<"companies">;
  matches: Array<{
    _id: Id<"matchedPairs">;
    confidence: "high" | "medium" | "low";
    confidenceScore: number;
    matchLayer: 1 | 2 | 3 | 4 | 5;
    status: "pending" | "approved" | "rejected";
    cashTransaction: Doc<"transactions"> | null;
    accrualDocument: Doc<"accrualDocuments"> | null;
    accrualTransaction: Doc<"transactions"> | null;
  }>;
  transactions: Doc<"transactions">[];
  accrualDocuments: Doc<"accrualDocuments">[];
  suspenseItems: Doc<"suspenseItems">[];
}

interface AccountingOptions {
  accountCodes?: {
    bankAccount?: string;
    receivables?: string;
    payables?: string;
    revenue?: string;
    expenses?: string;
  };
  includeJournalEntries?: boolean;
}

/**
 * Xero Bank Statement CSV Import Format
 *
 * Required columns (marked with *):
 * *Date,*Amount,*Payee,Description,Reference
 *
 * Example:
 * 2025-01-15,15000,Acme Corp,Invoice Payment,INV-001
 */
export function generateXeroExport(
  data: ExportData,
  options: AccountingOptions
): { content: string; fileName: string; mimeType: string } {
  const { session, matches, transactions } = data;

  // Header row - Xero expects these specific column names
  const headers = ["*Date", "*Amount", "*Payee", "Description", "Reference"];
  const rows: string[] = [headers.join(",")];

  // Export matched transactions with counterparty info
  const approvedMatches = matches.filter(
    (m) => m.status === "approved" && m.cashTransaction
  );

  for (const match of approvedMatches) {
    const cash = match.cashTransaction!;
    const accrualDoc = match.accrualDocument;

    // Xero date format: YYYY-MM-DD
    const date = cash.date; // Already in ISO format

    // Get counterparty from accrual document if available
    const payee = accrualDoc?.counterparty || extractPayeeFromDescription(cash.description);

    // Description from bank transaction
    const description = cleanDescription(cash.description);

    // Reference from invoice or bank reference
    const reference = accrualDoc?.docNumber || cash.reference || "";

    rows.push(
      [
        date,
        cash.amount.toFixed(2),
        escapeCSVField(payee),
        escapeCSVField(description),
        escapeCSVField(reference),
      ].join(",")
    );
  }

  // Also include unmatched transactions for Xero reconciliation
  const unmatchedCash = transactions.filter(
    (t) => t.type === "cash" && t.status === "pending"
  );

  for (const txn of unmatchedCash) {
    rows.push(
      [
        txn.date,
        txn.amount.toFixed(2),
        escapeCSVField(extractPayeeFromDescription(txn.description)),
        escapeCSVField(cleanDescription(txn.description)),
        escapeCSVField(txn.reference || ""),
      ].join(",")
    );
  }

  const content = rows.join("\n");
  const fileName = generateFileName("Xero_Bank_Import", "csv", session.name);

  return {
    content,
    fileName,
    mimeType: "text/csv",
  };
}

/**
 * Attempt to extract a payee name from bank description
 * Common patterns:
 * - "PAYMENT TO ABC COMPANY"
 * - "TRANSFER FROM XYZ LTD"
 * - "FPX ABC SDN BHD"
 */
function extractPayeeFromDescription(description: string): string {
  // Try to find common patterns
  const patterns = [
    /(?:PAYMENT TO|TRANSFER TO|FPX|IBG)\s+(.+?)(?:\s+\d|$)/i,
    /(?:FROM|TO)\s+(.+?)(?:\s+\d|$)/i,
    /^(.+?)\s+(?:SDN BHD|BHD|PTE LTD|LTD|INC|LLC|CORP)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches, return first 30 chars of description
  return description.substring(0, 30).trim();
}
