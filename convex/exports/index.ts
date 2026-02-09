// Main export actions for Reconciled
//
// Architecture: CSV/XLSX/Accounting exports are stored in Convex file storage
// instead of being returned as base64 data URLs. This avoids action return
// size limits and reduces memory pressure for large exports.
//
// Flow:
//   1. Frontend calls generateExport/generateAccountingExport action
//   2. Action: auth -> fetch data -> generate file -> store in Convex storage -> return job ID
//   3. Frontend subscribes to getExportJobStatus query (reactive via Convex)
//   4. Query resolves storageId -> download URL when ready
//   5. Cron cleans up expired files after 1 hour

import { v } from "convex/values";
import { action, internalMutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { generateBankReconExport } from "./bankRecon";
import { generateClientQueryExport } from "./clientQuery";
import { generateTransactionListingExport } from "./transactionListing";
import { generateSQLAccountingExport } from "./accounting/sqlAccounting";
import { generateAutoCountExport } from "./accounting/autocount";
import { generateQuickBooksExport } from "./accounting/quickbooks";
import { generateXeroExport } from "./accounting/xero";
import { authKit } from "../auth";
import { internalQuery } from "../_generated/server";

// Re-export PDF actions for convenience
export { generatePDFExport, getPDFJobStatus, retryPDFExport } from "./pdf";

// ============ VALIDATORS ============

const verifyAccessReturnValidator = v.object({
  authorized: v.boolean(),
  error: v.union(v.string(), v.null()),
  userId: v.union(v.id("users"), v.null()),
});

/** Return type for export actions -- now returns a job ID instead of a file */
const exportJobResultValidator = v.object({
  success: v.boolean(),
  error: v.optional(v.string()),
  jobId: v.optional(v.string()),
});

/** Return type for the job status query */
const exportJobStatusValidator = v.object({
  status: v.union(
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  downloadUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
});

// ============ AUTH & DATA QUERIES ============

// Internal query to verify session access for export operations
export const verifySessionAccess = internalQuery({
  args: {
    sessionId: v.id("reconciliationSessions"),
  },
  returns: verifyAccessReturnValidator,
  handler: async (ctx, args) => {
    // Get authenticated user from AuthKit
    const authUser = await authKit.getAuthUser(ctx);
    if (!authUser) {
      return { authorized: false, error: "Unauthorized: Please sign in", userId: null };
    }

    // Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos", (q) => q.eq("workosId", authUser.id))
      .first();

    if (!user) {
      return { authorized: false, error: "User not found", userId: null };
    }

    // Get session
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { authorized: false, error: "Session not found", userId: user._id };
    }

    // Get company and verify ownership
    const company = await ctx.db.get(session.companyId);
    if (!company) {
      return { authorized: false, error: "Company not found", userId: user._id };
    }

    if (company.isDeleted) {
      return { authorized: false, error: "Company has been deleted", userId: user._id };
    }

    if (company.ownerId !== user._id) {
      return { authorized: false, error: "Unauthorized: You don't have access to this session", userId: user._id };
    }

    return { authorized: true, error: null, userId: user._id };
  },
});

// Internal query to fetch all session data needed for exports
export const getExportData = internalQuery({
  args: {
    sessionId: v.id("reconciliationSessions"),
  },
  handler: async (ctx, args) => {
    // Get session
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Get company
    const company = await ctx.db.get(session.companyId);
    if (!company) return null;

    // Get all matches for this session
    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Enrich matches with transaction/document details
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const cashTxn = await ctx.db.get(match.cashTransactionId);

        let accrualDoc = null;
        let accrualTxn = null;

        if (match.accrualDocumentId) {
          accrualDoc = await ctx.db.get(match.accrualDocumentId);
        }
        if (match.accrualTransactionId) {
          accrualTxn = await ctx.db.get(match.accrualTransactionId);
        }

        return {
          ...match,
          cashTransaction: cashTxn,
          accrualDocument: accrualDoc,
          accrualTransaction: accrualTxn,
        };
      })
    );

    // Get all transactions for this session
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get all accrual documents for this session
    const accrualDocuments = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get suspense items for this session
    const suspenseItems = await ctx.db
      .query("suspenseItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      session,
      company,
      matches: enrichedMatches,
      transactions,
      accrualDocuments,
      suspenseItems,
    };
  },
});

// ============ EXPORT JOB LIFECYCLE (internal mutations) ============

/** Create an export job record. Returns the job ID. */
export const createExportJob = internalMutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    userId: v.id("users"),
    exportType: v.union(v.literal("csv"), v.literal("xlsx"), v.literal("accounting")),
    reportType: v.optional(v.string()),
  },
  returns: v.id("exportJobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("exportJobs", {
      sessionId: args.sessionId,
      userId: args.userId,
      exportType: args.exportType,
      reportType: args.reportType,
      status: "processing",
      createdAt: Date.now(),
    });
  },
});

