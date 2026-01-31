import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireSessionAccess, requireMatchAccess, verifyQuerySessionAccess, verifyQueryResourceAccess } from "./lib/auth";
import { ValidationErrors, BusinessErrors } from "./lib/errors";
import { enrichedMatchValidator, matchIdValidator, matchCountsValidator, accrualDocValidator } from "./lib/validators";

// ============ HELPERS ============

/**
 * Verify the session exists and get its companyId
 */
async function getSessionCompanyId(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"reconciliationSessions">
): Promise<Id<"companies"> | null> {
  const session = await ctx.db.get(sessionId);
  if (!session) return null;
  return session.companyId;
}

/**
 * Verify a transaction belongs to the expected company
 */
async function verifyTransactionCompany(
  ctx: QueryCtx | MutationCtx,
  transactionId: Id<"transactions">,
  expectedCompanyId: Id<"companies">
): Promise<boolean> {
  const txn = await ctx.db.get(transactionId);
  if (!txn) return false;
  return txn.companyId === expectedCompanyId;
}

/**
 * Verify an accrual document belongs to the expected company
 */
async function verifyAccrualDocCompany(
  ctx: QueryCtx | MutationCtx,
  docId: Id<"accrualDocuments">,
  expectedCompanyId: Id<"companies">
): Promise<boolean> {
  const doc = await ctx.db.get(docId);
  if (!doc) return false;
  return doc.companyId === expectedCompanyId;
}

// ============ QUERIES ============

// Get all matches for a session
export const listBySession = query({
  args: {
    sessionId: v.id("reconciliationSessions"),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
  },
  returns: v.array(enrichedMatchValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify session access
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId);
    if (!allowed) return [];

    let matches;

    if (args.status) {
      matches = await ctx.db
        .query("matchedPairs")
        .withIndex("by_status", (q) =>
          q.eq("sessionId", args.sessionId).eq("status", args.status!)
        )
        .collect();
    } else {
      matches = await ctx.db
        .query("matchedPairs")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();
    }

    // Enrich with transaction/document details
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const cashTxn = await ctx.db.get(match.cashTransactionId);

        // Support both old (accrualTransactionId) and new (accrualDocumentId) schema
        let accrualTxn = null;
        let accrualDoc = null;

        if (match.accrualDocumentId) {
          accrualDoc = await ctx.db.get(match.accrualDocumentId);
        }
        if (match.accrualTransactionId) {
          accrualTxn = await ctx.db.get(match.accrualTransactionId);
        }

        return {
          ...match,
          cashTransaction: cashTxn,
          accrualTransaction: accrualTxn, // Legacy
          accrualDocument: accrualDoc, // New
        };
      })
    );

    return enrichedMatches;
  },
});

// Get a single match by ID
export const get = query({
  args: { id: v.id("matchedPairs") },
  returns: v.union(enrichedMatchValidator, v.null()),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) return null;

    // SECURITY: Verify session access
    const { allowed } = await verifyQuerySessionAccess(ctx, match.sessionId);
    if (!allowed) return null;

    const cashTxn = await ctx.db.get(match.cashTransactionId);

    // Support both old and new schema
    let accrualTxn = null;
    let accrualDoc = null;

    if (match.accrualDocumentId) {
      accrualDoc = await ctx.db.get(match.accrualDocumentId);
    }
    if (match.accrualTransactionId) {
      accrualTxn = await ctx.db.get(match.accrualTransactionId);
    }

    return {
      ...match,
      cashTransaction: cashTxn,
      accrualTransaction: accrualTxn,
      accrualDocument: accrualDoc,
    };
  },
});

// Custom return type for getCounts (slightly different from matchCountsValidator)
const matchCountsReturnValidator = v.union(
  v.object({
    total: v.number(),
    pending: v.number(),
    approved: v.number(),
    rejected: v.number(),
    highConfidence: v.number(),
    mediumConfidence: v.number(),
    lowConfidence: v.number(),
  }),
  v.null()
);

// Get match counts by status for a session
export const getCounts = query({
  args: { sessionId: v.id("reconciliationSessions") },
  returns: matchCountsReturnValidator,
  handler: async (ctx, args) => {
    // SECURITY: Verify session access
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId);
    if (!allowed) return null;

    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      total: matches.length,
      pending: matches.filter((m) => m.status === "pending").length,
      approved: matches.filter((m) => m.status === "approved").length,
      rejected: matches.filter((m) => m.status === "rejected").length,
      highConfidence: matches.filter((m) => m.confidence === "high").length,
      mediumConfidence: matches.filter((m) => m.confidence === "medium").length,
      lowConfidence: matches.filter((m) => m.confidence === "low").length,
    };
  },
});

// Shared tolerance constant (15% = 0.15 in decimal, matching frontend)
const AMOUNT_TOLERANCE_DECIMAL = 0.15;

// Default and max limits for pagination
const DEFAULT_CANDIDATES_LIMIT = 50;
const MAX_CANDIDATES_LIMIT = 100;

