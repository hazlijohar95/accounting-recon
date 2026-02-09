/**
 * Shared Extraction Utilities
 *
 * Common functions used by both Bedrock and Gemini extraction workflows:
 * - Prompt building per document type
 * - JSON result parsing from model responses
 * - Date normalization (various formats → YYYY-MM-DD)
 * - Document type mapping to schema values
 * - User-friendly error messages
 *
 * @module convex/lib/extractionUtils
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExtractionResult {
  success: boolean;
  confidence: number;
  transactions?: Array<{
    date: string;
    description: string;
    amount: number;
    reference?: string;
  }>;
  invoiceData?: {
    docType: string;
    docNumber?: string;
    docDate: string;
    dueDate?: string;
    counterparty?: string;
    amount: number;
    taxAmount?: number;
    description?: string;
    lineItems?: string;
  };
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  errorMessage?: string;
  // Agent enrichment fields (populated for agent intelligence layer)
  companyNameOnDocument?: string;        // Company/entity name as printed on the document
  extractedCounterparties?: string[];    // All unique counterparty/payee names mentioned
  currency?: string;                     // Detected currency (MYR, USD, SGD, etc.)
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build extraction prompt based on document type.
 *
 * @param documentType - Type of document (bank_statement, invoice, receipt, etc.)
 * @param currentPage - Current page number (1-indexed), or null for whole-document extraction
 * @param totalPages - Total pages in document, or null for whole-document extraction
 */
export function buildExtractionPrompt(
  documentType: string,
  currentPage: number | null,
  totalPages: number | null
): string {
  const isWholeDocument = currentPage === null || totalPages === null;
  const pageContext = !isWholeDocument && totalPages > 1
    ? `\n\nThis is page ${currentPage} of ${totalPages}.`
    : "";
  const allPagesNote = isWholeDocument
    ? "\n\nExtract ALL transactions from ALL pages of this document."
    : "";

  switch (documentType) {
    case "bank_statement":
      return `Extract ALL transactions from this bank statement.${pageContext}${allPagesNote}

For each transaction, extract:
- Date (format: YYYY-MM-DD)
- Description (full text, preserve exact wording)
- Amount (positive for credits/deposits, negative for debits/withdrawals)
- Reference number (if visible)

Also extract if visible:
- Account holder name (the company or person who owns the bank account)
- Account number
- Bank name
- Statement period (start and end dates)
- Company or entity name exactly as printed on the document header
- Currency (e.g., MYR, USD, SGD)
- All unique counterparty/payee names from transaction descriptions (list of names)

Return ONLY valid JSON in this exact format:
{
  "transactions": [
    {
      "date": "2025-01-15",
      "description": "PAYMENT ABC COMPANY",
      "amount": -1500.00,
      "reference": "REF123"
    }
  ],
  "accountHolderName": "ABC Sdn Bhd",
  "accountNumber": "5123456789",
  "bankName": "Maybank",
  "statementPeriod": {"start": "2025-01-01", "end": "2025-01-31"},
  "companyNameOnDocument": "ABC Sdn Bhd",
  "currency": "MYR",
  "counterparties": ["XYZ Trading", "DEF Holdings"]
}

IMPORTANT:
- Debits/withdrawals should be NEGATIVE amounts
- Credits/deposits should be POSITIVE amounts
- Use YYYY-MM-DD date format
- If you cannot extract certain fields, omit them
- counterparties should be unique names only (no duplicates)
- Return ONLY the JSON, no explanations`;

    case "invoice":
    case "purchase_invoice":
      return `Extract all data from this invoice.${pageContext}${allPagesNote}

Return ONLY valid JSON in this exact format:
{
  "docType": "purchase_invoice",
  "docNumber": "INV-001234",
  "docDate": "2025-01-15",
  "dueDate": "2025-02-15",
  "counterparty": "Vendor Company Name",
  "issuingCompany": "Company Name That Created This Document",
  "amount": 1234.56,
  "taxAmount": 123.45,
  "currency": "MYR",
  "description": "Office supplies",
  "lineItems": [
    {"description": "Item 1", "quantity": 2, "unitPrice": 500.00, "total": 1000.00}
  ]
}

IMPORTANT:
- Use YYYY-MM-DD date format
- Amount should be the total including tax
- counterparty is who the invoice is addressed to (recipient/buyer)
- issuingCompany is who created/sent the invoice (seller/vendor)
- If you cannot extract certain fields, omit them
- Return ONLY the JSON, no explanations`;

    case "receipt":
      return `Extract all data from this receipt.${pageContext}${allPagesNote}

Return ONLY valid JSON in this exact format:
{
  "docType": "receipt",
  "docNumber": "RCP-001234",
  "docDate": "2025-01-15",
  "counterparty": "Store Name",
  "issuingCompany": "Company Name That Issued This Receipt",
  "amount": 123.45,
  "taxAmount": 12.34,
  "currency": "MYR",
  "description": "Purchase items",
  "lineItems": [
    {"description": "Item 1", "quantity": 1, "unitPrice": 50.00, "total": 50.00}
  ]
}

IMPORTANT:
- Use YYYY-MM-DD date format
- If you cannot extract certain fields, omit them
- Return ONLY the JSON, no explanations`;

    default:
      return `You are a financial document extraction specialist.${pageContext}${allPagesNote}

STEP 1 — Identify the document type:
- BANK STATEMENT: Shows a list of debit/credit transactions from a bank account over a period
- INVOICE: A bill requesting payment for goods or services (has invoice number, due date)
- RECEIPT: Confirms a completed payment or purchase

STEP 2 — Extract using the matching format below:

=== IF BANK STATEMENT ===
Extract ALL transactions. For each transaction, extract:
- Date (format: YYYY-MM-DD)
- Description (full text, preserve exact wording)
- Amount (positive for credits/deposits, NEGATIVE for debits/withdrawals)
- Reference number (if visible)

Return:
{
  "transactions": [
    {"date": "2025-01-15", "description": "PAYMENT ABC COMPANY", "amount": -1500.00, "reference": "REF123"}
  ],
  "accountHolderName": "ABC Sdn Bhd",
  "accountNumber": "5123456789",
  "bankName": "Bank Name",
  "statementPeriod": {"start": "2025-01-01", "end": "2025-01-31"}
}

=== IF INVOICE or RECEIPT ===
Return:
{
  "docType": "purchase_invoice",
  "docNumber": "INV-001234",
  "docDate": "2025-01-15",
  "dueDate": "2025-02-15",
  "counterparty": "Vendor Company Name",
  "amount": 1234.56,
  "taxAmount": 123.45,
  "description": "Office supplies",
  "lineItems": [{"description": "Item 1", "quantity": 2, "unitPrice": 500.00, "total": 1000.00}]
}

IMPORTANT:
- Choose ONE format only based on the document content
- Debits/withdrawals must be NEGATIVE amounts
- Use YYYY-MM-DD date format
- Omit fields you cannot extract
- Return ONLY valid JSON, no explanations`;
  }
}

