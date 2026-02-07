> **Status: Specification / Proposal -- Partially Implemented**
> The Hatchet workflow infrastructure described here was not adopted.
> Current extraction uses: `convex/extraction.ts`, `convex/nativePdfExtraction.ts`,
> `convex/geminiExtraction.ts`. Extraction prompts and schemas below remain useful reference.

# Reconciled - Document Extraction Workflow

## Overview

This document describes the end-to-end extraction pipeline for processing financial documents
(bank statements, invoices, management accounts, forecasts) using AI-powered extraction
via AWS Bedrock Claude models.

**Design Principles:**
1. **Simplicity** - Minimal dependencies (TypeScript + PDF.js only)
2. **Scalability** - 10K documents/day via Hatchet orchestration
3. **Accuracy** - Tiered model approach (Sonnet 4.5 → Opus 4.5 fallback)
4. **Cost Efficiency** - Prompt caching, smart routing, rate limiting
5. **Reliability** - Retry strategies, DLQ, real-time progress tracking

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Upload                                    │
│                               │                                          │
│                               ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Convex                                      │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐   │   │
│  │  │ Storage  │  │  documents   │  │ reconciliationSessions  │   │   │
│  │  │ (files)  │  │   (state)    │  │      (matching)         │   │   │
│  │  └────┬─────┘  └──────┬───────┘  └───────────┬─────────────┘   │   │
│  └───────┼───────────────┼──────────────────────┼─────────────────┘   │
│          │               │                      │                      │
│          │    ┌──────────┴──────────┐          │                      │
│          │    │  Trigger Workflow   │          │                      │
│          │    └──────────┬──────────┘          │                      │
│          │               │                      │                      │
└──────────┼───────────────┼──────────────────────┼──────────────────────┘
           │               │                      │
           ▼               ▼                      │
┌─────────────────────────────────────────────────┼──────────────────────┐
│                      Hatchet                    │                      │
│  ┌────────────────────────────────────────────┐│                      │
│  │         document-extraction workflow       ││                      │
│  │                                            ││                      │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────┐  ││                      │
│  │  │Validate │→ │Classify │→ │ Convert   │  ││                      │
│  │  │  File   │  │  Type   │  │ PDF→Image │  ││                      │
│  │  └─────────┘  └─────────┘  └─────┬─────┘  ││                      │
│  │                                   │        ││                      │
│  │  ┌─────────────────────────────────┘       ││                      │
│  │  │                                         ││                      │
│  │  ▼                                         ││                      │
│  │  ┌─────────────┐  ┌───────────┐  ┌──────┐ ││                      │
│  │  │ Extract     │→ │ Aggregate │→ │Store │ ││                      │
│  │  │ (parallel)  │  │ Dedupe    │  │      │─┼┼──────────────────────┘
│  │  └──────┬──────┘  └───────────┘  └──────┘ ││
│  │         │                                  ││
│  │         ▼                                  ││
│  │  ┌──────────────────────────────────────┐ ││
│  │  │         AWS Bedrock                   │ ││
│  │  │  ┌────────────┐  ┌────────────────┐  │ ││
│  │  │  │Sonnet 4.5  │  │  Opus 4.5      │  │ ││
│  │  │  │ (primary)  │  │  (fallback)    │  │ ││
│  │  │  └────────────┘  └────────────────┘  │ ││
│  │  └──────────────────────────────────────┘ ││
│  └────────────────────────────────────────────┘│
│                                                │
│  On failure → Dead Letter Queue (Convex)       │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Supported Document Types

### Accounting Documents

| Type | Schema Table | Purpose | Key Fields |
|------|--------------|---------|------------|
| Bank Statement | `transactions` | Cash basis records | date, description, amount, reference |
| Invoice | `accrualDocuments` | Sales/purchase invoices | docNumber, docDate, counterparty, amount, lineItems |
| Receipt | `accrualDocuments` | Payment proofs | docNumber, docDate, amount, counterparty |
| POS Report | `accrualDocuments` | Daily sales summaries | docDate, amount, lineItems |
| Settlement | `accrualDocuments` | Platform settlements | docDate, amount, fees, netAmount |

### FP&A Documents (New)

| Type | Schema Table | Purpose | Output Format |
|------|--------------|---------|---------------|
| Management Accounts | `fpaDocuments` | P&L, BS, Trial Balance | Tabular (rows/columns) |
| Budget vs Actual | `fpaDocuments` | Variance analysis | Tabular with variance columns |
| Forecast | `fpaDocuments` | Projections | Period-by-period tabular |
| Cost Analytics | `fpaDocuments` | Spending breakdown | Category-based tabular |

---

## Hatchet Workflow Definition

### Workflow: `document-extraction`

```typescript
// File: hatchet/workflows/document-extraction.ts

import { Hatchet } from "@hatchet-dev/typescript-sdk";
import * as pdfjs from "pdfjs-dist";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { ConvexHttpClient } from "convex/browser";

const hatchet = Hatchet.init();
const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

// ============================================================
// STEP 1: VALIDATE FILE
// ============================================================
const validateFile = hatchet.step({
  name: "validate-file",
  timeout: "30s",
  retries: 0, // No retry - validation should not fail transiently

  run: async (ctx) => {
    const { documentId, storageUrl, fileName, fileSize } = ctx.input;

    // Validation rules
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = ["pdf", "png", "jpg", "jpeg"];

    const extension = fileName.split(".").pop()?.toLowerCase();

    if (!extension || !ALLOWED_TYPES.includes(extension)) {
      throw new Error(`Unsupported file type: ${extension}. Allowed: ${ALLOWED_TYPES.join(", ")}`);
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${fileSize} bytes. Maximum: ${MAX_FILE_SIZE} bytes`);
    }

    // Update progress in Convex
    await convex.mutation("extractionIntegration:updateProgress", {
      documentId,
      phase: "validating",
      phaseMessage: "Validating file format and size...",
    });

    return {
      documentId,
      storageUrl,
      fileName,
      fileType: extension,
      isImage: ["png", "jpg", "jpeg"].includes(extension),
    };
  },
});

