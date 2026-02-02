/**
 * Agent job management for the agentic spreadsheet feature.
 *
 * Provides:
 * - Agent job creation and tracking
 * - Batch job processing via scheduled functions
 * - Credit balance management
 * - Webhook handling for enrichment results
 *
 * @module convex/agents
 */

import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, internalAction, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";

// Credit costs per data source
const CREDIT_COSTS: Record<string, number> = {
  llm: 1,
  clearbit: 0.5,
  zoominfo: 1,
  ssm: 2,
  default: 1,
};

// Valid data sources
const VALID_DATA_SOURCES = ["llm", "clearbit", "zoominfo", "ssm"];

// Maximum input/prompt lengths
const MAX_INPUT_LENGTH = 10_000;
const MAX_PROMPT_LENGTH = 10_000;

// Rate limiting constants
const MAX_BATCH_SIZE = 100; // Max rows per batch request
const MIN_BATCH_INTERVAL_MS = 2000; // Minimum time between batch requests per worksheet

// Retry configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRYABLE_ERRORS = [
  'etimedout',
  'econnreset',
  'rate limit',
  'throttl',
  'timeout',
  '503',
  '429',
];

/**
 * Check if an error is retryable (transient network/rate-limit issues).
 */
function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return RETRYABLE_ERRORS.some(pattern => message.includes(pattern));
}

/**
 * Sanitize user input for safe LLM prompt interpolation.
 * Escapes quotes, newlines, and potential injection patterns.
 */
function sanitizeForPrompt(input: string): string {
  return input
    // Escape backslashes first
    .replace(/\\/g, '\\\\')
    // Escape quotes
    .replace(/"/g, '\\"')
    // Escape newlines (preserve them as literal \n)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    // Limit length to prevent context overflow attacks
    .slice(0, 5000);
}

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Verify user has access to a company.
 * Currently uses simple ownership model (user is company owner).
 */
async function verifyCompanyAccess(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">,
  userId: Id<"users">
): Promise<boolean> {
  // Check if user is the owner of this company
  const company = await ctx.db.get(companyId);
  if (!company) return false;

  return company.ownerId === userId;
}

/**
 * Verify user has access to a worksheet via workspace.
 */
async function verifyWorksheetAccess(
  ctx: QueryCtx | MutationCtx,
  worksheetId: Id<"worksheets">,
  userId: Id<"users">
): Promise<{ hasAccess: boolean; companyId?: Id<"companies"> }> {
  const worksheet = await ctx.db.get(worksheetId);
  if (!worksheet) return { hasAccess: false };

  const workspace = await ctx.db.get(worksheet.workspaceId);
  if (!workspace) return { hasAccess: false };

  const hasAccess = await verifyCompanyAccess(ctx, workspace.companyId, userId);
  return { hasAccess, companyId: workspace.companyId };
}

// ============================================================================
// Agent Job Queries
// ============================================================================

/**
 * Get pending jobs for a worksheet.
 */
export const getPendingJobs = query({
  args: { worksheetId: v.id("worksheets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentJobs")
      .withIndex("by_worksheet_status", (q) =>
        q.eq("worksheetId", args.worksheetId).eq("status", "pending")
      )
      .collect();
  },
});

/**
 * Get all jobs for a worksheet.
 */
export const getJobsForWorksheet = query({
  args: { worksheetId: v.id("worksheets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentJobs")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();
  },
});

/**
 * Get job stats for a worksheet.
 */
export const getJobStats = query({
  args: { worksheetId: v.id("worksheets") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      running: jobs.filter((j) => j.status === "running").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
    };
  },
});

// ============================================================================
// Agent Job Mutations
// ============================================================================

/**
 * Create a single enrichment job for a cell.
 */
