// Export type definitions for Reconciled
import { Id } from "@/convex/_generated/dataModel";

// Export formats
export type ExportFormat = "xlsx" | "csv";

// Report types
export type ReportType = "bank_recon" | "client_query" | "transaction_listing";

// Accounting software formats
export type AccountingSoftware =
  | "sql_accounting"
  | "autocount"
  | "quickbooks_iif"
  | "xero_csv";

// Export request options
export interface ExportOptions {
  includeMatched?: boolean;
  includePending?: boolean;
  includeSuspense?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Accounting export options
export interface AccountingExportOptions {
  accountCodes?: {
    bankAccount?: string;
    receivables?: string;
    payables?: string;
    revenue?: string;
    expenses?: string;
  };
  includeJournalEntries?: boolean;
}

// Export request
export interface ExportRequest {
  sessionId: string;
  reportType: ReportType;
  format: ExportFormat;
  options?: ExportOptions;
}

// Accounting export request
export interface AccountingExportRequest {
  sessionId: string;
  software: AccountingSoftware;
  options?: AccountingExportOptions;
}

// Export result
export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  expiresAt?: number;
  error?: string;
}

// Bank reconciliation sheet types
export interface MatchedTransactionRow {
  date: string;
  bankDescription: string;
  bankAmount: number;
  invoiceNumber: string;
  counterparty: string;
  invoiceAmount: number;
  difference: number;
  matchType: string;
  confidence: number;
}

export interface SuspenseItemRow {
  date: string;
  description: string;
  amount: number;
  source: "Cash" | "Accrual";
  reason: string;
  suggestedAction: string;
  status: string;
}

export interface SummaryData {
  companyName: string;
  periodStart: string;
  periodEnd: string;
  totalCashTransactions: number;
  totalAccrualTransactions: number;
  matchedCount: number;
  pendingCount: number;
  suspenseCount: number;
  matchRate: number;
  totalVariance: number;
}

export interface JournalEntryRow {
  date: string;
  account: string;
  debit: number;
  credit: number;
  description: string;
  reference: string;
}

// Client query list types
export type QueryPriority = "High" | "Medium" | "Low";

export interface ClientQueryRow {
  priority: QueryPriority;
  queryType: string;
  date: string;
  description: string;
  amount: number;
  suggestedAction: string;
  status: string;
}

// Transaction listing types
export interface TransactionListingRow {
  date: string;
  type: "Cash" | "Accrual";
  description: string;
  reference?: string;
  amount: number;
  category?: string;
  status: string;
}
