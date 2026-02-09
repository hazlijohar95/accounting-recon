/**
 * Agent Session Module
 *
 * CRUD and lifecycle management for agent sessions.
 * An agent session tracks the intelligent upload flow from
 * file upload through analysis to reconciliation.
 *
 * Lifecycle: active → analyzing → ready → proceeded/dismissed/expired
 *
 * @module convex/agentSession
 */

import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery, MutationCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireCompanyAccess, verifyQueryCompanyAccess } from "./lib/auth";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get an agent session by ID.
 * Real-time subscription for the agent UI.
 */
export const get = query({
  args: {
    id: v.id("agentSessions"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    const { allowed } = await verifyQueryCompanyAccess(ctx, session.companyId, args.workosUserId);
    if (!allowed) return null;

    return session;
  },
});

/**
 * Find the most recent active/ready agent session for a company.
 * Used to detect and resume an existing session.
 */
export const getActiveForCompany = query({
  args: {
    companyId: v.id("companies"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return null;

    // Check for active sessions first, then analyzing, then ready
    for (const status of ["active", "analyzing", "ready"] as const) {
      const sessions = await ctx.db
        .query("agentSessions")
        .withIndex("by_company_status", (q) =>
          q.eq("companyId", args.companyId).eq("status", status),
        )
        .order("desc")
        .take(1);

      if (sessions.length > 0) return sessions[0];
    }

    return null;
  },
});

/**
 * Get agent session linked to a reconciliation session.
 * Used on /reconcile to show agent context.
 */
export const getForReconciliation = query({
  args: {
    reconciliationSessionId: v.id("reconciliationSessions"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the reconciliation session to get companyId
    const reconSession = await ctx.db.get(args.reconciliationSessionId);
    if (!reconSession) return null;

    const { allowed } = await verifyQueryCompanyAccess(
      ctx, reconSession.companyId, args.workosUserId,
    );
    if (!allowed) return null;

    // Find agent session linked to this reconciliation session (direct index lookup)
    const agentSessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_reconciliation_session", (q) =>
        q.eq("reconciliationSessionId", args.reconciliationSessionId),
      )
      .take(1);

    return agentSessions[0] || null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Expire stale active sessions for a company (>24h old).
 * Shared helper used by both public `create` and internal `createInternal`.
 */
async function expireStaleSessionsForCompany(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  now: number,
): Promise<void> {
  const activeSessions = await ctx.db
    .query("agentSessions")
    .withIndex("by_company_status", (q) =>
      q.eq("companyId", companyId).eq("status", "active"),
    )
    .take(100);

  for (const session of activeSessions) {
    const ageHours = (now - session.createdAt) / (1000 * 60 * 60);
    if (ageHours > 24) {
      await ctx.db.patch(session._id, { status: "expired", updatedAt: now });
    }
  }
}

/**
 * Create a new agent session when the user starts uploading.
 * Checks for existing active sessions and warns (but doesn't block).
 */
export const create = mutation({
  args: {
    companyId: v.id("companies"),
    documentIds: v.array(v.id("documents")),
    workosUserId: v.optional(v.string()),
  },
  returns: v.id("agentSessions"),
  handler: async (ctx, args) => {
    const { user } = await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

    const now = Date.now();

    // Expire any stale active sessions for this company (>24h old)
    await expireStaleSessionsForCompany(ctx, args.companyId, now);

    // Create the new session
    const sessionId = await ctx.db.insert("agentSessions", {
      companyId: args.companyId,
      userId: user._id,
      status: "active",
      currentStep: "upload",
      documentIds: args.documentIds,
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

/**
 * Add document IDs to an existing agent session.
 * Called as each file is uploaded and gets a document record.
 * If the session has already completed analysis (status: "ready"),
 * resets it to "active" to allow re-analysis with the new documents.
 */
export const addDocuments = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    documentIds: v.array(v.id("documents")),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Agent session not found");

    await requireCompanyAccess(ctx, session.companyId, args.workosUserId);

    // Merge new document IDs (deduplicate)
    const existingSet = new Set(session.documentIds.map((id) => id.toString()));
    const newIds = args.documentIds.filter((id) => !existingSet.has(id.toString()));

    if (newIds.length > 0) {
      const update: Record<string, unknown> = {
        documentIds: [...session.documentIds, ...newIds],
        updatedAt: Date.now(),
      };

      // If analysis already completed, reset to active so we can re-analyze
      // with the expanded document set
      if (session.status === "ready") {
        update.status = "active";
        update.currentStep = "upload";
      }

      await ctx.db.patch(args.sessionId, update);
    }

    return null;
  },
});

/**
 * Remove document IDs from an existing agent session.
 * Called when the user decides to remove a document (e.g., after extraction failure).
 */
export const removeDocuments = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    documentIds: v.array(v.id("documents")),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Agent session not found");

    await requireCompanyAccess(ctx, session.companyId, args.workosUserId);

    const removeSet = new Set(args.documentIds.map((id) => id.toString()));
    const remaining = session.documentIds.filter((id) => !removeSet.has(id.toString()));

    await ctx.db.patch(args.sessionId, {
      documentIds: remaining,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Advance the agent session to the next step.
 */
export const updateStep = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    step: v.union(
      v.literal("upload"),
      v.literal("analyze"),
      v.literal("validate"),
      v.literal("proceed"),
    ),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Agent session not found");

    await requireCompanyAccess(ctx, session.companyId, args.workosUserId);

    await ctx.db.patch(args.sessionId, {
      currentStep: args.step,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Dismiss the agent session.
 */
export const dismiss = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Agent session not found");

    await requireCompanyAccess(ctx, session.companyId, args.workosUserId);

    await ctx.db.patch(args.sessionId, {
      status: "dismissed",
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Respond to an agent finding (acknowledge, resolve, or dismiss it).
 * Called from the agent UI when the user interacts with a finding card.
 */
export const respondToFinding = mutation({
  args: {
    findingId: v.id("agentFindings"),
    status: v.union(
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    userResponse: v.optional(v.string()),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const finding = await ctx.db.get(args.findingId);
    if (!finding) throw new Error("Finding not found");

    // Auth check via the finding's company
    await requireCompanyAccess(ctx, finding.companyId, args.workosUserId);

    // Update the finding
    const update: {
      status: typeof args.status;
      userResponse?: string;
      resolvedAt?: number;
    } = { status: args.status };
    if (args.userResponse !== undefined) update.userResponse = args.userResponse;
    if (args.status === "resolved" || args.status === "dismissed") {
      update.resolvedAt = Date.now();
    }

    await ctx.db.patch(args.findingId, update);
    return null;
  },
});

/**
 * Proceed to reconciliation — creates a reconciliation session from the agent session.
 *
 * This is an action because it needs to:
 * 1. Read the agent session
 * 2. Create a reconciliation session (via existing logic)
 * 3. Link the agent session to the reconciliation session
 * 4. Run initial matching
 */
export const proceed = action({
  args: {
    sessionId: v.id("agentSessions"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({
    reconciliationSessionId: v.id("reconciliationSessions"),
  }),
  handler: async (ctx, args) => {
    // Get the agent session
    const session = await ctx.runQuery(api.agentSession.get, {
      id: args.sessionId,
      workosUserId: args.workosUserId,
    });

    if (!session) throw new Error("Agent session not found");
    if (session.status !== "ready") {
      throw new Error(`Cannot proceed: session status is "${session.status}", expected "ready"`);
    }

    // Check for unresolved critical findings
    const findings = await ctx.runQuery(api.agentEngine.getFindingsForSession, {
      agentSessionId: args.sessionId,
      workosUserId: args.workosUserId,
    });

    const unresolvedCritical = findings.filter(
      (f: { severity: string; status: string }) =>
        f.severity === "critical" && f.status === "open",
    );
    if (unresolvedCritical.length > 0) {
      throw new Error(
        `Cannot proceed: ${unresolvedCritical.length} critical finding(s) must be resolved first`,
      );
    }

    // Use the existing upload analysis approval flow if there's a linked uploadAnalysisId
    if (session.uploadAnalysisId) {
      const result = await ctx.runAction(api.uploadAnalysis.approveAndProceed, {
        analysisId: session.uploadAnalysisId,
        workosUserId: args.workosUserId,
      });

      // Link the agent session to the new reconciliation session
      await ctx.runMutation(internal.agentSession.linkReconciliationSession, {
        sessionId: args.sessionId,
        reconciliationSessionId: result.sessionId,
      });

      return { reconciliationSessionId: result.sessionId };
    }

    // Fallback: create reconciliation session directly
    // (For cases where the agent session was created without an upload analysis)
    throw new Error("Cannot proceed without linked upload analysis — use the standard upload flow");
  },
});

/**
 * Trigger a re-analysis of the agent session.
 *
 * Called when the user adds more files after analysis completed.
 * Resets the session to "active" (if needed), then schedules
 * runAgentAnalysisInternal to re-run the full pipeline.
 *
 * Safe to call multiple times — tryStartAnalysis uses CAS to
 * prevent duplicate concurrent analyses.
 */
export const triggerReanalysis = action({
  args: {
    sessionId: v.id("agentSessions"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the session to verify it exists and check auth
    const session = await ctx.runQuery(api.agentSession.get, {
      id: args.sessionId,
      workosUserId: args.workosUserId,
    });

    if (!session) throw new Error("Agent session not found");

    // If the session is already in "active" state (reset by addDocuments),
    // schedule the analysis. If it's "ready" but addDocuments hasn't been
    // called yet, reset it first.
    if (session.status === "ready") {
      await ctx.runMutation(internal.agentSession.resetForReanalysis, {
        sessionId: args.sessionId,
      });
    }

    // Schedule the analysis pipeline (CAS in tryStartAnalysis prevents duplicates)
    await ctx.scheduler.runAfter(0, internal.agentEngine.runAgentAnalysisInternal, {
      agentSessionId: args.sessionId,
    });

    return null;
  },
});

// ============================================================================
// Internal Mutations (called from actions, no auth check)
// ============================================================================

/**
 * Reset a session to "active" for re-analysis.
 * Called by triggerReanalysis when the session is still in "ready" state.
 */
export const resetForReanalysis = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;

    // Only reset from "ready" — don't interrupt "analyzing" or "proceeded"
    if (session.status !== "ready") return null;

    await ctx.db.patch(sessionId, {
      status: "active",
      currentStep: "upload",
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Create an agent session from the backend (no auth check).
 * Called by uploadAnalysis.runAnalysis after AI classification completes.
 * Idempotent: if a session already exists for this uploadAnalysisId, returns it.
 */
export const createInternal = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    documentIds: v.array(v.id("documents")),
    uploadAnalysisId: v.optional(v.id("uploadAnalyses")),
  },
  returns: v.id("agentSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Idempotency: if a session already exists for this upload analysis, return it
    if (args.uploadAnalysisId) {
      const existing = await ctx.db
        .query("agentSessions")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .filter((q) => q.eq(q.field("uploadAnalysisId"), args.uploadAnalysisId))
        .first();
      if (existing) return existing._id;
    }

    // Expire any stale active sessions for this company (>24h old)
    await expireStaleSessionsForCompany(ctx, args.companyId, now);

    // Create the new session
    const sessionId = await ctx.db.insert("agentSessions", {
      companyId: args.companyId,
      userId: args.userId,
      status: "active",
      currentStep: "upload",
      documentIds: args.documentIds,
      uploadAnalysisId: args.uploadAnalysisId,
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

/**
 * Update session status. Used by the agent engine during analysis.
 */
export const updateStatus = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    status: v.union(
      v.literal("active"),
      v.literal("analyzing"),
      v.literal("ready"),
      v.literal("proceeded"),
      v.literal("dismissed"),
      v.literal("expired"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, status }) => {
    await ctx.db.patch(sessionId, { status, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Update session step. Used by the agent engine.
 */
export const updateStepInternal = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    step: v.union(
      v.literal("upload"),
      v.literal("analyze"),
      v.literal("validate"),
      v.literal("proceed"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, step }) => {
    await ctx.db.patch(sessionId, { currentStep: step, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Store the agent summary and mark session as ready.
 */
export const completeAnalysis = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    summary: v.string(),
    tokenUsage: v.optional(v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, summary, tokenUsage }) => {
    const patch: Record<string, unknown> = {
      status: "ready",
      currentStep: "validate",
      summary,
      updatedAt: Date.now(),
    };
    if (tokenUsage) {
      patch.tokenUsage = tokenUsage;
    }
    await ctx.db.patch(sessionId, patch);
    return null;
  },
});

/**
 * Link a reconciliation session after the user proceeds.
 * Idempotent: if already linked to the same reconciliation session, this is a no-op.
 * Rejects if already linked to a DIFFERENT reconciliation session (race condition guard).
 */
export const linkReconciliationSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    reconciliationSessionId: v.id("reconciliationSessions"),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, reconciliationSessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Agent session not found");

    // Idempotency: already linked to the same reconciliation session
    if (session.reconciliationSessionId?.toString() === reconciliationSessionId.toString()) {
      return null;
    }

    // Race condition guard: reject if already linked to a different session
    if (session.reconciliationSessionId) {
      throw new Error(
        "Agent session already linked to a different reconciliation session",
      );
    }

    await ctx.db.patch(sessionId, {
      reconciliationSessionId,
      status: "proceeded",
      currentStep: "proceed",
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Store multi-company lanes detected by the agent engine.
 */
export const setCompanyLanes = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    companyLanes: v.array(v.object({
      detectedCompanyName: v.string(),
      companyId: v.optional(v.id("companies")),
      documentIds: v.array(v.id("documents")),
      isSelected: v.boolean(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, companyLanes }) => {
    await ctx.db.patch(sessionId, { companyLanes, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Toggle lane selection by the user.
 * Called from the multi-company lane UI when a user checks/unchecks a lane.
 */
export const toggleLaneSelection = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    laneIndex: v.number(),
    isSelected: v.boolean(),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Agent session not found");

    await requireCompanyAccess(ctx, session.companyId, args.workosUserId);

    if (!session.companyLanes || args.laneIndex >= session.companyLanes.length) {
      throw new Error(`Invalid lane index: ${args.laneIndex}`);
    }

    // Clone lanes and update the target lane's selection
    const updatedLanes = session.companyLanes.map((lane, idx) =>
      idx === args.laneIndex ? { ...lane, isSelected: args.isSelected } : lane,
    );

    await ctx.db.patch(args.sessionId, {
      companyLanes: updatedLanes,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Set selection state for all lanes in a single mutation.
 * Avoids N concurrent mutations when the user clicks "Select All" / "Selected Company Only".
 *
 * @param mode - "all" selects every lane; "primary_only" selects only lanes with a companyId match
 */
export const setAllLanesSelection = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    mode: v.union(v.literal("all"), v.literal("primary_only")),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Agent session not found");

    await requireCompanyAccess(ctx, session.companyId, args.workosUserId);

    if (!session.companyLanes || session.companyLanes.length === 0) {
      return null;
    }

    const updatedLanes = session.companyLanes.map((lane) => ({
      ...lane,
      isSelected: args.mode === "all" ? true : !!lane.companyId,
    }));

    await ctx.db.patch(args.sessionId, {
      companyLanes: updatedLanes,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// Token Usage Queries
// ============================================================================

/**
 * Get aggregated token usage statistics for a company.
 *
 * Returns:
 * - Total tokens used (prompt + completion)
 * - Session count (with and without token usage)
 * - Per-session breakdown (most recent first)
 * - Estimated cost (using Claude Sonnet 4 pricing: $3/M input, $15/M output)
 *
 * Note: Only returns sessions that have tokenUsage data (i.e., sessions
 * where the LLM layer ran). Sessions that completed with rules-only
 * analysis have no token data and are excluded from token stats but
 * included in the total session count.
 */
export const getTokenUsageStats = query({
  args: {
    companyId: v.id("companies"),
    workosUserId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return null;

    const pageSize = args.limit ?? 50;

    // Fetch all sessions for this company (most recent first)
    const allSessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(pageSize);

    // Aggregate stats
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let sessionsWithTokens = 0;
    const sessionBreakdown: Array<{
      sessionId: Id<"agentSessions">;
      status: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      documentCount: number;
      createdAt: number;
    }> = [];

    for (const session of allSessions) {
      if (session.tokenUsage && session.tokenUsage.totalTokens > 0) {
        totalPromptTokens += session.tokenUsage.promptTokens;
        totalCompletionTokens += session.tokenUsage.completionTokens;
        totalTokens += session.tokenUsage.totalTokens;
        sessionsWithTokens++;

        sessionBreakdown.push({
          sessionId: session._id,
          status: session.status,
          promptTokens: session.tokenUsage.promptTokens,
          completionTokens: session.tokenUsage.completionTokens,
          totalTokens: session.tokenUsage.totalTokens,
          documentCount: session.documentIds.length,
          createdAt: session.createdAt,
        });
      }
    }

    // Estimated cost: Claude Sonnet 4 pricing ($3/M input, $15/M output)
    const estimatedCostUsd =
      (totalPromptTokens / 1_000_000) * 3 +
      (totalCompletionTokens / 1_000_000) * 15;

    const avgTokensPerSession =
      sessionsWithTokens > 0 ? Math.round(totalTokens / sessionsWithTokens) : 0;

    return {
      totalSessions: allSessions.length,
      sessionsWithTokens,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      avgTokensPerSession,
      estimatedCostUsd: Math.round(estimatedCostUsd * 10000) / 10000, // 4 decimal places
      sessionBreakdown,
    };
  },
});

// ============================================================================
// Internal Queries
// ============================================================================

/**
 * Get session without auth check (for use by actions/internal functions).
 */
export const getInternal = internalQuery({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

// ============================================================================
// Cron: Global Session Expiry
// ============================================================================

const STALE_STATUSES = ["active", "analyzing", "ready"] as const;
const EXPIRY_HOURS = 24;
const MAX_EXPIRE_PER_RUN = 100; // Safety cap per cron tick

/**
 * Global agent session expiry cron handler.
 *
 * Sweeps all sessions in stale statuses (active, analyzing, ready)
 * and expires any older than 24h. This covers cases where:
 * - User abandons the upload page (active sessions left behind)
 * - Analysis hangs or fails silently (stuck in "analyzing")
 * - User reviews findings but never proceeds or dismisses (stuck in "ready")
 *
 * Runs every 15 minutes. Uses the by_status index for efficient queries.
 *
 * Note: The by_status index filters by status only, so we fetch up to
 * MAX_EXPIRE_PER_RUN sessions per status and filter by updatedAt in JS.
 * If there are many non-stale sessions in a status (e.g. hundreds of recent
 * "active" sessions), the take() limit may prevent reaching older stale ones.
 * In practice this is not an issue — agent sessions are short-lived and
 * the 15-minute cron interval ensures eventual cleanup. A compound index
 * on ["status", "updatedAt"] would allow index-level range filtering but
 * adds schema complexity for minimal gain at current scale.
 */
export const expireStaleSessionsGlobal = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - EXPIRY_HOURS * 60 * 60 * 1000;
    let expiredCount = 0;

    for (const status of STALE_STATUSES) {
      if (expiredCount >= MAX_EXPIRE_PER_RUN) break;

      const sessions = await ctx.db
        .query("agentSessions")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(MAX_EXPIRE_PER_RUN - expiredCount);

      for (const session of sessions) {
        // Use updatedAt for expiry check — a recently-interacted session
        // should not be expired even if created >24h ago
        const lastActivity = session.updatedAt || session.createdAt;
        if (lastActivity < cutoff) {
          await ctx.db.patch(session._id, {
            status: "expired",
            updatedAt: now,
          });
          expiredCount++;
        }
      }
    }

    if (expiredCount > 0) {
      console.log(`[AgentSession] Expired ${expiredCount} stale session(s)`);
    }

    return expiredCount;
  },
});
