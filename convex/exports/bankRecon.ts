// Bank Reconciliation Excel Export
import * as XLSX from "xlsx";
import {
  createWorksheet,
  createSummaryWorksheet,
  createWorkbook,
  workbookToBase64,
  formatDate,
  formatCurrency,
  getMatchLayerDescription,
} from "./utils/excel";
import {
  objectsToCSV,
  formatAmount,
  cleanDescription,
  generateFileName,
  formatStatus,
  formatSuspenseReason,
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
    matchReason?: string;
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

export function generateBankReconExport(
  data: ExportData,
  format: "xlsx" | "csv",
  options: ExportOptions
): { base64: string; fileName: string; mimeType: string } {
  const { session, company, matches, transactions, suspenseItems } = data;

  if (format === "csv") {
    return generateBankReconCSV(data, options);
  }

  // Build Excel workbook with 4 sheets

  // Sheet 1: Matched Transactions
  const matchedData = matches
    .filter((m) => {
      if (!options.includeMatched && m.status === "approved") return false;
      if (!options.includePending && m.status === "pending") return false;
      return m.cashTransaction !== null;
    })
    .map((match) => {
      const cash = match.cashTransaction!;
      const accrual = match.accrualDocument || match.accrualTransaction;
      const accrualAmount = match.accrualDocument
        ? match.accrualDocument.amount
        : match.accrualTransaction?.amount ?? 0;

      return {
        date: formatDate(cash.date),
        bankDescription: cleanDescription(cash.description),
        bankAmount: cash.amount,
        invoiceNumber: match.accrualDocument?.docNumber || cash.reference || "",
        counterparty: match.accrualDocument?.counterparty || "",
        invoiceAmount: accrualAmount,
        difference: Math.abs(cash.amount) - Math.abs(accrualAmount),
        matchType: getMatchLayerDescription(match.matchLayer),
        confidence: match.confidenceScore,
      };
    });

  const matchedHeaders = [
    "Date",
    "Bank Description",
    "Bank Amount",
    "Invoice #",
    "Counterparty",
    "Invoice Amount",
    "Difference",
    "Match Type",
    "Confidence %",
  ];

  const matchedWs = createWorksheet(
    matchedHeaders,
    matchedData,
    [
      "date",
      "bankDescription",
      "bankAmount",
      "invoiceNumber",
      "counterparty",
      "invoiceAmount",
      "difference",
      "matchType",
      "confidence",
    ] as const
  );

  // Sheet 2: Suspense Items
  const suspenseData = options.includeSuspense
    ? suspenseItems.map((item) => ({
        date: formatDate(item.transactionDate),
        description: cleanDescription(item.description),
        amount: item.amount,
        source: item.sourceType === "cash" ? "Bank" : "Accrual",
        reason: formatSuspenseReason(item.reason),
        suggestedAction: item.suggestedAction,
        status: formatStatus(item.status),
      }))
    : [];

  const suspenseHeaders = [
    "Date",
    "Description",
    "Amount",
    "Source",
    "Reason",
    "Suggested Action",
    "Status",
  ];

  const suspenseWs = createWorksheet(
    suspenseHeaders,
    suspenseData,
    [
      "date",
      "description",
      "amount",
      "source",
      "reason",
      "suggestedAction",
      "status",
    ] as const
  );

  // Sheet 3: Summary Dashboard
  const cashTxns = transactions.filter((t) => t.type === "cash");
  const accrualTxns = transactions.filter((t) => t.type === "accrual");
  const totalCash = cashTxns.reduce((sum, t) => sum + t.amount, 0);
  const totalAccrual = accrualTxns.reduce((sum, t) => sum + t.amount, 0);
  const matchedCount = matches.filter((m) => m.status === "approved").length;
  const pendingCount = matches.filter((m) => m.status === "pending").length;
  const totalMatches = matchedCount + pendingCount;
  const matchRate =
    cashTxns.length > 0 ? (totalMatches / cashTxns.length) * 100 : 0;

  const summaryData = [
    { label: "Company", value: company.name },
    { label: "Period Start", value: session.periodStart || "N/A" },
    { label: "Period End", value: session.periodEnd || "N/A" },
    { label: "", value: "" },
    { label: "TRANSACTION COUNTS", value: "" },
    { label: "Total Bank Transactions", value: cashTxns.length },
    { label: "Total Accrual Documents", value: accrualTxns.length },
    { label: "Matched Transactions", value: matchedCount },
    { label: "Pending Review", value: pendingCount },
    { label: "Suspense Items", value: suspenseItems.length },
    { label: "", value: "" },
    { label: "RECONCILIATION METRICS", value: "" },
    { label: "Match Rate", value: `${matchRate.toFixed(1)}%` },
    { label: "Total Cash (Bank)", value: formatCurrency(totalCash, company.currency) },
    { label: "Total Accrual", value: formatCurrency(totalAccrual, company.currency) },
    { label: "Total Variance", value: formatCurrency(totalCash - totalAccrual, company.currency) },
  ];

  const summaryWs = createSummaryWorksheet(summaryData);

  // Sheet 4: Journal Entries (for matched items)
  const journalData = matches
    .filter((m) => m.status === "approved" && m.cashTransaction)
    .flatMap((match, idx) => {
      const cash = match.cashTransaction!;
      const docNum = `JV${String(idx + 1).padStart(4, "0")}`;
      const amount = Math.abs(cash.amount);

      // Debit/Credit based on transaction direction
      if (cash.amount > 0) {
        // Inflow: Debit Bank, Credit Receivables
        return [
          {
            date: formatDate(cash.date),
            account: "1100 - Bank Account",
            debit: amount,
            credit: 0,
            description: `Receipt - ${cleanDescription(cash.description)}`,
            reference: docNum,
          },
          {
            date: formatDate(cash.date),
            account: "1200 - Accounts Receivable",
            debit: 0,
            credit: amount,
            description: `Receipt - ${cleanDescription(cash.description)}`,
            reference: docNum,
          },
        ];
      } else {
        // Outflow: Debit Payables, Credit Bank
        return [
          {
            date: formatDate(cash.date),
            account: "2100 - Accounts Payable",
            debit: amount,
            credit: 0,
            description: `Payment - ${cleanDescription(cash.description)}`,
            reference: docNum,
          },
          {
            date: formatDate(cash.date),
            account: "1100 - Bank Account",
            debit: 0,
            credit: amount,
            description: `Payment - ${cleanDescription(cash.description)}`,
            reference: docNum,
          },
        ];
      }
    });

  const journalHeaders = [
    "Date",
    "Account",
    "Debit",
    "Credit",
    "Description",
    "Reference",
  ];

  const journalWs = createWorksheet(
    journalHeaders,
    journalData,
    ["date", "account", "debit", "credit", "description", "reference"] as const
  );

  // Create workbook with all sheets
  const wb = createWorkbook([
    { name: "Matched Transactions", worksheet: matchedWs },
    { name: "Suspense Items", worksheet: suspenseWs },
    { name: "Summary", worksheet: summaryWs },
    { name: "Journal Entries", worksheet: journalWs },
  ]);

  const base64 = workbookToBase64(wb);
  const fileName = generateFileName("Bank_Reconciliation", "xlsx", session.name);

  return {
    base64,
    fileName,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

function generateBankReconCSV(
  data: ExportData,
  options: ExportOptions
): { base64: string; fileName: string; mimeType: string } {
  const { session, matches } = data;

  // For CSV, we export matched transactions only
  const matchedData = matches
    .filter((m) => {
      if (!options.includeMatched && m.status === "approved") return false;
      if (!options.includePending && m.status === "pending") return false;
      return m.cashTransaction !== null;
    })
    .map((match) => {
      const cash = match.cashTransaction!;
      const accrualAmount = match.accrualDocument
        ? match.accrualDocument.amount
        : match.accrualTransaction?.amount ?? 0;

      return {
        date: formatDate(cash.date),
        bankDescription: cleanDescription(cash.description),
        bankAmount: formatAmount(cash.amount),
        invoiceNumber: match.accrualDocument?.docNumber || cash.reference || "",
        counterparty: match.accrualDocument?.counterparty || "",
        invoiceAmount: formatAmount(accrualAmount),
        difference: formatAmount(
          Math.abs(cash.amount) - Math.abs(accrualAmount)
        ),
        matchType: getMatchLayerDescription(match.matchLayer),
        confidence: match.confidenceScore.toString(),
      };
    });

  const headers = [
    "Date",
    "Bank Description",
    "Bank Amount",
    "Invoice #",
    "Counterparty",
    "Invoice Amount",
    "Difference",
    "Match Type",
    "Confidence %",
  ];

  const csv = objectsToCSV(
    matchedData,
    headers,
    [
      "date",
      "bankDescription",
      "bankAmount",
      "invoiceNumber",
      "counterparty",
      "invoiceAmount",
      "difference",
      "matchType",
      "confidence",
    ] as const
  );

  const base64 = Buffer.from(csv).toString("base64");
  const fileName = generateFileName("Bank_Reconciliation", "csv", session.name);

  return {
    base64,
    fileName,
    mimeType: "text/csv",
  };
}