// Get unmatched accrual documents as candidates for manual matching
export const getCandidatesForManualMatch = query({
  args: {
    sessionId: v.id("reconciliationSessions"),
    cashTransactionId: v.id("transactions"),
    searchQuery: v.optional(v.string()),
    amountTolerance: v.optional(v.number()), // decimal, e.g., 0.15 for 15%
    limit: v.optional(v.number()), // Max candidates to return (default: 50, max: 100)
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify session access
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId);
    if (!allowed) return [];

    // Get the cash transaction to compare amounts
    const cashTxn = await ctx.db.get(args.cashTransactionId);
    if (!cashTxn) return [];

    // PERFORMANCE: Limit query results to prevent loading all documents into memory
    const resultLimit = Math.min(
      args.limit ?? DEFAULT_CANDIDATES_LIMIT,
      MAX_CANDIDATES_LIMIT
    );

    // Get unmatched accrual documents for this session with limit
    // Note: We fetch more than needed to account for filtering, but cap at reasonable amount
    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(resultLimit * 3); // Fetch 3x to account for filtering, capped at 300

    // Filter and score candidates
    const tolerance = args.amountTolerance ?? AMOUNT_TOLERANCE_DECIMAL;
    const targetAmount = Math.abs(cashTxn.amount);

    const candidates = accrualDocs
      .map((doc) => {
        const docAmount = Math.abs(doc.amount);
        const amountDiff = Math.abs(docAmount - targetAmount);

        // Handle zero-amount edge case (consistent with frontend)
        let percentDiff: number;
        if (targetAmount === 0 && docAmount === 0) {
          percentDiff = 0; // Both zero = exact match
        } else if (targetAmount === 0) {
          percentDiff = 1; // Target is zero but doc is not
        } else {
          percentDiff = amountDiff / targetAmount; // Decimal format (0.15 = 15%)
        }

        // Calculate relevance score (0-100, higher is better)
        const relevanceScore = Math.max(0, 100 - percentDiff * 100 * 2);

        return {
          ...doc,
          amountDiff,
          percentDiff,
          isWithinTolerance: percentDiff <= tolerance,
          isExactMatch: amountDiff === 0,
          relevanceScore,
        };
      })
      .filter((doc) => {
        // Filter by amount tolerance
        if (doc.percentDiff > tolerance) return false;

        // Filter by search query if provided (server-side for efficiency)
        if (args.searchQuery) {
          const query = args.searchQuery.toLowerCase();
          const matchesQuery =
            doc.docNumber?.toLowerCase().includes(query) ||
            doc.counterparty?.toLowerCase().includes(query) ||
            doc.description?.toLowerCase().includes(query);
          if (!matchesQuery) return false;
        }

        return true;
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, resultLimit); // PERFORMANCE: Enforce final result limit

    return candidates;
  },
});

// ============ MUTATIONS ============

// Create a match pair (called by matching engine)
export const create = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    cashTransactionId: v.id("transactions"),
    // NEW: Preferred way to reference accrual data
    accrualDocumentId: v.optional(v.id("accrualDocuments")),
    // DEPRECATED: Legacy field - will be removed in future version
    // Use accrualDocumentId instead
    accrualTransactionId: v.optional(v.id("transactions")),
    confidence: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    confidenceScore: v.number(),
    matchLayer: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5),
      v.literal(6)
    ),
    matchReason: v.optional(v.string()),
  },
  returns: matchIdValidator,
  handler: async (ctx, args) => {
    // Verify session ownership
    const { company } = await requireSessionAccess(ctx, args.sessionId);
    const sessionCompanyId = company._id;

    // Validate that at least one accrual reference is provided
    // MIGRATION: Prefer accrualDocumentId over accrualTransactionId
    if (!args.accrualDocumentId && !args.accrualTransactionId) {
      return ValidationErrors.missingField("accrualDocumentId (accrualTransactionId is deprecated)");
    }

    // Log deprecation warning if using legacy field
    if (args.accrualTransactionId && !args.accrualDocumentId) {
      console.warn(
        "[DEPRECATION] matches.create: accrualTransactionId is deprecated. " +
        "Migrate to accrualDocumentId for new matches."
      );
    }

    // Verify cash transaction belongs to same company
    const cashValid = await verifyTransactionCompany(
      ctx,
      args.cashTransactionId,
      sessionCompanyId
    );
    if (!cashValid) {
      return BusinessErrors.sessionMismatch("Cash transaction");
    }

    // Verify accrual document belongs to same company (if provided)
    if (args.accrualDocumentId) {
      const docValid = await verifyAccrualDocCompany(
        ctx,
        args.accrualDocumentId,
        sessionCompanyId
      );
      if (!docValid) {
        return BusinessErrors.sessionMismatch("Accrual document");
      }
    }

    // Verify accrual transaction belongs to same company (if provided - legacy)
    if (args.accrualTransactionId) {
      const txnValid = await verifyTransactionCompany(
        ctx,
        args.accrualTransactionId,
        sessionCompanyId
      );
      if (!txnValid) {
        return BusinessErrors.sessionMismatch("Accrual transaction");
      }
    }

    // Create the match - properly typed insert
    // Base fields required for all matches
    const baseData = {
      sessionId: args.sessionId,
      cashTransactionId: args.cashTransactionId,
      confidence: args.confidence,
      confidenceScore: args.confidenceScore,
      matchLayer: args.matchLayer,
      matchReason: args.matchReason,
      status: "pending" as const,
      createdAt: Date.now(),
    };

    // TYPE-SAFE: Build insert data based on which accrual reference is provided
    // Prefer accrualDocumentId when both are provided (new schema)
    let matchId: Id<"matchedPairs">;
    if (args.accrualDocumentId) {
      matchId = await ctx.db.insert("matchedPairs", {
        ...baseData,
        accrualDocumentId: args.accrualDocumentId,
      });
    } else if (args.accrualTransactionId) {
      // Legacy: only use if accrualDocumentId not provided
      matchId = await ctx.db.insert("matchedPairs", {
        ...baseData,
        accrualTransactionId: args.accrualTransactionId,
      });
    } else {
      // This should never happen due to earlier validation, but TypeScript needs it
      return ValidationErrors.missingField("accrualDocumentId or accrualTransactionId");
    }

    // Update cash transaction to reflect match
    await ctx.db.patch(args.cashTransactionId, {
      status: "matched",
      matchId,
    });

    // Update accrual side based on which reference was provided
    if (args.accrualDocumentId) {
      await ctx.db.patch(args.accrualDocumentId, {
        status: "matched",
        matchId,
      });
    }
    // Legacy: only update if accrualDocumentId not provided
    if (args.accrualTransactionId && !args.accrualDocumentId) {
      await ctx.db.patch(args.accrualTransactionId, {
        status: "matched",
        matchId,
      });
    }

    return matchId;
  },
});;

