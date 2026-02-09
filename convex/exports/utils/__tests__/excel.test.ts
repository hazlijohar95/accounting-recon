import { describe, expect, it, vi, afterEach } from "vitest";
import * as XLSX from "xlsx";
import {
  calculatePriority,
  createSummaryWorksheet,
  createWorkbook,
  createWorksheet,
  formatCurrency,
  formatDate,
  formatDateAccounting,
  formatDateQuickBooks,
  generateDocNumber,
  getConfidenceColor,
  getMatchLayerDescription,
  workbookToBase64,
  workbookToBuffer,
} from "../excel";

describe("export excel utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats currency and dates", () => {
    const currency = formatCurrency(1234.5, "MYR");
    expect(currency).toContain("1,234.50");

    const displayDate = formatDate("2024-02-03");
    expect(displayDate).toMatch(/2024/);
    expect(displayDate).toMatch(/Feb/);
    expect(displayDate).toMatch(/03/);

    expect(formatDateAccounting("2024-02-03")).toBe("03/02/2024");
    expect(formatDateQuickBooks("2024-02-03")).toBe("02/03/2024");
  });

  it("creates worksheets with headers and data", () => {
    const headers = ["Name", "Amount"];
    const data = [
      { name: "Alice", amount: 10 },
      { name: "Bob", amount: 20 },
    ];
    const ws = createWorksheet(headers, data, ["name", "amount"] as const);
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    expect(rows[0]).toEqual(["Name", "Amount"]);
    expect(rows[1]).toEqual(["Alice", 10]);
    expect(rows[2]).toEqual(["Bob", 20]);
  });

  it("creates summary worksheets and workbooks", () => {
    const summary = createSummaryWorksheet([
      { label: "Total", value: 100 },
    ]);
    const summaryRows = XLSX.utils.sheet_to_json(summary, { header: 1 }) as unknown[][];
    expect(summaryRows[0]).toEqual(["Total", 100]);

    const wb = createWorkbook([
      { name: "Summary", worksheet: summary },
    ]);
    expect(wb.SheetNames).toEqual(["Summary"]);

    const base64 = workbookToBase64(wb);
    expect(base64.length).toBeGreaterThan(0);

    const buffer = workbookToBuffer(wb);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("describes match layers and confidence colors", () => {
    expect(getMatchLayerDescription(1)).toBe("Exact Match");
    expect(getMatchLayerDescription(7)).toBe("Partial Match");
    expect(getConfidenceColor(95)).toBe("green");
    expect(getConfidenceColor(70)).toBe("yellow");
    expect(getConfidenceColor(50)).toBe("red");
  });

  it("calculates priority and doc numbers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T12:00:00Z"));

    expect(calculatePriority(6000, "2024-02-05")).toBe("High");
    expect(calculatePriority(1500, "2024-01-20")).toBe("Medium");
    expect(calculatePriority(100, "2024-02-08")).toBe("Low");

    expect(generateDocNumber("INV", 7)).toBe("INV20240007");
  });
});
