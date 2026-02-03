/**
 * Shared constants for Convex backend
 * Centralizes magic numbers and configuration values
 */

/**
 * Maximum number of items allowed in bulk import operations.
 * Prevents DoS via excessive resource consumption.
 * Used by: transactions.createBulk, accrualDocuments.createBulk, suspenseItems.createBulk
 */
export const MAX_BULK_IMPORT_SIZE = 10000;

/**
 * Default page size for paginated queries
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum page size for paginated queries
 */
export const MAX_PAGE_SIZE = 500;

/**
 * Confidence thresholds for automatic matching
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Auto-approve threshold (≥90%) */
  AUTO_MATCH: 0.9,
  /** Suggest threshold (70-89%) */
  SUGGEST: 0.7,
  /** Below this goes to suspense (<70%) */
  SUSPENSE: 0.7,
} as const;

/**
 * Match layer identifiers
 */
export const MATCH_LAYERS = {
  EXACT: 1,
  WINDOW: 2,
  REFERENCE: 3,
  FUZZY: 4,
  LLM_SEMANTIC: 5,
  MANUAL: 6,
} as const;

/**
 * Document types supported for upload/extraction
 */
export const DOCUMENT_TYPES = {
  BANK_STATEMENT: "bank_statement",
  INVOICE: "invoice",
  RECEIPT: "receipt",
  OTHER: "other",
} as const;

/**
 * Transaction statuses
 */
export const TRANSACTION_STATUS = {
  PENDING: "pending",
  MATCHED: "matched",
  SUSPENSE: "suspense",
} as const;

/**
 * Extraction statuses
 */
export const EXTRACTION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

/**
 * Workspace and worksheet limits
 * Used by: workspaces.ts, agents.ts
 */
export const WORKSPACE_LIMITS = {
  /** Maximum cells allowed per row */
  MAX_CELLS_PER_ROW: 100,
  /** Maximum character length for cell values */
  MAX_CELL_VALUE_LENGTH: 100_000,
  /** Maximum items in a single batch operation */
  MAX_BATCH_SIZE: 1000,
  /** Maximum columns per worksheet */
  MAX_COLUMNS_PER_WORKSHEET: 100,
  /** Maximum length for names (workspace, worksheet, column) */
  MAX_NAME_LENGTH: 255,
  /** Maximum length for description fields */
  MAX_DESCRIPTION_LENGTH: 1000,
  /** Maximum length for formulas */
  MAX_FORMULA_LENGTH: 10_000,
  /** Minimum column width in pixels */
  MIN_COLUMN_WIDTH: 40,
  /** Maximum column width in pixels */
  MAX_COLUMN_WIDTH: 1000,
} as const;

/**
 * Cell status values for AI enrichment
 */
export const CELL_STATUS = {
  IDLE: "idle",
  PENDING: "pending",
  RUNNING: "running",
  COMPLETE: "complete",
  ERROR: "error",
} as const;
