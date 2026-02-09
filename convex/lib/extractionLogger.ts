/**
 * Extraction Logger Module
 *
 * Structured logging for document extraction pipeline.
 * Provides detailed phase tracking, error logging, and progress reporting.
 *
 * @module convex/lib/extractionLogger
 */

import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================================================
// Type Definitions
// ============================================================================

export type ExtractionPhase =
  | "uploading"      // File being uploaded to storage
  | "converting"     // PDF → images (browser-side)
  | "extracting"     // OCR in progress (Bedrock)
  | "processing"     // Parsing extracted data
  | "complete"       // Extraction finished
  | "failed";        // Extraction failed

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ExtractionLogEntry {
  timestamp: number;
  documentId: string;
  phase: ExtractionPhase;
  level: LogLevel;
  message: string;
  pageNumber?: number;
  totalPages?: number;
  transactionsExtracted?: number;
  durationMs?: number;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractionProgress {
  documentId: string;
  phase: ExtractionPhase;
  currentPage: number;
  totalPages: number;
  pagesCompleted: number;
  transactionsExtracted: number;
  startedAt: number;
  estimatedRemainingMs?: number;
}

// ============================================================================
// In-Memory Log Buffer (for debugging)
// ============================================================================

// Circular buffer for recent extraction logs (in-memory only)
const MAX_BUFFER_SIZE = 1000;
const logBuffer: ExtractionLogEntry[] = [];

function addToBuffer(entry: ExtractionLogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift(); // Remove oldest entry
  }
}

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * Log an extraction event with structured data
 */
export function logExtraction(
  documentId: string,
  phase: ExtractionPhase,
  level: LogLevel,
  message: string,
  data?: Partial<Omit<ExtractionLogEntry, "timestamp" | "documentId" | "phase" | "level" | "message">>
): void {
  const entry: ExtractionLogEntry = {
    timestamp: Date.now(),
    documentId,
    phase,
    level,
    message,
    ...data,
  };

  // Add to in-memory buffer for debugging
  addToBuffer(entry);

  // Log to console with structured format
  const logMethod = level === "error" ? console.error :
                    level === "warn" ? console.warn :
                    level === "info" ? console.info :
                    console.debug;

  const prefix = `[Extraction:${phase}]`;
  const docPrefix = `[${documentId.slice(0, 8)}...]`;

  if (data?.pageNumber !== undefined && data?.totalPages !== undefined) {
    logMethod(
      `${prefix} ${docPrefix} ${message}`,
      `(page ${data.pageNumber}/${data.totalPages})`,
      data.metadata ? data.metadata : ""
    );
  } else if (data?.transactionsExtracted !== undefined) {
    logMethod(
      `${prefix} ${docPrefix} ${message}`,
      `(${data.transactionsExtracted} transactions)`,
      data.metadata ? data.metadata : ""
    );
  } else {
    logMethod(`${prefix} ${docPrefix} ${message}`, data?.metadata ? data.metadata : "");
  }
}

/**
 * Log extraction phase start
 */
export function logPhaseStart(
  documentId: string,
  phase: ExtractionPhase,
  metadata?: Record<string, unknown>
): void {
  logExtraction(documentId, phase, "info", `Phase started: ${phase}`, { metadata });
}

/**
 * Log extraction phase completion
 */
export function logPhaseComplete(
  documentId: string,
  phase: ExtractionPhase,
  durationMs: number,
  metadata?: Record<string, unknown>
): void {
  logExtraction(documentId, phase, "info", `Phase completed: ${phase}`, {
    durationMs,
    metadata,
  });
}

/**
 * Log extraction progress update
 */
export function logProgress(
  documentId: string,
  phase: ExtractionPhase,
  currentPage: number,
  totalPages: number,
  transactionsExtracted?: number
): void {
  logExtraction(documentId, phase, "debug", "Progress update", {
    pageNumber: currentPage,
    totalPages,
    transactionsExtracted,
  });
}

/**
 * Log extraction error with full context
 */
