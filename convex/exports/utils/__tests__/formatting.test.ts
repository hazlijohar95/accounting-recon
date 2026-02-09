import { describe, expect, it, vi, afterEach } from "vitest";
import {
  cleanDescription,
  escapeCSVField,
  formatAmount,
  formatAmountWithSign,
  formatPercentage,
  formatStatus,
  formatSuspenseReason,
  generateFileName,
  objectsToCSV,
  sortByPriority,
  truncateText,
} from "../formatting";

describe("export formatting utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("escapes CSV fields correctly", () => {
    expect(escapeCSVField(undefined)).toBe("");
    expect(escapeCSVField("plain")).toBe("plain");
    expect(escapeCSVField("has,comma")).toBe('"has,comma"');
    expect(escapeCSVField('has"quote')).toBe('"has""quote"');
    expect(escapeCSVField("line\nbreak")).toBe('"line\nbreak"');
  });

  it("converts objects to CSV", () => {
    const data = [
      { name: "Alice", amount: 10 },
      { name: "Bob", amount: 20 },
    ];
    const csv = objectsToCSV(data, ["Name", "Amount"], ["name", "amount"] as const);
    expect(csv.split("\n")).toEqual([
      "Name,Amount",
      "Alice,10",
      "Bob,20",
    ]);
  });

  it("formats amounts and descriptions", () => {
    expect(formatAmount(12)).toBe("12.00");
    expect(formatAmountWithSign(-5)).toBe("-5.00");
    expect(formatAmountWithSign(5)).toBe("5.00");

    const cleaned = cleanDescription("Hello\n  world  ");
    expect(cleaned).toBe("Hello world");
  });

  it("truncates text with ellipsis", () => {
    expect(truncateText("short", 10)).toBe("short");
    expect(truncateText("long text here", 8)).toBe("long ...");
  });

  it("generates safe file names", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    expect(generateFileName("report", "csv")).toBe("report_2024-01-15.csv");
    expect(generateFileName("report", "xlsx", "My Co.")).toBe(
      "report_My_Co__2024-01-15.xlsx"
    );
  });

  it("maps suspense reasons and statuses", () => {
    expect(formatSuspenseReason("no_match")).toBe("No matching document found");
    expect(formatSuspenseReason("custom_reason")).toBe("custom_reason");
    expect(formatStatus("matched")).toBe("Matched");
    expect(formatStatus("custom")).toBe("custom");
  });

  it("formats percentages and sorts by priority", () => {
    expect(formatPercentage(12.3456)).toBe("12.3%");
    expect(formatPercentage(12.3456, 2)).toBe("12.35%");

    const sorted = sortByPriority([
      { priority: "Low", id: 1 },
      { priority: "High", id: 2 },
      { priority: "Medium", id: 3 },
      { priority: "Unknown", id: 4 },
    ]);
    expect(sorted.map((item) => item.id)).toEqual([2, 3, 1, 4]);
  });
});
