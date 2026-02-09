/**
 * Test Data Factories
 *
 * Centralized test data factories for all domain models.
 * Uses consistent patterns and allows easy overrides.
 *
 * @module __tests__/utils/factories
 */

import { Id, TableNames } from "../../convex/_generated/dataModel";
import type { SystemTableNames } from "convex/server";

// ============================================================================
// Type Definitions
// ============================================================================

export type MockId<T extends string> = string & { __tableName: T };

// Helper to create mock IDs that satisfy type requirements
export function mockId<T extends TableNames | SystemTableNames>(table: T, id: string = crypto.randomUUID()): Id<T> {
  return id as Id<T>;
}

// ============================================================================
// Transaction Factory
// ============================================================================

export interface TransactionData {
  _id: Id<"transactions">;
  _creationTime: number;
  companyId: Id<"companies">;
  sessionId?: Id<"reconciliationSessions">;
  date: string;
  description: string;
  reference?: string;
  amount: number;
  type: "cash" | "accrual";
  status: "pending" | "matched" | "suspense";
  category?: string;
  matchId?: Id<"matchedPairs">;
  sourceDocumentId?: Id<"documents">;
  createdAt: number;
  fieldConfidence?: {
    date?: number;
    description?: number;
    amount?: number;
    reference?: number;
  };
  editedFields?: string[];
  editedAt?: number;
  editedBy?: Id<"users">;
}

export function createTestTransaction(overrides: Partial<TransactionData> = {}): TransactionData {
  const now = Date.now();
  return {
    _id: mockId("transactions"),
    _creationTime: now,
    companyId: mockId("companies", "company_default"),
    date: new Date().toISOString().split("T")[0], // "2025-01-15" format
    description: "Test transaction",
    amount: -100.0,
    type: "cash",
    status: "pending",
    createdAt: now,
    ...overrides,
  };
}

export function createCashTransaction(overrides: Partial<TransactionData> = {}): TransactionData {
  return createTestTransaction({
    type: "cash",
    description: "Bank payment",
    ...overrides,
  });
}

export function createAccrualTransaction(overrides: Partial<TransactionData> = {}): TransactionData {
  return createTestTransaction({
    type: "accrual",
    description: "Invoice entry",
    ...overrides,
  });
}

// ============================================================================
// Accrual Document Factory
// ============================================================================

export interface AccrualDocumentData {
  _id: Id<"accrualDocuments">;
  _creationTime: number;
  companyId: Id<"companies">;
  sessionId?: Id<"reconciliationSessions">;
  docType: "sales_invoice" | "purchase_invoice" | "pos_report" | "settlement" | "receipt";
  docNumber?: string;
  docDate: string;
  dueDate?: string;
  counterparty?: string;
  amount: number;
  taxAmount?: number;
  description?: string;
  lineItems?: string;
  sourceDocumentId?: Id<"documents">;
  extractedText?: string;
  status: "pending" | "matched" | "partial" | "suspense";
  matchId?: Id<"matchedPairs">;
  matchedTotal?: number;
  matchCount?: number;
  createdAt: number;
}

export function createTestAccrualDocument(overrides: Partial<AccrualDocumentData> = {}): AccrualDocumentData {
  const now = Date.now();
  return {
    _id: mockId("accrualDocuments"),
    _creationTime: now,
    companyId: mockId("companies", "company_default"),
    docType: "sales_invoice",
    docDate: new Date().toISOString().split("T")[0],
    amount: -100.0,
    status: "pending",
    createdAt: now,
    ...overrides,
  };
}

export function createSalesInvoice(overrides: Partial<AccrualDocumentData> = {}): AccrualDocumentData {
  return createTestAccrualDocument({
    docType: "sales_invoice",
    docNumber: `INV-${Math.floor(Math.random() * 10000)}`,
    counterparty: "Test Customer",
    ...overrides,
  });
}

