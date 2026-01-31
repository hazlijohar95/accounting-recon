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
import { query, mutation, internalMutation, internalQuery, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
  },
});

/**
 * Create batch jobs for an entire column.
 */
export const createBatchJobs = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    columnId: v.id("worksheetColumns"),
    prompt: v.string(),
    dataSource: v.string(),
    inputColumnKey: v.string(), // Which column to use as input
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

    // Validate prompt length
    if (args.prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`);
    }

    // Validate input column key format
    if (!args.inputColumnKey.match(/^col_\d+$/)) {
      throw new Error("Invalid input column key format");
    }

    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");

    const rows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Count how many jobs we'll create and check credits upfront
    let jobsToCreate = 0;
    const columnKey = `col_${column.order}`;

    for (const row of rows) {
      const input = row.cells[args.inputColumnKey];
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

    // Now create the jobs
    const jobIds: Id<"agentJobs">[] = [];

    for (const row of rows) {
      const input = row.cells[args.inputColumnKey];
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

      if (existingJob) {
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

      // Update cell status to pending
      await ctx.runMutation(internal.workspaces.updateCellStatus, {
        rowId: row._id,
        columnKey,
        status: "pending",
      });
    }

    return { jobIds, count: jobIds.length };
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
 * Mark a job as running.
 */
export const markJobRunning = internalMutation({
  args: { jobId: v.id("agentJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "pending") return;

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

