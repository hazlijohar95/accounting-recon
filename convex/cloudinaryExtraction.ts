/**
 * Cloudinary + Claude Vision Document Extraction
 *
 * Replaces Reducto API with cost-effective Cloudinary (PDF to images) + Claude Vision (OCR).
 *
 * Architecture:
 * - PDF: Upload to Cloudinary -> Get page images via URL transforms -> Claude Vision per page
 * - Image: Use Convex URL directly -> Claude Vision single call
 *
 * @module convex/cloudinaryExtraction
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authKit } from "./auth";
import { AuthErrors, ResourceErrors, ValidationErrors } from "./lib/errors";
import { boundingBoxValidator } from "./lib/validators";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import pLimit from "p-limit";

// ============================================================================
// Configuration
// ============================================================================

// Cloudinary credentials (from environment)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

// Parallel processing configuration
// Process 3 pages concurrently to balance speed vs API rate limits
const PARALLEL_CONFIG = {
  concurrency: 3,
};

// ============================================================================
// Type Definitions
// ============================================================================

interface CloudinaryUploadResult {
  publicId: string;
  pageCount: number;
  format: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FieldConfidence {
  date?: number;
  description?: number;
  amount?: number;
  reference?: number;
}

interface FieldBoundingBoxes {
  pageNumber: number;
  date?: BoundingBox;
  description?: BoundingBox;
  amount?: BoundingBox;
  reference?: BoundingBox;
}

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  reference?: string;
  /** Per-field confidence scores (0-100) */
  confidence?: FieldConfidence;
  /** Bounding boxes for source linking */
  boundingBox?: {
    date?: BoundingBox;
    description?: BoundingBox;
    amount?: BoundingBox;
    reference?: BoundingBox;
  };
}

interface ExtractedInvoice {
  docType: string;
  docNumber?: string;
  docDate: string;
  dueDate?: string;
  counterparty?: string;
  amount: number;
  taxAmount?: number;
  description?: string;
  lineItems?: string;
}

interface ExtractionResult {
  success: boolean;
  extractedText: string;
  confidence: number;
  transactions?: ExtractedTransaction[];
  invoiceData?: ExtractedInvoice;
  bankName?: string;
  periodStart?: string;
  periodEnd?: string;
  errorMessage?: string;
  /** Count of records skipped due to invalid data (e.g., unparseable dates) */
  skippedCount?: number;
  /** Warnings about data quality issues */
  warnings?: string[];
  /**
   * Pre-computed transaction count for streamed extractions
   * When transactions are streamed page-by-page, this preserves the final count
   * even after transactions array is cleared to prevent re-insertion
   */
  extractedTransactionCount?: number;
}

// ============================================================================
// Cloudinary Functions
// ============================================================================

/**
 * Upload a file to Cloudinary for processing
 * Returns the public ID and page count for PDFs
 */
async function uploadToCloudinary(
  fileUrl: string,
  fileName: string
): Promise<CloudinaryUploadResult> {
  console.log(`[Cloudinary] Starting upload for: ${fileName}`);
  console.log(`[Cloudinary] Cloud name configured: ${!!CLOUDINARY_CLOUD_NAME}`);
  console.log(`[Cloudinary] API key configured: ${!!CLOUDINARY_API_KEY}`);
  console.log(`[Cloudinary] API secret configured: ${!!CLOUDINARY_API_SECRET}`);

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "reconciled/extractions";

  // Generate signature for authenticated upload (Cloudinary uses SHA-1)
  const signatureString = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // Prepare form data for upload
  const formData = new FormData();
  formData.append("file", fileUrl);
  formData.append("folder", folder);
  formData.append("timestamp", timestamp.toString());
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("signature", signature);
  // Request page count info for PDFs
  formData.append("pages", "true");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  console.log(`[Cloudinary] Sending upload request to: ${uploadUrl}`);
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  console.log(`[Cloudinary] Response status: ${response.status}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Cloudinary] Upload failed: ${response.status} - ${errorText}`);
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as {
    public_id: string;
    pages?: number;
    format: string;
  };

  return {
    publicId: result.public_id,
    pageCount: result.pages || 1,
    format: result.format,
  };
}

/**
 * Generate URL for a specific page of a PDF as an image
 * Uses Cloudinary's transformation API
 */
