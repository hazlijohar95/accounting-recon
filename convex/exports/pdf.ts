// PDF Report Export Action
import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id, Doc } from "../_generated/dataModel";

// Type for enriched match from getExportData
type EnrichedMatch = {
  _id: Id<"matchedPairs">;
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  matchLayer: 1 | 2 | 3 | 4 | 5 | 6;
  matchReason?: string;
  status: "pending" | "approved" | "rejected";
  cashTransaction: Doc<"transactions"> | null;
  accrualDocument: Doc<"accrualDocuments"> | null;
  accrualTransaction: Doc<"transactions"> | null;
};

// Return validator for PDF export
const pdfExportResultValidator = v.object({
  success: v.boolean(),
  error: v.optional(v.string()),
  jobId: v.optional(v.string()),
});

// Return validator for job status
const jobStatusValidator = v.object({
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  downloadUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
});

/**
 * Generate a PDF export for a reconciliation session
 *
 * This action:
 * 1. Verifies user authentication and authorization
 * 2. Creates a PDF export job record
 * 3. Fetches all session data
 * 4. Calls the ML service to generate the PDF
 * 5. Returns the job ID for polling
 */
export const generatePDFExport = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    reportType: v.union(
      v.literal("bank_recon"),
      v.literal("client_query"),
      v.literal("transaction_listing")
    ),
    options: v.optional(
      v.object({
        includeMatched: v.optional(v.boolean()),
        includeSuspense: v.optional(v.boolean()),
        includeJournal: v.optional(v.boolean()),
      })
    ),
  },
  returns: pdfExportResultValidator,
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

    // Fetch all data needed for export
    const data = await ctx.runQuery(internal.exports.index.getExportData, {
      sessionId: args.sessionId,
    });

    if (!data) {
      return {
        success: false,
        error: "Session not found or access denied",
      };
    }

    // Create PDF export job record
    const jobId = await ctx.runMutation(internal.exports.pdf.createPDFJob, {
      sessionId: args.sessionId,
      userId: authCheck.userId,
      reportType: args.reportType,
    });

    // Prepare data for ML service
    const mlServiceUrl = process.env.ML_SERVICE_URL;
    if (!mlServiceUrl) {
      // Update job as failed
      await ctx.runMutation(internal.exports.pdf.handlePDFResults, {
        jobId,
        status: "failed",
        errorMessage: "ML service URL not configured",
      });
      return {
        success: false,
        error: "PDF service not configured",
      };
    }

    const convexUrl = process.env.CONVEX_SITE_URL;
    if (!convexUrl) {
      await ctx.runMutation(internal.exports.pdf.handlePDFResults, {
        jobId,
        status: "failed",
        errorMessage: "Convex site URL not configured",
      });
      return {
        success: false,
        error: "Webhook URL not configured",
      };
    }

    // Transform data for ML service format
    const options = {
      include_matched: args.options?.includeMatched ?? true,
      include_suspense: args.options?.includeSuspense ?? true,
      include_journal: args.options?.includeJournal ?? true,
    };

    // Build matches array
    const matches = data.matches.map((match: EnrichedMatch) => {
      const cash = match.cashTransaction;
      const accrual = match.accrualDocument || match.accrualTransaction;

      return {
        date: cash?.date || "",
        bank_description: cash?.description || "",
        bank_amount: cash?.amount || 0,
        invoice_number: match.accrualDocument?.docNumber || cash?.reference || null,
        counterparty: match.accrualDocument?.counterparty || null,
        invoice_amount: accrual
          ? "amount" in accrual
            ? accrual.amount
            : 0
          : null,
        match_type: getMatchTypeDescription(match.matchLayer),
        confidence: match.confidenceScore,
      };
    });

    // Build suspense items array
    const suspenseItems = data.suspenseItems.map((item: Doc<"suspenseItems">) => ({
      date: item.transactionDate,
      description: item.description,
      amount: item.amount,
      source: item.sourceType === "cash" ? "Bank" : "Accrual",
      reason: formatSuspenseReason(item.reason),
      suggested_action: item.suggestedAction,
      status: item.status,
    }));

    // Build transactions array
    const transactions = data.transactions.map((txn: Doc<"transactions">) => ({
      date: txn.date,
      description: txn.description,
      reference: txn.reference || null,
      amount: txn.amount,
      type: txn.type,
      status: txn.status,
      category: txn.category || null,
    }));

    // Build journal entries (for approved matches)
    const journalEntries = data.matches
      .filter((m: EnrichedMatch) => m.status === "approved" && m.cashTransaction)
      .flatMap((match: EnrichedMatch, idx: number) => {
        const cash = match.cashTransaction!;
        const docNum = `JV${String(idx + 1).padStart(4, "0")}`;
        const amount = Math.abs(cash.amount);

        if (cash.amount > 0) {
          return [
            {
              date: cash.date,
              account: "1100 - Bank Account",
              debit: amount,
              credit: 0,
              description: `Receipt - ${cash.description.slice(0, 50)}`,
              reference: docNum,
            },
            {
              date: cash.date,
              account: "1200 - Accounts Receivable",
              debit: 0,
              credit: amount,
              description: `Receipt - ${cash.description.slice(0, 50)}`,
              reference: docNum,
            },
          ];
        } else {
          return [
            {
              date: cash.date,
              account: "2100 - Accounts Payable",
              debit: amount,
              credit: 0,
              description: `Payment - ${cash.description.slice(0, 50)}`,
              reference: docNum,
            },
            {
              date: cash.date,
              account: "1100 - Bank Account",
              debit: 0,
              credit: amount,
              description: `Payment - ${cash.description.slice(0, 50)}`,
              reference: docNum,
            },
          ];
        }
      });

    // Calculate summary stats
    const cashTxns = data.transactions.filter((t: Doc<"transactions">) => t.type === "cash");
    const accrualTxns = data.transactions.filter((t: Doc<"transactions">) => t.type === "accrual");
    const totalCash = cashTxns.reduce((sum: number, t: Doc<"transactions">) => sum + t.amount, 0);
    const totalAccrual = accrualTxns.reduce((sum: number, t: Doc<"transactions">) => sum + t.amount, 0);
    const matchedCount = data.matches.filter((m: EnrichedMatch) => m.status === "approved").length;
    const pendingCount = data.matches.filter((m: EnrichedMatch) => m.status === "pending").length;
    const totalMatches = matchedCount + pendingCount;
    const matchRate = cashTxns.length > 0 ? (totalMatches / cashTxns.length) * 100 : 0;

    // Build request payload for ML service
    const mlPayload = {
      job_id: jobId,
      report_type: args.reportType,
      company: {
        name: data.company.name,
        currency: data.company.currency,
        registration_number: data.company.registrationNumber || null,
      },
      data: {
        session: {
          id: args.sessionId,
          name: data.session.name,
          period_start: data.session.periodStart || null,
          period_end: data.session.periodEnd || null,
        },
        matches,
        suspense_items: suspenseItems,
        transactions,
        journal_entries: journalEntries,
        summary: {
          total_cash: totalCash,
          total_accrual: totalAccrual,
          matched_count: matchedCount,
          pending_count: pendingCount,
          suspense_count: data.suspenseItems.length,
          match_rate: matchRate,
          total_cash_transactions: cashTxns.length,
          total_accrual_documents: accrualTxns.length + data.accrualDocuments.length,
        },
      },
      options,
      webhook_url: `${convexUrl}/api/pdf-ready`,
    };

    // Call ML service to generate PDF
    try {
      const response = await fetch(`${mlServiceUrl}/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mlPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await ctx.runMutation(internal.exports.pdf.handlePDFResults, {
          jobId,
          status: "failed",
          errorMessage: `ML service error: ${response.status} - ${errorText}`,
        });
        return {
          success: false,
          error: `PDF generation failed: ${response.status}`,
        };
      }

      // Audit logging
      console.log(
        JSON.stringify({
          event: "pdf_export_started",
          level: "info",
          userId: authCheck.userId,
          sessionId: args.sessionId,
          reportType: args.reportType,
          jobId,
          timestamp: Date.now(),
        })
      );

      return {
        success: true,
        jobId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.exports.pdf.handlePDFResults, {
        jobId,
        status: "failed",
        errorMessage,
      });
      return {
        success: false,
        error: `Failed to call PDF service: ${errorMessage}`,
      };
    }
  },
});

/**
 * Get the status of a PDF export job
 */
export const getPDFJobStatus = query({
  args: {
    jobId: v.string(),
  },
  returns: v.union(jobStatusValidator, v.null()),
  handler: async (ctx, args) => {
    // Find job by ID (jobId is stored as the Convex ID string)
    const job = await ctx.db
      .query("pdfExportJobs")
      .filter((q) => q.eq(q.field("_id"), args.jobId as Id<"pdfExportJobs">))
      .first();

    if (!job) {
      return null;
    }

    return {
      status: job.status,
      downloadUrl: job.downloadUrl,
      fileName: job.fileName,
      errorMessage: job.errorMessage,
    };
  },
});

/**
 * Internal mutation to create a PDF export job
 */
export const createPDFJob = internalMutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    userId: v.id("users"),
    reportType: v.union(
      v.literal("bank_recon"),
      v.literal("client_query"),
      v.literal("transaction_listing")
    ),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("pdfExportJobs", {
      sessionId: args.sessionId,
      userId: args.userId,
      reportType: args.reportType,
      status: "processing",
      createdAt: Date.now(),
    });

    return jobId;
  },
});

/**
 * Internal mutation to update PDF job with results from webhook
 */
export const handlePDFResults = internalMutation({
  args: {
    jobId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    downloadUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the job
    const job = await ctx.db.get(args.jobId as Id<"pdfExportJobs">);
    if (!job) {
      console.error(`PDF job not found: ${args.jobId}`);
      return;
    }

    // Update the job
    const updates: {
      status: typeof args.status;
      downloadUrl?: string;
      fileName?: string;
      errorMessage?: string;
      completedAt?: number;
      expiresAt?: number;
    } = {
      status: args.status,
    };

    if (args.downloadUrl) {
      updates.downloadUrl = args.downloadUrl;
    }
    if (args.fileName) {
      updates.fileName = args.fileName;
    }
    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
      // Set expiry to 24 hours from now for completed jobs
      if (args.status === "completed") {
        updates.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      }
    }

    await ctx.db.patch(args.jobId as Id<"pdfExportJobs">, updates);

    // Audit logging
    console.log(
      JSON.stringify({
        event: "pdf_export_completed",
        level: "info",
        jobId: args.jobId,
        status: args.status,
        fileName: args.fileName,
        timestamp: Date.now(),
      })
    );
  },
});

/**
 * Internal mutation to mark stale PDF jobs as failed
 * Called by cron job to handle timeout of stuck jobs
 */
export const cleanupStalePDFJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Jobs are considered stale after 10 minutes of processing
    const STALE_THRESHOLD_MS = 10 * 60 * 1000;
    const now = Date.now();

    // Find all processing jobs
    const processingJobs = await ctx.db
      .query("pdfExportJobs")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();

    let cleanedCount = 0;
    for (const job of processingJobs) {
      if (now - job.createdAt > STALE_THRESHOLD_MS) {
        await ctx.db.patch(job._id, {
          status: "failed",
          errorMessage: "Job timed out after 10 minutes",
          completedAt: now,
        });
        cleanedCount++;

        console.log(
          JSON.stringify({
            event: "pdf_job_timeout",
            level: "warning",
            jobId: job._id,
            sessionId: job.sessionId,
            createdAt: job.createdAt,
            timestamp: now,
          })
        );
      }
    }

    // Also clean up expired completed jobs (remove download URLs after 24h)
    const expiredJobs = await ctx.db
      .query("pdfExportJobs")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    for (const job of expiredJobs) {
      if (job.expiresAt && now > job.expiresAt) {
        await ctx.db.patch(job._id, {
          downloadUrl: undefined,
          fileName: undefined,
        });
      }
    }

    return { cleanedCount };
  },
});

/**
 * Retry a failed PDF export job
 */
export const retryPDFExport = action({
  args: {
    jobId: v.string(),
  },
  returns: pdfExportResultValidator,
  handler: async (ctx, args) => {
    // Get the failed job
    const job = await ctx.runQuery(internal.exports.pdf.getJobById, {
      jobId: args.jobId,
    });

    if (!job) {
      return {
        success: false,
        error: "Job not found",
      };
    }

    if (job.status !== "failed") {
      return {
        success: false,
        error: "Can only retry failed jobs",
      };
    }

    // Re-trigger the PDF export with the same parameters
    const result = await ctx.runAction(api.exports.index.generatePDFExport, {
      sessionId: job.sessionId,
      reportType: job.reportType,
    });

    return result;
  },
});

/**
 * Internal query to get a PDF job by ID
 */
export const getJobById = internalQuery({
  args: {
    jobId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId as Id<"pdfExportJobs">);
    return job;
  },
});

// Helper functions
function getMatchTypeDescription(layer: number): string {
  const descriptions: Record<number, string> = {
    1: "Exact",
    2: "Window",
    3: "Reference",
    4: "Fuzzy",
    5: "Semantic",
    6: "Manual",
  };
  return descriptions[layer] || "Unknown";
}

function formatSuspenseReason(reason: string): string {
  const reasons: Record<string, string> = {
    no_match: "No matching document found",
    amount_mismatch: "Amount does not match",
    date_outside_range: "Date outside reconciliation period",
    duplicate: "Possible duplicate entry",
    partial_match: "Partial match found",
  };
  return reasons[reason] || reason;
}
