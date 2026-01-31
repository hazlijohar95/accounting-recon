import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { requireCompanyAccess, requireSessionAccess, verifyQueryCompanyAccess, verifyQuerySessionAccess } from "./lib/auth";
import { filterUndefinedValues } from "./lib/validation";
import { sessionDocValidator, sessionIdValidator, sessionWithStatsValidator, matchingResultValidator } from "./lib/validators";

// ============ QUERIES ============

// Get a single session by ID
export const get = query({
  args: { id: v.id("reconciliationSessions") },
  returns: v.union(sessionDocValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    // SECURITY: Verify ownership
    const { allowed } = await verifyQuerySessionAccess(ctx, args.id);
    if (!allowed) return null;

    return session;
  },
});

// List sessions for a company
export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("processing"),
        v.literal("review"),
        v.literal("completed")
      )
    ),
  },
  returns: v.array(sessionDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId);
    if (!allowed) return [];

    let sessions;

    if (args.status) {
      sessions = await ctx.db
        .query("reconciliationSessions")
        .withIndex("by_status", (q) =>
          q.eq("companyId", args.companyId).eq("status", args.status!)
        )
        .collect();
    } else {
      sessions = await ctx.db
        .query("reconciliationSessions")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();
    }

    // Sort by creation date descending (most recent first)
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Custom validator for getWithStats return type
const sessionWithFullStatsValidator = v.union(
  v.object({
    _id: v.id("reconciliationSessions"),
    _creationTime: v.number(),
    companyId: v.id("companies"),
    name: v.string(),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("review"),
      v.literal("completed")
    ),
    progress: v.number(),
    totalCashTransactions: v.number(),
    totalAccrualTransactions: v.number(),
    matchedCount: v.number(),
    suspenseCount: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    stats: v.object({
      totalMatches: v.number(),
      pendingMatches: v.number(),
      approvedMatches: v.number(),
      rejectedMatches: v.number(),
      cashTransactions: v.number(),
      accrualTransactions: v.number(),
      unmatchedCash: v.number(),
      unmatchedAccrual: v.number(),
      suspenseCash: v.number(),
      suspenseAccrual: v.number(),
    }),
  }),
  v.null()
);

// Get session with full statistics
export const getWithStats = query({
  args: { id: v.id("reconciliationSessions") },
  returns: sessionWithFullStatsValidator,
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    // SECURITY: Verify ownership
    const { allowed } = await verifyQuerySessionAccess(ctx, args.id);
    if (!allowed) return null;

    // Get match counts
    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    // Get transaction counts by status
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    const cashTxns = transactions.filter((t) => t.type === "cash");
    const accrualTxns = transactions.filter((t) => t.type === "accrual");

    return {
      ...session,
      stats: {
        totalMatches: matches.length,
        pendingMatches: matches.filter((m) => m.status === "pending").length,
        approvedMatches: matches.filter((m) => m.status === "approved").length,
        rejectedMatches: matches.filter((m) => m.status === "rejected").length,
        cashTransactions: cashTxns.length,
        accrualTransactions: accrualTxns.length,
        unmatchedCash: cashTxns.filter((t) => t.status !== "matched").length,
        unmatchedAccrual: accrualTxns.filter((t) => t.status !== "matched")
          .length,
        suspenseCash: cashTxns.filter((t) => t.status === "suspense").length,
        suspenseAccrual: accrualTxns.filter((t) => t.status === "suspense")
          .length,
      },
    };
  },
});

// ============ MUTATIONS ============

// Create a new reconciliation session
export const create = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    // Keep for backwards compatibility, but prefer auth context
    createdBy: v.optional(v.id("users")),
  },
  returns: sessionIdValidator,
  handler: async (ctx, args) => {
    // Verify company ownership
    const { user } = await requireCompanyAccess(ctx, args.companyId);

    const sessionId = await ctx.db.insert("reconciliationSessions", {
      companyId: args.companyId,
      name: args.name,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      status: "draft",
      progress: 0,
      totalCashTransactions: 0,
      totalAccrualTransactions: 0,
      matchedCount: 0,
      suspenseCount: 0,
      createdAt: Date.now(),
      createdBy: user._id, // Server-derived from auth context
    });
    return sessionId;
  },
});

// Update session status
export const updateStatus = mutation({
  args: {
    id: v.id("reconciliationSessions"),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("review"),
      v.literal("completed")
    ),
  },
  returns: sessionIdValidator,
  handler: async (ctx, args) => {
    // Verify session ownership
    await requireSessionAccess(ctx, args.id);

    const updates: Record<string, unknown> = { status: args.status };

    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Update session progress (called during matching)
export const updateProgress = mutation({
  args: {
    id: v.id("reconciliationSessions"),
    progress: v.number(),
    matchedCount: v.optional(v.number()),
    suspenseCount: v.optional(v.number()),
  },
  returns: sessionIdValidator,
  handler: async (ctx, args) => {
    // Verify session ownership
    await requireSessionAccess(ctx, args.id);

    const { id, ...updates } = args;
    await ctx.db.patch(id, filterUndefinedValues(updates));
    return id;
  },
});

// Delete a session (and all related data)
export const remove = mutation({
  args: { id: v.id("reconciliationSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify session ownership
    await requireSessionAccess(ctx, args.id);

    // CASCADE DELETE: Clean up all related data

    // 1. Delete all matches for this session
    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    // 2. Reset session ID on transactions (don't delete them)
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    for (const txn of transactions) {
      await ctx.db.patch(txn._id, {
        sessionId: undefined,
        status: "pending",
        matchId: undefined,
      });
    }

    // 3. Reset session ID on accrualDocuments (don't delete them)
    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    for (const doc of accrualDocs) {
      await ctx.db.patch(doc._id, {
        sessionId: undefined,
        status: "pending",
        matchId: undefined,
      });
    }

    // 4. Delete all suspense items for this session
    const suspenseItems = await ctx.db
      .query("suspenseItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    for (const item of suspenseItems) {
      await ctx.db.delete(item._id);
    }

    // 5. Delete PDF export jobs for this session
    const exportJobs = await ctx.db
      .query("pdfExportJobs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    for (const job of exportJobs) {
      await ctx.db.delete(job._id);
    }

    // 6. Delete the session
    await ctx.db.delete(args.id);
    return null;
  },
});;


// ============ MATCHING ACTIONS ============

// Run the matching engine on a session
export const runMatching = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    useLLM: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Call the matching engine
    const result = await ctx.runAction(api.matching.engine.runMatchingEngine, {
      sessionId: args.sessionId,
      useLLM: args.useLLM ?? false,
    });

    return result;
  },
});

// Preview matching results without persisting
export const previewMatching = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(api.matching.engine.previewMatching, {
      sessionId: args.sessionId,
    });

    return result;
  },
});