// ============================================================
// STEP 2: CLASSIFY DOCUMENT TYPE
// ============================================================
const classifyDocument = hatchet.step({
  name: "classify-document",
  timeout: "60s",
  retries: 2,

  run: async (ctx) => {
    const { documentId, storageUrl, fileName, fileType, isImage } = ctx.prev.validateFile;

    await convex.mutation("extractionIntegration:updateProgress", {
      documentId,
      phase: "classifying",
      phaseMessage: "Analyzing document type...",
    });

    // For images, we need to classify using vision
    // For PDFs, we'll classify after conversion (first page)
    if (isImage) {
      const imageData = await fetchAsBase64(storageUrl);
      const classification = await classifyWithVision(imageData, fileType);
      return { ...ctx.prev.validateFile, classification };
    }

    // For PDFs, pass through - will classify after first page render
    return {
      ...ctx.prev.validateFile,
      classification: { type: "unknown", confidence: 0 }
    };
  },
});

// ============================================================
// STEP 3: CONVERT PDF TO IMAGES
// ============================================================
const convertPdfToImages = hatchet.step({
  name: "convert-pdf-to-images",
  timeout: "5m",
  retries: 2,

  run: async (ctx) => {
    const { documentId, storageUrl, fileType, isImage } = ctx.prev.classifyDocument;

    // Skip for images - they're already in the right format
    if (isImage) {
      const imageData = await fetchAsBase64(storageUrl);
      return {
        ...ctx.prev.classifyDocument,
        pages: [{ pageNumber: 1, imageBase64: imageData, mediaType: `image/${fileType}` }],
        totalPages: 1,
      };
    }

    await convex.mutation("extractionIntegration:updateProgress", {
      documentId,
      phase: "converting",
      phaseMessage: "Converting PDF to images...",
    });

    // Fetch PDF and convert pages
    const pdfBuffer = await fetchAsBuffer(storageUrl);
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
    const totalPages = pdf.numPages;

    const pages: Array<{ pageNumber: number; imageBase64: string; mediaType: string }> = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x for quality

      // Render to canvas (Node canvas or similar)
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      await page.render({ canvasContext: context, viewport }).promise;

      const imageBase64 = canvas.toDataURL("image/png").split(",")[1];
      pages.push({ pageNumber: i, imageBase64, mediaType: "image/png" });

      // Update progress
      await convex.mutation("extractionIntegration:updateProgress", {
        documentId,
        phase: "converting",
        currentPage: i,
        totalPages,
        phaseMessage: `Converting page ${i} of ${totalPages}...`,
      });
    }

    // Classify based on first page if not already classified
    let classification = ctx.prev.classifyDocument.classification;
    if (classification.type === "unknown" && pages.length > 0) {
      classification = await classifyWithVision(pages[0].imageBase64, "png");
    }

    return {
      ...ctx.prev.classifyDocument,
      classification,
      pages,
      totalPages,
    };
  },
});

// ============================================================
// STEP 4: EXTRACT DATA (PARALLEL PER PAGE)
// ============================================================
const extractPages = hatchet.step({
  name: "extract-pages",
  timeout: "10m",
  retries: 3,

  run: async (ctx) => {
    const { documentId, pages, totalPages, classification } = ctx.prev.convertPdfToImages;

    await convex.mutation("extractionIntegration:updateProgress", {
      documentId,
      phase: "extracting",
      phaseMessage: `Extracting data from ${totalPages} page(s)...`,
    });

    const results: Array<{
      pageNumber: number;
      data: any;
      confidence: number;
      model: string;
    }> = [];

    // Process pages in parallel batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const batch = pages.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (page) => {
          // Try Sonnet 4.5 first
          try {
            const result = await extractWithBedrock({
              imageBase64: page.imageBase64,
              mediaType: page.mediaType,
              documentType: classification.type,
              pageNumber: page.pageNumber,
              totalPages,
              model: "sonnet",
            });

            // If confidence too low, escalate to Opus
            if (result.confidence < 70) {
              console.log(`Page ${page.pageNumber}: Low confidence (${result.confidence}%), escalating to Opus`);
              const opusResult = await extractWithBedrock({
                imageBase64: page.imageBase64,
                mediaType: page.mediaType,
                documentType: classification.type,
                pageNumber: page.pageNumber,
                totalPages,
                model: "opus",
              });
              return { pageNumber: page.pageNumber, ...opusResult };
            }

            return { pageNumber: page.pageNumber, ...result };
          } catch (error) {
            // Fallback to Opus on Sonnet failure
            console.error(`Sonnet failed for page ${page.pageNumber}, trying Opus:`, error);
            const opusResult = await extractWithBedrock({
              imageBase64: page.imageBase64,
              mediaType: page.mediaType,
              documentType: classification.type,
              pageNumber: page.pageNumber,
              totalPages,
              model: "opus",
            });
            return { pageNumber: page.pageNumber, ...opusResult };
          }
        })
      );

      results.push(...batchResults);

      // Stream partial results to Convex
      for (const result of batchResults) {
        if (classification.type === "bank_statement" && result.data.transactions) {
          await convex.mutation("extractionIntegration:streamTransactions", {
            documentId,
            transactions: result.data.transactions,
            pageNumber: result.pageNumber,
          });
        }
      }

      // Update progress
      await convex.mutation("extractionIntegration:updateProgress", {
        documentId,
        phase: "extracting",
        currentPage: Math.min(i + BATCH_SIZE, pages.length),
        totalPages,
        streamedTransactionCount: results.reduce(
          (sum, r) => sum + (r.data.transactions?.length || 0), 0
        ),
        phaseMessage: `Extracted ${Math.min(i + BATCH_SIZE, pages.length)} of ${totalPages} pages...`,
      });
    }

    return {
      ...ctx.prev.convertPdfToImages,
      extractionResults: results,
    };
  },
});

