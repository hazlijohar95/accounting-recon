import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reconciled Database Schema
// Supports multi-tenant accounting reconciliation with 5-layer AI matching

export default defineSchema({
  // Users table - authenticated users via WorkOS
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    workosId: v.optional(v.string()), // WorkOS user ID for auth
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_email", ["email"])
    .index("by_workos", ["workosId"]),

  // Companies table - accountant clients (multi-tenant)
  companies: defineTable({
    name: v.string(),
    code: v.optional(v.string()), // Auto-generated: "CJT001"
    tradingAs: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    industry: v.optional(v.string()),
    industryCategory: v.optional(v.string()), // F&B, Retail, Services, etc.
    fiscalYearEnd: v.optional(v.string()), // e.g., "December"
    taxRegistered: v.optional(v.boolean()),
    taxNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    primaryBank: v.optional(v.string()),
    primaryAccountNumber: v.optional(v.string()),
    bankAccounts: v.optional(
      v.array(
        v.object({
          bank: v.string(),
          accountNumber: v.string(),
          accountType: v.string(),
          isPrimary: v.boolean(),
        })
      )
    ),
    currency: v.string(), // e.g., "MYR", "USD"
    ownerId: v.id("users"), // User who owns this company
    onboardingCompleted: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(), // Soft delete
  })
    .index("by_owner", ["ownerId"])
    .index("by_name", ["name"])
    .index("by_code", ["code"]),

  // Transactions table - bank statements and accrual records
  transactions: defineTable({
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")), // Which recon session
    date: v.string(), // ISO date string "2025-01-15"
    description: v.string(),
    reference: v.optional(v.string()), // Invoice #, check #, etc.
    amount: v.number(), // Positive = inflow, negative = outflow
    type: v.union(v.literal("cash"), v.literal("accrual")),
    status: v.union(
      v.literal("pending"),
      v.literal("matched"),
      v.literal("suspense")
    ),
    category: v.optional(v.string()), // e.g., "Revenue", "Payroll"
    matchId: v.optional(v.id("matchedPairs")), // Link to match
    sourceDocumentId: v.optional(v.id("documents")), // Uploaded file
    createdAt: v.number(),
    // Field-level confidence scores (Phase 2)
    fieldConfidence: v.optional(v.object({
      date: v.optional(v.number()),        // 0-100 confidence for date field
      description: v.optional(v.number()), // 0-100 confidence for description
      amount: v.optional(v.number()),      // 0-100 confidence for amount
      reference: v.optional(v.number()),   // 0-100 confidence for reference
    })),
    // Bounding boxes for source linking (Phase 2)
    boundingBoxes: v.optional(v.object({
      pageNumber: v.number(), // Which page this transaction came from
      date: v.optional(v.object({
        x: v.number(), y: v.number(), width: v.number(), height: v.number(),
      })),
      description: v.optional(v.object({
        x: v.number(), y: v.number(), width: v.number(), height: v.number(),
      })),
      amount: v.optional(v.object({
        x: v.number(), y: v.number(), width: v.number(), height: v.number(),
      })),
      reference: v.optional(v.object({
        x: v.number(), y: v.number(), width: v.number(), height: v.number(),
      })),
    })),
    // User editing tracking (Phase 3)
    editedFields: v.optional(v.array(v.string())), // Which fields were manually edited
    editedAt: v.optional(v.number()),
    editedBy: v.optional(v.id("users")),
  })
    .index("by_company", ["companyId"])
    .index("by_session", ["sessionId"])
    .index("by_type", ["companyId", "type"])
    .index("by_status", ["companyId", "status"])
    .index("by_date", ["companyId", "date"])
    .index("by_session_type", ["sessionId", "type"])
    .index("by_company_type_status", ["companyId", "type", "status"])
    .index("by_session_type_status", ["sessionId", "type", "status"])
    .index("by_session_date", ["sessionId", "date"])
    .index("by_source_document", ["sourceDocumentId"]),

  // Documents table - uploaded files (bank statements, invoices)
  documents: defineTable({
    companyId: v.id("companies"),
    fileName: v.string(),
    fileType: v.string(), // "pdf", "csv", "xlsx"
    fileSize: v.number(), // bytes
    storageId: v.optional(v.id("_storage")), // Convex file storage ID
    documentType: v.union(
      v.literal("bank_statement"),
      v.literal("invoice"),
      v.literal("receipt"),
      v.literal("other")
    ),
    extractedText: v.optional(v.string()), // OCR/parsed text
    extractionStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    // Granular extraction phase tracking (for enhanced UX)
    extractionPhase: v.optional(v.union(
      v.literal("uploading"),      // File being uploaded to storage
      v.literal("converting"),     // PDF → images (browser-side)
      v.literal("extracting"),     // OCR in progress (Bedrock)
      v.literal("processing"),     // Parsing extracted data
      v.literal("complete"),       // Extraction finished
      v.literal("failed")          // Extraction failed
    )),
    // Extraction job tracking
    extractionJobId: v.optional(v.string()), // ML service job ID
    errorMessage: v.optional(v.string()), // Error details if failed
    extractionConfidence: v.optional(v.number()), // 0-100 overall confidence
    // Bank statement specific fields
    bankType: v.optional(v.string()), // "maybank", "cimb", "public_bank", etc.
    periodStart: v.optional(v.string()), // Statement period start date
    periodEnd: v.optional(v.string()), // Statement period end date
    // Extraction stats
    extractedTransactionCount: v.optional(v.number()),
    // Multi-page extraction progress (for PDFs)
    extractionProgress: v.optional(v.object({
      currentPage: v.number(),
      totalPages: v.number(),
      /** Pages fully completed (for parallel processing where currentPage may not be sequential) */
      pagesCompleted: v.optional(v.number()),
      /** Running count of transactions extracted so far (for streaming display) */
      streamedTransactionCount: v.optional(v.number()),
      /** Human-readable phase description for UI display */
      phaseMessage: v.optional(v.string()),
    })),
    uploadedAt: v.number(),
    processedAt: v.optional(v.number()),
    // AI upload analysis fields
    aiClassification: v.optional(v.string()),           // AI's content-based classification
    aiBasisType: v.optional(v.union(v.literal("cash"), v.literal("accrual"))),
    aiClassificationConfidence: v.optional(v.number()), // 0-100
    uploadAnalysisId: v.optional(v.id("uploadAnalyses")),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["extractionStatus"])
    .index("by_job", ["extractionJobId"])
    .index("by_company_documentType", ["companyId", "documentType"]),

  // Matched pairs table - reconciliation results
  matchedPairs: defineTable({
    sessionId: v.id("reconciliationSessions"),
    cashTransactionId: v.id("transactions"),
    // Support both old (transaction) and new (accrualDocument) schema
    accrualTransactionId: v.optional(v.id("transactions")), // Legacy - will be deprecated
    accrualDocumentId: v.optional(v.id("accrualDocuments")), // New - preferred
    confidence: v.union(
      v.literal("high"),    // >= 90%
      v.literal("medium"),  // 70-89%
      v.literal("low")      // < 70%
    ),
    confidenceScore: v.number(), // 0-100
    matchLayer: v.union(
      v.literal(1), // Exact match
      v.literal(2), // Window match (+/- 7 days)
      v.literal(3), // Reference match
      v.literal(4), // Fuzzy match
      v.literal(5), // LLM semantic match
      v.literal(6), // Manual match
      v.literal(7)  // Partial match (one-to-many)
    ),
    matchReason: v.optional(v.string()), // Why matched
    status: v.union(
      v.literal("pending"),   // Awaiting review
      v.literal("approved"),  // User approved
      v.literal("rejected")   // User rejected
    ),
    // Partial matching support (one-to-many)
    matchedAmount: v.optional(v.number()), // Amount matched from cash txn (defaults to full amount)
    isPartialMatch: v.optional(v.boolean()), // True if this is part of a partial payment chain
    partialMatchGroupId: v.optional(v.string()), // Groups related partial matches together (e.g., "pm_<cashTxnId>_<timestamp>")
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["sessionId", "status"])
    .index("by_cash_txn", ["cashTransactionId"])
    .index("by_accrual_txn", ["accrualTransactionId"])
    .index("by_accrual_doc", ["accrualDocumentId"])
    .index("by_session_layer", ["sessionId", "matchLayer"])
    .index("by_session_confidence", ["sessionId", "confidence"])
    .index("by_partial_group", ["partialMatchGroupId"]),

  // Reconciliation sessions table - grouping of reconciliation work
  reconciliationSessions: defineTable({
    companyId: v.id("companies"),
    name: v.string(), // e.g., "January 2025 Reconciliation"
    periodStart: v.optional(v.string()), // ISO date
    periodEnd: v.optional(v.string()), // ISO date
    status: v.union(
      v.literal("draft"),      // Just created
      v.literal("processing"), // Matching in progress
      v.literal("review"),     // Awaiting user review
      v.literal("completed")   // Finalized
    ),
    progress: v.number(), // 0-100

    // Stats
    totalCashTransactions: v.number(),
    totalAccrualTransactions: v.number(),
    matchedCount: v.number(),
    suspenseCount: v.number(),

    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    createdBy: v.id("users"),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["companyId", "status"]),

  // Accrual documents table - invoices, receipts, POS reports (separate from cash transactions)
  accrualDocuments: defineTable({
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")),
    docType: v.union(
      v.literal("sales_invoice"),
      v.literal("purchase_invoice"),
      v.literal("pos_report"),
      v.literal("settlement"),
      v.literal("receipt")
    ),
    docNumber: v.optional(v.string()),
    docDate: v.string(), // ISO date
    dueDate: v.optional(v.string()),
    counterparty: v.optional(v.string()),
    amount: v.number(),
    taxAmount: v.optional(v.number()),
    description: v.optional(v.string()),
    lineItems: v.optional(v.string()), // JSON string for flexibility
    sourceDocumentId: v.optional(v.id("documents")),
    extractedText: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("matched"),
      v.literal("partial"),
      v.literal("suspense")
    ),
    // Matching support
    matchId: v.optional(v.id("matchedPairs")), // Primary/first match (for backwards compat)
    // Partial payment tracking (one-to-many matching)
    matchedTotal: v.optional(v.number()), // Total amount matched so far (0 = unmatched)
    matchCount: v.optional(v.number()), // Number of matches (for partial payments)
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["companyId", "status"])
    .index("by_date", ["companyId", "docDate"])
    .index("by_session_status", ["sessionId", "status"])
    .index("by_session_type", ["sessionId", "docType"])
    .index("by_session_date", ["sessionId", "docDate"])
    .index("by_counterparty", ["sessionId", "counterparty"])
    .index("by_source_document", ["sourceDocumentId"]),

  // Suspense items table - unmatched items requiring attention
  suspenseItems: defineTable({
    companyId: v.id("companies"),
    sessionId: v.id("reconciliationSessions"),
    sourceType: v.union(v.literal("cash"), v.literal("accrual")),
    // Typed ID for referential integrity
    // - For cash: Id<transactions>
    // - For accrual: Id<accrualDocuments>
    sourceId: v.union(v.id("transactions"), v.id("accrualDocuments")),
    amount: v.number(),
    transactionDate: v.string(),
    description: v.string(),
    reason: v.string(), // "no_match", "amount_mismatch", "date_outside_range"
    suggestedAction: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("queried"),
      v.literal("resolved")
    ),
    resolutionNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["companyId", "status"])
    .index("by_session_status", ["sessionId", "status"]),

  // Categories table - keyword-based transaction categorization
  categories: defineTable({
    companyId: v.optional(v.id("companies")), // null = global
    keyword: v.string(),
    mainCategory: v.string(),
    subCategory: v.string(),
    accountCode: v.optional(v.string()),
    isGlobal: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_keyword", ["keyword"])
    .index("by_global", ["isGlobal"]),

  // PDF Export Jobs - tracks async PDF generation
  pdfExportJobs: defineTable({
    sessionId: v.id("reconciliationSessions"),
    userId: v.id("users"),
    reportType: v.union(
      v.literal("bank_recon"),
      v.literal("client_query"),
      v.literal("transaction_listing")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    downloadUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    expiresAt: v.optional(v.number()), // When download URL expires
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Onboarding progress - persists multi-step onboarding state
  onboardingProgress: defineTable({
    userId: v.id("users"),
    currentStep: v.number(), // Current question index
    data: v.object({
      companyName: v.optional(v.string()),
      industryCategory: v.optional(v.string()),
      taxRegistered: v.optional(v.string()),
      taxNumber: v.optional(v.string()),
      primaryBank: v.optional(v.string()),
      fiscalYearEnd: v.optional(v.string()),
    }),
    isCompleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_completed", ["isCompleted"]),

  // ============================================================================
  // Agentic Spreadsheet (Smart Workspace) Tables
  // ============================================================================

  // Workspace = collection of worksheets (like a Google Sheets document)
  workspaces: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_name", ["companyId", "name"]),

  // Worksheet = single spreadsheet tab within a workspace
  worksheets: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    /** Display order within workspace (0-based) */
    order: v.optional(v.number()),
    /** Number of frozen rows (header rows that stay visible when scrolling) */
    frozenRows: v.optional(v.number()),
    /** Number of frozen columns (left columns that stay visible when scrolling) */
    frozenColumns: v.optional(v.number()),
    /** Template ID this worksheet was created from */
    templateId: v.optional(v.id("sheetTemplates")),
    deletedAt: v.optional(v.number()), // Soft delete timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_active", ["workspaceId", "deletedAt"])
    .index("by_workspace_order", ["workspaceId", "order"]), // For ordering worksheets

  // Column definitions (schema for each column)
  worksheetColumns: defineTable({
    worksheetId: v.id("worksheets"),
    order: v.number(), // 0, 1, 2... for column ordering
    name: v.string(), // "Company URL", "CEO Name"
    columnType: v.union(
      v.literal("text"), // Manual input
      v.literal("number"),
      v.literal("date"),
      v.literal("dropdown"),
      v.literal("checkbox"),
      v.literal("currency"),
      v.literal("percentage"),
      v.literal("formula") // AI-enriched or Excel formula
    ),
    formula: v.optional(v.string()), // "=ENRICH(A, 'Find the CEO')"
    /** Native Excel formula (=SUM, =IF, etc.) - different from AI enrichment formula */
    excelFormula: v.optional(v.string()),
    /** Number/date/currency format string (e.g., "#,##0.00", "YYYY-MM-DD") */
    format: v.optional(v.string()),
    /** Dropdown options for dropdown type */
    dropdownOptions: v.optional(v.array(v.string())),
    dataSource: v.optional(v.string()), // "clearbit", "zoominfo", "llm"
    width: v.optional(v.number()), // Column width in pixels
    /** Whether this column is hidden */
    hidden: v.optional(v.boolean()),
    inputColumnId: v.optional(v.id("worksheetColumns")), // Which column to use as input for AI enrichment
    deletedAt: v.optional(v.number()), // Soft delete timestamp
    // Data validation settings (Phase 4)
    validation: v.optional(v.object({
      type: v.union(
        v.literal("list"),       // Dropdown from list of values
        v.literal("number"),     // Numeric constraints (min/max)
        v.literal("date"),       // Date constraints
        v.literal("text")        // Text constraints (length, pattern)
      ),
      /** Allowed values for list type */
      allowedValues: v.optional(v.array(v.string())),
      /** Minimum value for number/date/text length */
      min: v.optional(v.number()),
      /** Maximum value for number/date/text length */
      max: v.optional(v.number()),
      /** Regex pattern for text validation */
      pattern: v.optional(v.string()),
      /** Whether the field is required (non-empty) */
      required: v.optional(v.boolean()),
      /** Custom error message */
      errorMessage: v.optional(v.string()),
    })),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_worksheet_order", ["worksheetId", "order"])
    .index("by_input_column", ["inputColumnId"]) // For cascade handling when input column is deleted
    .index("by_worksheet_active", ["worksheetId", "deletedAt"]), // For filtering active columns

  // Row data (cells stored as JSON object per row)
  worksheetRows: defineTable({
    worksheetId: v.id("worksheets"),
    rowNumber: v.number(),
    // Cell values: { "col_0": "apple.com", "col_1": "Tim Cook" }
    cells: v.record(v.string(), v.any()),
    // Cell status: { "col_1": "complete", "col_2": "running" }
    cellStatus: v.record(
      v.string(),
      v.union(
        v.literal("idle"),
        v.literal("pending"),
        v.literal("running"),
        v.literal("complete"),
        v.literal("error")
      )
    ),
    // Cell errors: { "col_2": "API rate limit exceeded" }
    cellErrors: v.optional(v.record(v.string(), v.string())),
    // Optimistic concurrency control - increment on each update
    version: v.optional(v.number()), // Optional for backwards compatibility with existing rows
    deletedAt: v.optional(v.number()), // Soft delete timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_worksheet_row", ["worksheetId", "rowNumber"])
    .index("by_worksheet_active", ["worksheetId", "deletedAt"]), // For filtering active rows

  // Agent jobs (for tracking async enrichment)
  agentJobs: defineTable({
    worksheetId: v.id("worksheets"),
    rowId: v.id("worksheetRows"),
    columnId: v.id("worksheetColumns"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    input: v.string(), // The input value
    prompt: v.string(), // The enrichment prompt
    dataSource: v.string(), // "clearbit", "zoominfo", "llm"
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    retryCount: v.number(),
    // Credits tracking
    creditsCost: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_worksheet", ["worksheetId"])
    .index("by_row", ["rowId"])
    .index("by_column", ["columnId"])
    .index("by_worksheet_status", ["worksheetId", "status"]),

  // Company credits balance
  companyCredits: defineTable({
    companyId: v.id("companies"),
    balance: v.number(), // Current credit balance
    totalPurchased: v.number(), // Lifetime credits purchased
    totalUsed: v.number(), // Lifetime credits used
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Credit transactions (audit log)
  creditTransactions: defineTable({
    companyId: v.id("companies"),
    type: v.union(
      v.literal("purchase"),
      v.literal("usage"),
      v.literal("refund")
    ),
    amount: v.number(), // Positive for purchase, negative for usage
    description: v.string(), // "Enrichment job #123" or "100 credits pack"
    jobId: v.optional(v.id("agentJobs")),
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_company", ["companyId"])
    .index("by_company_time", ["companyId", "createdAt"])
    .index("by_job", ["jobId"]),

  // ============================================================================
  // Worksheet Data Sources - Links worksheets to external data (Phase 3)
  // ============================================================================

  // Data sources for worksheets (reconciliation, CSV, manual)
  worksheetDataSources: defineTable({
    worksheetId: v.id("worksheets"),
    sourceType: v.union(
      v.literal("manual"),         // User-entered data (default)
      v.literal("reconciliation"), // Linked to reconciliation session
      v.literal("csv_import")      // Imported from CSV/Excel file
    ),
    // Configuration depends on sourceType - union of all possible configs:
    // - reconciliation: { sessionId, includeMatches?, includeSuspense?, matchStatusFilter?, suspenseStatusFilter? }
    // - csv_import: { fileName, columnMapping, importedAt }
    // - manual: {}
    sourceConfig: v.union(
      // Manual source config (empty)
      v.object({}),
      // Reconciliation source config
      v.object({
        sessionId: v.id("reconciliationSessions"),
        includeMatches: v.optional(v.boolean()),
        includeSuspense: v.optional(v.boolean()),
        matchStatusFilter: v.optional(v.union(
          v.literal("pending"),
          v.literal("approved"),
          v.literal("rejected")
        )),
        suspenseStatusFilter: v.optional(v.union(
          v.literal("open"),
          v.literal("queried"),
          v.literal("resolved")
        )),
      }),
      // CSV import source config
      v.object({
        fileName: v.string(),
        columnMapping: v.record(v.string(), v.number()),
        importedAt: v.number(),
      })
    ),
    // Column indices that are read-only (linked to data source)
    linkedColumns: v.array(v.number()),
    // Whether this data source is read-only (blocks editing of linked columns)
    readonly: v.boolean(),
    // Auto-refresh interval in milliseconds (null = manual refresh only)
    refreshInterval: v.optional(v.number()),
    lastRefreshedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_source_type", ["sourceType"]),

  // ============================================================================
  // Worksheet Conditional Formatting - Visual rules for cells (Phase 4)
  // ============================================================================

  worksheetConditionalFormats: defineTable({
    worksheetId: v.id("worksheets"),
    /** Display name for the rule */
    name: v.string(),
    /** Range specification - which cells to apply the rule to */
    range: v.object({
      /** Start cell like "A1" or null for entire column */
      startCell: v.optional(v.string()),
      /** End cell like "A100" or null for until last row */
      endCell: v.optional(v.string()),
      /** Apply to entire column by index (0-based) */
      columnIndex: v.optional(v.number()),
      /** Apply to entire row by index (0-based) */
      rowIndex: v.optional(v.number()),
    }),
    /** Type of rule */
    ruleType: v.union(
      v.literal("threshold"),        // value > X or value < X
      v.literal("between"),          // X <= value <= Y
      v.literal("equals"),           // value == X
      v.literal("contains"),         // text contains substring
      v.literal("confidenceBand"),   // Preset: high (≥90%), medium (70-89%), low (<70%)
      v.literal("statusColor"),      // Preset: matched/pending/suspense colors
      v.literal("matchLayer")        // Preset: exact/window/reference/fuzzy/semantic/manual colors
    ),
    /** Conditions and their formatting */
    conditions: v.array(v.object({
      /** Comparison operator */
      operator: v.union(
        v.literal("gt"),       // >
        v.literal("gte"),      // >=
        v.literal("lt"),       // <
        v.literal("lte"),      // <=
        v.literal("eq"),       // ==
        v.literal("neq"),      // !=
        v.literal("contains"), // text contains
        v.literal("startsWith"),
        v.literal("endsWith"),
        v.literal("between")   // range check
      ),
      /** Value to compare against (number or string) */
      value: v.any(),
      /** Second value for "between" operator */
      value2: v.optional(v.any()),
      /** Formatting to apply when condition is true */
      formatting: v.object({
        backgroundColor: v.optional(v.string()),
        textColor: v.optional(v.string()),
        bold: v.optional(v.boolean()),
        italic: v.optional(v.boolean()),
        underline: v.optional(v.boolean()),
        strikethrough: v.optional(v.boolean()),
      }),
    })),
    /** Priority for overlapping rules (higher = applied later/wins) */
    priority: v.number(),
    /** Whether this rule is currently enabled */
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_worksheet_enabled", ["worksheetId", "enabled"]),

  // ============================================================================
  // Worksheet Charts - Visualizations from spreadsheet data (Phase 4)
  // ============================================================================

  worksheetCharts: defineTable({
    worksheetId: v.id("worksheets"),
    /** Chart title */
    title: v.string(),
    /** Chart type */
    chartType: v.union(
      v.literal("bar"),
      v.literal("line"),
      v.literal("pie"),
      v.literal("area"),
      v.literal("scatter")
    ),
    /** Data range like "A1:B10" */
    dataRange: v.string(),
    /** Column index for labels (X-axis or pie labels) */
    labelColumn: v.optional(v.number()),
    /** Column indices for values (Y-axis values) */
    valueColumns: v.array(v.number()),
    /** Chart display options */
    options: v.object({
      showLegend: v.boolean(),
      showLabels: v.boolean(),
      showGrid: v.optional(v.boolean()),
      animate: v.boolean(),
      colors: v.optional(v.array(v.string())),
      /** For bar charts: horizontal vs vertical */
      orientation: v.optional(v.union(v.literal("horizontal"), v.literal("vertical"))),
      /** For line/area charts: show data points */
      showDots: v.optional(v.boolean()),
      /** Chart height in pixels */
      height: v.optional(v.number()),
    }),
    /** Position in chart panel (for ordering) */
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_worksheet_position", ["worksheetId", "position"]),

  // ============================================================================
  // Sheet Templates - Reusable spreadsheet configurations
  // ============================================================================

  sheetTemplates: defineTable({
    /** Template name */
    name: v.string(),
    /** Template description */
    description: v.optional(v.string()),
    /** Template category */
    category: v.union(
      v.literal("blank"),
      v.literal("reconciliation"),
      v.literal("accounting"),
      v.literal("custom")
    ),
    /** Whether this is a built-in system template */
    isBuiltIn: v.boolean(),
    /** Column definitions as JSON */
    columns: v.array(v.object({
      name: v.string(),
      columnType: v.string(),
      width: v.optional(v.number()),
      format: v.optional(v.string()),
      dropdownOptions: v.optional(v.array(v.string())),
      validation: v.optional(v.any()),
    })),
    /** Sample data rows (optional) */
    sampleData: v.optional(v.array(v.record(v.string(), v.any()))),
    /** Template thumbnail URL */
    thumbnailUrl: v.optional(v.string()),
    /** Company ID (null for global templates) */
    companyId: v.optional(v.id("companies")),
    /** User who created the template */
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_company", ["companyId"])
    .index("by_built_in", ["isBuiltIn"]),

  // ============================================================================
  // Upload Analysis - AI-powered document classification and company verification
  // ============================================================================

  uploadAnalyses: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),     // Waiting for extractions to complete
      v.literal("analyzing"),   // AI analysis running
      v.literal("ready"),       // Analysis complete, awaiting review
      v.literal("approved"),    // User approved, session created
      v.literal("dismissed")    // User skipped
    ),
    documentIds: v.array(v.id("documents")),

    // AI-detected company info
    detectedCompany: v.optional(v.object({
      name: v.string(),
      registrationNumber: v.optional(v.string()),
      bankName: v.optional(v.string()),
      accountNumber: v.optional(v.string()),
      matchStatus: v.union(
        v.literal("match"),
        v.literal("partial_match"),
        v.literal("mismatch"),
        v.literal("unknown")
      ),
      matchDetails: v.optional(v.string()),
    })),

    // Per-document classification
    documentClassifications: v.array(v.object({
      documentId: v.id("documents"),
      fileName: v.string(),
      aiClassification: v.string(),  // bank_statement, invoice, receipt, etc.
      basisType: v.union(v.literal("cash"), v.literal("accrual")),
      confidence: v.number(),
      reason: v.optional(v.string()),
      userOverride: v.optional(v.object({
        classification: v.string(),
        basisType: v.union(v.literal("cash"), v.literal("accrual")),
      })),
      pageCount: v.optional(v.number()),
      transactionCount: v.optional(v.number()),
      extractionStatus: v.string(),
      errorMessage: v.optional(v.string()),
    })),

    // Aggregate stats
    stats: v.optional(v.object({
      totalDocuments: v.number(),
      totalPages: v.number(),
      cashDocuments: v.number(),
      accrualDocuments: v.number(),
      cashTransactions: v.number(),
      accrualItems: v.number(),
      failedDocuments: v.number(),
    })),

    sessionId: v.optional(v.id("reconciliationSessions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_status", ["companyId", "status"]),

  // Atomic counters for unique code generation (prevents race conditions)
  counters: defineTable({
    key: v.string(), // e.g., "company_code:ABC" for company initials
    value: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // ============================================================================
  // Extraction Queue - Batch document processing
  // ============================================================================

  // Extraction queue for batch processing (50+ documents)
  extractionQueue: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    /** Batch name for display (e.g., "January 2025 Statements") */
    batchName: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),      // Waiting to start
      v.literal("processing"),   // Currently processing
      v.literal("completed"),    // All documents processed
      v.literal("failed"),       // Batch failed (partial or full)
      v.literal("cancelled")     // User cancelled
    ),
    /** Total documents in this batch */
    totalDocuments: v.number(),
    /** Documents successfully processed */
    completedCount: v.number(),
    /** Documents that failed */
    failedCount: v.number(),
    /** Current document being processed (0-indexed position) */
    currentPosition: v.number(),
    /** Estimated time remaining in seconds */
    estimatedSecondsRemaining: v.optional(v.number()),
    /** Average processing time per document (for estimation) */
    avgProcessingTimeMs: v.optional(v.number()),
    /** Priority level (higher = processed first) */
    priority: v.number(), // 0 = normal, 10 = high
    /** Whether queue processing is paused (default false) */
    isPaused: v.optional(v.boolean()),
    /** Timestamp when queue was paused */
    pausedAt: v.optional(v.number()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_priority_created", ["priority", "createdAt"])
    // QUALITY FIX: Compound index for proper queue ordering by status, priority, then creation time
    .index("by_status_priority_created", ["status", "priority", "createdAt"]),

  // Individual items in extraction queue (links to documents)
  extractionQueueItems: defineTable({
    queueId: v.id("extractionQueue"),
    documentId: v.id("documents"),
    /** Position in queue (0-indexed) */
    position: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    /** Error message if failed */
    errorMessage: v.optional(v.string()),
    /** Processing time in ms */
    processingTimeMs: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // Retry logic fields for DLQ management
    /** Number of retry attempts so far (default 0) */
    retryCount: v.optional(v.number()),
    /** Maximum retries allowed before moving to DLQ (default 3) */
    maxRetries: v.optional(v.number()),
    /** Full error details from last failure */
    lastError: v.optional(v.string()),
    /** Timestamp for next retry attempt (for backoff scheduling) */
    nextRetryAt: v.optional(v.number()),
    /** Whether this item is in the dead letter queue (exhausted retries) */
    isDLQ: v.optional(v.boolean()),
  })
    .index("by_queue", ["queueId"])
    .index("by_queue_position", ["queueId", "position"])
    .index("by_document", ["documentId"])
    .index("by_queue_status", ["queueId", "status"])
    .index("by_dlq", ["isDLQ"])
    .index("by_next_retry", ["nextRetryAt"]),

  // User preferences - persists display settings and notification preferences
  userPreferences: defineTable({
    userId: v.id("users"),
    dateFormat: v.optional(v.string()), // "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"
    numberFormat: v.optional(v.string()), // "1,234.56" | "1.234,56" | "1 234.56"
    emailReconciliation: v.optional(v.boolean()), // Notify when reconciliation completes
    emailWeeklyDigest: v.optional(v.boolean()), // Weekly summary email
    emailProductUpdates: v.optional(v.boolean()), // New features notifications
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Rate limit tracking for destructive operations (per-user)
  rateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(), // "deleteAccount" | "exportUserData"
    timestamps: v.array(v.number()), // Array of attempt timestamps
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_action", ["userId", "action"]),

  // Rate limit tracking for uploads (per-company)
  // SECURITY: Prevents abuse by limiting uploads per company per minute
  uploadRateLimits: defineTable({
    companyId: v.id("companies"),
    timestamps: v.array(v.number()), // Array of upload attempt timestamps
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"]),

  // Reconciliation chat messages for agentic assistant with 24h retention
  reconciliationChatMessages: defineTable({
    sessionId: v.id("reconciliationSessions"),
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(), // Full UIMessage JSON-serialized
    metadata: v.optional(v.object({
      toolCalls: v.optional(v.array(v.object({
        toolName: v.string(),
        toolCallId: v.string(),
      }))),
      stepCount: v.optional(v.number()),
    })),
    createdAt: v.number(),
    expiresAt: v.number(), // createdAt + 86400000 (24h)
  })
    .index("by_session", ["sessionId"])
    .index("by_session_time", ["sessionId", "createdAt"])
    .index("by_expires", ["expiresAt"]),

  // Worksheet chat messages for conversational AI queries on spreadsheet data
  worksheetMessages: defineTable({
    worksheetId: v.id("worksheets"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    metadata: v.optional(v.object({
      referencedCells: v.optional(v.array(v.object({
        rowNumber: v.number(),
        columnKey: v.string(),
      }))),
      toolCalls: v.optional(v.array(v.object({
        name: v.string(),
        result: v.optional(v.string()),
      }))),
    })),
    createdAt: v.number(),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_worksheet_time", ["worksheetId", "createdAt"]),

  // ============================================================================
  // Self-Hosted Error Monitoring
  // ============================================================================

  // Application errors table - stores client and server errors for monitoring
  errors: defineTable({
    message: v.string(),
    stack: v.optional(v.string()),
    type: v.union(
      v.literal("uncaught"),      // window.onerror
      v.literal("promise"),       // unhandledrejection
      v.literal("boundary"),      // React error boundary
      v.literal("api"),           // API/fetch errors
      v.literal("convex"),        // Convex mutation/query errors
      v.literal("manual")         // Manually logged errors
    ),
    url: v.string(),              // Page URL where error occurred
    userAgent: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    componentName: v.optional(v.string()), // For boundary errors
    metadata: v.optional(v.any()),         // Additional context
    fingerprint: v.string(),               // Hash for deduplication
    count: v.number(),                     // Occurrence count (for deduped errors)
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    isResolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
  })
    .index("by_created", ["lastSeenAt"])
    .index("by_type", ["type", "lastSeenAt"])
    .index("by_fingerprint", ["fingerprint"])
    .index("by_resolved", ["isResolved", "lastSeenAt"])
    .index("by_user", ["userId", "lastSeenAt"]),

  // ============================================================================
  // Audit Log - User action audit trail for compliance and debugging
  // ============================================================================

  auditLog: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    /** Action type - what operation was performed */
    action: v.union(
      // Document actions
      v.literal("document_upload"),
      v.literal("document_delete"),
      // Extraction actions
      v.literal("extraction_start"),
      v.literal("extraction_complete"),
      v.literal("extraction_fail"),
      v.literal("extraction_retry"),
      // Match actions
      v.literal("match_create"),
      v.literal("match_approve"),
      v.literal("match_reject"),
      v.literal("match_manual"),
      v.literal("match_bulk_approve"),
      v.literal("match_bulk_reject"),
      // Session actions
      v.literal("session_create"),
      v.literal("session_start"),
      v.literal("session_complete"),
      // Export actions
      v.literal("export_generate"),
      v.literal("export_download"),
      // Settings actions
      v.literal("settings_change"),
      v.literal("company_update"),
      // Queue actions
      v.literal("queue_create"),
      v.literal("queue_pause"),
      v.literal("queue_resume"),
      v.literal("queue_cancel"),
      // Transaction actions
      v.literal("transaction_edit"),
      v.literal("transaction_delete"),
      // Suspense actions
      v.literal("suspense_query"),
      v.literal("suspense_resolve")
    ),
    /** Resource type affected */
    resourceType: v.union(
      v.literal("document"),
      v.literal("transaction"),
      v.literal("accrualDocument"),
      v.literal("match"),
      v.literal("session"),
      v.literal("company"),
      v.literal("queue"),
      v.literal("suspense"),
      v.literal("export")
    ),
    /** Resource ID (string for flexibility with different ID types) */
    resourceId: v.optional(v.string()),
    /** Additional metadata about the action */
    metadata: v.optional(v.any()),
    /** Timestamp when action occurred */
    timestamp: v.number(),
    /** IP address (if available from HTTP context) */
    ipAddress: v.optional(v.string()),
    /** User agent (if available from HTTP context) */
    userAgent: v.optional(v.string()),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_company_time", ["companyId", "timestamp"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_user_time", ["userId", "timestamp"])
    .index("by_company_action", ["companyId", "action"]),
});