/** Mark an export job as completed with its storage reference. */
export const completeExportJob = internalMutation({
  args: {
    jobId: v.id("exportJobs"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      storageId: args.storageId,
      fileName: args.fileName,
      mimeType: args.mimeType,
      completedAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    });
  },
});

/** Mark an export job as failed. */
export const failExportJob = internalMutation({
  args: {
    jobId: v.id("exportJobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
  },
});

// ============ EXPORT JOB STATUS QUERY ============

/**
 * Get the status of a file export job.
 * SECURITY: Verifies the authenticated user owns the job before returning data.
 * Resolves storageId to a download URL for completed jobs.
 */
export const getExportJobStatus = query({
  args: {
    jobId: v.string(),
  },
  returns: v.union(exportJobStatusValidator, v.null()),
  handler: async (ctx, args) => {
    // SECURITY: Verify authenticated user
    const authUser = await authKit.getAuthUser(ctx);
    if (!authUser) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos", (q) => q.eq("workosId", authUser.id))
      .first();
    if (!user) return null;

    // Fetch the job
    const job = await ctx.db.get(args.jobId as Id<"exportJobs">);
    if (!job) return null;

    // SECURITY: Verify ownership
    if (job.userId !== user._id) return null;

    // For completed jobs, resolve the storage ID to a download URL
    let downloadUrl: string | undefined;
    if (job.status === "completed" && job.storageId) {
      // Check if job has expired
      if (job.expiresAt && Date.now() > job.expiresAt) {
        return {
          status: "failed" as const,
          errorMessage: "Export has expired. Please generate a new export.",
        };
      }
      downloadUrl = await ctx.storage.getUrl(job.storageId) ?? undefined;
    }

    return {
      status: job.status,
      downloadUrl,
      fileName: job.fileName,
      errorMessage: job.errorMessage,
    };
  },
});

// ============ CLEANUP ============

/**
 * Clean up expired export jobs and their stored files.
 * Called by cron to free Convex storage.
 */
export const cleanupExpiredExportJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let cleanedCount = 0;

    // Find completed jobs that have expired
    const completedJobs = await ctx.db
      .query("exportJobs")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    for (const job of completedJobs) {
      if (job.expiresAt && now > job.expiresAt) {
        // Delete the stored file
        if (job.storageId) {
          try {
            await ctx.storage.delete(job.storageId);
          } catch (e) {
            console.warn(`Failed to delete storage for export job ${job._id}:`, e);
          }
        }
        // Delete the job record
        await ctx.db.delete(job._id);
        cleanedCount++;
      }
    }

    // Also clean up failed jobs older than 1 hour
    const failedJobs = await ctx.db
      .query("exportJobs")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();

    for (const job of failedJobs) {
      if (now - job.createdAt > 60 * 60 * 1000) {
        await ctx.db.delete(job._id);
        cleanedCount++;
      }
    }

    // Clean up stuck processing jobs (>10 min)
    const processingJobs = await ctx.db
      .query("exportJobs")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();

    for (const job of processingJobs) {
      if (now - job.createdAt > 10 * 60 * 1000) {
        await ctx.db.patch(job._id, {
          status: "failed",
          errorMessage: "Export timed out. Please try again.",
          completedAt: now,
        });
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(JSON.stringify({
        event: "export_jobs_cleaned",
        level: "info",
        cleanedCount,
        timestamp: now,
      }));
    }

    return { cleanedCount };
  },
});

// ============ EXPORT ACTIONS ============

/**
 * Generate a CSV or XLSX report export.
 *
 * Stores the generated file in Convex storage and returns a job ID.
 * The frontend should subscribe to getExportJobStatus to get the download URL.
 */