// ============================================================
// STEP 5: AGGREGATE & DEDUPLICATE
// ============================================================
const aggregateResults = hatchet.step({
  name: "aggregate-results",
  timeout: "2m",
  retries: 1,

  run: async (ctx) => {
    const { documentId, classification, extractionResults } = ctx.prev.extractPages;

    await convex.mutation("extractionIntegration:updateProgress", {
      documentId,
      phase: "aggregating",
      phaseMessage: "Aggregating and deduplicating results...",
    });

    // Aggregate based on document type
    let aggregatedData: any;
    let overallConfidence: number;

    switch (classification.type) {
      case "bank_statement":
        aggregatedData = aggregateBankStatement(extractionResults);
        break;
      case "invoice":
      case "receipt":
        aggregatedData = aggregateInvoice(extractionResults);
        break;
      case "management_accounts":
      case "trial_balance":
      case "budget_vs_actual":
      case "forecast":
        aggregatedData = aggregateTabularData(extractionResults);
        break;
      default:
        aggregatedData = { raw: extractionResults };
    }

    // Calculate overall confidence (weighted average)
    overallConfidence = Math.round(
      extractionResults.reduce((sum, r) => sum + r.confidence, 0) / extractionResults.length
    );

    return {
      documentId,
      documentType: classification.type,
      data: aggregatedData,
      confidence: overallConfidence,
      pageCount: extractionResults.length,
    };
  },
});

// ============================================================
// STEP 6: STORE RESULTS
// ============================================================
const storeResults = hatchet.step({
  name: "store-results",
  timeout: "2m",
  retries: 3,

  run: async (ctx) => {
    const { documentId, documentType, data, confidence, pageCount } = ctx.prev.aggregateResults;

    await convex.mutation("extractionIntegration:updateProgress", {
      documentId,
      phase: "storing",
      phaseMessage: "Saving extracted data...",
    });

    // Store based on document type
    if (documentType === "bank_statement") {
      // Transactions already streamed in extract step
      // Just update document metadata
      await convex.mutation("documents:completeExtraction", {
        documentId,
        bankType: data.bankType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        extractedTransactionCount: data.transactions?.length || 0,
        confidence,
      });
    } else if (["invoice", "receipt", "pos_report", "settlement"].includes(documentType)) {
      await convex.mutation("accrualDocuments:createFromExtraction", {
        documentId,
        ...data,
        confidence,
      });
    } else if (["management_accounts", "trial_balance", "budget_vs_actual", "forecast"].includes(documentType)) {
      await convex.mutation("fpaDocuments:createFromExtraction", {
        documentId,
        docType: documentType,
        tabularData: data,
        confidence,
      });
    }

    // Mark extraction complete
    await convex.mutation("extractionIntegration:updateProgress", {
      documentId,
      phase: "complete",
      phaseMessage: "Extraction complete",
    });

    return {
      success: true,
      documentId,
      documentType,
      confidence,
      pageCount,
      recordCount: documentType === "bank_statement"
        ? data.transactions?.length
        : documentType.includes("_") ? data.rows?.length : 1,
    };
  },
});