export function createPurchaseInvoice(overrides: Partial<AccrualDocumentData> = {}): AccrualDocumentData {
  return createTestAccrualDocument({
    docType: "purchase_invoice",
    docNumber: `PO-${Math.floor(Math.random() * 10000)}`,
    counterparty: "Test Vendor",
    ...overrides,
  });
}

export function createPOSReport(overrides: Partial<AccrualDocumentData> = {}): AccrualDocumentData {
  return createTestAccrualDocument({
    docType: "pos_report",
    description: "Daily POS Summary",
    ...overrides,
  });
}

// ============================================================================
// Match Factory
// ============================================================================

export interface MatchedPairData {
  _id: Id<"matchedPairs">;
  _creationTime: number;
  sessionId: Id<"reconciliationSessions">;
  cashTransactionId: Id<"transactions">;
  accrualTransactionId?: Id<"transactions">;
  accrualDocumentId?: Id<"accrualDocuments">;
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  matchLayer: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  matchReason?: string;
  status: "pending" | "approved" | "rejected";
  matchedAmount?: number;
  isPartialMatch?: boolean;
  partialMatchGroupId?: string;
  reviewedAt?: number;
  reviewedBy?: Id<"users">;
  createdAt: number;
}

export function createTestMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  const now = Date.now();
  return {
    _id: mockId("matchedPairs"),
    _creationTime: now,
    sessionId: mockId("reconciliationSessions", "session_default"),
    cashTransactionId: mockId("transactions", "cash_tx_default"),
    confidence: "high",
    confidenceScore: 95,
    matchLayer: 1,
    matchReason: "Exact match: amount and date",
    status: "pending",
    createdAt: now,
    ...overrides,
  };
}

export function createExactMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  return createTestMatch({
    matchLayer: 1,
    confidenceScore: 100,
    confidence: "high",
    matchReason: "Exact amount and date match",
    ...overrides,
  });
}

export function createWindowMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  return createTestMatch({
    matchLayer: 2,
    confidenceScore: 92,
    confidence: "high",
    matchReason: "Amount match within 7-day window",
    ...overrides,
  });
}

export function createReferenceMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  return createTestMatch({
    matchLayer: 3,
    confidenceScore: 88,
    confidence: "medium",
    matchReason: "Reference number match",
    ...overrides,
  });
}

export function createFuzzyMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  return createTestMatch({
    matchLayer: 4,
    confidenceScore: 75,
    confidence: "medium",
    matchReason: "Fuzzy counterparty name match",
    ...overrides,
  });
}

export function createSemanticMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  return createTestMatch({
    matchLayer: 5,
    confidenceScore: 70,
    confidence: "medium",
    matchReason: "LLM semantic match",
    ...overrides,
  });
}

export function createManualMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  return createTestMatch({
    matchLayer: 6,
    confidenceScore: 100,
    confidence: "high",
    matchReason: "Manual user match",
    status: "approved",
    ...overrides,
  });
}

export function createPartialMatch(overrides: Partial<MatchedPairData> = {}): MatchedPairData {
  return createTestMatch({
    matchLayer: 7,
    confidenceScore: 85,
    confidence: "medium",
    matchReason: "Partial payment match",
    isPartialMatch: true,
    partialMatchGroupId: `pm_${Date.now()}`,
    ...overrides,
  });
}

// ============================================================================
// Reconciliation Session Factory
// ============================================================================

export interface ReconciliationSessionData {
  _id: Id<"reconciliationSessions">;
  _creationTime: number;
  companyId: Id<"companies">;
  name: string;
  periodStart?: string;
  periodEnd?: string;
  status: "draft" | "processing" | "review" | "completed";
  progress: number;
  totalCashTransactions: number;
  totalAccrualTransactions: number;
  matchedCount: number;
  suspenseCount: number;
  createdAt: number;
  completedAt?: number;
  createdBy: Id<"users">;
}