// ============================================================================
// Document Classification
// ============================================================================

/**
 * Build a prompt for LLM-based document type classification.
 * Used as a fast pre-extraction step to replace filename-based guessing.
 */
export function buildClassificationPrompt(): string {
  return `Classify this financial document into EXACTLY ONE of these categories:

- "bank_statement" — A bank statement listing multiple debit/credit transactions from a bank account. Look for: opening/closing balance, transaction list with dates and amounts, account number, statement period. Includes Malaysian banks (Maybank, CIMB, Public Bank, RHB, Hong Leong, AmBank, Bank Islam, Bank Rakyat, OCBC, UOB, HSBC, Standard Chartered) — these may use Malay terms like "Penyata Akaun", "Baki", "Pengeluaran", "Simpanan".
- "invoice" — An invoice (purchase or sales) requesting payment for goods or services. Has invoice number, due date, line items.
- "receipt" — A receipt confirming payment or purchase. Has receipt number, payment confirmation.
- "other" — ONLY use this if the document clearly does not fit any category above.

Return ONLY valid JSON in this exact format:
{"documentType": "bank_statement|invoice|receipt|other", "confidence": 95, "reason": "Brief explanation"}

IMPORTANT:
- Choose the SINGLE most appropriate category
- If the document contains a LIST of financial transactions with dates and amounts, it is almost certainly a "bank_statement"
- An invoice is NOT a bank statement even if it lists amounts
- A receipt is NOT a bank statement even if it shows a transaction
- Prefer a specific category over "other" — only use "other" as last resort
- Return ONLY the JSON, no explanations`;
}

