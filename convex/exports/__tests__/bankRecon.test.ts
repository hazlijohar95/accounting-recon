import { describe, expect, it, vi, afterEach } from "vitest";
import * as XLSX from "xlsx";
import { generateBankReconExport } from "../bankRecon";

const baseData = {
  session: { _id: "session_1", name: "Main Session", periodStart: "2024-02-01", periodEnd: "2024-02-28" } as any,
  company: { _id: "company_1", name: "Reconciled Inc", currency: "MYR" } as any,
  transactions: [],
  matches: [],
  accrualDocuments: [],
  suspenseItems: [],
} as any;

describe("bank reconciliation export", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates CSV for matched transactions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      matches: [
        {
          _id: "match_1",
          status: "approved",
          matchLayer: 2,
          confidenceScore: 88,
          cashTransaction: {
            date: "2024-02-05",
            amount: 100,
            description: "Bank payment",
            reference: "REF-1",
          },
          accrualDocument: {
            amount: 95,
            docNumber: "INV-1",
            counterparty: "Acme",
          },
        },
        {
          _id: "match_2",
          status: "pending",
          matchLayer: 1,
          confidenceScore: 70,
          cashTransaction: {
            date: "2024-02-06",
            amount: -50,
            description: "Bank out",
          },
          accrualTransaction: {
            amount: -50,
          },
        },
      ],
    };

    const result = generateBankReconExport(data, "csv", {
      includeMatched: true,
      includePending: true,
      includeSuspense: true,
    });

    const csv = Buffer.from(result.base64, "base64").toString("utf8");
    expect(csv.split("\n")[0]).toBe(
      "Date,Bank Description,Bank Amount,Invoice #,Counterparty,Invoice Amount,Difference,Match Type,Confidence %"
    );
    expect(csv).toContain("Date Window Match (+/- 7 days)");
    expect(result.fileName).toBe("Bank_Reconciliation_Main_Session_2024-02-10.csv");
  });

  it("generates XLSX with all sheets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      matches: [
        {
          _id: "match_1",
          status: "approved",
          matchLayer: 1,
          confidenceScore: 92,
          cashTransaction: {
            date: "2024-02-05",
            amount: 100,
            description: "Bank payment",
          },
          accrualDocument: {
            amount: 100,
            docNumber: "INV-1",
            counterparty: "Acme",
          },
        },
      ],
      transactions: [
        { type: "cash", amount: 100 },
        { type: "accrual", amount: 100 },
      ],
      suspenseItems: [
        {
          transactionDate: "2024-02-03",
          description: "Suspense item",
          amount: 25,
          sourceType: "cash",
          reason: "no_match",
          suggestedAction: "Review",
          status: "pending",
        },
      ],
    };

    const result = generateBankReconExport(data, "xlsx", {
      includeMatched: true,
      includePending: true,
      includeSuspense: true,
    });

    const workbook = XLSX.read(result.base64, { type: "base64" });
    expect(workbook.SheetNames).toEqual([
      "Matched Transactions",
      "Suspense Items",
      "Summary",
      "Journal Entries",
    ]);

    const summaryRows = XLSX.utils.sheet_to_json(workbook.Sheets["Summary"], {
      header: 1,
    }) as unknown[][];
    const companyRow = summaryRows.find((row) => row[0] === "Company");
    expect(companyRow?.[1]).toBe("Reconciled Inc");
    expect(result.fileName).toBe("Bank_Reconciliation_Main_Session_2024-02-10.xlsx");
  });
});