export function createTestSession(overrides: Partial<ReconciliationSessionData> = {}): ReconciliationSessionData {
  const now = Date.now();
  const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  return {
    _id: mockId("reconciliationSessions"),
    _creationTime: now,
    companyId: mockId("companies", "company_default"),
    name: `${currentMonth} Reconciliation`,
    status: "draft",
    progress: 0,
    totalCashTransactions: 0,
    totalAccrualTransactions: 0,
    matchedCount: 0,
    suspenseCount: 0,
    createdAt: now,
    createdBy: mockId("users", "user_default"),
    ...overrides,
  };
}

export function createDraftSession(overrides: Partial<ReconciliationSessionData> = {}): ReconciliationSessionData {
  return createTestSession({
    status: "draft",
    progress: 0,
    ...overrides,
  });
}

export function createProcessingSession(overrides: Partial<ReconciliationSessionData> = {}): ReconciliationSessionData {
  return createTestSession({
    status: "processing",
    progress: 50,
    ...overrides,
  });
}

export function createReviewSession(overrides: Partial<ReconciliationSessionData> = {}): ReconciliationSessionData {
  return createTestSession({
    status: "review",
    progress: 100,
    totalCashTransactions: 50,
    totalAccrualTransactions: 45,
    matchedCount: 40,
    suspenseCount: 5,
    ...overrides,
  });
}

export function createCompletedSession(overrides: Partial<ReconciliationSessionData> = {}): ReconciliationSessionData {
  return createTestSession({
    status: "completed",
    progress: 100,
    completedAt: Date.now(),
    ...overrides,
  });
}

// ============================================================================
// Document Factory
// ============================================================================

export interface DocumentData {
  _id: Id<"documents">;
  _creationTime: number;
  companyId: Id<"companies">;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageId?: Id<"_storage">;
  documentType: "bank_statement" | "invoice" | "receipt" | "other";
  extractedText?: string;
  extractionStatus: "pending" | "processing" | "completed" | "failed";
  extractionPhase?: "uploading" | "converting" | "extracting" | "processing" | "complete" | "failed";
  extractionJobId?: string;
  errorMessage?: string;
  extractionConfidence?: number;
  bankType?: string;
  periodStart?: string;
  periodEnd?: string;
  extractedTransactionCount?: number;
  extractionProgress?: {
    currentPage: number;
    totalPages: number;
    pagesCompleted?: number;
    streamedTransactionCount?: number;
    phaseMessage?: string;
  };
  uploadedAt: number;
  processedAt?: number;
}

export function createTestDocument(overrides: Partial<DocumentData> = {}): DocumentData {
  const now = Date.now();
  return {
    _id: mockId("documents"),
    _creationTime: now,
    companyId: mockId("companies", "company_default"),
    fileName: "test-document.pdf",
    fileType: "pdf",
    fileSize: 1024 * 100, // 100KB
    documentType: "bank_statement",
    extractionStatus: "pending",
    uploadedAt: now,
    ...overrides,
  };
}

export function createBankStatementDoc(overrides: Partial<DocumentData> = {}): DocumentData {
  return createTestDocument({
    documentType: "bank_statement",
    fileName: "bank-statement-jan-2025.pdf",
    fileType: "pdf",
    ...overrides,
  });
}

export function createInvoiceDoc(overrides: Partial<DocumentData> = {}): DocumentData {
  return createTestDocument({
    documentType: "invoice",
    fileName: "invoice-12345.pdf",
    fileType: "pdf",
    ...overrides,
  });
}

export function createReceiptDoc(overrides: Partial<DocumentData> = {}): DocumentData {
  return createTestDocument({
    documentType: "receipt",
    fileName: "receipt.jpg",
    fileType: "jpg",
    fileSize: 1024 * 50, // 50KB
    ...overrides,
  });
}