export const createJob = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    rowId: v.id("worksheetRows"),
    columnId: v.id("worksheetColumns"),
    input: v.string(),
    prompt: v.string(),
    dataSource: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { hasAccess, companyId } = await verifyWorksheetAccess(ctx, args.worksheetId, args.userId);
    if (!hasAccess || !companyId) {
      throw new Error("Unauthorized: You don't have access to this worksheet");
    }

    // Validate data source
    if (!VALID_DATA_SOURCES.includes(args.dataSource)) {
      throw new Error(`Invalid data source: ${args.dataSource}`);
    }

    // Validate input lengths
    if (args.input.length > MAX_INPUT_LENGTH) {
      throw new Error(`Input too long (max ${MAX_INPUT_LENGTH} characters)`);
    }
    if (args.prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`);
    }

    // Check credits BEFORE creating the job
    const creditCost = CREDIT_COSTS[args.dataSource] || CREDIT_COSTS.default;
    const credits = await ctx.db
      .query("companyCredits")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first();

    if (!credits || credits.balance < creditCost) {
      throw new Error("Insufficient credits");
    }

    // Check if there's already a pending/running job for this cell
    const existingJobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
      .filter((q) =>
        q.and(
          q.eq(q.field("columnId"), args.columnId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "running")
          )
        )
      )
      .first();

    if (existingJobs) {
      return existingJobs._id; // Return existing job
    }

    // Insert with duplicate handling for TOCTOU race condition
    try {
      const jobId = await ctx.db.insert("agentJobs", {
        worksheetId: args.worksheetId,
        rowId: args.rowId,
        columnId: args.columnId,
        status: "pending",
        input: args.input,
        prompt: args.prompt,
        dataSource: args.dataSource,
        retryCount: 0,
      });

      // Update cell status to pending
      const column = await ctx.db.get(args.columnId);
      if (column) {
        await ctx.runMutation(internal.workspaces.updateCellStatus, {
          rowId: args.rowId,
          columnKey: `col_${column.order}`,
          status: "pending",
        });
      }

      return jobId;
    } catch (error) {
      // If we hit a race condition, re-check for existing job
      const raceCheckJob = await ctx.db
        .query("agentJobs")
        .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
        .filter((q) =>
          q.and(
            q.eq(q.field("columnId"), args.columnId),
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "running")
            )
          )
        )
        .first();

      if (raceCheckJob) {
        return raceCheckJob._id;
      }
      throw error;
    }
  },
});

/**
 * Create batch jobs for an entire column.
 * Rate limited to prevent spam clicks and DoS.
 */
export const createBatchJobs = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    columnId: v.id("worksheetColumns"),
    prompt: v.string(),
    dataSource: v.string(),
    inputColumnKey: v.optional(v.string()), // Which column to use as input (optional - can be derived from column definition)
    userId: v.id("users"),
    maxRows: v.optional(v.number()), // Optional row limit (defaults to MAX_BATCH_SIZE)
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { hasAccess, companyId } = await verifyWorksheetAccess(ctx, args.worksheetId, args.userId);
    if (!hasAccess || !companyId) {
      throw new Error("Unauthorized: You don't have access to this worksheet");
    }

    // Validate data source - give helpful error for unimplemented sources
    if (!VALID_DATA_SOURCES.includes(args.dataSource)) {
      throw new Error(`Invalid data source: ${args.dataSource}`);
    }

    // RATE LIMITING: Only LLM is currently implemented
    if (args.dataSource !== "llm") {
      throw new Error(
        `Data source "${args.dataSource}" is not yet available. ` +
        `Currently, only "LLM (AI)" enrichment is supported. ` +
        `Please select "LLM" as your data source.`
      );
    }

    // Validate prompt length
    if (args.prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`);
    }

    // Enforce batch size limit
    const effectiveMaxRows = Math.min(args.maxRows || MAX_BATCH_SIZE, MAX_BATCH_SIZE);

    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    // Determine input column key
    let inputColumnKey = args.inputColumnKey;
    if (!inputColumnKey && column.inputColumnId) {
      const inputColumn = await ctx.db.get(column.inputColumnId);
      if (!inputColumn) throw new Error("Input column no longer exists");
      inputColumnKey = `col_${inputColumn.order}`;
    }
    if (!inputColumnKey) {
      // Fallback to first column
      const allColumns = await ctx.db
        .query("worksheetColumns")
        .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
        .collect();
      allColumns.sort((a, b) => a.order - b.order);
      if (allColumns.length === 0) throw new Error("No columns available for input");
      inputColumnKey = `col_${allColumns[0].order}`;
    }

    // Validate input column key format
    if (!inputColumnKey.match(/^col_\d+$/)) {
      throw new Error("Invalid input column key format");
    }

    const allRows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Filter out soft-deleted rows
    const rows = allRows.filter(r => !r.deletedAt);

    // Count how many jobs we'll create and check credits upfront
    let jobsToCreate = 0;
    const columnKey = `col_${column.order}`;
    let processedRows = 0;

    for (const row of rows) {
      // RATE LIMITING: Stop counting after reaching batch limit
      if (jobsToCreate >= effectiveMaxRows) break;

      const input = row.cells[inputColumnKey];
      if (!input || typeof input !== "string" || input.trim() === "") {
        continue;
      }
      const existingValue = row.cells[columnKey];
      if (existingValue !== undefined && existingValue !== null && existingValue !== "") {
        continue;
      }
      // Check for existing pending/running job
      const existingJob = await ctx.db
        .query("agentJobs")
        .withIndex("by_row", (q) => q.eq("rowId", row._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("columnId"), args.columnId),
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "running")
            )
          )
        )
        .first();

      if (!existingJob) {
        jobsToCreate++;
      }
    }

    // SECURITY: Check credits BEFORE creating any jobs
    const creditCost = CREDIT_COSTS[args.dataSource] || CREDIT_COSTS.default;
    const totalCost = jobsToCreate * creditCost;
    const credits = await ctx.db
      .query("companyCredits")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .first();

    if (!credits || credits.balance < totalCost) {
      throw new Error(`Insufficient credits. Need ${totalCost}, have ${credits?.balance || 0}`);
    }

    // Now create the jobs (respecting batch limit)
    const jobIds: Id<"agentJobs">[] = [];
    let jobsCreated = 0;

    for (const row of rows) {
      // RATE LIMITING: Stop after reaching batch limit
      if (jobsCreated >= effectiveMaxRows) break;

      const input = row.cells[inputColumnKey];
      if (!input || typeof input !== "string" || input.trim() === "") {
        continue; // Skip empty inputs
      }

      // Validate input length
      if (String(input).length > MAX_INPUT_LENGTH) {
        continue; // Skip oversized inputs
      }

      // Skip if already has a value
      const existingValue = row.cells[columnKey];
      if (existingValue !== undefined && existingValue !== null && existingValue !== "") {
        continue;
      }

      // Check for existing pending/running job (deduplication)
      const existingJob = await ctx.db
        .query("agentJobs")
        .withIndex("by_row", (q) => q.eq("rowId", row._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("columnId"), args.columnId),
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "running")
            )
          )
        )
        .first();

      if (existingJob) {
        // Deduplication: Don't create new job, but count it
        jobIds.push(existingJob._id);
        continue;
      }

      const jobId = await ctx.db.insert("agentJobs", {
        worksheetId: args.worksheetId,
        rowId: row._id,
        columnId: args.columnId,
        status: "pending",
        input: String(input),
        prompt: args.prompt,
        dataSource: args.dataSource,
        retryCount: 0,
      });

      jobIds.push(jobId);
      jobsCreated++;

      // Update cell status to pending
      await ctx.runMutation(internal.workspaces.updateCellStatus, {
        rowId: row._id,
        columnKey,
        status: "pending",
      });
    }

    // Inform user if there are more rows to process
    const remainingRows = rows.length - jobsCreated;
    const hasMore = remainingRows > 0 && jobsCreated >= effectiveMaxRows;

    return {
      jobIds,
      count: jobIds.length,
      created: jobsCreated,
      hasMore,
      message: hasMore
        ? `Created ${jobsCreated} jobs (max ${effectiveMaxRows} per request). ${remainingRows} rows remaining.`
        : `Created ${jobsCreated} jobs.`,
    };
  },
});