// ============================================================
// WORKFLOW DEFINITION
// ============================================================
export const documentExtractionWorkflow = hatchet.workflow({
  name: "document-extraction",
  version: "1.0.0",

  on: {
    event: "document:uploaded",
  },

  steps: [
    validateFile,
    classifyDocument,
    convertPdfToImages,
    extractPages,
    aggregateResults,
    storeResults,
  ],

  onFailure: async (ctx, error) => {
    const documentId = ctx.input?.documentId;

    if (documentId) {
      // Update document status
      await convex.mutation("documents:markFailed", {
        documentId,
        errorMessage: error.message,
      });

      // Add to Dead Letter Queue
      await convex.mutation("extractionDLQ:add", {
        documentId,
        workflowRunId: ctx.workflowRunId,
        errorType: error.name || "UnknownError",
        errorMessage: error.message,
        attemptCount: ctx.attemptCount || 1,
      });
    }

    console.error(`[Extraction Failed] Document ${documentId}:`, error);
  },
});
```

---

## Extraction Prompts

### Document Classification Prompt

```typescript
const CLASSIFICATION_PROMPT = `You are a document classifier for accounting and financial documents.

Analyze this document image and classify it into ONE of these categories:

ACCOUNTING DOCUMENTS:
- bank_statement: Bank transaction records, account statements
- invoice: Sales or purchase invoices with line items
- receipt: Payment receipts, proof of payment
- pos_report: Point-of-sale daily reports, sales summaries
- settlement: Platform settlement statements (Grab, Shopee, etc.)

FP&A DOCUMENTS:
- management_accounts: P&L statements, Balance Sheets, Income Statements
- trial_balance: Trial balance reports with account codes
- budget_vs_actual: Budget comparison reports with variances
- forecast: Financial forecasts, projections, cash flow forecasts

OUTPUT FORMAT (JSON only):
{
  "type": "document_type_here",
  "confidence": 0-100,
  "reasoning": "Brief explanation of why this classification"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown
- Confidence should reflect how certain you are
- If unclear, use the most likely category with lower confidence`;
```

### Bank Statement Extraction Prompt

```typescript
const BANK_STATEMENT_PROMPT = `You are an expert bank statement parser. Extract ALL transactions from this bank statement image.

EXTRACTION RULES:
1. Extract EVERY transaction visible on this page
2. Dates: Convert to ISO format (YYYY-MM-DD)
3. Amounts: Positive for credits/deposits, negative for debits/withdrawals
4. References: Include check numbers, transaction IDs if visible
5. Descriptions: Capture full transaction description

FIELD CONFIDENCE:
- Assign 0-100 confidence per field based on clarity
- Low confidence (< 70): Blurry, partially visible, ambiguous
- Medium confidence (70-89): Readable but could have errors
- High confidence (90+): Crystal clear, unambiguous

OUTPUT FORMAT (JSON only):
{
  "bankType": "maybank|cimb|public_bank|hsbc|ocbc|uob|rhb|ambank|hong_leong|standard_chartered|other",
  "periodStart": "YYYY-MM-DD or null if not visible",
  "periodEnd": "YYYY-MM-DD or null if not visible",
  "accountNumber": "Masked account number if visible",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Full transaction description",
      "reference": "Reference number or null",
      "amount": 1234.56,
      "fieldConfidence": {
        "date": 95,
        "description": 88,
        "amount": 99,
        "reference": 75
      }
    }
  ],
  "pageConfidence": 0-100
}

IMPORTANT:
- Return ONLY valid JSON
- Include ALL transactions, even if partially visible
- For unclear amounts, provide best estimate with low confidence
- Negative amounts for withdrawals/debits
- Do NOT fabricate transactions - only extract what's visible`;
```

### Invoice/Receipt Extraction Prompt

```typescript
const INVOICE_PROMPT = `You are an expert invoice/receipt parser. Extract all data from this document.

EXTRACTION RULES:
1. Identify document type (sales_invoice, purchase_invoice, receipt)
2. Extract header information (document number, dates, parties)
3. Extract ALL line items with quantities, rates, amounts
4. Calculate totals and verify they match visible totals
5. Extract tax information if present

OUTPUT FORMAT (JSON only):
{
  "docType": "sales_invoice|purchase_invoice|receipt",
  "docNumber": "Invoice/receipt number",
  "docDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD or null",
  "counterparty": {
    "name": "Company/person name",
    "address": "Address if visible",
    "taxNumber": "GST/SST number if visible"
  },
  "lineItems": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 100.00,
      "amount": 100.00,
      "taxRate": 6
    }
  ],
  "subtotal": 1000.00,
  "taxAmount": 60.00,
  "totalAmount": 1060.00,
  "currency": "MYR",
  "paymentTerms": "Net 30 or null",
  "fieldConfidence": {
    "docNumber": 95,
    "docDate": 90,
    "counterparty": 85,
    "amounts": 98
  },
  "overallConfidence": 0-100
}

IMPORTANT:
- Return ONLY valid JSON
- Verify math: subtotal + tax = total
- If amounts don't match, flag in confidence
- Extract ALL line items`;
```

### Management Accounts Extraction Prompt (FP&A)

```typescript
const MANAGEMENT_ACCOUNTS_PROMPT = `You are an expert financial statement parser. Extract tabular data from this management accounts document.

This could be a P&L (Profit & Loss), Balance Sheet, or Trial Balance.

EXTRACTION RULES:
1. Identify the report type and period
2. Extract ALL rows with account codes (if present), descriptions, and amounts
3. Maintain hierarchical structure (categories, sub-categories)
4. Extract comparative columns (current period, prior period, budget, etc.)
5. Preserve totals and subtotals

OUTPUT FORMAT (JSON only):
{
  "reportType": "profit_and_loss|balance_sheet|trial_balance|cash_flow",
  "reportPeriod": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "description": "January 2025"
  },
  "comparativePeriod": {
    "start": "YYYY-MM-DD or null",
    "end": "YYYY-MM-DD or null",
    "description": "January 2024 or null"
  },
  "columns": [
    { "id": "current", "label": "Jan 2025", "type": "amount" },
    { "id": "prior", "label": "Jan 2024", "type": "amount" },
    { "id": "variance", "label": "Variance", "type": "amount" },
    { "id": "variance_pct", "label": "%", "type": "percentage" }
  ],
  "rows": [
    {
      "accountCode": "4000",
      "description": "Revenue",
      "level": 0,
      "isTotal": false,
      "values": {
        "current": 100000.00,
        "prior": 95000.00,
        "variance": 5000.00,
        "variance_pct": 5.26
      }
    },
    {
      "accountCode": "4100",
      "description": "Sales Revenue",
      "level": 1,
      "isTotal": false,
      "parentCode": "4000",
      "values": {
        "current": 80000.00,
        "prior": 75000.00,
        "variance": 5000.00,
        "variance_pct": 6.67
      }
    }
  ],
  "metadata": {
    "company": "Company name if visible",
    "preparedBy": "Preparer if visible",
    "currency": "MYR"
  },
  "overallConfidence": 0-100
}

IMPORTANT:
- Return ONLY valid JSON
- Maintain account hierarchy through level and parentCode
- Mark total/subtotal rows with isTotal: true
- Include ALL visible rows, even if partially legible
- Verify totals sum correctly where possible`;
```

### Budget vs Actual Extraction Prompt (FP&A)

```typescript
const BUDGET_VS_ACTUAL_PROMPT = `You are an expert financial analyst. Extract budget vs actual comparison data from this document.

EXTRACTION RULES:
1. Extract all line items with budget, actual, and variance columns
2. Identify the reporting period
3. Calculate variance percentages if not shown
4. Preserve category hierarchy

OUTPUT FORMAT (JSON only):
{
  "reportType": "budget_vs_actual",
  "reportPeriod": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "description": "Q1 2025"
  },
  "columns": [
    { "id": "budget", "label": "Budget", "type": "amount" },
    { "id": "actual", "label": "Actual", "type": "amount" },
    { "id": "variance", "label": "Variance", "type": "amount" },
    { "id": "variance_pct", "label": "Var %", "type": "percentage" },
    { "id": "ytd_budget", "label": "YTD Budget", "type": "amount" },
    { "id": "ytd_actual", "label": "YTD Actual", "type": "amount" }
  ],
  "rows": [
    {
      "category": "Revenue",
      "accountCode": "4000",
      "description": "Total Revenue",
      "level": 0,
      "isTotal": true,
      "values": {
        "budget": 100000.00,
        "actual": 95000.00,
        "variance": -5000.00,
        "variance_pct": -5.00
      },
      "status": "under_budget|on_budget|over_budget"
    }
  ],
  "summary": {
    "totalBudget": 500000.00,
    "totalActual": 485000.00,
    "overallVariance": -15000.00,
    "overallVariancePct": -3.00
  },
  "overallConfidence": 0-100
}`;
```

---

## Output Schemas

### Transaction Schema (Bank Statements)

```typescript
interface ExtractedTransaction {
  date: string;           // ISO format YYYY-MM-DD
  description: string;    // Full transaction description
  reference?: string;     // Reference/check number
  amount: number;         // Positive = credit, negative = debit
  fieldConfidence: {
    date: number;         // 0-100
    description: number;  // 0-100
    amount: number;       // 0-100
    reference?: number;   // 0-100
  };
}
```

### Accrual Document Schema (Invoices/Receipts)

```typescript
interface ExtractedAccrualDocument {
  docType: "sales_invoice" | "purchase_invoice" | "receipt" | "pos_report" | "settlement";
  docNumber?: string;
  docDate: string;        // ISO format
  dueDate?: string;       // ISO format
  counterparty?: string;
  amount: number;
  taxAmount?: number;
  description?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  overallConfidence: number;
}
```

### FP&A Document Schema (Tabular Data)

```typescript
interface ExtractedFpaDocument {
  docType: "management_accounts" | "trial_balance" | "budget_vs_actual" | "forecast";
  reportPeriod: {
    start: string;
    end: string;
    description: string;
  };
  columns: Array<{
    id: string;
    label: string;
    type: "amount" | "percentage" | "text";
  }>;
  rows: Array<{
    accountCode?: string;
    description: string;
    level: number;          // Hierarchy depth (0 = top level)
    isTotal: boolean;
    parentCode?: string;    // For hierarchy
    values: Record<string, number | string>;
  }>;
  metadata?: {
    company?: string;
    currency?: string;
    preparedBy?: string;
  };
  overallConfidence: number;
}
```

---

## Model Routing & Fallback Strategy

### Decision Flow

```
Document received
       │
       ▼