export function logExtractionError(
  documentId: string,
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorStack = typeof error === "string" ? undefined : error.stack;

  logExtraction(documentId, "failed", "error", `Extraction failed: ${errorMessage}`, {
    errorMessage,
    errorStack,
    metadata: context,
  });
}

/**
 * Log page extraction result
 */
export function logPageExtracted(
  documentId: string,
  pageNumber: number,
  totalPages: number,
  transactionsFound: number,
  durationMs: number
): void {
  logExtraction(documentId, "extracting", "info", `Page ${pageNumber}/${totalPages} extracted`, {
    pageNumber,
    totalPages,
    transactionsExtracted: transactionsFound,
    durationMs,
  });
}

/**
 * Log transaction insertion
 */
export function logTransactionsInserted(
  documentId: string,
  count: number,
  companyId: string
): void {
  logExtraction(documentId, "processing", "info", `Inserted ${count} transactions`, {
    transactionsExtracted: count,
    metadata: { companyId },
  });
}

// ============================================================================
// Database Logging (Persistent)
// ============================================================================

/**
 * Update document with extraction progress in Convex
 */
export async function updateExtractionProgress(
  ctx: MutationCtx,
  documentId: Id<"documents">,
  progress: {
    phase?: ExtractionPhase;
    currentPage?: number;
    totalPages?: number;
    pagesCompleted?: number;
    streamedTransactionCount?: number;
    phaseMessage?: string;
  }
): Promise<void> {
  const update: Record<string, unknown> = {};

  if (progress.phase) {
    update.extractionPhase = progress.phase;
  }

  // Build extraction progress object
  const extractionProgress: Record<string, unknown> = {};

  if (progress.currentPage !== undefined) {
    extractionProgress.currentPage = progress.currentPage;
  }
  if (progress.totalPages !== undefined) {
    extractionProgress.totalPages = progress.totalPages;
  }
  if (progress.pagesCompleted !== undefined) {
    extractionProgress.pagesCompleted = progress.pagesCompleted;
  }
  if (progress.streamedTransactionCount !== undefined) {
    extractionProgress.streamedTransactionCount = progress.streamedTransactionCount;
  }
  if (progress.phaseMessage !== undefined) {
    extractionProgress.phaseMessage = progress.phaseMessage;
  }

  if (Object.keys(extractionProgress).length > 0) {
    // Get existing progress to merge
    const doc = await ctx.db.get(documentId);
    update.extractionProgress = {
      ...doc?.extractionProgress,
      ...extractionProgress,
    };
  }

  if (Object.keys(update).length > 0) {
    await ctx.db.patch(documentId, update);
  }
}

/**
 * Mark document extraction as complete
 */
export async function markExtractionComplete(
  ctx: MutationCtx,
  documentId: Id<"documents">,
  stats: {
    transactionCount: number;
    confidence?: number;
    bankType?: string;
    periodStart?: string;
    periodEnd?: string;
  }
): Promise<void> {
  await ctx.db.patch(documentId, {
    extractionStatus: "completed",
    extractionPhase: "complete",
    extractedTransactionCount: stats.transactionCount,
    extractionConfidence: stats.confidence,
    bankType: stats.bankType,
    periodStart: stats.periodStart,
    periodEnd: stats.periodEnd,
    processedAt: Date.now(),
  });

  logPhaseComplete(documentId, "complete", 0, {
    transactionCount: stats.transactionCount,
    confidence: stats.confidence,
  });
}

/**
 * Mark document extraction as failed
 */
export async function markExtractionFailed(
  ctx: MutationCtx,
  documentId: Id<"documents">,
  errorMessage: string
): Promise<void> {
  await ctx.db.patch(documentId, {
    extractionStatus: "failed",
    extractionPhase: "failed",
    errorMessage,
    processedAt: Date.now(),
  });

  logExtractionError(documentId, errorMessage);
}

// ============================================================================
// Progress Estimation
// ============================================================================

/**
 * Estimate remaining time based on current progress
 */
