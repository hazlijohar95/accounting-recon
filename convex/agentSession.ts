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
    if (!session) return null;

    await requireCompanyAccess(ctx, session.companyId, args.workosUserId);

    // Merge new document IDs (deduplicate)
    const existingSet = new Set(session.documentIds.map((id) => id.toString()));
    const newIds = args.documentIds.filter((id) => !existingSet.has(id.toString()));

    if (newIds.length > 0) {
      await ctx.db.patch(args.sessionId, {
        documentIds: [...session.documentIds, ...newIds],
        updatedAt: Date.now(),
      });
    }

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
    if (!session) return null;

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
    if (!session) return null;

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

// ============================================================================
// Internal Mutations (called from actions, no auth check)
// ============================================================================

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
  },
  returns: v.null(),
  handler: async (ctx, { sessionId, summary }) => {
    await ctx.db.patch(sessionId, {
      status: "ready",
      currentStep: "validate",
      summary,
      updatedAt: Date.now(),
    });
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
