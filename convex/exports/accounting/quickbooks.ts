// QuickBooks IIF Export Format
import { formatDateQuickBooks } from "../utils/excel";
import { cleanDescription, generateFileName } from "../utils/formatting";
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
 * QuickBooks IIF (Intuit Interchange Format)
 *
 * Structure:
 * !TRNS  TRNSID  TRNSTYPE  DATE  ACCNT  AMOUNT  MEMO
 * TRNS  [id]    GENERAL JOURNAL  [date]  [account]  [amount]  [memo]
 * SPL   [id]    GENERAL JOURNAL  [date]  [account]  [amount]  [memo]
 * ENDTRNS
 */
export function generateQuickBooksExport(
  data: ExportData,
  options: AccountingOptions
): { content: string; fileName: string; mimeType: string } {
  const { session, matches } = data;

  // Default account names for QuickBooks
  const accounts = {
    bankAccount: options.accountCodes?.bankAccount || "Bank Account",
    receivables: options.accountCodes?.receivables || "Accounts Receivable",
    payables: options.accountCodes?.payables || "Accounts Payable",
    revenue: options.accountCodes?.revenue || "Sales Revenue",
    expenses: options.accountCodes?.expenses || "Operating Expenses",
  };

  const lines: string[] = [];

  // Header definition
  lines.push("!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO");
  lines.push("!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO");
  lines.push("!ENDTRNS");

  // Generate journal entries for approved matches
  const approvedMatches = matches.filter(
    (m) => m.status === "approved" && m.cashTransaction
  );

  for (const match of approvedMatches) {
    const cash = match.cashTransaction!;
    const date = formatDateQuickBooks(cash.date);
    const memo = cleanDescription(cash.description).substring(0, 60);
    const amount = cash.amount;

    if (amount > 0) {
      // Receipt: Debit Bank (positive), Credit Receivables (negative)
      lines.push(
        `TRNS\t\tGENERAL JOURNAL\t${date}\t${accounts.bankAccount}\t${amount.toFixed(2)}\t${memo}`
      );
      lines.push(
        `SPL\t\tGENERAL JOURNAL\t${date}\t${accounts.receivables}\t${(-amount).toFixed(2)}\t${memo}`
      );
      lines.push("ENDTRNS");
    } else {
      // Payment: Debit Payables (positive), Credit Bank (negative)
      const absAmount = Math.abs(amount);
      lines.push(
        `TRNS\t\tGENERAL JOURNAL\t${date}\t${accounts.payables}\t${absAmount.toFixed(2)}\t${memo}`
      );
      lines.push(
        `SPL\t\tGENERAL JOURNAL\t${date}\t${accounts.bankAccount}\t${(-absAmount).toFixed(2)}\t${memo}`
      );
      lines.push("ENDTRNS");
    }
  }

  const content = lines.join("\n");
  const fileName = generateFileName("QuickBooks_Import", "iif", session.name);

  return {
    content,
    fileName,
    mimeType: "application/x-iif",
  };
}
