import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireCompanyAccess, requireSessionAccess, verifyQueryCompanyAccess, verifyQuerySessionAccess } from "./lib/auth";
import { filterUndefinedValues } from "./lib/validation";
import { sessionDocValidator, sessionIdValidator, sessionWithStatsValidator, matchingResultValidator } from "./lib/validators";

// ============ STATUS TRANSITION VALIDATION ============

/**
 * Valid status transitions for reconciliation sessions.
 * Prevents invalid state changes (e.g., completed → pending).
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["processing", "completed"],        // Can start processing or skip to completed
  processing: ["review", "draft"],            // Can finish processing or reset to draft
  review: ["completed", "processing"],        // Can complete or re-run matching
  completed: [],                              // Terminal state — no transitions allowed
};

function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): void {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed transitions from "${currentStatus}": [${(allowed || []).join(", ")}]`
    );
  }
}

// ============ QUERIES ============

// Get a single session by ID
export const get = query({
  args: {
    id: v.id("reconciliationSessions"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.union(sessionDocValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    // SECURITY: Verify ownership (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQuerySessionAccess(ctx, args.id, args.workosUserId);
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
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(sessionDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
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
      accrualDocuments: v.number(),
    }),
  }),
  v.null()
);

// Get session with full statistics
export const getWithStats = query({
  args: {
    id: v.id("reconciliationSessions"),
    workosUserId: v.optional(v.string()),
  },
  returns: sessionWithFullStatsValidator,
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    // SECURITY: Verify ownership (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQuerySessionAccess(ctx, args.id, args.workosUserId);
    if (!allowed) return null;

    // PERFORMANCE: Use .take() limits to prevent loading entire dataset into memory.
    // Sessions with 100K+ items would otherwise cause memory exhaustion.
    const STATS_QUERY_LIMIT = 10000;

    // Get match counts (capped)
    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(STATS_QUERY_LIMIT);

    // Get transaction counts by status (capped)
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(STATS_QUERY_LIMIT);

    // Get accrual documents (capped)
    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(STATS_QUERY_LIMIT);

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
        accrualTransactions: accrualTxns.length + accrualDocs.length,
        unmatchedCash: cashTxns.filter((t) => t.status !== "matched").length,
        unmatchedAccrual: accrualTxns.filter((t) => t.status !== "matched").length
          + accrualDocs.filter((d) => d.status !== "matched").length,
        suspenseCash: cashTxns.filter((t) => t.status === "suspense").length,
        suspenseAccrual: accrualTxns.filter((t) => t.status === "suspense").length
          + accrualDocs.filter((d) => d.status === "suspense").length,
        accrualDocuments: accrualDocs.length,
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
    workosUserId: v.optional(v.string()),
  },
  returns: sessionIdValidator,
  handler: async (ctx, args) => {
    // Verify company ownership
    const { user } = await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

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
    workosUserId: v.optional(v.string()),
  },
  returns: sessionIdValidator,
  handler: async (ctx, args) => {
    // Verify session ownership
    const { session } = await requireSessionAccess(ctx, args.id, args.workosUserId);

    // Validate status transition
    validateStatusTransition(session.status, args.status);

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
    workosUserId: v.optional(v.string()),
  },
  returns: sessionIdValidator,
  handler: async (ctx, args) => {
    // Verify session ownership
    await requireSessionAccess(ctx, args.id, args.workosUserId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, filterUndefinedValues(updates));
    return id;
  },
});

// Delete a session (and all related data)
export const remove = mutation({
  args: {
    id: v.id("reconciliationSessions"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify session ownership
    await requireSessionAccess(ctx, args.id, args.workosUserId);

    // CASCADE DELETE: Clean up all related data in batches to avoid timeout.
    // Convex mutations are atomic, so partial failure won't leave orphaned data.
    const BATCH_LIMIT = 500;

    // 1. Delete all matches for this session (batched)
    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(BATCH_LIMIT);

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    // 2. Reset session ID on transactions (don't delete them, batched)
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(BATCH_LIMIT);

    for (const txn of transactions) {
      await ctx.db.patch(txn._id, {
        sessionId: undefined,
        status: "pending",
        matchId: undefined,
      });
    }

    // 3. Reset session ID on accrualDocuments (don't delete them, batched)
    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(BATCH_LIMIT);

    for (const doc of accrualDocs) {
      await ctx.db.patch(doc._id, {
        sessionId: undefined,
        status: "pending",
        matchId: undefined,
      });
    }

    // 4. Delete all suspense items for this session (batched)
    const suspenseItems = await ctx.db
      .query("suspenseItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(BATCH_LIMIT);

    for (const item of suspenseItems) {
      await ctx.db.delete(item._id);
    }

    // 5. Delete PDF export jobs for this session (batched)
    const exportJobs = await ctx.db
      .query("pdfExportJobs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .take(BATCH_LIMIT);

    for (const job of exportJobs) {
      await ctx.db.delete(job._id);
    }

    // Check if there are remaining items that need cleanup
    const remainingMatches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .first();

    if (remainingMatches) {
      // Schedule another cleanup pass if there's more data than one batch
      // For now, log a warning - large sessions may need multiple delete calls
      console.warn(`[sessions.remove] Session ${args.id} has remaining data after batch delete. May need another pass.`);
    }

    // 6. Delete the session itself
    await ctx.db.delete(args.id);
    return null;
  },
});

// ============ INTERNAL MUTATIONS (called from extraction actions) ============

/**
 * Auto-create a session after extraction and link all pending transactions.
 * Called from geminiExtraction/nativePdfExtraction after successful extraction.
 *
 * Flow:
 * 1. Find or create a "draft" session for this company
 * 2. Link all unassigned transactions to the session
 * 3. Link all unassigned accrual documents to the session
 * 4. Update session counts
 */
