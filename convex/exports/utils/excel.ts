// Excel utility helpers for export generation
import * as XLSX from "xlsx";

// Currency formatting helper
export function formatCurrency(
  value: number,
  currency: string = "MYR"
): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Date formatting helper
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

// Format date for accounting software (DD/MM/YYYY)
export function formatDateAccounting(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format date for QuickBooks (MM/DD/YYYY)
export function formatDateQuickBooks(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Create a worksheet with headers and data
export function createWorksheet<T extends object>(
  headers: string[],
  data: T[],
  columnKeys: readonly (keyof T)[]
): XLSX.WorkSheet {
  // Create header row
  const wsData: unknown[][] = [headers];

  // Add data rows
  for (const row of data) {
    const rowData = columnKeys.map((key) => {
      const value = row[key];
      // Keep numbers as numbers for Excel
      if (typeof value === "number") return value;
      return value ?? "";
    });
    wsData.push(rowData);
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = headers.map((h) => ({
    wch: Math.max(h.length, 12),
  }));
  ws["!cols"] = colWidths;

  return ws;
}

// Create a summary worksheet with key-value pairs
export function createSummaryWorksheet(
  data: Array<{ label: string; value: string | number }>
): XLSX.WorkSheet {
  const wsData = data.map((row) => [row.label, row.value]);
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [{ wch: 30 }, { wch: 25 }];

  return ws;
}

// Create workbook with multiple sheets
export function createWorkbook(
  sheets: Array<{ name: string; worksheet: XLSX.WorkSheet }>
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(wb, sheet.worksheet, sheet.name);
  }

  return wb;
}

// Convert workbook to base64 string
export function workbookToBase64(wb: XLSX.WorkBook): string {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
  return wbout;
}

// Convert workbook to buffer
export function workbookToBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return wbout;
}

// Get match layer description
export function getMatchLayerDescription(layer: number): string {
  const descriptions: Record<number, string> = {
    1: "Exact Match",
    2: "Date Window Match (+/- 7 days)",
    3: "Reference Match",
    4: "Fuzzy Match",
    5: "LLM Semantic Match",
  };
  return descriptions[layer] || `Layer ${layer}`;
}

// Get confidence level color (for conditional formatting notes)
export function getConfidenceColor(score: number): string {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  return "red";
}

// Calculate priority based on amount and age
export function calculatePriority(
  amount: number,
  date: string
): "High" | "Medium" | "Low" {
  const daysSinceTransaction = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (Math.abs(amount) > 5000 || daysSinceTransaction > 30) return "High";
  if (Math.abs(amount) > 1000 || daysSinceTransaction > 14) return "Medium";
  return "Low";
}

// Generate unique document number
export function generateDocNumber(prefix: string, index: number): string {
  const paddedIndex = String(index).padStart(4, "0");
  const year = new Date().getFullYear();
  return `${prefix}${year}${paddedIndex}`;
}
