import { describe, expect, it, vi, afterEach } from "vitest";
import * as XLSX from "xlsx";
import { generateTransactionListingExport } from "../transactionListing";

const baseData = {
  session: { _id: "session_1", name: "Main Session" } as any,
  company: { _id: "company_1" } as any,
  matches: [],
  transactions: [],
  accrualDocuments: [],
  suspenseItems: [],
} as any;

describe("transaction listing export", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates CSV with filtered transactions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      transactions: [
        {
          type: "cash",
          status: "matched",
          date: "2024-02-05",
          amount: 100,
          description: "Bank payment",
          reference: "REF-1",
          category: "Sales",
        },
        {
          type: "cash",
          status: "pending",
          date: "2024-02-06",
          amount: 50,
          description: "Pending cash",
        },
        {
          type: "cash",
          status: "suspense",
          date: "2024-02-07",
          amount: 10,
          description: "Suspense cash",
        },
      ],
      accrualDocuments: [
        {
          docType: "sales_invoice",
          docDate: "2024-02-04",
          amount: 250,
          status: "pending",
          description: "Invoice A",
          docNumber: "INV-1",
        },
        {
          docType: "receipt",
          docDate: "2024-02-08",
          amount: 80,
          status: "suspense",
          description: "Receipt B",
        },
      ],
    };

    const result = generateTransactionListingExport(data, "csv", {
      includeMatched: true,
      includePending: true,
      includeSuspense: false,
    });

    const csv = Buffer.from(result.base64, "base64").toString("utf8");
    expect(csv).toContain("Cash (Bank)");
    expect(csv).toContain("Accrual (Sales Invoice)");
    expect(csv).not.toContain("Suspense cash");
    expect(result.fileName).toBe("Transaction_Listing_Main_Session_2024-02-10.csv");
    expect(result.mimeType).toBe("text/csv");
  });

  it("generates XLSX with expected sheet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      transactions: [
        {
          type: "cash",
          status: "matched",
          date: "2024-02-05",
          amount: 100,
          description: "Bank payment",
        },
      ],
    };

    const result = generateTransactionListingExport(data, "xlsx", {
      includeMatched: true,
      includePending: true,
      includeSuspense: true,
    });

    const workbook = XLSX.read(result.base64, { type: "base64" });
    expect(workbook.SheetNames).toEqual(["All Transactions"]);

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["All Transactions"], {
      header: 1,
    }) as unknown[][];
    expect(rows[0]).toEqual([
      "Date",
      "Type",
      "Description",
      "Reference",
      "Amount",
      "Category",
      "Status",
    ]);
    expect(result.fileName).toBe("Transaction_Listing_Main_Session_2024-02-10.xlsx");
  });
});
