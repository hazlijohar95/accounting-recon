// AutoCount Export Format (Malaysian Accounting Software)
import { formatDateAccounting, generateDocNumber } from "../utils/excel";
import { escapeCSVField, cleanDescription, generateFileName } from "../utils/formatting";
import type { ExportData, AccountingOptions } from "../types";

/**
 * AutoCount Import Format:
 * DocDate,DocNo,AccNo,Description,Dr,Cr
 *
 * Example:
 * 15/01/2025,JV001,4100,Sales Revenue,0,15000
 */
export function generateAutoCountExport(
  data: ExportData,
  options: AccountingOptions
): { content: string; fileName: string; mimeType: string } {
  const { session, matches } = data;

  // Default account codes
  const accounts = {
    bankAccount: options.accountCodes?.bankAccount || "1100",
    receivables: options.accountCodes?.receivables || "1200",
    payables: options.accountCodes?.payables || "2100",
    revenue: options.accountCodes?.revenue || "4100",
    expenses: options.accountCodes?.expenses || "5100",
  };

  // Header row
  const headers = ["DocDate", "DocNo", "AccNo", "Description", "Dr", "Cr"];
  const rows: string[] = [headers.join(",")];

  // Generate journal entries for approved matches
  const approvedMatches = matches.filter(
    (m) => m.status === "approved" && m.cashTransaction
  );

  let docIndex = 1;
  for (const match of approvedMatches) {
    const cash = match.cashTransaction!;
    const docNo = generateDocNumber("JV", docIndex);
    const date = formatDateAccounting(cash.date);
    const description = cleanDescription(cash.description).substring(0, 60);
    const amount = Math.abs(cash.amount);

    if (cash.amount > 0) {
      // Receipt: Debit Bank, Credit Receivables
      rows.push(
        [
          date,
          docNo,
          accounts.bankAccount,
          escapeCSVField(description),
          amount.toFixed(2),
          "0",
        ].join(",")
      );
      rows.push(
        [
          date,
          docNo,
          accounts.receivables,
          escapeCSVField(description),
          "0",
          amount.toFixed(2),
        ].join(",")
      );
    } else {
      // Payment: Debit Payables, Credit Bank
      rows.push(
        [
          date,
          docNo,
          accounts.payables,
          escapeCSVField(description),
          amount.toFixed(2),
          "0",
        ].join(",")
      );
      rows.push(
        [
          date,
          docNo,
          accounts.bankAccount,
          escapeCSVField(description),
          "0",
          amount.toFixed(2),
        ].join(",")
      );
    }

    docIndex++;
  }

  const content = rows.join("\n");
  const fileName = generateFileName("AutoCount_Import", "csv", session.name);

  return {
    content,
    fileName,
    mimeType: "text/csv",
  };
}