/**
 * Parse the classification result from an LLM response.
 *
 * @param text - Raw LLM response text
 * @param fallbackType - Type to use if parsing fails
 */
export function parseClassificationResult(
  text: string,
  fallbackType: string
): { documentType: string; confidence: number } {
  try {
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonObjMatch) return { documentType: fallbackType, confidence: 0 };

    const data = JSON.parse(jsonObjMatch[0]);
    const validTypes = ["bank_statement", "invoice", "receipt", "other"];
    const docType = validTypes.includes(data.documentType) ? data.documentType : fallbackType;
    const confidence = typeof data.confidence === "number" ? data.confidence : 50;

    return { documentType: docType, confidence };
  } catch {
    return { documentType: fallbackType, confidence: 0 };
  }
}

// ============================================================================
// Result Parsing
// ============================================================================

/**
 * Parse extraction result from model response text
 */
export function parseExtractionResult(text: string, documentType: string): ExtractionResult {
  try {
    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonObjMatch) {
      throw new Error("No JSON object found in response");
    }

    const data = JSON.parse(jsonObjMatch[0]);

    // Route based on response shape: if the model returned transactions, treat as bank statement
    // regardless of what the document was classified as. The two schemas (transactions vs invoice)
    // have zero overlapping keys, so presence of transactions is unambiguous.
    const hasTransactions = Array.isArray(data.transactions) && data.transactions.length > 0;

    if (hasTransactions) {
      const transactions: Array<{
        date: string;
        description: string;
        amount: number;
        reference?: string;
      }> = [];

      for (const tx of data.transactions) {
        if (!tx.date || !tx.description || typeof tx.amount !== "number") {
          continue;
        }

        const normalizedDate = normalizeDate(tx.date);
        if (!normalizedDate) continue;

        transactions.push({
          date: normalizedDate,
          description: String(tx.description).trim(),
          amount: tx.amount,
          reference: tx.reference ? String(tx.reference) : undefined,
        });
      }

      return {
        success: transactions.length > 0,
        confidence: transactions.length > 0 ? 80 : 0,
        transactions,
        bankName: typeof data.bankName === "string" ? data.bankName : undefined,
        accountHolderName: typeof data.accountHolderName === "string" ? data.accountHolderName : undefined,
        accountNumber: typeof data.accountNumber === "string" ? String(data.accountNumber) : typeof data.accountNumber === "number" ? String(data.accountNumber) : undefined,
        periodStart: data.statementPeriod?.start ? normalizeDate(data.statementPeriod.start) || undefined : undefined,
        periodEnd: data.statementPeriod?.end ? normalizeDate(data.statementPeriod.end) || undefined : undefined,
        // Agent enrichment fields
        companyNameOnDocument: typeof data.companyNameOnDocument === "string" ? data.companyNameOnDocument : undefined,
        currency: typeof data.currency === "string" ? data.currency : undefined,
        extractedCounterparties: Array.isArray(data.counterparties)
          ? data.counterparties.filter((c: unknown) => typeof c === "string" && c.length > 0)
          : undefined,
      };
    } else {
      // Invoice/receipt
      const docDate = normalizeDate(data.docDate);
      if (!docDate) {
        return {
          success: false,
          confidence: 0,
          errorMessage: "Could not parse document date",
        };
      }

      return {
        success: true,
        confidence: 85,
        invoiceData: {
          docType: mapDocType(data.docType || documentType),
          docNumber: data.docNumber,
          docDate,
          dueDate: data.dueDate ? normalizeDate(data.dueDate) || undefined : undefined,
          counterparty: data.counterparty,
          amount: typeof data.amount === "number" ? data.amount : 0,
          taxAmount: typeof data.taxAmount === "number" ? data.taxAmount : undefined,
          description: data.description,
          lineItems: data.lineItems ? JSON.stringify(data.lineItems) : undefined,
        },
        // Agent enrichment fields — for invoices, issuingCompany is the document's company
        companyNameOnDocument: typeof data.issuingCompany === "string" ? data.issuingCompany : undefined,
        currency: typeof data.currency === "string" ? data.currency : undefined,
        extractedCounterparties: data.counterparty
          ? [data.counterparty, ...(typeof data.issuingCompany === "string" ? [data.issuingCompany] : [])].filter(Boolean)
          : undefined,
      };
    }
  } catch (error) {
    console.error("Failed to parse extraction result:", error);
    return {
      success: false,
      confidence: 0,
      errorMessage: error instanceof Error ? error.message : "Parse error",
    };
  }
}