┌──────────────────┐
│ Try Sonnet 4.5   │
│ (primary model)  │
└────────┬─────────┘
         │
         ▼
    ┌────────────┐
    │ Success?   │
    └─────┬──────┘
          │
    ┌─────┴─────┐
    │           │
   YES          NO (error/timeout)
    │           │
    ▼           ▼
┌─────────┐  ┌──────────────┐
│Check    │  │ Try Opus 4.5 │
│Confidence│ │ (fallback)   │
└────┬────┘  └──────┬───────┘
     │              │
     ▼              ▼
 ┌───────┐      ┌────────┐
 │ ≥70%? │      │Success?│
 └───┬───┘      └────┬───┘
     │               │
 ┌───┴───┐      ┌────┴────┐
YES     NO     YES       NO
 │       │      │         │
 ▼       ▼      ▼         ▼
Done  Escalate Done    DLQ
      to Opus         (Dead Letter)
```

### Model Selection Logic

```typescript
async function selectModel(context: {
  documentType: string;
  pageCount: number;
  previousAttempts: number;
  lastConfidence?: number;
}): Promise<"sonnet" | "opus"> {
  // Always use Opus for:
  // 1. Complex FP&A documents (management accounts, forecasts)
  // 2. After Sonnet failure
  // 3. Low confidence results (<70%)
  // 4. Multi-page documents >20 pages

  if (context.previousAttempts > 0) {
    return "opus"; // Fallback after failure
  }

  if (context.lastConfidence !== undefined && context.lastConfidence < 70) {
    return "opus"; // Escalate low confidence
  }

  const complexTypes = ["management_accounts", "trial_balance", "budget_vs_actual", "forecast"];
  if (complexTypes.includes(context.documentType)) {
    return "opus"; // Complex FP&A needs Opus
  }

  if (context.pageCount > 20) {
    return "opus"; // Long documents benefit from Opus
  }

  return "sonnet"; // Default to cost-effective Sonnet
}
```

---

## Error Handling

### Retry Configuration

| Step | Retries | Backoff | Timeout |
|------|---------|---------|---------|
| validate-file | 0 | N/A | 30s |
| classify-document | 2 | exponential | 60s |
| convert-pdf-to-images | 2 | exponential | 5m |
| extract-pages | 3 | exponential | 10m |
| aggregate-results | 1 | fixed | 2m |
| store-results | 3 | exponential | 2m |

### Dead Letter Queue Schema

```typescript
// Add to convex/schema.ts
extractionDLQ: defineTable({
  documentId: v.id("documents"),
  companyId: v.id("companies"),
  workflowRunId: v.string(),
  errorType: v.string(),
  errorMessage: v.string(),
  attemptCount: v.number(),
  firstAttemptAt: v.number(),
  lastAttemptAt: v.number(),
  status: v.union(
    v.literal("pending"),      // Awaiting review
    v.literal("retrying"),     // Manual retry in progress
    v.literal("resolved"),     // Successfully reprocessed
    v.literal("abandoned")     // Permanently failed
  ),
  resolvedAt: v.optional(v.number()),
  resolvedBy: v.optional(v.id("users")),
  notes: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_company", ["companyId"])
  .index("by_status", ["status"])
  .index("by_created", ["createdAt"]),
```

---

## Rate Limiting & Cost Management

### Rate Limits

| Limit Type | Value | Window |
|------------|-------|--------|
| Per workspace extractions | 20 | 1 minute |
| Per workspace pages | 100 | 1 minute |
| Global Sonnet calls | 300 | 1 minute |
| Global Opus calls | 50 | 1 minute |
| Daily Opus calls | 1,000 | 24 hours |
| Daily total pages | 50,000 | 24 hours |

### Cost Estimates (10K docs/day)

Assuming average 5 pages per document:

| Model Mix | Daily Cost | Monthly Cost |
|-----------|------------|--------------|
| 100% Sonnet 4.5 | ~$75 | ~$2,250 |
| 90% Sonnet + 10% Opus | ~$112 | ~$3,375 |
| 70% Sonnet + 30% Opus | ~$187 | ~$5,625 |

### Prompt Caching Savings

With prompt caching enabled:
- System prompts cached: ~2,000 tokens per call
- Cache hit rate: ~95% (same prompts across all docs)
- Estimated savings: 40-50% on input token costs

---

## Convex Schema Additions

```typescript
// Add to convex/schema.ts

// FP&A Documents table - for management accounts, budgets, forecasts
fpaDocuments: defineTable({
  companyId: v.id("companies"),
  documentId: v.id("documents"),          // Source document
  sessionId: v.optional(v.id("reconciliationSessions")),
  docType: v.union(
    v.literal("management_accounts"),     // P&L, BS, etc.
    v.literal("trial_balance"),           // Trial Balance
    v.literal("budget_vs_actual"),        // Budget comparison
    v.literal("forecast")                 // Financial forecasts
  ),
  reportPeriod: v.object({
    start: v.string(),
    end: v.string(),
    description: v.string(),
  }),
  columns: v.array(v.object({
    id: v.string(),
    label: v.string(),
    type: v.union(v.literal("amount"), v.literal("percentage"), v.literal("text")),
  })),
  rows: v.array(v.object({
    accountCode: v.optional(v.string()),
    description: v.string(),
    level: v.number(),
    isTotal: v.boolean(),
    parentCode: v.optional(v.string()),
    values: v.any(),                      // Dynamic based on columns
  })),
  metadata: v.optional(v.object({
    company: v.optional(v.string()),
    currency: v.optional(v.string()),
    preparedBy: v.optional(v.string()),
  })),
  extractionConfidence: v.number(),
  createdAt: v.number(),
})
  .index("by_company", ["companyId"])
  .index("by_document", ["documentId"])
  .index("by_type", ["companyId", "docType"]),
```

---

## Integration with Matching Engine

After extraction completes, the workflow automatically:

1. **Links transactions to session** - If active reconciliation session exists
2. **Triggers matching** - Optional auto-run of matching engine
3. **Updates session stats** - Real-time counts in UI

```typescript
// Called by Hatchet workflow on completion
export const onExtractionComplete = internalMutation({
  args: {
    documentId: v.id("documents"),
    companyId: v.id("companies"),
    documentType: v.string(),
    recordCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Find active session
    const session = await ctx.db
      .query("reconciliationSessions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .first();

    if (session && args.documentType === "bank_statement") {
      // Link new transactions
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .filter((q) =>
          q.and(
            q.eq(q.field("sourceDocumentId"), args.documentId),
            q.eq(q.field("sessionId"), undefined)
          )
        )
        .collect();

      for (const tx of transactions) {
        await ctx.db.patch(tx._id, { sessionId: session._id });
      }

      // Update session stats
      await ctx.db.patch(session._id, {
        totalCashTransactions: (session.totalCashTransactions || 0) + args.recordCount,
      });
    }
  },
});
```

---

## Helper Functions

### Bedrock Client Implementation

```typescript
// File: hatchet/lib/bedrock-client.ts

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const MODEL_IDS = {
  sonnet: "anthropic.claude-sonnet-4-5-20250514-v1:0",
  opus: "anthropic.claude-opus-4-5-20250514-v1:0",
};

interface ExtractionResult {
  data: any;
  confidence: number;
  model: string;
}

export async function extractWithBedrock(params: {
  imageBase64: string;
  mediaType: string;
  documentType: string;
  pageNumber: number;
  totalPages: number;
  model: "sonnet" | "opus";
}): Promise<ExtractionResult> {
  const prompt = getPromptForDocumentType(params.documentType, params.pageNumber, params.totalPages);

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType,
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const command = new InvokeModelCommand({
    modelId: MODEL_IDS[params.model],
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  // Parse JSON from response
  const content = responseBody.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("No valid JSON found in model response");
  }

  const data = JSON.parse(jsonMatch[0]);

  return {
    data,
    confidence: data.overallConfidence || data.pageConfidence || 80,
    model: params.model,
  };
}

export async function classifyWithVision(
  imageBase64: string,
  fileType: string
): Promise<{ type: string; confidence: number }> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: `image/${fileType}`,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: CLASSIFICATION_PROMPT,
          },
        ],
      },
    ],
  });

  const command = new InvokeModelCommand({
    modelId: MODEL_IDS.sonnet, // Always use Sonnet for classification (cheaper)
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  const content = responseBody.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { type: "unknown", confidence: 0 };
  }

  const result = JSON.parse(jsonMatch[0]);
  return { type: result.type, confidence: result.confidence };
}