// Approve a match
export const approve = mutation({
  args: {
    id: v.id("matchedPairs"),
    // Keep for backwards compatibility, but prefer auth context
    reviewerId: v.optional(v.id("users")),
  },
  returns: matchIdValidator,
  handler: async (ctx, args) => {
    // Verify match ownership
    const { user } = await requireMatchAccess(ctx, args.id);

    await ctx.db.patch(args.id, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: user._id, // Server-derived from auth context
    });
    return args.id;
  },
});

// Reject a match (unmatch the transactions)
export const reject = mutation({
  args: {
    id: v.id("matchedPairs"),
    // Keep for backwards compatibility, but prefer auth context
    reviewerId: v.optional(v.id("users")),
  },
  returns: matchIdValidator,
  handler: async (ctx, args) => {
    // Verify match ownership
    const { user, match } = await requireMatchAccess(ctx, args.id);

    // VALIDATION: Verify all referenced entities exist before making changes
    // This prevents partial updates if references are stale
    const cashTxn = await ctx.db.get(match.cashTransactionId);
    if (!cashTxn) {
      return BusinessErrors.resourceNotFound("Cash transaction", match.cashTransactionId);
    }

    let accrualDoc = null;
    let accrualTxn = null;

    if (match.accrualDocumentId) {
      accrualDoc = await ctx.db.get(match.accrualDocumentId);
      if (!accrualDoc) {
        return BusinessErrors.resourceNotFound("Accrual document", match.accrualDocumentId);
      }
    }

    if (match.accrualTransactionId) {
      accrualTxn = await ctx.db.get(match.accrualTransactionId);
      if (!accrualTxn) {
        return BusinessErrors.resourceNotFound("Accrual transaction", match.accrualTransactionId);
      }
    }

    // All entities validated - now perform atomic update
    // Convex mutations are transactional: all succeed or all rollback

    // 1. Update match status to rejected
    await ctx.db.patch(args.id, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewedBy: user._id, // Server-derived from auth context
    });

    // 2. Reset cash transaction to pending
    await ctx.db.patch(match.cashTransactionId, {
      status: "pending",
      matchId: undefined,
    });

    // 3. Reset accrual side based on which reference was used
    if (match.accrualDocumentId) {
      await ctx.db.patch(match.accrualDocumentId, {
        status: "pending",
        matchId: undefined,
      });
    }
    if (match.accrualTransactionId) {
      await ctx.db.patch(match.accrualTransactionId, {
        status: "pending",
        matchId: undefined,
      });
    }

    return args.id;
  },
});;

// Bulk approve high-confidence matches
export const approveHighConfidence = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    // Keep for backwards compatibility, but prefer auth context
    reviewerId: v.optional(v.id("users")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Verify session ownership
    const { user } = await requireSessionAccess(ctx, args.sessionId);

    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("confidence"), "high")
        )
      )
      .collect();

    const now = Date.now();
    for (const match of matches) {
      await ctx.db.patch(match._id, {
        status: "approved",
        reviewedAt: now,
        reviewedBy: user._id, // Server-derived from auth context
      });
    }

    return matches.length;
  },
});