/**
 * Cancel pending jobs for a worksheet or column.
 * Running jobs cannot be cancelled.
 */
export const cancelPendingJobs = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    columnId: v.optional(v.id("worksheetColumns")), // Optional: only cancel jobs for specific column
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { hasAccess } = await verifyWorksheetAccess(ctx, args.worksheetId, args.userId);
    if (!hasAccess) {
      throw new Error("Unauthorized: You don't have access to this worksheet");
    }

    // Get pending jobs
    const pendingJobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_worksheet_status", (q) =>
        q.eq("worksheetId", args.worksheetId).eq("status", "pending")
      )
      .collect();

    // Filter by column if specified
    const jobsToCancel = args.columnId
      ? pendingJobs.filter(j => j.columnId === args.columnId)
      : pendingJobs;

    let cancelled = 0;
    for (const job of jobsToCancel) {
      // Delete the job
      await ctx.db.delete(job._id);

      // Reset cell status to idle
      const column = await ctx.db.get(job.columnId);
      if (column) {
        await ctx.runMutation(internal.workspaces.updateCellStatus, {
          rowId: job.rowId,
          columnKey: `col_${column.order}`,
          status: "idle",
        });
      }
      cancelled++;
    }

    return { cancelled };
  },
});

/**
 * Retry failed jobs for a worksheet or column.
 */