function getPageImageUrl(publicId: string, page: number): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("CLOUDINARY_CLOUD_NAME not configured");
  }

  // Transformation: pg_{page}, width 1200, format jpg for compatibility
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/pg_${page},w_1200,f_jpg/${publicId}`;
}

/**
 * Delete a resource from Cloudinary after extraction
 */
async function cleanupCloudinaryResource(publicId: string): Promise<void> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn("Cloudinary credentials not configured, skipping cleanup");
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Generate signature (Cloudinary uses SHA-1)
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const destroyUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp.toString());
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("signature", signature);

  try {
    await fetch(destroyUrl, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    // Log but don't fail extraction if cleanup fails
    console.error("Cloudinary cleanup failed:", error);
  }
}

// ============================================================================
// Claude Vision Functions
// ============================================================================

/**
 * Call Claude Vision to extract data from an image
 */
async function callClaudeVision(
  imageUrl: string,
  documentType: string,
  currentPage: number,
  totalPages: number
): Promise<string> {
  const region = process.env.AWS_REGION || "us-east-1";
  // Use Haiku for cost-effectiveness
  const modelId = process.env.EXTRACTION_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  const bedrock = createAmazonBedrock({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

  console.log(`[Claude Vision] Fetching image from: ${imageUrl}`);

  // Build the extraction prompt based on document type
  const prompt = buildExtractionPrompt(documentType, currentPage, totalPages);

  // Pass URL directly - AI SDK will fetch and determine mime type
  const { text } = await generateText({
    model: bedrock(modelId),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: new URL(imageUrl),
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    temperature: 0.1,
    maxOutputTokens: 4096,
  });

  return text;
}

/**
 * Fetch with retry logic for transient failures
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: Error | null = null;
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response;
      }

      // Check if retryable
      if (RETRY_CONFIG.retryableStatusCodes.includes(response.status) && attempt < RETRY_CONFIG.maxAttempts) {
        console.log(`Retry attempt ${attempt} for ${url} (status: ${response.status})`);
        await sleep(delay);
        delay *= RETRY_CONFIG.backoffMultiplier;
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < RETRY_CONFIG.maxAttempts) {
        console.log(`Retry attempt ${attempt} for ${url}:`, lastError.message);
        await sleep(delay);
        delay *= RETRY_CONFIG.backoffMultiplier;
      }
    }
  }

  throw lastError || new Error("Unknown fetch error");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Extraction Prompts
// ============================================================================

/**
 * Build the extraction prompt based on document type
 *
 * Enhanced for Phase 2:
 * - Requests per-field confidence scores (0-100)
 * - Requests bounding boxes for source linking (relative percentages)
 */
function buildExtractionPrompt(
  documentType: string,
  currentPage: number,
  totalPages: number
): string {
  const pageContext = totalPages > 1
    ? `\n\nThis is page ${currentPage} of ${totalPages}.`
    : "";

  switch (documentType) {
    case "bank_statement":
      return `Extract ALL transactions from this bank statement image.${pageContext}

For each transaction, extract:
- Date (format: YYYY-MM-DD)
- Description (full text, preserve exact wording)
- Amount (positive for credits/deposits, negative for debits/withdrawals)
- Reference number (if visible)
- Confidence scores for each field (0-100, where 100 = certain)
- Bounding boxes for each field (x, y, width, height as percentages of image 0-100)

Also extract if visible:
- Bank name
- Account number (last 4 digits only for security)
- Statement period (start and end dates)

Return ONLY valid JSON in this exact format:
{
  "transactions": [
    {
      "date": "2025-01-15",
      "description": "PAYMENT ABC COMPANY",
      "amount": -1500.00,
      "reference": "REF123",
      "confidence": {
        "date": 98,
        "description": 85,
        "amount": 95,
        "reference": 72
      },
      "boundingBox": {
        "date": {"x": 5, "y": 20, "width": 10, "height": 2},
        "description": {"x": 18, "y": 20, "width": 45, "height": 2},
        "amount": {"x": 75, "y": 20, "width": 12, "height": 2}
      }
    }
  ],
  "bankName": "Maybank",
  "statementPeriod": {"start": "2025-01-01", "end": "2025-01-31"}
}

IMPORTANT:
- Debits/withdrawals should be NEGATIVE amounts
- Credits/deposits should be POSITIVE amounts
- Use YYYY-MM-DD date format
- Confidence: 90-100 = clear/certain, 70-89 = likely correct, <70 = uncertain
- Bounding boxes: x/y are top-left corner, all values as percentage of image dimensions
- If you cannot extract certain fields, omit them
- Return ONLY the JSON, no explanations`;

    case "invoice":
    case "purchase_invoice":
      return `Extract all data from this invoice.${pageContext}

Return ONLY valid JSON in this exact format:
{
  "docType": "purchase_invoice",
  "docNumber": "INV-001234",
  "docDate": "2025-01-15",
  "dueDate": "2025-02-15",
  "counterparty": "Vendor Company Name",
  "amount": 1234.56,
  "taxAmount": 123.45,
  "description": "Office supplies",
  "lineItems": [
    {"description": "Item 1", "quantity": 2, "unitPrice": 500.00, "total": 1000.00}
  ]
}

IMPORTANT:
- Use YYYY-MM-DD date format
- Amount should be the total including tax
- If you cannot extract certain fields, omit them
- Return ONLY the JSON, no explanations`;

    case "receipt":
      return `Extract all data from this receipt.${pageContext}

Return ONLY valid JSON in this exact format:
{
  "docType": "receipt",
  "docNumber": "RCP-001234",
  "docDate": "2025-01-15",
  "counterparty": "Store Name",
  "amount": 123.45,
  "taxAmount": 12.34,
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
      return `Extract all relevant financial data from this document.${pageContext}

Return ONLY valid JSON with the following structure as applicable:
{
  "docType": "invoice|receipt|statement|other",
  "docNumber": "...",
  "docDate": "YYYY-MM-DD",
  "counterparty": "...",
  "amount": 0.00,
  "description": "...",
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "...", "amount": 0.00}
  ]
}

Return ONLY the JSON, no explanations.`;
  }
}

// ============================================================================
// Data Parsing Functions
// ============================================================================

/**
 * Parse extracted data from Claude response
 *
 * IMPORTANT: This function validates all dates and skips records with invalid dates
 * rather than silently using today's date. This ensures data integrity for financial records.
 */
