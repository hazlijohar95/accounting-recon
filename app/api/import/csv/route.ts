/**
 * CSV Import API Route
 *
 * Parses CSV files and imports them via Convex mutations.
 * Supports both bank transactions (cash) and accrual documents.
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getSession } from "@/lib/auth-server";
import { validateCSRF } from "@/lib/csrf";
import { checkRateLimit, RateLimits, createRateLimitHeaders, getRateLimitIdentifier } from "@/lib/rate-limit";
import { getAuthedConvexClient } from "@/lib/convex-server";

// SECURITY: Maximum CSV file size (10MB)
const MAX_CSV_SIZE = 10 * 1024 * 1024;

// SECURITY: Maximum records per CSV import to prevent memory exhaustion
// A 10MB CSV with 10-byte rows could have 1M records - this limits the impact
const MAX_CSV_RECORDS = 10000;

// Column mapping for flexible CSV headers
const CASH_COLUMN_MAPPINGS: Record<string, string[]> = {
  date: ["date", "transaction_date", "txn_date", "trans_date", "posting_date"],
  description: ["description", "desc", "narrative", "details", "particulars", "transaction_description"],
  amount: ["amount", "value", "sum", "transaction_amount", "debit_credit"],
  reference: ["reference", "ref", "ref_no", "reference_number", "check_number", "cheque_number"],
  category: ["category", "type", "transaction_type", "account_type"],
};

const ACCRUAL_COLUMN_MAPPINGS: Record<string, string[]> = {
  date: ["date", "invoice_date", "doc_date", "document_date", "issue_date"],
  description: ["description", "desc", "details", "notes", "memo"],
  amount: ["amount", "total", "invoice_amount", "value", "net_amount", "gross_amount"],
  docNumber: ["doc_number", "invoice_number", "invoice_no", "document_number", "reference"],
  counterparty: ["counterparty", "customer", "vendor", "supplier", "client", "party_name", "name"],
  docType: ["doc_type", "document_type", "type", "invoice_type"],
  dueDate: ["due_date", "payment_due", "due"],
  taxAmount: ["tax_amount", "tax", "gst", "vat", "sst"],
};

/**
 * Find matching column in CSV headers
 */
function findColumn(headers: string[], mappings: string[]): string | null {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, "_"));

  for (const mapping of mappings) {
    const normalizedMapping = mapping.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const index = normalizedHeaders.indexOf(normalizedMapping);
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v.trim())) {
      continue; // Skip empty rows
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse numeric amount from string
 */
function parseAmount(value: string): number | null {
  if (!value) return null;

  // Remove currency symbols and thousands separators
  let cleaned = value.replace(/[RM$€£¥,\s]/g, "");

  // Handle parentheses as negative (accounting format)
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = "-" + cleaned.slice(1, -1);
  }

  // Handle CR/DR suffixes
  if (cleaned.toUpperCase().endsWith("CR")) {
    cleaned = cleaned.slice(0, -2);
  } else if (cleaned.toUpperCase().endsWith("DR")) {
    cleaned = "-" + cleaned.slice(0, -2);
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: CSRF validation
    const csrf = validateCSRF(request);
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 });
    }

    // SECURITY: Session validation
    // Note: API-level auth validates the user has a valid session cookie.
    // Ownership verification (user owns the sessionId) is enforced at Convex layer
    // via authKit.getAuthUser() in import.ts mutations.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Rate limiting (10 CSV imports per minute)
    const rateLimitResult = await checkRateLimit(
      getRateLimitIdentifier(session),
      'csvImport',
      RateLimits.csvImport
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many import requests. Please try again later." },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const convex = await getAuthedConvexClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const sessionId = formData.get("sessionId") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!type || !["cash", "accrual"].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "cash" or "accrual"' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV files are supported." },
        { status: 400 }
      );
    }

    // SECURITY: Validate file size before loading into memory
    if (file.size > MAX_CSV_SIZE) {
      return NextResponse.json(
        { error: `CSV file too large. Maximum size is ${MAX_CSV_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Parse CSV
    const content = await file.text();
    const { headers, rows } = parseCSV(content);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or has no data rows" }, { status: 400 });
    }

    // SECURITY: Validate record count to prevent memory exhaustion
    // File size validation (10MB) doesn't limit record count for small-row CSVs
    if (rows.length > MAX_CSV_RECORDS) {
      return NextResponse.json(
        {
          error: `Too many records: ${rows.length} rows exceeds maximum of ${MAX_CSV_RECORDS}`,
          hint: "Please split your CSV into smaller files",
        },
        { status: 400 }
      );
    }

    // Map columns based on type
    const columnMappings = type === "cash" ? CASH_COLUMN_MAPPINGS : ACCRUAL_COLUMN_MAPPINGS;

    const mappedColumns: Record<string, string | null> = {};
    for (const [field, aliases] of Object.entries(columnMappings)) {
      mappedColumns[field] = findColumn(headers, aliases);
    }

    // Check required columns
    const requiredFields = type === "cash" ? ["date", "description", "amount"] : ["date", "description", "amount"];

    const missingColumns = requiredFields.filter((f) => !mappedColumns[f]);
    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingColumns.join(", ")}`,
          hint: `Expected columns like: ${missingColumns.map((f) => columnMappings[f].join(" or ")).join("; ")}`,
          foundColumns: headers,
        },
        { status: 400 }
      );
    }

    // Transform rows to records
    if (type === "cash") {
      const records = rows.map((row) => ({
        date: row[mappedColumns.date!] || "",
        description: row[mappedColumns.description!] || "",
        amount: parseAmount(row[mappedColumns.amount!]) || 0,
        reference: mappedColumns.reference ? row[mappedColumns.reference] : undefined,
        category: mappedColumns.category ? row[mappedColumns.category] : undefined,
      })).filter((r) => r.date && r.description);

      // Import via Convex
      const result = await convex.mutation(api.import.importCashTransactions, {
        sessionId: sessionId as Id<"reconciliationSessions">,
        records,
      });

      return NextResponse.json(result);
    } else {
      const records = rows.map((row) => ({
        date: row[mappedColumns.date!] || "",
        description: row[mappedColumns.description!] || "",
        amount: parseAmount(row[mappedColumns.amount!]) || 0,
        docNumber: mappedColumns.docNumber ? row[mappedColumns.docNumber] : undefined,
        counterparty: mappedColumns.counterparty ? row[mappedColumns.counterparty] : undefined,
        docType: mappedColumns.docType ? row[mappedColumns.docType] : undefined,
        dueDate: mappedColumns.dueDate ? row[mappedColumns.dueDate] : undefined,
        taxAmount: mappedColumns.taxAmount ? parseAmount(row[mappedColumns.taxAmount]) ?? undefined : undefined,
      })).filter((r) => r.date && r.description);

      // Import via Convex
      const result = await convex.mutation(api.import.importAccrualDocuments, {
        sessionId: sessionId as Id<"reconciliationSessions">,
        records,
      });

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "CSV Import API",
    usage: "POST with multipart/form-data: file (CSV), type (cash|accrual), sessionId",
    templates: {
      cash: "/templates/bank_transactions_template.csv",
      accrual: "/templates/accrual_documents_template.csv",
    },
  });
}
