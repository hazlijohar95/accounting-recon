/**
 * Shared validators for Convex return types
 * Used to add type-safe return validators to queries and mutations
 */
import { v } from "convex/values";

// ============ ID VALIDATORS ============

export const userIdValidator = v.id("users");
export const companyIdValidator = v.id("companies");
export const transactionIdValidator = v.id("transactions");
export const documentIdValidator = v.id("documents");
export const matchIdValidator = v.id("matchedPairs");
export const sessionIdValidator = v.id("reconciliationSessions");
export const accrualDocIdValidator = v.id("accrualDocuments");
export const suspenseItemIdValidator = v.id("suspenseItems");
export const categoryIdValidator = v.id("categories");

// ============ BOUNDING BOX VALIDATOR ============

/**
 * Bounding box validator for OCR/extraction source linking
 * Coordinates are percentages (0-100) relative to image dimensions
 */
export const boundingBoxValidator = v.object({
  x: v.number(),      // X coordinate (percentage from left)
  y: v.number(),      // Y coordinate (percentage from top)
  width: v.number(),  // Width (percentage)
  height: v.number(), // Height (percentage)
});

/**
 * Field-level bounding boxes for transaction source linking
 */
export const fieldBoundingBoxesValidator = v.object({
  pageNumber: v.number(),
  date: v.optional(boundingBoxValidator),
  description: v.optional(boundingBoxValidator),
  amount: v.optional(boundingBoxValidator),
  reference: v.optional(boundingBoxValidator),
});

/**
 * Field-level confidence scores for extraction quality indication
 */
export const fieldConfidenceValidator = v.object({
  date: v.optional(v.number()),
  description: v.optional(v.number()),
  amount: v.optional(v.number()),
  reference: v.optional(v.number()),
});

// ============ ENUM VALIDATORS ============

// Transaction types
export const transactionTypeValidator = v.union(
  v.literal("cash"),
  v.literal("accrual")
);

// Transaction/document status
export const transactionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("matched"),
  v.literal("suspense")
);

// Session status
export const sessionStatusValidator = v.union(
  v.literal("draft"),
  v.literal("processing"),
  v.literal("review"),
  v.literal("completed")
);

// Document types
export const documentTypeValidator = v.union(
  v.literal("bank_statement"),
  v.literal("invoice"),
  v.literal("receipt"),
  v.literal("other")
);

// Extraction status
export const extractionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

// Accrual document types
export const accrualDocTypeValidator = v.union(
  v.literal("sales_invoice"),
  v.literal("purchase_invoice"),
  v.literal("pos_report"),
  v.literal("settlement"),
  v.literal("receipt")
);

// Accrual document status
export const accrualDocStatusValidator = v.union(
  v.literal("pending"),
  v.literal("matched"),
  v.literal("partial"),
  v.literal("suspense")
);

// Match confidence
export const matchConfidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

// Match layer
export const matchLayerValidator = v.union(
  v.literal(1), // Exact match
  v.literal(2), // Window match
  v.literal(3), // Reference match
  v.literal(4), // Fuzzy match
  v.literal(5), // LLM semantic match
  v.literal(6), // Manual match
  v.literal(7)  // Partial match (one-to-many)
);

// Match status
export const matchStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

// Suspense item status
export const suspenseStatusValidator = v.union(
  v.literal("open"),
  v.literal("queried"),
  v.literal("resolved")
);

// Source type for suspense
export const sourceTypeValidator = v.union(
  v.literal("cash"),
  v.literal("accrual")
);

// ============ DOCUMENT VALIDATORS ============

// Bank account object
export const bankAccountValidator = v.object({
  bank: v.string(),
  accountNumber: v.string(),
  accountType: v.string(),
  isPrimary: v.boolean(),
});

// User document
export const userDocValidator = v.object({
  _id: userIdValidator,
  _creationTime: v.number(),
  email: v.string(),
  name: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  workosId: v.optional(v.string()),
  createdAt: v.number(),
});