export function estimateRemainingTime(
  startTime: number,
  currentPage: number,
  totalPages: number
): number | null {
  if (currentPage === 0 || totalPages === 0) return null;

  const elapsed = Date.now() - startTime;
  const timePerPage = elapsed / currentPage;
  const remainingPages = totalPages - currentPage;

  return Math.ceil(timePerPage * remainingPages);
}

/**
 * Calculate extraction throughput (pages per second)
 */
export function calculateThroughput(
  pagesCompleted: number,
  durationMs: number
): number {
  if (durationMs === 0) return 0;
  return (pagesCompleted / durationMs) * 1000; // pages per second
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Get recent extraction logs for a document (from in-memory buffer)
 */
export function getRecentLogs(
  documentId?: string,
  limit: number = 100
): ExtractionLogEntry[] {
  let logs = [...logBuffer].reverse(); // Most recent first

  if (documentId) {
    logs = logs.filter((log) => log.documentId === documentId);
  }

  return logs.slice(0, limit);
}

/**
 * Get logs by level (for error analysis)
 */
export function getLogsByLevel(level: LogLevel, limit: number = 100): ExtractionLogEntry[] {
  return [...logBuffer]
    .filter((log) => log.level === level)
    .reverse()
    .slice(0, limit);
}

/**
 * Clear log buffer (for testing)
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

/**
 * Get extraction stats from logs
 */
export function getExtractionStats(documentId: string): {
  totalDurationMs: number;
  pagesProcessed: number;
  transactionsExtracted: number;
  errors: number;
} | null {
  const logs = logBuffer.filter((log) => log.documentId === documentId);

  if (logs.length === 0) return null;

  const startLog = logs.find((log) => log.phase === "uploading" || log.phase === "extracting");
  const endLog = [...logs].reverse().find((log) => log.phase === "complete" || log.phase === "failed");

  const totalDurationMs = startLog && endLog
    ? endLog.timestamp - startLog.timestamp
    : 0;

  const lastProgressLog = [...logs]
    .reverse()
    .find((log) => log.pageNumber !== undefined);

  const transactionLog = [...logs]
    .reverse()
    .find((log) => log.transactionsExtracted !== undefined);

  return {
    totalDurationMs,
    pagesProcessed: lastProgressLog?.pageNumber ?? 0,
    transactionsExtracted: transactionLog?.transactionsExtracted ?? 0,
    errors: logs.filter((log) => log.level === "error").length,
  };
}

// ============================================================================
// Extraction Logger Class (Stateful)
// ============================================================================

/**
 * Stateful extraction logger for tracking a single document's extraction
 */
export class DocumentExtractionLogger {
  private documentId: string;
  private startTime: number;
  private pagesCompleted: number = 0;
  private transactionsExtracted: number = 0;

  constructor(documentId: string) {
    this.documentId = documentId;
    this.startTime = Date.now();
  }

  start(totalPages: number): void {
    logPhaseStart(this.documentId, "extracting", { totalPages });
  }

  pageComplete(pageNumber: number, totalPages: number, transactionsFound: number): void {
    this.pagesCompleted = pageNumber;
    this.transactionsExtracted += transactionsFound;

    const elapsed = Date.now() - this.startTime;
    logPageExtracted(
      this.documentId,
      pageNumber,
      totalPages,
      transactionsFound,
      elapsed
    );
  }

  complete(): void {
    const duration = Date.now() - this.startTime;
    logPhaseComplete(this.documentId, "complete", duration, {
      pagesCompleted: this.pagesCompleted,
      transactionsExtracted: this.transactionsExtracted,
    });
  }

  error(error: Error | string): void {
    logExtractionError(this.documentId, error, {
      pagesCompleted: this.pagesCompleted,
      transactionsExtracted: this.transactionsExtracted,
      elapsedMs: Date.now() - this.startTime,
    });
  }

  getStats(): {
    documentId: string;
    elapsedMs: number;
    pagesCompleted: number;
    transactionsExtracted: number;
  } {
    return {
      documentId: this.documentId,
      elapsedMs: Date.now() - this.startTime,
      pagesCompleted: this.pagesCompleted,
      transactionsExtracted: this.transactionsExtracted,
    };
  }
}
