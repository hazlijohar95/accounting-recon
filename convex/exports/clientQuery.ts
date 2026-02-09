// Client Query List Export
import {
  createWorksheet,
  createWorkbook,
  workbookToBase64,
  formatDate,
  calculatePriority,
} from "./utils/excel";
import {
  objectsToCSV,
  formatAmount,
  cleanDescription,
  generateFileName,
  formatStatus,
  sortByPriority,
} from "./utils/formatting";
import { formatSuspenseReason } from "./types";
import type { ExportData, ExportOptions } from "./types";
import type { Doc } from "../_generated/dataModel";

interface QueryItem {
  priority: "High" | "Medium" | "Low";
  queryType: string;
  date: string;
  description: string;
  amount: number;
  suggestedAction: string;
  status: string;
}

export function generateClientQueryExport(
  data: ExportData,
  format: "xlsx" | "csv",
  options: ExportOptions
): { base64: string; fileName: string; mimeType: string } {
  const { session, suspenseItems, transactions, matches } = data;

  // Build query list from suspense items and unmatched transactions
  const queryItems: QueryItem[] = [];

  // Add suspense items
  if (options.includeSuspense) {
    for (const item of suspenseItems) {
      queryItems.push({
        priority: calculatePriority(item.amount, item.transactionDate),
        queryType: "Suspense Item",
        date: formatDate(item.transactionDate),
        description: cleanDescription(item.description),
        amount: item.amount,
        suggestedAction: item.suggestedAction || "Review and categorize",
        status: formatStatus(item.status),
      });
    }
  }

  // Add unmatched cash transactions
  const unmatchedCash = transactions.filter(
    (t) => t.type === "cash" && t.status === "pending"
  );
  for (const txn of unmatchedCash) {
    queryItems.push({
      priority: calculatePriority(txn.amount, txn.date),
      queryType: "Missing Document",
      date: formatDate(txn.date),
      description: cleanDescription(txn.description),
      amount: txn.amount,
      suggestedAction: "Obtain supporting invoice/receipt",
      status: "Action Required",
    });
  }

  // Add pending matches that need review
  if (options.includePending) {
    const pendingMatches = matches.filter(
      (m) => m.status === "pending" && m.confidence !== "high"
    );
    for (const match of pendingMatches) {
      if (!match.cashTransaction) continue;
      queryItems.push({
        priority: match.confidence === "low" ? "High" : "Medium",
        queryType: "Match Review Required",
        date: formatDate(match.cashTransaction.date),
        description: cleanDescription(match.cashTransaction.description),
        amount: match.cashTransaction.amount,
        suggestedAction: `Review ${match.confidence} confidence match`,
        status: "Pending Review",
      });
    }
  }

  // Sort by priority
  const sortedItems = sortByPriority(queryItems);

  if (format === "csv") {
    return generateClientQueryCSV(sortedItems, session);
  }

  // Excel format
  const headers = [
    "Priority",
    "Query Type",
    "Date",
    "Description",
    "Amount",
    "Suggested Action",
    "Status",
  ];

  const formattedData = sortedItems.map((item) => ({
    ...item,
    amount: item.amount, // Keep as number for Excel
  }));

  const ws = createWorksheet(
    headers,
    formattedData,
    [
      "priority",
      "queryType",
      "date",
      "description",
      "amount",
      "suggestedAction",
      "status",
    ] as const
  );

  const wb = createWorkbook([{ name: "Client Queries", worksheet: ws }]);

  const base64 = workbookToBase64(wb);
  const fileName = generateFileName("Client_Queries", "xlsx", session.name);

  return {
    base64,
    fileName,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

function generateClientQueryCSV(
  items: QueryItem[],
  session: Doc<"reconciliationSessions">
): { base64: string; fileName: string; mimeType: string } {
  const headers = [
    "Priority",
    "Query Type",
    "Date",
    "Description",
    "Amount",
    "Suggested Action",
    "Status",
  ];

  const formattedData = items.map((item) => ({
    ...item,
    amount: formatAmount(item.amount),
  }));

  const csv = objectsToCSV(
    formattedData,
    headers,
    [
      "priority",
      "queryType",
      "date",
      "description",
      "amount",
      "suggestedAction",
      "status",
    ] as const
  );

  const base64 = Buffer.from(csv).toString("base64");
  const fileName = generateFileName("Client_Queries", "csv", session.name);

  return {
    base64,
    fileName,
    mimeType: "text/csv",
  };
}