// Company document
export const companyDocValidator = v.object({
  _id: companyIdValidator,
  _creationTime: v.number(),
  name: v.string(),
  code: v.optional(v.string()),
  tradingAs: v.optional(v.string()),
  registrationNumber: v.optional(v.string()),
  industry: v.optional(v.string()),
  industryCategory: v.optional(v.string()),
  fiscalYearEnd: v.optional(v.string()),
  taxRegistered: v.optional(v.boolean()),
  taxNumber: v.optional(v.string()),
  bankName: v.optional(v.string()),
  primaryBank: v.optional(v.string()),
  primaryAccountNumber: v.optional(v.string()),
  bankAccounts: v.optional(v.array(bankAccountValidator)),
  currency: v.string(),
  ownerId: userIdValidator,
  onboardingCompleted: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
  isDeleted: v.boolean(),
});

// Transaction document
export const transactionDocValidator = v.object({
  _id: transactionIdValidator,
  _creationTime: v.number(),
  companyId: companyIdValidator,
  sessionId: v.optional(sessionIdValidator),
  date: v.string(),
  description: v.string(),
  reference: v.optional(v.string()),
  amount: v.number(),
  type: transactionTypeValidator,
  status: transactionStatusValidator,
  category: v.optional(v.string()),
  matchId: v.optional(matchIdValidator),
  sourceDocumentId: v.optional(documentIdValidator),
  createdAt: v.number(),
});

// Document (file upload) document
export const documentDocValidator = v.object({
  _id: documentIdValidator,
  _creationTime: v.number(),
  companyId: companyIdValidator,
  fileName: v.string(),
  fileType: v.string(),
  fileSize: v.number(),
  storageId: v.optional(v.id("_storage")), // Convex file storage ID
  documentType: documentTypeValidator,
  extractedText: v.optional(v.string()),
  extractionStatus: extractionStatusValidator,
  extractionJobId: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  extractionConfidence: v.optional(v.number()),
  bankType: v.optional(v.string()),
  periodStart: v.optional(v.string()),
  periodEnd: v.optional(v.string()),
  extractedTransactionCount: v.optional(v.number()),
  extractionProgress: v.optional(v.object({
    currentPage: v.number(),
    totalPages: v.number(),
    pagesCompleted: v.optional(v.number()),
    streamedTransactionCount: v.optional(v.number()),
    phaseMessage: v.optional(v.string()),
  })),
  extractionPhase: v.optional(v.union(
    v.literal("uploading"),
    v.literal("converting"),
    v.literal("extracting"),
    v.literal("processing"),
    v.literal("complete"),
    v.literal("failed")
  )),
  uploadedAt: v.number(),
  processedAt: v.optional(v.number()),
  // AI upload analysis fields
  aiClassification: v.optional(v.string()),
  aiBasisType: v.optional(v.union(v.literal("cash"), v.literal("accrual"))),
  aiClassificationConfidence: v.optional(v.number()),
  uploadAnalysisId: v.optional(v.id("uploadAnalyses")),
  // Bank statement specific fields
  accountHolderName: v.optional(v.string()),
  accountNumber: v.optional(v.string()),
  // Agent enrichment fields (populated during extraction)
  extractedCompanyName: v.optional(v.string()),
  extractedCounterparties: v.optional(v.array(v.string())),
  extractedCurrency: v.optional(v.string()),
});

// Matched pair document
export const matchDocValidator = v.object({
  _id: matchIdValidator,
  _creationTime: v.number(),
  sessionId: sessionIdValidator,
  cashTransactionId: transactionIdValidator,
  accrualTransactionId: v.optional(transactionIdValidator),
  accrualDocumentId: v.optional(accrualDocIdValidator),
  confidence: matchConfidenceValidator,
  confidenceScore: v.number(),
  matchLayer: matchLayerValidator,
  matchReason: v.optional(v.string()),
  status: matchStatusValidator,
  // Partial matching support
  matchedAmount: v.optional(v.number()),
  isPartialMatch: v.optional(v.boolean()),
  partialMatchGroupId: v.optional(v.string()), // Groups related partial matches
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(userIdValidator),
  createdAt: v.number(),
});