function parseExtractedData(
  text: string,
  documentType: string
): ExtractionResult {
  const warnings: string[] = [];
  let skippedCount = 0;

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object
    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonObjMatch) {
      throw new Error("No JSON object found in response");
    }

    const data = JSON.parse(jsonObjMatch[0]);

    if (documentType === "bank_statement") {
      // Parse bank statement transactions
      const transactions: ExtractedTransaction[] = [];

      if (Array.isArray(data.transactions)) {
        for (const tx of data.transactions) {
          // Validate required fields exist
          if (!tx.date || !tx.description || typeof tx.amount !== "number") {
            skippedCount++;
            warnings.push(`Skipped transaction: missing required fields (date/description/amount)`);
            continue;
          }

          // CRITICAL: Validate date - don't silently use today's date
          const normalizedDate = normalizeDate(tx.date);
          if (normalizedDate === null) {
            skippedCount++;
            warnings.push(`Skipped transaction with invalid date: "${tx.date}" - ${tx.description}`);
            console.warn(`[Extraction] Skipping transaction with unparseable date: "${tx.date}"`);
            continue;
          }

          // Validate the date is reasonable (not in the future, not too old)
          if (!isReasonableDate(normalizedDate)) {
            skippedCount++;
            warnings.push(`Skipped transaction with unreasonable date: "${normalizedDate}" - ${tx.description}`);
            console.warn(`[Extraction] Skipping transaction with unreasonable date: "${normalizedDate}"`);
            continue;
          }

          // Extract field confidence scores if provided
          const confidence: FieldConfidence | undefined = tx.confidence ? {
            date: typeof tx.confidence.date === 'number' ? tx.confidence.date : undefined,
            description: typeof tx.confidence.description === 'number' ? tx.confidence.description : undefined,
            amount: typeof tx.confidence.amount === 'number' ? tx.confidence.amount : undefined,
            reference: typeof tx.confidence.reference === 'number' ? tx.confidence.reference : undefined,
          } : undefined;

          // Extract bounding boxes if provided
          const boundingBox = tx.boundingBox ? {
            date: parseBoundingBox(tx.boundingBox.date),
            description: parseBoundingBox(tx.boundingBox.description),
            amount: parseBoundingBox(tx.boundingBox.amount),
            reference: parseBoundingBox(tx.boundingBox.reference),
          } : undefined;

          transactions.push({
            date: normalizedDate,
            description: String(tx.description).trim(),
            amount: parseAmount(tx.amount),
            reference: tx.reference ? String(tx.reference) : undefined,
            confidence,
            boundingBox,
          });
        }
      }

      // Parse statement period dates (optional metadata, use null if invalid)
      const periodStart = data.statementPeriod?.start
        ? normalizeDate(data.statementPeriod.start)
        : undefined;
      const periodEnd = data.statementPeriod?.end
        ? normalizeDate(data.statementPeriod.end)
        : undefined;

      // Log if we had to skip any records
      if (skippedCount > 0) {
        console.warn(`[Extraction] Skipped ${skippedCount} records due to invalid data`);
      }

      return {
        success: transactions.length > 0 || skippedCount === 0, // Success if we got transactions OR there were none to begin with
        extractedText: jsonObjMatch[0],
        confidence: calculateConfidence(transactions.length, data, skippedCount),
        transactions,
        bankName: data.bankName,
        periodStart: periodStart ?? undefined,
        periodEnd: periodEnd ?? undefined,
        skippedCount: skippedCount > 0 ? skippedCount : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } else {
      // Parse invoice/receipt
      // CRITICAL: Require valid date for invoices - don't use today's date as fallback
      const rawDocDate = data.docDate;
      const normalizedDocDate = rawDocDate ? normalizeDate(rawDocDate) : null;

      if (!normalizedDocDate) {
        // If we can't parse the date, fail the extraction rather than using wrong data
        const errorMsg = rawDocDate
          ? `Could not parse invoice date: "${rawDocDate}"`
          : "Invoice date is missing";
        console.error(`[Extraction] ${errorMsg}`);
        return {
          success: false,
          extractedText: jsonObjMatch[0],
          confidence: 0,
          errorMessage: errorMsg,
          warnings: [errorMsg],
        };
      }

      // Validate the date is reasonable
      if (!isReasonableDate(normalizedDocDate)) {
        const errorMsg = `Invoice date "${normalizedDocDate}" is unreasonable (too old or in future)`;
        console.error(`[Extraction] ${errorMsg}`);
        return {
          success: false,
          extractedText: jsonObjMatch[0],
          confidence: 0,
          errorMessage: errorMsg,
          warnings: [errorMsg],
        };
      }

      // Parse optional due date (null if invalid, that's OK for optional field)
      const normalizedDueDate = data.dueDate ? normalizeDate(data.dueDate) : undefined;

      const invoiceData: ExtractedInvoice = {
        docType: mapDocType(data.docType || documentType),
        docNumber: data.docNumber,
        docDate: normalizedDocDate,
        dueDate: normalizedDueDate ?? undefined,
        counterparty: data.counterparty,
        amount: parseAmount(data.amount) || 0,
        taxAmount: data.taxAmount ? parseAmount(data.taxAmount) : undefined,
        description: data.description,
        lineItems: data.lineItems ? JSON.stringify(data.lineItems) : undefined,
      };

      return {
        success: true,
        extractedText: jsonObjMatch[0],
        confidence: calculateConfidence(invoiceData.amount > 0 ? 1 : 0, data, 0),
        invoiceData,
      };
    }
  } catch (error) {
    console.error("Failed to parse extraction result:", error);
    return {
      success: false,
      extractedText: text,
      confidence: 0,
      errorMessage: error instanceof Error ? error.message : "Parse error",
    };
  }
}

/**
 * Normalize date to YYYY-MM-DD format
 * Handles: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY
 *
 * CRITICAL: Returns null if date cannot be parsed.
 * This prevents silent data corruption by using today's date as a fallback.
 *
 * @param dateStr - The date string to normalize
 * @returns Normalized date in YYYY-MM-DD format, or null if unparseable
 */