export function createProcessingDocument(overrides: Partial<DocumentData> = {}): DocumentData {
  return createTestDocument({
    extractionStatus: "processing",
    extractionPhase: "extracting",
    extractionProgress: {
      currentPage: 1,
      totalPages: 5,
      pagesCompleted: 1,
    },
    ...overrides,
  });
}

export function createCompletedDocument(overrides: Partial<DocumentData> = {}): DocumentData {
  return createTestDocument({
    extractionStatus: "completed",
    extractionPhase: "complete",
    extractionConfidence: 95,
    extractedTransactionCount: 25,
    processedAt: Date.now(),
    ...overrides,
  });
}

export function createFailedDocument(overrides: Partial<DocumentData> = {}): DocumentData {
  return createTestDocument({
    extractionStatus: "failed",
    extractionPhase: "failed",
    errorMessage: "OCR extraction failed: Unable to parse document",
    ...overrides,
  });
}

// ============================================================================
// Suspense Item Factory
// ============================================================================

export interface SuspenseItemData {
  _id: Id<"suspenseItems">;
  _creationTime: number;
  companyId: Id<"companies">;
  sessionId: Id<"reconciliationSessions">;
  sourceType: "cash" | "accrual";
  sourceId: Id<"transactions"> | Id<"accrualDocuments">;
  amount: number;
  transactionDate: string;
  description: string;
  reason: string;
  suggestedAction: string;
  status: "open" | "queried" | "resolved";
  resolutionNotes?: string;
  resolvedAt?: number;
  resolvedBy?: Id<"users">;
  createdAt: number;
}

export function createTestSuspenseItem(overrides: Partial<SuspenseItemData> = {}): SuspenseItemData {
  const now = Date.now();
  return {
    _id: mockId("suspenseItems"),
    _creationTime: now,
    companyId: mockId("companies", "company_default"),
    sessionId: mockId("reconciliationSessions", "session_default"),
    sourceType: "cash",
    sourceId: mockId("transactions", "tx_default"),
    amount: -250.0,
    transactionDate: new Date().toISOString().split("T")[0],
    description: "Unmatched transaction",
    reason: "no_match",
    suggestedAction: "Review for manual matching or categorization",
    status: "open",
    createdAt: now,
    ...overrides,
  };
}

export function createCashSuspense(overrides: Partial<SuspenseItemData> = {}): SuspenseItemData {
  return createTestSuspenseItem({
    sourceType: "cash",
    sourceId: mockId("transactions"),
    reason: "no_match",
    suggestedAction: "Find corresponding invoice",
    ...overrides,
  });
}

export function createAccrualSuspense(overrides: Partial<SuspenseItemData> = {}): SuspenseItemData {
  return createTestSuspenseItem({
    sourceType: "accrual",
    sourceId: mockId("accrualDocuments"),
    reason: "no_match",
    suggestedAction: "Find corresponding bank payment",
    ...overrides,
  });
}

export function createResolvedSuspense(overrides: Partial<SuspenseItemData> = {}): SuspenseItemData {
  return createTestSuspenseItem({
    status: "resolved",
    resolutionNotes: "Manually matched to existing transaction",
    resolvedAt: Date.now(),
    resolvedBy: mockId("users", "user_default"),
    ...overrides,
  });
}

// ============================================================================
// Extraction Queue Factory
// ============================================================================