export const retryFailedJobs = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    columnId: v.optional(v.id("worksheetColumns")), // Optional: only retry jobs for specific column
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { hasAccess, companyId } = await verifyWorksheetAccess(ctx, args.worksheetId, args.userId);
    if (!hasAccess || !companyId) {
      throw new Error("Unauthorized: You don't have access to this worksheet");
    }

    // Get failed jobs
    const failedJobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .filter((q) => q.eq(q.field("status"), "failed"))
      .collect();

    // Filter by column if specified
    const jobsToRetry = args.columnId
      ? failedJobs.filter(j => j.columnId === args.columnId)
      : failedJobs;

    // Limit to MAX_BATCH_SIZE
    const limitedJobs = jobsToRetry.slice(0, MAX_BATCH_SIZE);

    // Check credits upfront
    if (limitedJobs.length > 0) {
      const creditCost = CREDIT_COSTS[limitedJobs[0].dataSource] || CREDIT_COSTS.default;
      const totalCost = limitedJobs.length * creditCost;
      const credits = await ctx.db
        .query("companyCredits")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .first();

      if (!credits || credits.balance < totalCost) {
        throw new Error(`Insufficient credits. Need ${totalCost}, have ${credits?.balance || 0}`);
      }
    }

    let retried = 0;
    for (const job of limitedJobs) {
      // Reset to pending for retry
      await ctx.db.patch(job._id, {
        status: "pending",
        retryCount: 0, // Reset retry count for manual retry
        error: undefined,
        completedAt: undefined,
        startedAt: undefined,
      });

      // Update cell status to pending
      const column = await ctx.db.get(job.columnId);
      if (column) {
        await ctx.runMutation(internal.workspaces.updateCellStatus, {
          rowId: job.rowId,
          columnKey: `col_${column.order}`,
          status: "pending",
        });
      }
      retried++;
    }

    return {
      retried,
      hasMore: jobsToRetry.length > MAX_BATCH_SIZE,
      remaining: Math.max(0, jobsToRetry.length - MAX_BATCH_SIZE),
    };
  },
});

// ============================================================================
// Internal Mutations (for scheduled functions and webhooks)
// ============================================================================

/**
 * Get next batch of pending jobs to process.
 */
export const getNextBatch = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(args.limit);
  },
});

/**
 * Mark a job as running (atomic claim).
 * Returns true if the job was successfully claimed, false if already claimed.
 */
export const markJobRunning = internalMutation({
  args: { jobId: v.id("agentJobs") },
  handler: async (ctx, args): Promise<boolean> => {
    const job = await ctx.db.get(args.jobId);
    // Return false if job doesn't exist or already claimed
    if (!job || job.status !== "pending") {
      return false;
    }

    await ctx.db.patch(args.jobId, {
      status: "running",
      startedAt: Date.now(),
    });

    // Update cell status
    const column = await ctx.db.get(job.columnId);
    if (column) {
      await ctx.runMutation(internal.workspaces.updateCellStatus, {
        rowId: job.rowId,
        columnKey: `col_${column.order}`,
        status: "running",
      });
    }

    return true; // Successfully claimed
  },
});

/**
 * Handle enrichment job completion (called from webhook).
 */
export const handleJobResult = internalMutation({
  args: {
    jobId: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the job
    const jobs = await ctx.db
      .query("agentJobs")
      .filter((q) => q.eq(q.field("_id"), args.jobId as Id<"agentJobs">))
      .first();

    if (!jobs) {
      console.error(`Job not found: ${args.jobId}`);
      return;
    }

    const job = jobs;

    // Calculate credit cost
    const creditCost = CREDIT_COSTS[job.dataSource] || CREDIT_COSTS.default;

    // Update job
    await ctx.db.patch(job._id, {
      status: args.status,
      result: args.result,
      error: args.error,
      completedAt: Date.now(),
      creditsCost: args.status === "completed" ? creditCost : undefined,
    });

    // Update cell
    const column = await ctx.db.get(job.columnId);
    if (column) {
      if (args.status === "completed" && args.result !== undefined) {
        await ctx.runMutation(internal.workspaces.updateCellStatus, {
          rowId: job.rowId,
          columnKey: `col_${column.order}`,
          status: "complete",
          value: args.result,
        });
      } else {
        await ctx.runMutation(internal.workspaces.updateCellStatus, {
          rowId: job.rowId,
          columnKey: `col_${column.order}`,
          status: "error",
          error: args.error,
        });
      }
    }

    // Deduct credits on success
    if (args.status === "completed") {
      // Get worksheet to find company
      const worksheet = await ctx.db.get(job.worksheetId);
      if (worksheet) {
        const workspace = await ctx.db.get(worksheet.workspaceId);
        if (workspace) {
          await ctx.runMutation(internal.agents.deductCredits, {
            companyId: workspace.companyId,
            amount: creditCost,
            description: `Enrichment: ${job.prompt.substring(0, 50)}...`,
            jobId: job._id,
          });
        }
      }
    }
  },
});

