// Formatting utilities for exports

// CSV formatting with proper escaping
export function escapeCSVField(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const stringValue = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Convert array of objects to CSV string
export function objectsToCSV<T extends object>(
  data: T[],
  headers: string[],
  columnKeys: readonly (keyof T)[]
): string {
  // Header row
  const headerRow = headers.map(escapeCSVField).join(",");

  // Data rows
  const dataRows = data.map((row) =>
    columnKeys.map((key) => escapeCSVField(row[key] as string)).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

// Format amount for display (no currency symbol)
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

// Format amount with sign
export function formatAmountWithSign(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount >= 0 ? "" : "-";
  return `${sign}${absAmount.toFixed(2)}`;
}

// Clean description for export (remove special characters that might break CSV/Excel)
export function cleanDescription(description: string): string {
  return description
    .replace(/[\r\n]+/g, " ") // Replace newlines with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

// Truncate text to max length
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Generate filename with timestamp
export function generateFileName(
  baseName: string,
  extension: string,
  sessionName?: string
): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const safeName = sessionName
    ? sessionName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)
    : "";
  return safeName
    ? `${baseName}_${safeName}_${timestamp}.${extension}`
    : `${baseName}_${timestamp}.${extension}`;
}

// Map suspense reason to human-readable text -- delegates to shared types for single source of truth
export { formatSuspenseReason } from "../types";

// Map status to display text
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending Review",
    matched: "Matched",
    approved: "Approved",
    rejected: "Rejected",
    suspense: "Suspense",
    open: "Open",
    queried: "Queried",
    resolved: "Resolved",
  };
  return statusMap[status] || status;
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Sort data by priority (High > Medium > Low)
export function sortByPriority<T extends { priority: string }>(data: T[]): T[] {
  const priorityOrder: Record<string, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
  };
  return [...data].sort(
    (a, b) =>
      (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
  );
}
