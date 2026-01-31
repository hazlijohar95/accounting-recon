// Transaction Listing CSV Export
import * as XLSX from "xlsx";
import { createWorksheet, createWorkbook, workbookToBase64, formatDate } from "./utils/excel";
import {
  objectsToCSV,
  formatAmount,
  cleanDescription,
  generateFileName,
  formatStatus,
} from "./utils/formatting";
import type { Doc, Id } from "../_generated/dataModel";

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

interface ExportOptions {
  includeMatched: boolean;
  includePending: boolean;
  includeSuspense: boolean;
}

interface TransactionRow {
  date: string;
  type: string;
  description: string;
  reference: string;
  amount: number;
  category: string;
  status: string;
}

export function generateTransactionListingExport(
  data: ExportData,
  format: "xlsx" | "csv",
  options: ExportOptions
): { base64: string; fileName: string; mimeType: string } {
  const { session, transactions, accrualDocuments } = data;

  // Build transaction list
  const allTransactions: TransactionRow[] = [];

  // Add cash transactions
  for (const txn of transactions) {
    if (txn.type !== "cash") continue;

    // Filter based on options
    if (!options.includeMatched && txn.status === "matched") continue;
    if (!options.includePending && txn.status === "pending") continue;
    if (!options.includeSuspense && txn.status === "suspense") continue;

    allTransactions.push({
      date: formatDate(txn.date),
      type: "Cash (Bank)",
      description: cleanDescription(txn.description),
      reference: txn.reference || "",
      amount: txn.amount,
      category: txn.category || "Uncategorized",
      status: formatStatus(txn.status),
    });
  }

  // Add accrual documents
  for (const doc of accrualDocuments) {
    // Filter based on options
    if (!options.includeMatched && doc.status === "matched") continue;
    if (!options.includePending && doc.status === "pending") continue;
    if (!options.includeSuspense && doc.status === "suspense") continue;

    const docTypeLabel = getDocTypeLabel(doc.docType);

    allTransactions.push({
      date: formatDate(doc.docDate),
      type: `Accrual (${docTypeLabel})`,
      description: doc.description
        ? cleanDescription(doc.description)
        : doc.counterparty || doc.docNumber || "No description",
      reference: doc.docNumber || "",
      amount: doc.amount,
      category: docTypeLabel,
      status: formatStatus(doc.status),
    });
  }

  // Sort by date
  allTransactions.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (format === "csv") {
    return generateTransactionListingCSV(allTransactions, session);
  }

  // Excel format
  const headers = [
    "Date",
    "Type",
    "Description",
    "Reference",
    "Amount",
    "Category",
    "Status",
  ];

  const ws = createWorksheet(
    headers,
    allTransactions,
    [
      "date",
      "type",
      "description",
      "reference",
      "amount",
      "category",
      "status",
    ] as const
  );

  const wb = createWorkbook([{ name: "All Transactions", worksheet: ws }]);

  const base64 = workbookToBase64(wb);
  const fileName = generateFileName(
    "Transaction_Listing",
    "xlsx",
    session.name
  );

  return {
    base64,
    fileName,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

function generateTransactionListingCSV(
  transactions: TransactionRow[],
  session: Doc<"reconciliationSessions">
): { base64: string; fileName: string; mimeType: string } {
  const headers = [
    "Date",
    "Type",
    "Description",
    "Reference",
    "Amount",
    "Category",
    "Status",
  ];

  const formattedData = transactions.map((txn) => ({
    ...txn,
    amount: formatAmount(txn.amount),
  }));

  const csv = objectsToCSV(
    formattedData,
    headers,
    [
      "date",
      "type",
      "description",
      "reference",
      "amount",
      "category",
      "status",
    ] as const
  );

  const base64 = Buffer.from(csv).toString("base64");
  const fileName = generateFileName("Transaction_Listing", "csv", session.name);

  return {
    base64,
    fileName,
    mimeType: "text/csv",
  };
}

function getDocTypeLabel(
  docType:
    | "sales_invoice"
    | "purchase_invoice"
    | "pos_report"
    | "settlement"
    | "receipt"
): string {
  const labels: Record<string, string> = {
    sales_invoice: "Sales Invoice",
    purchase_invoice: "Purchase Invoice",
    pos_report: "POS Report",
    settlement: "Settlement",
    receipt: "Receipt",
  };
  return labels[docType] || docType;
}