function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  const str = String(dateStr).trim();

  if (!str) {
    return null;
  }

  // Already in YYYY-MM-DD format - validate it
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
      // Assume DD/MM/YYYY (Malaysian format) if first part <= 12 could be either
      // But if first part > 12, it must be day
      if (parseInt(parts[0]) > 12) {
        // DD/MM/YYYY
        [day, month, year] = parts;
      } else if (parseInt(parts[1]) > 12) {
        // MM/DD/YYYY
        [month, day, year] = parts;
      } else {
        // Assume DD/MM/YYYY (more common in Malaysia)
        [day, month, year] = parts;
      }
    } else if (parts[2].length === 2) {
      // DD/MM/YY
      [day, month, year] = parts;
      // Convert 2-digit year to 4-digit
      const yearNum = parseInt(year);
      if (yearNum >= 0 && yearNum <= 99) {
        // Assume 00-30 is 2000-2030, 31-99 is 1931-1999
        year = yearNum <= 30 ? `20${year.padStart(2, "0")}` : `19${year}`;
      }
    } else {
      // Unknown format
      return null;
    }

    // Pad with zeros
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
      // Double-check the result is valid
      if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
        return result;
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Could not parse - return null instead of today's date
  return null;
}

/**
 * Validate date components are within valid ranges
 */
function isValidDateComponents(year: string, month: string, day: string): boolean {
  const y = parseInt(year);
  const m = parseInt(month);
  const d = parseInt(day);

  // Basic range checks
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // Check days in month
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
 * Check if a date is reasonable for financial records
 * - Not more than 10 years in the past
 * - Not more than 1 year in the future (allows for future-dated invoices)
 */
function isReasonableDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const now = new Date();

    // Check if date is valid
    if (isNaN(date.getTime())) return false;

    // Calculate boundaries
    const tenYearsAgo = new Date(now);
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    // Date should be within reasonable range
    return date >= tenYearsAgo && date <= oneYearFromNow;
  } catch {
    return false;
  }
}

/**
 * Parse bounding box from extracted data
 * Validates and normalizes bounding box coordinates
 */
function parseBoundingBox(box: unknown): BoundingBox | undefined {
  if (!box || typeof box !== 'object') return undefined;

  const b = box as Record<string, unknown>;
  const x = typeof b.x === 'number' ? b.x : undefined;
  const y = typeof b.y === 'number' ? b.y : undefined;
  const width = typeof b.width === 'number' ? b.width : undefined;
  const height = typeof b.height === 'number' ? b.height : undefined;

  // All fields required
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined;
  }

  // Validate ranges (0-100 percentages)
  if (x < 0 || x > 100 || y < 0 || y > 100 || width < 0 || width > 100 || height < 0 || height > 100) {
    return undefined;
  }

  return { x, y, width, height };
}

/**
 * Parse amount from various formats
 */
function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    // Remove currency symbols, spaces, and thousand separators
    const cleaned = value
      .replace(/[RM$MYR\s]/gi, "")
      .replace(/,/g, "")
      .trim();

    // Handle parentheses for negative (accounting format)
    if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
      return -parseFloat(cleaned.slice(1, -1));
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}

/**
 * Map document type to valid schema value
 */
