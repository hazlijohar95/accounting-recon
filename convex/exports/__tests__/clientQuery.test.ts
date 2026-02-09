import { describe, expect, it, vi, afterEach } from "vitest";
import * as XLSX from "xlsx";
import { generateClientQueryExport } from "../clientQuery";

const baseData = {
  session: { _id: "session_1", name: "Main Session" } as any,
  company: { _id: "company_1" } as any,
  matches: [],
  transactions: [],
  accrualDocuments: [],
  suspenseItems: [],
} as any;

describe("client query export", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates CSV with suspense, missing docs, and pending matches", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      suspenseItems: [
        {
          transactionDate: "2024-01-01",
          description: "Suspense item",
          amount: 6000,
          suggestedAction: "Investigate",
          status: "pending",
        },
      ],
      transactions: [
        {
          type: "cash",
          status: "pending",
          date: "2024-02-01",
          amount: 2000,
          description: "Unmatched cash",
        },
      ],
      matches: [
        {
          _id: "match_1",
          status: "pending",
          confidence: "low",
          cashTransaction: {
            date: "2024-02-05",
            amount: 100,
            description: "Low confidence match",
          },
        },
      ],
    };

    const result = generateClientQueryExport(data, "csv", {
      includeMatched: true,
      includePending: true,
      includeSuspense: true,
    });

    const csv = Buffer.from(result.base64, "base64").toString("utf8");
    expect(csv).toContain("Suspense Item");
    expect(csv).toContain("Missing Document");
    expect(csv).toContain("Match Review Required");
    expect(csv).toContain("High");
    expect(csv).toContain("Medium");
    expect(result.fileName).toBe("Client_Queries_Main_Session_2024-02-10.csv");
  });

  it("generates XLSX with expected sheet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T00:00:00Z"));

    const data = {
      ...baseData,
      transactions: [
        {
          type: "cash",
          status: "pending",
          date: "2024-02-01",
          amount: 2000,
          description: "Unmatched cash",
        },
      ],
    };

    const result = generateClientQueryExport(data, "xlsx", {
      includeMatched: true,
      includePending: true,
      includeSuspense: true,
    });

    const workbook = XLSX.read(result.base64, { type: "base64" });
    expect(workbook.SheetNames).toEqual(["Client Queries"]);

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Client Queries"], {
      header: 1,
    }) as unknown[][];
    expect(rows[0]).toEqual([
      "Priority",
      "Query Type",
      "Date",
      "Description",
      "Amount",
      "Suggested Action",
      "Status",
    ]);
    expect(result.fileName).toBe("Client_Queries_Main_Session_2024-02-10.xlsx");
  });
});