// Session document
export const sessionDocValidator = v.object({
  _id: sessionIdValidator,
  _creationTime: v.number(),
  companyId: companyIdValidator,
  name: v.string(),
  periodStart: v.optional(v.string()),
  periodEnd: v.optional(v.string()),
  status: sessionStatusValidator,
  progress: v.number(),
  totalCashTransactions: v.number(),
  totalAccrualTransactions: v.number(),
  matchedCount: v.number(),
  suspenseCount: v.number(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
  createdBy: userIdValidator,
});

// Accrual document
export const accrualDocValidator = v.object({
  _id: accrualDocIdValidator,
  _creationTime: v.number(),
  companyId: companyIdValidator,
  sessionId: v.optional(sessionIdValidator),
  docType: accrualDocTypeValidator,
  docNumber: v.optional(v.string()),
  docDate: v.string(),
  dueDate: v.optional(v.string()),
  counterparty: v.optional(v.string()),
  amount: v.number(),
  taxAmount: v.optional(v.number()),
  description: v.optional(v.string()),
  lineItems: v.optional(v.string()),
  sourceDocumentId: v.optional(documentIdValidator),
  extractedText: v.optional(v.string()),
  status: accrualDocStatusValidator,
  matchId: v.optional(matchIdValidator),
  // Partial matching support
  matchedTotal: v.optional(v.number()),
  matchCount: v.optional(v.number()),
  createdAt: v.number(),
});;

// Suspense item document
export const suspenseItemDocValidator = v.object({
  _id: suspenseItemIdValidator,
  _creationTime: v.number(),
  companyId: companyIdValidator,
  sessionId: sessionIdValidator,
  sourceType: sourceTypeValidator,
  // Typed ID union for referential integrity
  sourceId: v.union(transactionIdValidator, accrualDocIdValidator),
  amount: v.number(),
  transactionDate: v.string(),
  description: v.string(),
  reason: v.string(),
  suggestedAction: v.string(),
  status: suspenseStatusValidator,
  resolutionNotes: v.optional(v.string()),
  resolvedAt: v.optional(v.number()),
  resolvedBy: v.optional(userIdValidator),
  createdAt: v.number(),
});;

// Category document
export const categoryDocValidator = v.object({
  _id: categoryIdValidator,
  _creationTime: v.number(),
  companyId: v.optional(companyIdValidator),
  keyword: v.string(),
  mainCategory: v.string(),
  subCategory: v.string(),
  accountCode: v.optional(v.string()),
  isGlobal: v.boolean(),
  createdAt: v.number(),
});

// ============ COMPOSITE VALIDATORS ============

// Enriched match with transaction details
export const enrichedMatchValidator = v.object({
  _id: matchIdValidator,
  _creationTime: v.number(),
  sessionId: sessionIdValidator,
  cashTransactionId: transactionIdValidator,
  accrualTransactionId: v.optional(transactionIdValidator),
  accrualDocumentId: v.optional(accrualDocIdValidator),
  confidence: matchConfidenceValidator,
  confidenceScore: v.number(),
  matchLayer: matchLayerValidator,
  matchReason: v.optional(v.string()),
  status: matchStatusValidator,
  // Partial matching support
  matchedAmount: v.optional(v.number()),
  isPartialMatch: v.optional(v.boolean()),
  partialMatchGroupId: v.optional(v.string()), // Groups related partial matches
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(userIdValidator),
  createdAt: v.number(),
  // Enriched fields
  cashTransaction: v.union(transactionDocValidator, v.null()),
  accrualTransaction: v.union(transactionDocValidator, v.null()),
  accrualDocument: v.union(accrualDocValidator, v.null()),
});

// Session with stats
export const sessionWithStatsValidator = v.object({
  _id: sessionIdValidator,
  _creationTime: v.number(),
  companyId: companyIdValidator,
  name: v.string(),
  periodStart: v.optional(v.string()),
  periodEnd: v.optional(v.string()),
  status: sessionStatusValidator,
  progress: v.number(),
  totalCashTransactions: v.number(),
  totalAccrualTransactions: v.number(),
  matchedCount: v.number(),
  suspenseCount: v.number(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
  createdBy: userIdValidator,
  // Stats
  pendingMatches: v.number(),
  approvedMatches: v.number(),
  rejectedMatches: v.number(),
});

// ============ RETURN VALUE VALIDATORS ============

// Match counts
export const matchCountsValidator = v.object({
  total: v.number(),
  pending: v.number(),
  approved: v.number(),
  rejected: v.number(),
  byConfidence: v.object({
    high: v.number(),
    medium: v.number(),
    low: v.number(),
  }),
});

// Suspense counts
export const suspenseCountsValidator = v.object({
  total: v.number(),
  open: v.number(),
  queried: v.number(),
  resolved: v.number(),
});

// Accrual counts
export const accrualCountsValidator = v.object({
  total: v.number(),
  pending: v.number(),
  matched: v.number(),
  partial: v.number(),
  suspense: v.number(),
});

// Monthly cash flow for analytics
export const monthlyCashFlowValidator = v.object({
  month: v.string(),
  inflows: v.number(),
  outflows: v.number(),
  net: v.number(),
});

// Expense breakdown for analytics
export const expenseBreakdownValidator = v.object({
  category: v.string(),
  amount: v.number(),
  percentage: v.number(),
});

// Reconciliation stats
export const reconciliationStatsValidator = v.object({
  totalSessions: v.number(),
  completedSessions: v.number(),
  avgMatchRate: v.number(),
  totalTransactionsProcessed: v.number(),
});

// Export data
export const exportDataValidator = v.object({
  session: sessionDocValidator,
  company: companyDocValidator,
  matches: v.array(enrichedMatchValidator),
  suspenseItems: v.array(suspenseItemDocValidator),
  transactions: v.array(transactionDocValidator),
  accrualDocuments: v.array(accrualDocValidator),
});

// Matching result
export const matchingResultValidator = v.object({
  success: v.boolean(),
  matchesCreated: v.number(),
  suspenseCreated: v.number(),
  errors: v.optional(v.array(v.string())),
});

// Bulk operation result
export const bulkResultValidator = v.object({
  inserted: v.number(),
  errors: v.array(v.string()),
});

// ============ WORKSHEET DATA SOURCE VALIDATORS ============

/**
 * Reconciliation source configuration
 */
export const reconciliationSourceConfigValidator = v.object({
  sessionId: sessionIdValidator,
  includeMatches: v.optional(v.boolean()),
  includeSuspense: v.optional(v.boolean()),
  matchStatusFilter: v.optional(matchStatusValidator),
  suspenseStatusFilter: v.optional(suspenseStatusValidator),
});

/**
 * CSV import source configuration
 */
export const csvImportSourceConfigValidator = v.object({
  fileName: v.string(),
  columnMapping: v.record(v.string(), v.number()),
  importedAt: v.number(),
});

/**
 * Manual source configuration (empty object)
 */
export const manualSourceConfigValidator = v.object({});

/**
 * Union validator for all source configurations.
 * Use this in the schema instead of v.any() for type safety.
 */
export const worksheetSourceConfigValidator = v.union(
  // Manual source - empty object
  manualSourceConfigValidator,
  // Reconciliation source - contains sessionId
  reconciliationSourceConfigValidator,
  // CSV import source - contains fileName
  csvImportSourceConfigValidator
);