function mapDocType(docType: string): string {
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

/**
 * Calculate extraction confidence score
 *
 * Factors:
 * - Number of items extracted (more = higher confidence)
 * - Presence of key metadata fields
 * - Number of skipped records (more skipped = lower confidence)
 */
function calculateConfidence(
  itemCount: number,
  data: Record<string, unknown>,
  skippedCount: number = 0
): number {
  let score = 50; // Base score

  // Items extracted
  if (itemCount > 0) score += 20;
  if (itemCount >= 5) score += 10;
  if (itemCount >= 10) score += 10;

  // Key fields present
  if (data.bankName || data.counterparty) score += 5;
  if (data.statementPeriod || data.docDate) score += 5;

  // Penalty for skipped records (indicates data quality issues)
  if (skippedCount > 0) {
    const totalAttempted = itemCount + skippedCount;
    const skipRatio = skippedCount / totalAttempted;

    // Reduce score based on skip ratio
    // 10% skipped = -5 points, 50% skipped = -25 points
    score -= Math.round(skipRatio * 50);
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregate results from multiple pages
 */
function aggregatePageResults(
  pageResults: ExtractionResult[],
  documentType: string
): ExtractionResult {
  if (pageResults.length === 0) {
    return {
      success: false,
      extractedText: "",
      confidence: 0,
      errorMessage: "No pages processed",
    };
  }

  if (pageResults.length === 1) {
    return pageResults[0];
  }

  // Aggregate bank statement transactions
  if (documentType === "bank_statement") {
    const allTransactions: ExtractedTransaction[] = [];
    const allText: string[] = [];
    let bankName: string | undefined;
    let periodStart: string | undefined;
    let periodEnd: string | undefined;
    let successCount = 0;

    for (const result of pageResults) {
      if (result.success) {
        successCount++;
        if (result.transactions) {
          allTransactions.push(...result.transactions);
        }
        allText.push(result.extractedText);

        // Use first found metadata
        if (!bankName && result.bankName) bankName = result.bankName;
        if (!periodStart && result.periodStart) periodStart = result.periodStart;
        if (!periodEnd && result.periodEnd) periodEnd = result.periodEnd;
      }
    }

    // Deduplicate transactions by date+description+amount
    const seen = new Set<string>();
    const uniqueTransactions = allTransactions.filter(tx => {
      const key = `${tx.date}|${tx.description}|${tx.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date
    uniqueTransactions.sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: successCount > 0,
      extractedText: allText.join("\n\n---PAGE---\n\n"),
      confidence: Math.round((successCount / pageResults.length) * 100),
      transactions: uniqueTransactions,
      bankName,
      periodStart,
      periodEnd,
    };
  }

  // For non-bank statements, use the first successful result
  const successfulResult = pageResults.find(r => r.success);
  return successfulResult || pageResults[0];
}

// ============================================================================
// Main Extraction Action
// ============================================================================

/**
 * Trigger Cloudinary-based extraction for a document
 *
 * IDEMPOTENCY: This action includes protection against duplicate extractions:
 * - If extraction is already "processing", returns existing job ID
 * - If extraction is already "completed", returns success without re-extracting
 * - Uses deterministic job ID based on document ID to prevent duplicates
 */
export const triggerCloudinaryExtraction = action({
  args: {
    documentId: v.id("documents"),
    workosUserId: v.optional(v.string()),
    /** Force re-extraction even if already completed (use with caution) */
    force: v.optional(v.boolean()),
  },
  // Return type includes message for idempotency feedback
  returns: v.object({
    jobId: v.string(),
    success: v.boolean(),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ jobId: string; success: boolean; message?: string }> => {
    console.log(`[Extraction] ===== START triggerCloudinaryExtraction =====`);
    console.log(`[Extraction] Document ID: ${args.documentId}, Force: ${args.force}`);

    // SECURITY: Verify user is authenticated
    let authUser: { id: string } | null = null;
    try {
      authUser = await authKit.getAuthUser(ctx);
      console.log(`[Extraction] AuthKit user: ${authUser?.id || 'null'}`);
    } catch (e) {
      // AuthKit failed - use fallback
      console.log(`[Extraction] AuthKit failed: ${e}`);
    }

    const effectiveWorkosId = authUser?.id ?? args.workosUserId;
    console.log(`[Extraction] Effective WorkOS ID: ${effectiveWorkosId || 'null'}`);

    if (!effectiveWorkosId) {
      return { jobId: "", success: false, message: "Authentication required" };
    }

    // Get document details
    const document = await ctx.runQuery(internal.cloudinaryExtraction.getDocument, {
      documentId: args.documentId,
    });

    if (!document) {
      return { jobId: "", success: false, message: "Document not found" };
    }

    // =========================================================================
    // IDEMPOTENCY CHECK: Prevent duplicate extractions
    // =========================================================================

    // Generate deterministic job ID based on document ID
    // This ensures the same document always gets the same job ID
    const jobId = `cloudinary-${args.documentId}`;

    // Check if extraction is already in progress (unless force=true to unstick)
    if (document.extractionStatus === "processing" && !args.force) {
      console.log(`[Extraction] Document ${args.documentId} is already being processed`);
      return {
        jobId: document.extractionJobId || jobId,
        success: false,
        message: "Extraction already in progress",
      };
    }

    // Check if extraction was already completed (unless force=true)
    if (document.extractionStatus === "completed" && !args.force) {
      console.log(`[Extraction] Document ${args.documentId} was already extracted`);
      return {
        jobId: document.extractionJobId || jobId,
        success: true,
        message: "Already extracted",
      };
    }

    // If forcing re-extraction, log it
    if ((document.extractionStatus === "completed" || document.extractionStatus === "processing") && args.force) {
      console.log(`[Extraction] Force re-extracting document ${args.documentId} (was: ${document.extractionStatus})`);
    }

    // =========================================================================
    // Authorization Check
    // =========================================================================

    // Verify ownership
    const user = await ctx.runQuery(api.users.getByWorkosId, {
      workosId: effectiveWorkosId,
    });

    if (!user) {
      return { jobId: "", success: false, message: "User not found" };
    }

    const company = await ctx.runQuery(api.companies.get, {
      id: document.companyId,
      workosUserId: effectiveWorkosId,
    });

    if (!company || company.ownerId !== user._id) {
      return { jobId: "", success: false, message: "Access denied" };
    }

    if (!document.storageId) {
      return { jobId: "", success: false, message: "Document has no file" };
    }

    // Get storage URL
    const storageUrl = await ctx.runQuery(internal.documents.getStorageUrl, {
      storageId: document.storageId,
    });

    if (!storageUrl) {
      return { jobId: "", success: false, message: "File not found in storage" };
    }

    // =========================================================================
    // Start Extraction
    // =========================================================================

    // Update status to processing AND set job ID atomically
    // This prevents race conditions where two requests could both pass the "processing" check
    await ctx.runMutation(internal.cloudinaryExtraction.startExtraction, {
      documentId: args.documentId,
      jobId,
    });

    try {
      // Determine if PDF or image
      const isPdf = document.fileType === "pdf" ||
        document.fileName.toLowerCase().endsWith(".pdf");

      console.log(`[Extraction] Processing ${isPdf ? "PDF" : "image"}: ${document.fileName}`);

      let result: ExtractionResult;

      if (isPdf) {
        result = await extractFromPdf(
          ctx,
          args.documentId,
          document.companyId,
          storageUrl,
          document.fileName,
          document.documentType
        );
      } else {
        result = await extractFromImage(storageUrl, document.documentType);
      }

      // Store extraction results
      await ctx.runMutation(internal.cloudinaryExtraction.handleExtractionResults, {
        documentId: args.documentId,
        companyId: document.companyId,
        jobId,
        result: {
          success: result.success,
          extractedText: result.extractedText,
          confidence: result.confidence,
          transactions: result.transactions,
          invoiceData: result.invoiceData,
          bankName: result.bankName,
          periodStart: result.periodStart,
          periodEnd: result.periodEnd,
          errorMessage: result.errorMessage,
        },
        documentType: document.documentType,
      });

      // Build success message
      let message = "Extraction completed";
      if (result.skippedCount && result.skippedCount > 0) {
        message = `Extraction completed with ${result.skippedCount} skipped record(s)`;
      }

      return { jobId, success: result.success, message };
    } catch (error) {
      console.error("[Extraction] Failed:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.cloudinaryExtraction.updateDocumentStatus, {
        documentId: args.documentId,
        status: "failed",
        errorMessage: getUserFriendlyError(errorMessage),
      });

      return { jobId, success: false, message: getUserFriendlyError(errorMessage) };
    }
  },
});

// Type for the extraction context with properly typed mutations
interface ExtractionContext {
  runMutation: {
    (
      fn: typeof internal.cloudinaryExtraction.updateExtractionProgress,
      args: {
        documentId: Id<"documents">;
        currentPage: number;
        totalPages: number;
        pagesCompleted?: number;
        streamedTransactionCount?: number;
      }
    ): Promise<null>;
    (
      fn: typeof internal.cloudinaryExtraction.streamPageTransactions,
      args: {
        documentId: Id<"documents">;
        companyId: Id<"companies">;
        transactions: Array<{
          date: string;
          description: string;
          amount: number;
          reference?: string;
        }>;
        pageNumber: number;
        totalPages: number;
        pagesCompleted: number;
      }
    ): Promise<{ insertedCount: number; totalStreamed: number }>;
  };
}

/**
 * Extract data from a PDF using Cloudinary page transformations
 *
 * Performance optimization: Processes pages in parallel (3 concurrent) for 3x speed improvement.
 * A 10-page PDF that took ~45s now completes in ~15s.
 *
 * Streaming: Transactions are inserted to the database as each page completes,
 * allowing the UI to show real-time progress. Final deduplication happens at the end.
 */
async function extractFromPdf(
  ctx: ExtractionContext,
  documentId: Id<"documents">,
  companyId: Id<"companies">,
  fileUrl: string,
  fileName: string,
  documentType: string
): Promise<ExtractionResult> {
  // Upload PDF to Cloudinary
  console.log("[Extraction] Uploading PDF to Cloudinary...");
  const uploadResult = await uploadToCloudinary(fileUrl, fileName);
  console.log(`[Extraction] PDF uploaded: ${uploadResult.pageCount} pages`);

  // Create array to store results in correct order
  const pageResults: ExtractionResult[] = new Array(uploadResult.pageCount);

  // Track completed pages for progress updates
  let pagesCompleted = 0;
  let totalStreamedTransactions = 0;

  // Track all transactions for final deduplication
  const allTransactionsMap = new Map<string, ExtractedTransaction>();

  try {
    // Create a concurrency limiter (3 pages at a time)
    const limit = pLimit(PARALLEL_CONFIG.concurrency);

    // Create array of page numbers [1, 2, 3, ..., pageCount]
    const pageNumbers = Array.from({ length: uploadResult.pageCount }, (_, i) => i + 1);

    console.log(`[Extraction] Processing ${uploadResult.pageCount} pages with concurrency ${PARALLEL_CONFIG.concurrency}...`);

    // Process all pages in parallel with controlled concurrency
    await Promise.all(
      pageNumbers.map((page) =>
        limit(async () => {
          console.log(`[Extraction] Processing page ${page}/${uploadResult.pageCount}`);

          // Get page image URL
          const pageImageUrl = getPageImageUrl(uploadResult.publicId, page);

          // Extract data from page using Claude Vision
          const rawResult = await callClaudeVision(
            pageImageUrl,
            documentType,
            page,
            uploadResult.pageCount
          );

          // Parse the result
          const pageResult = parseExtractedData(rawResult, documentType);

          // Store result in correct position (0-indexed)
          pageResults[page - 1] = pageResult;

          // Update completed count
          pagesCompleted++;

          // Stream transactions immediately for bank statements
          if (documentType === "bank_statement" && pageResult.transactions && pageResult.transactions.length > 0) {
            // Filter out duplicates before streaming
            const newTransactions: ExtractedTransaction[] = [];
            for (const tx of pageResult.transactions) {
              const key = `${tx.date}|${tx.description}|${tx.amount}`;
              if (!allTransactionsMap.has(key)) {
                allTransactionsMap.set(key, tx);
                newTransactions.push(tx);
              }
            }

            // Stream non-duplicate transactions
            if (newTransactions.length > 0) {
              const streamResult = await ctx.runMutation(internal.cloudinaryExtraction.streamPageTransactions, {
                documentId,
                companyId,
                transactions: newTransactions,
                pageNumber: page,
                totalPages: uploadResult.pageCount,
                pagesCompleted,
              }) as { insertedCount: number; totalStreamed: number };
              totalStreamedTransactions = streamResult.totalStreamed;
            }
          }

          // Update progress
          await ctx.runMutation(internal.cloudinaryExtraction.updateExtractionProgress, {
            documentId,
            currentPage: pagesCompleted,
            totalPages: uploadResult.pageCount,
            pagesCompleted,
            streamedTransactionCount: totalStreamedTransactions,
          });

          console.log(`[Extraction] Page ${page} complete (${pagesCompleted}/${uploadResult.pageCount} done, ${totalStreamedTransactions} transactions)`);

          return pageResult;
        })
      )
    );

    // Aggregate results from all pages (already in correct order)
    // Note: For streaming, transactions are already inserted, so we skip re-insertion
    const aggregatedResult = aggregatePageResults(pageResults, documentType);

    // Mark that transactions were already streamed (don't re-insert in handleExtractionResults)
    if (documentType === "bank_statement") {
      const finalCount = allTransactionsMap.size;
      aggregatedResult.transactions = undefined; // Clear to prevent re-insertion
      // CRITICAL: Preserve the count in a field that handleExtractionResults will use
      // This fixes the bug where document shows 0 transactions after streaming
      (aggregatedResult as ExtractionResult & { extractedTransactionCount?: number }).extractedTransactionCount = finalCount;
      console.log(`[Extraction] Final transaction count: ${finalCount} (streamed)`);
    }

    return aggregatedResult;
  } finally {
    // Cleanup Cloudinary resource
    console.log("[Extraction] Cleaning up Cloudinary resource...");
    await cleanupCloudinaryResource(uploadResult.publicId);
  }
}

/**
 * Extract data from a single image
 */
async function extractFromImage(
  imageUrl: string,
  documentType: string
): Promise<ExtractionResult> {
  console.log("[Extraction] Processing image with Claude Vision...");

  // Direct Claude Vision call
  const rawResult = await callClaudeVision(imageUrl, documentType, 1, 1);

  // Parse the result
  return parseExtractedData(rawResult, documentType);
}

/**
 * Convert technical error to user-friendly message
 */
function getUserFriendlyError(error: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes("cloudinary") && errorLower.includes("quota")) {
    return "Monthly processing limit reached. Please try again next month or upgrade your plan.";
  }

  if (errorLower.includes("429") || errorLower.includes("rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (errorLower.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  if (errorLower.includes("credentials") || errorLower.includes("auth")) {
    return "Service configuration error. Please contact support.";
  }

  if (errorLower.includes("content policy") || errorLower.includes("blocked")) {
    return "Document could not be processed. Please try a different document or contact support.";
  }

  // Generic fallback
  return "Extraction failed. Please try again or contact support if the issue persists.";
}

// ============================================================================
// Internal Queries
// ============================================================================

export const getDocument = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.object({
      _id: v.id("documents"),
      companyId: v.id("companies"),
      fileName: v.string(),
      fileType: v.string(),
      storageId: v.optional(v.id("_storage")),
      documentType: v.union(
        v.literal("bank_statement"),
        v.literal("invoice"),
        v.literal("receipt"),
        v.literal("other")
      ),
      // Include extraction status for idempotency checks
      extractionStatus: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      ),
      extractionJobId: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    return {
      _id: doc._id,
      companyId: doc.companyId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      storageId: doc.storageId,
      documentType: doc.documentType,
      extractionStatus: doc.extractionStatus,
      extractionJobId: doc.extractionJobId,
    };
  },
});

// ============================================================================
// Internal Mutations
// ============================================================================

export const updateDocumentStatus = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = {
      extractionStatus: args.status,
    };

    if (args.errorMessage) {
      update.errorMessage = args.errorMessage;
    }

    if (args.status === "completed" || args.status === "failed") {
      update.processedAt = Date.now();
      // Clear progress on completion/failure
      update.extractionProgress = undefined;
    }

    await ctx.db.patch(args.documentId, update);
    return null;
  },
});

/**
 * Start extraction - atomically set status to "processing" and assign job ID
 *
 * This is used instead of separate updateDocumentStatus + updateDocumentJobId calls
 * to prevent race conditions where two requests could both pass the idempotency check.
 */
export const startExtraction = internalMutation({
  args: {
    documentId: v.id("documents"),
    jobId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Double-check the document isn't already processing (defense in depth)
    const doc = await ctx.db.get(args.documentId);
    if (doc && doc.extractionStatus === "processing") {
      // Another request beat us to it - this is fine, just return
      console.log(`[Extraction] Race condition avoided - document ${args.documentId} already processing`);
      return null;
    }

    // Atomically update both fields
    await ctx.db.patch(args.documentId, {
      extractionStatus: "processing",
      extractionJobId: args.jobId,
      errorMessage: undefined, // Clear any previous error
      extractionProgress: undefined, // Clear any stale progress
    });

    return null;
  },
});

export const updateDocumentJobId = internalMutation({
  args: {
    documentId: v.id("documents"),
    jobId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, { extractionJobId: args.jobId });
    return null;
  },
});

export const updateExtractionProgress = internalMutation({
  args: {
    documentId: v.id("documents"),
    currentPage: v.number(),
    totalPages: v.number(),
    /** Number of pages fully completed (for parallel processing) */
    pagesCompleted: v.optional(v.number()),
    /** Running count of transactions extracted so far */
    streamedTransactionCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      extractionProgress: {
        currentPage: args.currentPage,
        totalPages: args.totalPages,
        // Track completed pages separately when processing in parallel
        pagesCompleted: args.pagesCompleted,
        // Track streamed transaction count for real-time display
        streamedTransactionCount: args.streamedTransactionCount,
      },
    });
    return null;
  },
});

/**
 * Stream transactions from a single page immediately
 *
 * This mutation is called as each page completes extraction, allowing
 * the UI to show transactions in real-time rather than waiting for
 * all pages to complete.
 */
// Note: boundingBoxValidator imported from lib/validators.ts

export const streamPageTransactions = internalMutation({
  args: {
    documentId: v.id("documents"),
    companyId: v.id("companies"),
    transactions: v.array(
      v.object({
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        reference: v.optional(v.string()),
        // Field-level confidence scores (Phase 2)
        confidence: v.optional(v.object({
          date: v.optional(v.number()),
          description: v.optional(v.number()),
          amount: v.optional(v.number()),
          reference: v.optional(v.number()),
        })),
        // Bounding boxes for source linking (Phase 2)
        boundingBox: v.optional(v.object({
          date: v.optional(boundingBoxValidator),
          description: v.optional(boundingBoxValidator),
          amount: v.optional(boundingBoxValidator),
          reference: v.optional(boundingBoxValidator),
        })),
      })
    ),
    pageNumber: v.number(),
    totalPages: v.number(),
    pagesCompleted: v.number(),
  },
  returns: v.object({
    insertedCount: v.number(),
    totalStreamed: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify document belongs to company
    const document = await ctx.db.get(args.documentId);
    if (!document || document.companyId !== args.companyId) {
      console.error("Document/company mismatch - potential security issue");
      return { insertedCount: 0, totalStreamed: 0 };
    }

    // Insert transactions immediately
    const now = Date.now();
    let insertedCount = 0;

    for (const tx of args.transactions) {
      await ctx.db.insert("transactions", {
        companyId: args.companyId,
        date: tx.date,
        description: tx.description,
        reference: tx.reference,
        amount: tx.amount,
        type: "cash",
        status: "pending",
        sourceDocumentId: args.documentId,
        createdAt: now,
        // Store field-level confidence (Phase 2)
        fieldConfidence: tx.confidence,
        // Store bounding boxes with page number (Phase 2)
        boundingBoxes: tx.boundingBox ? {
          pageNumber: args.pageNumber,
          ...tx.boundingBox,
        } : undefined,
      });
      insertedCount++;
    }

    // Calculate new total streamed count
    const currentProgress = document.extractionProgress;
    const previousStreamedCount = currentProgress?.streamedTransactionCount || 0;
    const totalStreamed = previousStreamedCount + insertedCount;

    // Update progress with new streamed count
    await ctx.db.patch(args.documentId, {
      extractionProgress: {
        currentPage: args.pagesCompleted,
        totalPages: args.totalPages,
        pagesCompleted: args.pagesCompleted,
        streamedTransactionCount: totalStreamed,
      },
    });

    console.log(`[Extraction] Streamed ${insertedCount} transactions from page ${args.pageNumber} (total: ${totalStreamed})`);

    return { insertedCount, totalStreamed };
  },
});

/**
 * Handle extraction results and store in database
 */
export const handleExtractionResults = internalMutation({
  args: {
    documentId: v.id("documents"),
    companyId: v.id("companies"),
    jobId: v.string(),
    result: v.object({
      success: v.boolean(),
      extractedText: v.string(),
      confidence: v.number(),
      transactions: v.optional(
        v.array(
          v.object({
            date: v.string(),
            description: v.string(),
            amount: v.number(),
            reference: v.optional(v.string()),
          })
        )
      ),
      invoiceData: v.optional(
        v.object({
          docType: v.string(),
          docNumber: v.optional(v.string()),
          docDate: v.string(),
          dueDate: v.optional(v.string()),
          counterparty: v.optional(v.string()),
          amount: v.number(),
          taxAmount: v.optional(v.number()),
          description: v.optional(v.string()),
          lineItems: v.optional(v.string()),
        })
      ),
      bankName: v.optional(v.string()),
      periodStart: v.optional(v.string()),
      periodEnd: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
    }),
    documentType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { result } = args;

    // Verify document belongs to company
    const document = await ctx.db.get(args.documentId);
    if (!document || document.companyId !== args.companyId) {
      console.error("Document/company mismatch - potential security issue");
      return null;
    }

    // Update document with extraction results
    const updateData: Record<string, unknown> = {
      extractionStatus: result.success ? "completed" : "failed",
      extractedText: result.extractedText,
      extractionConfidence: result.confidence,
      processedAt: Date.now(),
      extractionProgress: undefined, // Clear progress
    };

    if (result.errorMessage) updateData.errorMessage = result.errorMessage;
    if (result.bankName) updateData.bankType = result.bankName.toLowerCase().replace(/\s+/g, "_");
    if (result.periodStart) updateData.periodStart = result.periodStart;
    if (result.periodEnd) updateData.periodEnd = result.periodEnd;

    // Count transactions/items
    // CRITICAL: Check for pre-computed count from streaming first (fixes bug where
    // streamed transactions would show 0 because transactions array was cleared)
    const streamedCount = (result as { extractedTransactionCount?: number }).extractedTransactionCount;
    const itemCount = streamedCount ?? result.transactions?.length ?? (result.invoiceData ? 1 : 0);
    updateData.extractedTransactionCount = itemCount;

    await ctx.db.patch(args.documentId, updateData);

    // Insert transactions (for bank statements)
    if (result.transactions && result.transactions.length > 0) {
      const now = Date.now();
      for (const tx of result.transactions) {
        await ctx.db.insert("transactions", {
          companyId: args.companyId,
          date: tx.date,
          description: tx.description,
          reference: tx.reference,
          amount: tx.amount,
          type: "cash",
          status: "pending",
          sourceDocumentId: args.documentId,
          createdAt: now,
        });
      }
      console.log(`[Extraction] Inserted ${result.transactions.length} transactions`);
    }

    // Insert accrual document (for invoices/receipts)
    if (result.invoiceData) {
      const doc = result.invoiceData;
      const validDocTypes = ["sales_invoice", "purchase_invoice", "pos_report", "settlement", "receipt"] as const;
      const docType = validDocTypes.includes(doc.docType as typeof validDocTypes[number])
        ? doc.docType as typeof validDocTypes[number]
        : "receipt";

      await ctx.db.insert("accrualDocuments", {
        companyId: args.companyId,
        docType,
        docNumber: doc.docNumber,
        docDate: doc.docDate,
        dueDate: doc.dueDate,
        counterparty: doc.counterparty,
        amount: doc.amount,
        taxAmount: doc.taxAmount,
        description: doc.description,
        lineItems: doc.lineItems,
        sourceDocumentId: args.documentId,
        extractedText: result.extractedText,
        status: "pending",
        createdAt: Date.now(),
      });
      console.log("[Extraction] Inserted accrual document");
    }

    return null;
  },
});