export const generateExport = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    reportType: v.union(
      v.literal("bank_recon"),
      v.literal("client_query"),
      v.literal("transaction_listing")
    ),
    format: v.union(v.literal("xlsx"), v.literal("csv")),
    options: v.optional(
      v.object({
        includeMatched: v.optional(v.boolean()),
        includePending: v.optional(v.boolean()),
        includeSuspense: v.optional(v.boolean()),
      })
    ),
  },
  returns: exportJobResultValidator,
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this session
    const authCheck = await ctx.runQuery(internal.exports.index.verifySessionAccess, {
      sessionId: args.sessionId,
    });

    if (!authCheck.authorized || !authCheck.userId) {
      return {
        success: false,
        error: authCheck.error || "Access denied",
      };
    }

    // Create export job record
    const jobId = await ctx.runMutation(internal.exports.index.createExportJob, {
      sessionId: args.sessionId,
      userId: authCheck.userId,
      exportType: args.format,
      reportType: args.reportType,
    });

    try {
      // Fetch all data needed for export
      const data = await ctx.runQuery(internal.exports.index.getExportData, {
        sessionId: args.sessionId,
      });

      if (!data) {
        await ctx.runMutation(internal.exports.index.failExportJob, {
          jobId,
          errorMessage: "Session not found or access denied",
        });
        return { success: false, error: "Session not found or access denied" };
      }

      const options = {
        includeMatched: args.options?.includeMatched ?? true,
        includePending: args.options?.includePending ?? true,
        includeSuspense: args.options?.includeSuspense ?? true,
      };

      let result: { base64: string; fileName: string; mimeType: string };

      switch (args.reportType) {
        case "bank_recon":
          result = generateBankReconExport(data, args.format, options);
          break;
        case "client_query":
          result = generateClientQueryExport(data, args.format, options);
          break;
        case "transaction_listing":
          result = generateTransactionListingExport(data, args.format, options);
          break;
        default:
          await ctx.runMutation(internal.exports.index.failExportJob, {
            jobId,
            errorMessage: `Unknown report type: ${args.reportType}`,
          });
          return { success: false, error: `Unknown report type: ${args.reportType}` };
      }

      // Decode base64 to binary and store in Convex file storage
      const fileBytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([fileBytes], { type: result.mimeType });
      const storageId = await ctx.storage.store(blob);

      // Mark job as completed
      await ctx.runMutation(internal.exports.index.completeExportJob, {
        jobId,
        storageId,
        fileName: result.fileName,
        mimeType: result.mimeType,
      });

      // Audit logging
      console.log(JSON.stringify({
        event: "export_generated",
        level: "info",
        userId: authCheck.userId,
        sessionId: args.sessionId,
        reportType: args.reportType,
        format: args.format,
        jobId,
        timestamp: Date.now(),
      }));

      return { success: true, jobId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.exports.index.failExportJob, {
        jobId,
        errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Generate an accounting software export (SQL Accounting, AutoCount, QuickBooks, Xero).
 *
 * Stores the generated file in Convex storage and returns a job ID.
 */
export const generateAccountingExport = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    software: v.union(
      v.literal("sql_accounting"),
      v.literal("autocount"),
      v.literal("quickbooks_iif"),
      v.literal("xero_csv")
    ),
    options: v.optional(
      v.object({
        accountCodes: v.optional(
          v.object({
            bankAccount: v.optional(v.string()),
            receivables: v.optional(v.string()),
            payables: v.optional(v.string()),
            revenue: v.optional(v.string()),
            expenses: v.optional(v.string()),
          })
        ),
        includeJournalEntries: v.optional(v.boolean()),
      })
    ),
  },
  returns: exportJobResultValidator,
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this session
    const authCheck = await ctx.runQuery(internal.exports.index.verifySessionAccess, {
      sessionId: args.sessionId,
    });

    if (!authCheck.authorized || !authCheck.userId) {
      return {
        success: false,
        error: authCheck.error || "Access denied",
      };
    }

    // Create export job record
    const jobId = await ctx.runMutation(internal.exports.index.createExportJob, {
      sessionId: args.sessionId,
      userId: authCheck.userId,
      exportType: "accounting",
      reportType: args.software,
    });

    try {
      // Fetch all data needed for export
      const data = await ctx.runQuery(internal.exports.index.getExportData, {
        sessionId: args.sessionId,
      });

      if (!data) {
        await ctx.runMutation(internal.exports.index.failExportJob, {
          jobId,
          errorMessage: "Session not found or access denied",
        });
        return { success: false, error: "Session not found or access denied" };
      }

      const options = {
        accountCodes: args.options?.accountCodes ?? {},
        includeJournalEntries: args.options?.includeJournalEntries ?? true,
      };

      let result: { content: string; fileName: string; mimeType: string };

      switch (args.software) {
        case "sql_accounting":
          result = generateSQLAccountingExport(data, options);
          break;
        case "autocount":
          result = generateAutoCountExport(data, options);
          break;
        case "quickbooks_iif":
          result = generateQuickBooksExport(data, options);
          break;
        case "xero_csv":
          result = generateXeroExport(data, options);
          break;
        default:
          await ctx.runMutation(internal.exports.index.failExportJob, {
            jobId,
            errorMessage: `Unknown accounting software: ${args.software}`,
          });
          return { success: false, error: `Unknown accounting software: ${args.software}` };
      }

      // Store text content in Convex file storage
      const blob = new Blob([result.content], { type: result.mimeType });
      const storageId = await ctx.storage.store(blob);

      // Mark job as completed
      await ctx.runMutation(internal.exports.index.completeExportJob, {
        jobId,
        storageId,
        fileName: result.fileName,
        mimeType: result.mimeType,
      });

      // Audit logging
      console.log(JSON.stringify({
        event: "accounting_export_generated",
        level: "info",
        userId: authCheck.userId,
        sessionId: args.sessionId,
        software: args.software,
        jobId,
        timestamp: Date.now(),
      }));

      return { success: true, jobId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.exports.index.failExportJob, {
        jobId,
        errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },
});