function getPromptForDocumentType(
  documentType: string,
  pageNumber: number,
  totalPages: number
): string {
  const pageContext = `\n\nThis is page ${pageNumber} of ${totalPages}.`;

  switch (documentType) {
    case "bank_statement":
      return BANK_STATEMENT_PROMPT + pageContext;
    case "invoice":
    case "receipt":
      return INVOICE_PROMPT + pageContext;
    case "management_accounts":
    case "trial_balance":
      return MANAGEMENT_ACCOUNTS_PROMPT + pageContext;
    case "budget_vs_actual":
      return BUDGET_VS_ACTUAL_PROMPT + pageContext;
    default:
      return BANK_STATEMENT_PROMPT + pageContext; // Default to bank statement
  }
}
```

### Aggregation Functions

```typescript
// File: hatchet/lib/aggregators.ts

interface PageResult {
  pageNumber: number;
  data: any;
  confidence: number;
  model: string;
}

export function aggregateBankStatement(results: PageResult[]): any {
  const allTransactions: any[] = [];
  let bankType = "other";
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let accountNumber: string | null = null;

  for (const result of results) {
    const { data } = result;

    // Collect transactions
    if (data.transactions) {
      allTransactions.push(...data.transactions);
    }

    // Get metadata from first page that has it
    if (data.bankType && bankType === "other") bankType = data.bankType;
    if (data.periodStart && !periodStart) periodStart = data.periodStart;
    if (data.periodEnd && !periodEnd) periodEnd = data.periodEnd;
    if (data.accountNumber && !accountNumber) accountNumber = data.accountNumber;
  }

  // Deduplicate transactions (by date + amount + description hash)
  const seen = new Set<string>();
  const deduped = allTransactions.filter((tx) => {
    const key = `${tx.date}|${tx.amount}|${tx.description?.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date
  deduped.sort((a, b) => a.date.localeCompare(b.date));

  return {
    bankType,
    periodStart,
    periodEnd,
    accountNumber,
    transactions: deduped,
  };
}

export function aggregateInvoice(results: PageResult[]): any {
  // For invoices, typically all info is on one page
  // But for multi-page invoices, we need to merge line items
  if (results.length === 1) {
    return results[0].data;
  }

  // Multi-page invoice - merge line items
  const firstPage = results[0].data;
  const allLineItems = [...(firstPage.lineItems || [])];

  for (let i = 1; i < results.length; i++) {
    const pageData = results[i].data;
    if (pageData.lineItems) {
      allLineItems.push(...pageData.lineItems);
    }
  }

  return {
    ...firstPage,
    lineItems: allLineItems,
  };
}

export function aggregateTabularData(results: PageResult[]): any {
  if (results.length === 1) {
    return results[0].data;
  }

  // For multi-page financial statements, merge rows
  const firstPage = results[0].data;
  const allRows = [...(firstPage.rows || [])];

  for (let i = 1; i < results.length; i++) {
    const pageData = results[i].data;
    if (pageData.rows) {
      allRows.push(...pageData.rows);
    }
  }

  return {
    ...firstPage,
    rows: allRows,
  };
}
```

### Utility Functions

```typescript
// File: hatchet/lib/utils.ts

export async function fetchAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

export async function fetchAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// For Node.js canvas creation (requires node-canvas package)
export function createCanvas(width: number, height: number) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createCanvas: nodeCreateCanvas } = require("canvas");
  return nodeCreateCanvas(width, height);
}
```

---

## Testing & Verification

### Manual Testing Steps

1. **Upload bank statement PDF** → Verify transactions extracted
2. **Upload invoice image** → Verify accrual document created
3. **Upload management accounts** → Verify tabular data in `fpaDocuments`
4. **Trigger low-confidence scenario** → Verify Opus fallback
5. **Simulate Bedrock failure** → Verify DLQ entry created
6. **Check real-time progress** → Verify UI updates during extraction

### Automated Tests

```typescript
// __tests__/extraction-workflow.test.ts

describe("Extraction Workflow", () => {
  it("classifies bank statement correctly", async () => {
    const result = await classifyWithVision(bankStatementImage, "png");
    expect(result.type).toBe("bank_statement");
    expect(result.confidence).toBeGreaterThan(80);
  });

  it("extracts transactions from bank statement", async () => {
    const result = await extractWithBedrock({
      imageBase64: bankStatementImage,
      mediaType: "image/png",
      documentType: "bank_statement",
      pageNumber: 1,
      totalPages: 1,
      model: "sonnet",
    });
    expect(result.data.transactions).toBeDefined();
    expect(result.data.transactions.length).toBeGreaterThan(0);
  });

  it("falls back to Opus on low confidence", async () => {
    // Mock low confidence response from Sonnet
    const mockLowConfidence = jest.fn().mockResolvedValue({
      data: { transactions: [], pageConfidence: 45 },
      confidence: 45,
      model: "sonnet",
    });

    // The workflow should escalate to Opus
    // ... test implementation
  });

  it("deduplicates transactions across pages", () => {
    const results = [
      {
        pageNumber: 1,
        data: {
          transactions: [
            { date: "2025-01-15", amount: -100, description: "PAYMENT ABC" },
            { date: "2025-01-16", amount: 500, description: "DEPOSIT XYZ" },
          ],
        },
        confidence: 90,
        model: "sonnet",
      },
      {
        pageNumber: 2,
        data: {
          transactions: [
            { date: "2025-01-16", amount: 500, description: "DEPOSIT XYZ" }, // Duplicate
            { date: "2025-01-17", amount: -200, description: "TRANSFER OUT" },
          ],
        },
        confidence: 88,
        model: "sonnet",
      },
    ];

    const aggregated = aggregateBankStatement(results);
    expect(aggregated.transactions).toHaveLength(3); // Not 4
  });
});
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Set up Hatchet (cloud or self-hosted)
- [ ] Configure Bedrock credentials for Sonnet 4.5 + Opus 4.5
- [ ] Add `fpaDocuments` and `extractionDLQ` tables to schema
- [ ] Create Convex mutations for external workflow integration

### Phase 2: Workflow Implementation (Week 2)
- [ ] Implement Hatchet workflow steps
- [ ] Create extraction prompts for each document type
- [ ] Implement model routing logic (Sonnet → Opus fallback)
- [ ] Add PDF.js conversion in worker

### Phase 3: Integration (Week 3)
- [ ] Connect to existing matching engine
- [ ] Build DLQ management UI
- [ ] Add real-time progress tracking
- [ ] Implement rate limiting

### Phase 4: FP&A Support (Week 4)
- [ ] Create FP&A extraction prompts
- [ ] Build tabular data viewer component
- [ ] Add budget vs actual variance calculations
- [ ] Test with real management account documents

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add `fpaDocuments`, `extractionDLQ` tables |
| `convex/documents.ts` | Add `completeExtraction`, `markFailed` mutations |
| `convex/matching/engine.ts` | Add `onExtractionComplete` integration |
| `package.json` | Add Hatchet SDK, PDF.js dependencies |

## New Files to Create

| File | Purpose |
|------|---------|
| `hatchet/workflows/document-extraction.ts` | Main Hatchet workflow |
| `hatchet/lib/bedrock-client.ts` | Bedrock API wrapper |
| `hatchet/lib/prompts/` | Extraction prompts by doc type |
| `hatchet/lib/aggregators.ts` | Result aggregation functions |
| `hatchet/lib/utils.ts` | Utility functions |
| `hatchet/lib/rate-limiter.ts` | Rate limiting utilities |
| `convex/extractionIntegration.ts` | Convex mutations for Hatchet |
| `convex/fpaDocuments.ts` | FP&A document CRUD |
| `components/views/fpa-view.tsx` | FP&A document viewer |
| `components/dlq-management.tsx` | DLQ management UI |

---

## Environment Variables Required

```bash
# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Hatchet
HATCHET_CLIENT_TOKEN=xxx
HATCHET_API_URL=https://cloud.hatchet.run  # or self-hosted URL

# Convex (already configured)
CONVEX_URL=xxx
CONVEX_DEPLOY_KEY=xxx
```

---

## Monitoring & Observability

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Extraction success rate | >95% | <90% |
| Average extraction time | <60s/page | >120s |
| Opus fallback rate | <15% | >30% |
| DLQ size | <10 items | >50 items |
| Daily cost | Within budget | >120% budget |

### Logging Strategy

```typescript
// Structured logging for each step
const log = {
  workflowRunId: ctx.workflowRunId,
  documentId,
  step: "extract-pages",
  pageNumber: page.pageNumber,
  model: "sonnet",
  confidence: result.confidence,
  transactionCount: result.data.transactions?.length || 0,
  durationMs: endTime - startTime,
};

console.log(JSON.stringify(log));
```

---

## Security Considerations

1. **Data Isolation** - Documents are scoped to workspaces via `companyId`
2. **Bedrock IAM** - Use least-privilege IAM roles for Bedrock access
3. **No PII in Logs** - Never log actual transaction data, only counts/metadata
4. **Storage Encryption** - Convex storage uses encryption at rest
5. **Network Security** - Hatchet workers run in private VPC