export const autoCreateAndLink = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    sessionName: v.optional(v.string()),
  },
  returns: v.id("reconciliationSessions"),
  handler: async (ctx, { companyId, userId, sessionName }) => {
    // Check for existing active session for this company (draft, processing, or review)
    // We look for any non-completed session so that both sides of a reconciliation
    // (bank statements + invoices) always land in the same session regardless of upload order.
    const allSessions = await ctx.db
      .query("reconciliationSessions")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    // Prefer draft, then processing, then review — never reuse completed
    const existingSessions = allSessions
      .filter((s) => s.status !== "completed")
      .sort((a, b) => {
        const priority: Record<string, number> = { draft: 0, processing: 1, review: 2 };
        return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
      });

    let sessionId;

    if (existingSessions.length > 0) {
      // Reuse the most recent active session
      sessionId = existingSessions[0]._id;
    } else {
      // Create new session
      const name = sessionName || `Reconciliation ${new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;

      sessionId = await ctx.db.insert("reconciliationSessions", {
        companyId,
        name,
        status: "draft",
        progress: 0,
        totalCashTransactions: 0,
        totalAccrualTransactions: 0,
        matchedCount: 0,
        suspenseCount: 0,
        createdAt: Date.now(),
        createdBy: userId,
      });
    }

    // Link all unassigned cash transactions to this session
    const unlinkedCashTxns = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    let cashCount = 0;
    let accrualTxnCount = 0;
    for (const txn of unlinkedCashTxns) {
      if (!txn.sessionId) {
        await ctx.db.patch(txn._id, { sessionId });
        if (txn.type === "cash") cashCount++;
        if (txn.type === "accrual") accrualTxnCount++;
      }
    }

    // Link all unassigned accrual documents to this session
    const unlinkedAccrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    let accrualDocCount = 0;
    for (const doc of unlinkedAccrualDocs) {
      if (!doc.sessionId) {
        await ctx.db.patch(doc._id, { sessionId });
        accrualDocCount++;
      }
    }

    // Derive counts from actual linked data (not incremental — avoids race conditions)
    const linkedTxns = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const linkedAccrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    const newLinkedCount = cashCount + accrualTxnCount + accrualDocCount;
    const patchData: Record<string, unknown> = {
      totalCashTransactions: linkedTxns.filter((t) => t.type === "cash").length,
      totalAccrualTransactions: linkedTxns.filter((t) => t.type === "accrual").length + linkedAccrualDocs.length,
    };

    // If we linked new items to a non-draft session, reset to "draft"
    // so the matching gate (status === "draft") will trigger a fresh matching run.
    if (newLinkedCount > 0 && existingSessions.length > 0 && existingSessions[0].status !== "draft") {
      patchData.status = "draft";
    }

    await ctx.db.patch(sessionId, patchData);

    return sessionId;
  },
});

/**
 * Public mutation to re-sync unlinked documents to an existing session.
 * Called from the reconcile page when the session appears empty but
 * extracted documents exist for the company.
 */
export const resyncDocuments = mutation({
  args: {
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")),
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({
    sessionId: v.id("reconciliationSessions"),
    linkedCash: v.number(),
    linkedAccrual: v.number(),
  }),
  handler: async (ctx, { companyId, sessionId: requestedSessionId, workosUserId }) => {
    const { user } = await requireCompanyAccess(ctx, companyId, workosUserId);

    // Find or create a session
    let sessionId = requestedSessionId;
    if (!sessionId) {
      // Look for existing active session
      const sessions = await ctx.db
        .query("reconciliationSessions")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .collect();
      const active = sessions.find((s) => s.status !== "completed");
      if (active) {
        sessionId = active._id;
      } else {
        // Create a new session
        sessionId = await ctx.db.insert("reconciliationSessions", {
          companyId,
          name: `Reconciliation ${new Date().toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
          })}`,
          status: "draft",
          progress: 0,
          totalCashTransactions: 0,
          totalAccrualTransactions: 0,
          matchedCount: 0,
          suspenseCount: 0,
          createdAt: Date.now(),
          createdBy: user._id,
        });
      }
    } else {
      // Verify the requested session belongs to this company
      const session = await ctx.db.get(sessionId);
      if (!session || session.companyId !== companyId) {
        throw new Error("Session not found or does not belong to this company");
      }
    }

    // Link unassigned cash transactions
    const allTxns = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    let linkedCash = 0;
    for (const txn of allTxns) {
      if (!txn.sessionId) {
        await ctx.db.patch(txn._id, { sessionId });
        if (txn.type === "cash") linkedCash++;
      }
    }

    // Link unassigned accrual documents
    const allAccrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .collect();

    let linkedAccrual = 0;
    for (const doc of allAccrualDocs) {
      if (!doc.sessionId) {
        await ctx.db.patch(doc._id, { sessionId });
        linkedAccrual++;
      }
    }

    // Recalculate session totals from actual linked data
    const linkedTxns = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const linkedDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    await ctx.db.patch(sessionId, {
      totalCashTransactions: linkedTxns.filter((t) => t.type === "cash").length,
      totalAccrualTransactions: linkedTxns.filter((t) => t.type === "accrual").length + linkedDocs.length,
    });

    return { sessionId, linkedCash, linkedAccrual };
  },
});

/**
 * Internal status update (called from extraction actions, no auth check)
 */
export const updateStatusInternal = internalMutation({
  args: {
    id: v.id("reconciliationSessions"),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("review"),
      v.literal("completed")
    ),
  },
  returns: v.null(),
  handler: async (ctx, { id, status }) => {
    const updates: Record<string, unknown> = { status };
    if (status === "completed") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(id, updates);
    return null;
  },
});

/**
 * Get live session counts for cash and accrual items.
 * Used by extraction actions to decide whether to auto-run matching.
 */
export const getSessionCounts = internalQuery({
  args: { sessionId: v.id("reconciliationSessions") },
  returns: v.object({
    cashCount: v.number(),
    accrualCount: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("processing"),
      v.literal("review"),
      v.literal("completed")
    ),
  }),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);

    // Use indexed queries to count by type instead of loading all transactions
    const cashTxns = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .filter((q) => q.eq(q.field("type"), "cash"))
      .collect();

    const accrualTxns = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .filter((q) => q.eq(q.field("type"), "accrual"))
      .collect();

    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    return {
      cashCount: cashTxns.length,
      accrualCount: accrualTxns.length + accrualDocs.length,
      status: session?.status ?? "draft",
    };
  },
});

// ============ MATCHING ACTIONS ============

// Run the matching engine on a session
export const runMatching = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    useLLM: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify session ownership before triggering expensive matching
    // Without this check, anyone who guesses a session ID could trigger matching (DoS vector)
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) {
      throw new Error("Session not found or access denied");
    }

    // Call the matching engine (internal action - not directly callable by clients)
    const result = await ctx.runAction(internal.matching.engine.runMatchingEngine, {
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
    // SECURITY: Verify session ownership before allowing preview
    const session = await ctx.runQuery(api.sessions.get, { id: args.sessionId });
    if (!session) {
      throw new Error("Session not found or access denied");
    }

    const result = await ctx.runAction(internal.matching.engine.previewMatching, {
      sessionId: args.sessionId,
    });

    return result;
  },
});
