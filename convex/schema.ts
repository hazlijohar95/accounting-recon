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
  })
    .index("by_company", ["companyId"])
    .index("by_session", ["sessionId"])
    .index("by_type", ["companyId", "type"])
    .index("by_status", ["companyId", "status"])
    .index("by_date", ["companyId", "date"])
    .index("by_session_type", ["sessionId", "type"])
    .index("by_company_type_status", ["companyId", "type", "status"])
    .index("by_session_type_status", ["sessionId", "type", "status"])
    .index("by_session_date", ["sessionId", "date"]),

  // Documents table - uploaded files (bank statements, invoices)
  documents: defineTable({
    companyId: v.id("companies"),
    fileName: v.string(),
    fileType: v.string(), // "pdf", "csv", "xlsx"
    fileSize: v.number(), // bytes
    storageId: v.optional(v.string()), // R2/S3 storage key
    storageUrl: v.optional(v.string()), // Public URL for ML service access
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
    uploadedAt: v.number(),
    processedAt: v.optional(v.number()),
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
      v.literal(6)  // Manual match
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
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["sessionId", "status"])
    .index("by_cash_txn", ["cashTransactionId"])
    .index("by_accrual_txn", ["accrualTransactionId"])
    .index("by_accrual_doc", ["accrualDocumentId"])
    .index("by_session_layer", ["sessionId", "matchLayer"]),

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
    .index("by_counterparty", ["sessionId", "counterparty"]),

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
    userId: v.string(), // Email before account created, or Convex user ID after
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  // Column definitions (schema for each column)
  worksheetColumns: defineTable({
    worksheetId: v.id("worksheets"),
    order: v.number(), // 0, 1, 2... for column ordering
    name: v.string(), // "Company URL", "CEO Name"
    columnType: v.union(
      v.literal("text"), // Manual input
      v.literal("number"),
      v.literal("formula") // AI-enriched
    ),
    formula: v.optional(v.string()), // "=ENRICH(A, 'Find the CEO')"
    dataSource: v.optional(v.string()), // "clearbit", "zoominfo", "llm"
    width: v.optional(v.number()), // Column width in pixels
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_worksheet_order", ["worksheetId", "order"]),

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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_worksheet", ["worksheetId"])
    .index("by_worksheet_row", ["worksheetId", "rowNumber"]),

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

  // Atomic counters for unique code generation (prevents race conditions)
  counters: defineTable({
    key: v.string(), // e.g., "company_code:ABC" for company initials
    value: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