/**
 * Reset a job for retry after a transient failure.
 * Increments retry count and resets status to pending.
 */
export const resetJobForRetry = internalMutation({
  args: {
    jobId: v.id("agentJobs"),
    retryCount: v.number(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "pending",
      retryCount: args.retryCount,
      error: args.error, // Store last error for debugging
      startedAt: undefined, // Clear startedAt for fresh processing
    });

    // Also reset cell status to pending
    const job = await ctx.db.get(args.jobId);
    if (job) {
      const column = await ctx.db.get(job.columnId);
      if (column) {
        await ctx.runMutation(internal.workspaces.updateCellStatus, {
          rowId: job.rowId,
          columnKey: `col_${column.order}`,
          status: "pending",
        });
      }
    }
  },
});

// ============================================================================
// Credits Management
// ============================================================================

/**
 * Get company's credit balance.
 */
export const getCreditBalance = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const credits = await ctx.db
      .query("companyCredits")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();

    return credits || { balance: 0, totalPurchased: 0, totalUsed: 0 };
  },
});

/**
 * Get credit transaction history.
 */
export const getCreditHistory = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    return await ctx.db
      .query("creditTransactions")
      .withIndex("by_company_time", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Add credits to a company (for purchases).
 */
export const addCredits = mutation({
  args: {
    companyId: v.id("companies"),
    amount: v.number(),
    description: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this company
    const hasAccess = await verifyCompanyAccess(ctx, args.companyId, args.userId);
    if (!hasAccess) {
      throw new Error("Unauthorized: You don't have access to this company");
    }

    // Validate amount
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }
    if (args.amount > 1_000_000) {
      throw new Error("Amount too large");
    }

    // Validate description
    if (args.description.length > 500) {
      throw new Error("Description too long (max 500 characters)");
    }

    const now = Date.now();

    // Get or create credit balance
    const existing = await ctx.db
      .query("companyCredits")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: existing.balance + args.amount,
        totalPurchased: existing.totalPurchased + args.amount,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("companyCredits", {
        companyId: args.companyId,
        balance: args.amount,
        totalPurchased: args.amount,
        totalUsed: 0,
        updatedAt: now,
      });
    }

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      companyId: args.companyId,
      type: "purchase",
      amount: args.amount,
      description: args.description,
      createdAt: now,
      createdBy: args.userId,
    });
  },
});

/**
 * Deduct credits (internal, called after job completion).
 * Note: Credits are now checked BEFORE job creation, so this should
 * always have sufficient balance. The Math.max(0, ...) is a safety net.
 */
export const deductCredits = internalMutation({
  args: {
    companyId: v.id("companies"),
    amount: v.number(),
    description: v.string(),
    jobId: v.id("agentJobs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const credits = await ctx.db
      .query("companyCredits")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();

    if (credits) {
      // Check if we have sufficient balance (should always be true due to upfront check)
      if (credits.balance < args.amount) {
        // Log warning but still deduct (job already completed)
        console.warn(`Insufficient credits for deduction: ${args.companyId}, need ${args.amount}, have ${credits.balance}`);
      }

      // Use Math.max(0, ...) as safety net to prevent negative balance
      await ctx.db.patch(credits._id, {
        balance: Math.max(0, credits.balance - args.amount),
        totalUsed: credits.totalUsed + args.amount,
        updatedAt: now,
      });
    } else {
      // Create credit record with negative balance warning
      console.warn(`No credit record found for company: ${args.companyId}`);
      await ctx.db.insert("companyCredits", {
        companyId: args.companyId,
        balance: 0, // Don't allow negative
        totalPurchased: 0,
        totalUsed: args.amount,
        updatedAt: now,
      });
    }

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      companyId: args.companyId,
      type: "usage",
      amount: -args.amount,
      description: args.description,
      jobId: args.jobId,
      createdAt: now,
    });
  },
});