export interface ExtractionQueueData {
  _id: Id<"extractionQueue">;
  _creationTime: number;
  companyId: Id<"companies">;
  userId: Id<"users">;
  batchName?: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  totalDocuments: number;
  completedCount: number;
  failedCount: number;
  currentPosition: number;
  estimatedSecondsRemaining?: number;
  avgProcessingTimeMs?: number;
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export function createTestQueue(overrides: Partial<ExtractionQueueData> = {}): ExtractionQueueData {
  const now = Date.now();
  return {
    _id: mockId("extractionQueue"),
    _creationTime: now,
    companyId: mockId("companies", "company_default"),
    userId: mockId("users", "user_default"),
    status: "pending",
    totalDocuments: 10,
    completedCount: 0,
    failedCount: 0,
    currentPosition: 0,
    priority: 0,
    createdAt: now,
    ...overrides,
  };
}

export function createPendingQueue(overrides: Partial<ExtractionQueueData> = {}): ExtractionQueueData {
  return createTestQueue({
    status: "pending",
    batchName: "January 2025 Bank Statements",
    totalDocuments: 25,
    ...overrides,
  });
}

export function createProcessingQueue(overrides: Partial<ExtractionQueueData> = {}): ExtractionQueueData {
  return createTestQueue({
    status: "processing",
    totalDocuments: 25,
    completedCount: 10,
    currentPosition: 10,
    startedAt: Date.now() - 60000, // Started 1 min ago
    estimatedSecondsRemaining: 180, // 3 min remaining
    avgProcessingTimeMs: 12000, // 12s per doc
    ...overrides,
  });
}

export function createCompletedQueue(overrides: Partial<ExtractionQueueData> = {}): ExtractionQueueData {
  return createTestQueue({
    status: "completed",
    totalDocuments: 25,
    completedCount: 25,
    failedCount: 0,
    currentPosition: 25,
    completedAt: Date.now(),
    estimatedSecondsRemaining: 0,
    ...overrides,
  });
}

export function createFailedQueue(overrides: Partial<ExtractionQueueData> = {}): ExtractionQueueData {
  return createTestQueue({
    status: "failed",
    totalDocuments: 25,
    completedCount: 15,
    failedCount: 10,
    completedAt: Date.now(),
    ...overrides,
  });
}

// ============================================================================
// Extraction Queue Item Factory
// ============================================================================

export interface ExtractionQueueItemData {
  _id: Id<"extractionQueueItems">;
  _creationTime: number;
  queueId: Id<"extractionQueue">;
  documentId: Id<"documents">;
  position: number;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  errorMessage?: string;
  processingTimeMs?: number;
  startedAt?: number;
  completedAt?: number;
}

export function createTestQueueItem(overrides: Partial<ExtractionQueueItemData> = {}): ExtractionQueueItemData {
  const now = Date.now();
  return {
    _id: mockId("extractionQueueItems"),
    _creationTime: now,
    queueId: mockId("extractionQueue", "queue_default"),
    documentId: mockId("documents", "doc_default"),
    position: 0,
    status: "pending",
    ...overrides,
  };
}

export function createPendingQueueItem(overrides: Partial<ExtractionQueueItemData> = {}): ExtractionQueueItemData {
  return createTestQueueItem({
    status: "pending",
    ...overrides,
  });
}

export function createCompletedQueueItem(overrides: Partial<ExtractionQueueItemData> = {}): ExtractionQueueItemData {
  return createTestQueueItem({
    status: "completed",
    processingTimeMs: 12000,
    startedAt: Date.now() - 12000,
    completedAt: Date.now(),
    ...overrides,
  });
}

export function createFailedQueueItem(overrides: Partial<ExtractionQueueItemData> = {}): ExtractionQueueItemData {
  return createTestQueueItem({
    status: "failed",
    errorMessage: "OCR extraction failed",
    processingTimeMs: 5000,
    startedAt: Date.now() - 5000,
    completedAt: Date.now(),
    ...overrides,
  });
}

// ============================================================================
// User Factory
// ============================================================================

export interface UserData {
  _id: Id<"users">;
  _creationTime: number;
  email: string;
  name?: string;
  avatarUrl?: string;
  workosId?: string;
  createdAt: number;
}

export function createTestUser(overrides: Partial<UserData> = {}): UserData {
  const now = Date.now();
  return {
    _id: mockId("users"),
    _creationTime: now,
    email: "test@example.com",
    name: "Test User",
    workosId: `user_${crypto.randomUUID().slice(0, 8)}`,
    createdAt: now,
    ...overrides,
  };
}

// ============================================================================
// Company Factory
// ============================================================================

export interface CompanyData {
  _id: Id<"companies">;
  _creationTime: number;
  name: string;
  code?: string;
  tradingAs?: string;
  registrationNumber?: string;
  industry?: string;
  industryCategory?: string;
  fiscalYearEnd?: string;
  taxRegistered?: boolean;
  taxNumber?: string;
  bankName?: string;
  primaryBank?: string;
  primaryAccountNumber?: string;
  currency: string;
  ownerId: Id<"users">;
  onboardingCompleted?: boolean;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export function createTestCompany(overrides: Partial<CompanyData> = {}): CompanyData {
  const now = Date.now();
  return {
    _id: mockId("companies"),
    _creationTime: now,
    name: "Test Company Sdn Bhd",
    code: "TST001",
    currency: "MYR",
    ownerId: mockId("users", "user_default"),
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    ...overrides,
  };
}

// ============================================================================
// Bulk Creation Helpers
// ============================================================================

/**
 * Create multiple transactions with incrementing amounts
 */
export function createTransactionBatch(
  count: number,
  baseOverrides: Partial<TransactionData> = {}
): TransactionData[] {
  return Array.from({ length: count }, (_, i) =>
    createTestTransaction({
      _id: mockId("transactions", `tx_${i}`),
      amount: -100 - i * 10,
      description: `Transaction ${i + 1}`,
      ...baseOverrides,
    })
  );
}

/**
 * Create multiple accrual documents with incrementing amounts
 */
export function createAccrualDocumentBatch(
  count: number,
  baseOverrides: Partial<AccrualDocumentData> = {}
): AccrualDocumentData[] {
  return Array.from({ length: count }, (_, i) =>
    createTestAccrualDocument({
      _id: mockId("accrualDocuments", `doc_${i}`),
      amount: -100 - i * 10,
      docNumber: `INV-${1000 + i}`,
      ...baseOverrides,
    })
  );
}

/**
 * Create a matched pair scenario (cash + accrual + match)
 */
export function createMatchedScenario(overrides: {
  cash?: Partial<TransactionData>;
  accrual?: Partial<AccrualDocumentData>;
  match?: Partial<MatchedPairData>;
} = {}): {
  cash: TransactionData;
  accrual: AccrualDocumentData;
  match: MatchedPairData;
} {
  const cashId = mockId("transactions", "cash_matched");
  const accrualId = mockId("accrualDocuments", "accrual_matched");
  const matchId = mockId("matchedPairs", "match_1");
  const sessionId = mockId("reconciliationSessions", "session_1");

  const cash = createCashTransaction({
    _id: cashId,
    sessionId,
    amount: -500.0,
    status: "matched",
    matchId,
    ...overrides.cash,
  });

  const accrual = createSalesInvoice({
    _id: accrualId,
    sessionId,
    amount: -500.0,
    status: "matched",
    matchId,
    ...overrides.accrual,
  });

  const match = createExactMatch({
    _id: matchId,
    sessionId,
    cashTransactionId: cashId,
    accrualDocumentId: accrualId,
    status: "approved",
    ...overrides.match,
  });

  return { cash, accrual, match };
}

/**
 * Create a suspense scenario (unmatched cash transaction)
 */
export function createSuspenseScenario(overrides: {
  transaction?: Partial<TransactionData>;
  suspense?: Partial<SuspenseItemData>;
} = {}): {
  transaction: TransactionData;
  suspense: SuspenseItemData;
} {
  const txId = mockId("transactions", "tx_suspense");
  const sessionId = mockId("reconciliationSessions", "session_1");

  const transaction = createCashTransaction({
    _id: txId,
    sessionId,
    amount: -750.0,
    status: "suspense",
    ...overrides.transaction,
  });

  const suspense = createCashSuspense({
    sessionId,
    sourceId: txId,
    amount: -750.0,
    ...overrides.suspense,
  });

  return { transaction, suspense };
}