// ============================================================================
// Date Normalization
// ============================================================================

/**
 * Validate date components are within valid ranges.
 * Accounts for days in month and leap years.
 */
export function isValidDateComponents(year: string, month: string, day: string): boolean {
  const y = parseInt(year);
  const m = parseInt(month);
  const d = parseInt(day);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Adjust for leap year
  if (m === 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) {
    if (d > 29) return false;
  } else {
    if (d > daysInMonth[m - 1]) return false;
  }

  return true;
}

/**
 * Check if a date is reasonable for financial records.
 * - Not more than 10 years in the past
 * - Not more than 1 year in the future (allows for future-dated invoices)
 */
export function isReasonableDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const now = new Date();

    if (isNaN(date.getTime())) return false;

    const tenYearsAgo = new Date(now);
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    return date >= tenYearsAgo && date <= oneYearFromNow;
  } catch {
    return false;
  }
}

/**
 * Normalize date string to YYYY-MM-DD format.
 *
 * Handles various formats:
 * - YYYY-MM-DD (ISO, returned as-is after validation)
 * - DD/MM/YYYY (Malaysian default for ambiguous dates)
 * - MM/DD/YYYY (when month > 12 indicates day)
 * - DD/MM/YY (2-digit year: 00-30 = 2000-2030, 31-99 = 1931-1999)
 * - Native Date-parseable strings (ISO, etc.)
 *
 * Validates date components to prevent invalid dates like 2025-02-31.
 * Returns null if the date cannot be parsed.
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const str = String(dateStr).trim();
  if (!str) return null;

  // Already in YYYY-MM-DD format — validate it
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    if (isValidDateComponents(str.slice(0, 4), str.slice(5, 7), str.slice(8, 10))) {
      return str;
    }
    return null;
  }

  // Try to parse various formats
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day: string, month: string, year: string;

    if (parts[0].length === 4) {
      // YYYY-MM-DD or YYYY/MM/DD
      [year, month, day] = parts;
    } else if (parts[2].length === 4) {
      // DD/MM/YYYY or MM/DD/YYYY
      if (parseInt(parts[0]) > 12) {
        [day, month, year] = parts;
      } else if (parseInt(parts[1]) > 12) {
        [month, day, year] = parts;
      } else {
        // Ambiguous: default to DD/MM/YYYY (Malaysian format)
        [day, month, year] = parts;
      }
    } else if (parts[2].length === 2) {
      // DD/MM/YY — convert 2-digit year
      [day, month, year] = parts;
      const yearNum = parseInt(year);
      if (yearNum >= 0 && yearNum <= 99) {
        year = yearNum <= 30 ? `20${year.padStart(2, "0")}` : `19${year}`;
      }
    } else {
      return null;
    }

    day = day.padStart(2, "0");
    month = month.padStart(2, "0");

    // Validate the components
    if (!isValidDateComponents(year, month, day)) {
      return null;
    }

    return `${year}-${month}-${day}`;
  }

  // Fallback: try native Date parsing (handles ISO strings, etc.)
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      const result = date.toISOString().split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
        return result;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

// ============================================================================
// Document Type Mapping
// ============================================================================

/**
 * Map document type string to valid schema value
 */
export function mapDocType(docType: string): string {
  const typeMap: Record<string, string> = {
    invoice: "purchase_invoice",
    purchase_invoice: "purchase_invoice",
    sales_invoice: "sales_invoice",
    receipt: "receipt",
    pos_report: "pos_report",
    settlement: "settlement",
  };
  return typeMap[docType?.toLowerCase()] || "receipt";
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Convert technical error messages to user-friendly messages
 */
export function getUserFriendlyError(error: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes("429") || errorLower.includes("rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (errorLower.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  if (errorLower.includes("credentials") || errorLower.includes("auth")) {
    return "Service configuration error. Please contact support.";
  }

  if (errorLower.includes("too large") || errorLower.includes("size limit")) {
    return "Document is too large. Please try a smaller file.";
  }

  return "Extraction failed. Please try again or contact support if the issue persists.";
}