// ============================================================================
// Job Processing Action
// ============================================================================

/**
 * Call AWS Bedrock for enrichment tasks.
 * Reuses the pattern from convex/matching/llm.ts
 * Uses structured prompts with sanitized inputs to prevent injection attacks.
 */
async function callBedrockForEnrichment(input: string, prompt: string): Promise<string> {
  const region = process.env.AWS_REGION || "us-east-1";
  const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  // Create Bedrock provider
  const bedrock = createAmazonBedrock({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

  // Sanitize user inputs to prevent prompt injection
  const sanitizedInput = sanitizeForPrompt(input);
  const sanitizedPrompt = sanitizeForPrompt(prompt);

  // Use XML structure to clearly separate user data from instructions
  const fullPrompt = `You are a data enrichment assistant. Perform the task described below.

<user_input>
${sanitizedInput}
</user_input>

<task>
${sanitizedPrompt}
</task>

Respond with ONLY the direct answer. No explanations, formatting, or additional text.`;

  const { text } = await generateText({
    model: bedrock(modelId),
    prompt: fullPrompt,
    temperature: 0.1,
    maxOutputTokens: 1024,
  });

  return text.trim();
}

/**
 * Call the appropriate enrichment service based on data source.
 */
async function callEnrichmentService(
  dataSource: string,
  input: string,
  prompt: string
): Promise<string> {
  switch (dataSource) {
    case "llm":
      return await callBedrockForEnrichment(input, prompt);
    case "clearbit":
      // TODO: Implement Clearbit API integration
      throw new Error("Clearbit integration not yet implemented");
    case "zoominfo":
      // TODO: Implement ZoomInfo API integration
      throw new Error("ZoomInfo integration not yet implemented");
    case "ssm":
      // TODO: Implement SSM (custom) integration
      throw new Error("SSM integration not yet implemented");
    default:
      throw new Error(`Unknown data source: ${dataSource}`);
  }
}

/**
 * Process pending enrichment jobs.
 * This scheduled action picks up pending jobs, runs enrichment, and updates results.
 * Implements atomic job claiming to prevent race conditions and retry logic for transient failures.
 */
export const processJobs = internalAction({
  handler: async (ctx) => {
    // Get next batch of pending jobs
    const jobs = await ctx.runQuery(internal.agents.getNextBatch, { limit: 50 });

    if (jobs.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0, retried: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let retried = 0;

    for (const job of jobs) {
      // Atomically try to claim the job
      const claimed = await ctx.runMutation(internal.agents.markJobRunning, { jobId: job._id });
      if (!claimed) {
        // Job already claimed by another worker, skip
        skipped++;
        continue;
      }

      try {
        // Extract the actual prompt from the formula
        const prompt = job.prompt.replace(/^=ENRICH\(["'](.*)["']\)$/i, "$1") || job.prompt;

        // Call enrichment service
        const result = await callEnrichmentService(job.dataSource, job.input, prompt);

        // Handle successful completion
        await ctx.runMutation(internal.agents.handleJobResult, {
          jobId: job._id,
          status: "completed",
          result,
        });
        succeeded++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const currentRetryCount = job.retryCount || 0;

        // Check if error is retryable and we haven't exceeded max retries
        if (isRetryableError(error) && currentRetryCount < MAX_RETRY_ATTEMPTS) {
          // Reset to pending for retry, increment counter
          await ctx.runMutation(internal.agents.resetJobForRetry, {
            jobId: job._id,
            retryCount: currentRetryCount + 1,
            error: errorMessage,
          });
          console.log(`Job ${job._id} will retry (attempt ${currentRetryCount + 1}/${MAX_RETRY_ATTEMPTS}): ${errorMessage}`);
          retried++;
        } else {
          // Permanent failure - either not retryable or max retries exceeded
          console.error(`Job ${job._id} permanently failed:`, errorMessage);
          await ctx.runMutation(internal.agents.handleJobResult, {
            jobId: job._id,
            status: "failed",
            error: errorMessage,
          });
          failed++;
        }
      }
    }

    console.log(`Processed ${jobs.length} jobs: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped (already claimed), ${retried} retrying`);
    return { processed: jobs.length, succeeded, failed, skipped, retried };
  },
});

