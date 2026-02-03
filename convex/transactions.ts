import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCompanyAccess, requireTransactionAccess, requireSessionAccess, verifyQueryCompanyAccess, verifyQuerySessionAccess, verifyQueryResourceAccess } from "./lib/auth";
import { validateAmount, validateBulkSize, validateDate } from "./lib/validation";
import { MAX_BULK_IMPORT_SIZE } from "./lib/constants";
import { BusinessErrors, ValidationErrors } from "./lib/errors";
import { transactionDocValidator, transactionIdValidator } from "./lib/validators";
import { transactionCounts, transactionSums } from "./lib/aggregates";

// ============ QUERIES ============

// Get transactions for a company
export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    type: v.optional(v.union(v.literal("cash"), v.literal("accrual"))),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("matched"), v.literal("suspense"))
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(transactionDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId);
    if (!allowed) return [];

    // Build query based on filters
    let results;
    if (args.type && args.status) {
      results = await ctx.db
        .query("transactions")
        .withIndex("by_company_type_status", (idx) =>
          idx
            .eq("companyId", args.companyId)
            .eq("type", args.type!)
            .eq("status", args.status!)
        )
        .collect();
    } else if (args.type) {
      results = await ctx.db
        .query("transactions")
        .withIndex("by_type", (idx) =>
          idx.eq("companyId", args.companyId).eq("type", args.type!)
        )
        .collect();
    } else if (args.status) {
      results = await ctx.db
        .query("transactions")
        .withIndex("by_status", (idx) =>
          idx.eq("companyId", args.companyId).eq("status", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("transactions")
        .withIndex("by_company", (idx) => idx.eq("companyId", args.companyId))
        .collect();
    }

    // Sort by date descending
    results.sort((a, b) => b.date.localeCompare(a.date));

    // Apply limit
    if (args.limit) {
      results = results.slice(0, args.limit);
    }

    return results;
  },
});

// Get transactions for a session
export const listBySession = query({
  args: {
    sessionId: v.id("reconciliationSessions"),
    type: v.optional(v.union(v.literal("cash"), v.literal("accrual"))),
  },
  returns: v.array(transactionDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify session access
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId);
    if (!allowed) return [];

    // Use compound index when filtering by type
    if (args.type) {
      return await ctx.db
        .query("transactions")
        .withIndex("by_session_type", (q) =>
          q.eq("sessionId", args.sessionId).eq("type", args.type!)
        )
        .collect();
    }

    return await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Get a single transaction
export const get = query({
  args: { id: v.id("transactions") },
  returns: v.union(transactionDocValidator, v.null()),
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.id);
    if (!transaction) return null;

    // SECURITY: Verify ownership
    const { allowed } = await verifyQueryResourceAccess(ctx, transaction.companyId);
    if (!allowed) return null;

    return transaction;
  },
});

// ============ MUTATIONS ============

// Add a single transaction
export const create = mutation({
  args: {
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")),
    date: v.string(),
    description: v.string(),
    reference: v.optional(v.string()),
    amount: v.number(),
    type: v.union(v.literal("cash"), v.literal("accrual")),
    category: v.optional(v.string()),
    sourceDocumentId: v.optional(v.id("documents")),
  },
  returns: transactionIdValidator,
  handler: async (ctx, args) => {
    // Verify company ownership
    await requireCompanyAccess(ctx, args.companyId);

    validateDate(args.date, "date");
    validateAmount(args.amount, "amount");

    // If sessionId provided, verify session belongs to same company
    if (args.sessionId) {
      const { company } = await requireSessionAccess(ctx, args.sessionId);
      if (company._id !== args.companyId) {
        return BusinessErrors.sessionMismatch("Transaction");
      }
    }

    const transactionId = await ctx.db.insert("transactions", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    // Update aggregates for O(log n) counts and sums
    const doc = await ctx.db.get(transactionId);
    if (doc) {
      await transactionCounts.insert(ctx, doc);
      await transactionSums.insert(ctx, doc);
    }

    return transactionId;
  },
});;

// Bulk add transactions (for imports)
export const createBulk = mutation({
  args: {
    transactions: v.array(
      v.object({
        companyId: v.id("companies"),
        sessionId: v.optional(v.id("reconciliationSessions")),
        date: v.string(),
        description: v.string(),
        reference: v.optional(v.string()),
        amount: v.number(),
        type: v.union(v.literal("cash"), v.literal("accrual")),
        category: v.optional(v.string()),
      })
    ),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    if (args.transactions.length === 0) {
      return [];
    }

    // SECURITY: Prevent DoS via excessive bulk imports
    validateBulkSize(args.transactions.length);

    // Verify ownership of all companies involved
    const companyIds = new Set(args.transactions.map((t) => t.companyId));
    for (const companyId of companyIds) {
      await requireCompanyAccess(ctx, companyId);
    }

    // Verify ownership of all sessions involved
    const sessionIds = new Set(
      args.transactions
        .map((t) => t.sessionId)
        .filter((id): id is NonNullable<typeof id> => id !== undefined)
    );
    for (const sessionId of sessionIds) {
      await requireSessionAccess(ctx, sessionId);
    }

    const now = Date.now();
    const ids: string[] = [];

    for (const txn of args.transactions) {
      validateDate(txn.date, "date");
      validateAmount(txn.amount, "amount");
      const id = await ctx.db.insert("transactions", {
        ...txn,
        status: "pending",
        createdAt: now,
      });
      ids.push(id);

      // Update aggregates for O(log n) counts and sums
      const doc = await ctx.db.get(id);
      if (doc) {
        await transactionCounts.insert(ctx, doc);
        await transactionSums.insert(ctx, doc);
      }
    }

    return ids;
  },
});;

// Update transaction status (when matched)
export const updateStatus = mutation({
  args: {
    id: v.id("transactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("matched"),
      v.literal("suspense")
    ),
    matchId: v.optional(v.id("matchedPairs")),
  },
  returns: transactionIdValidator,
  handler: async (ctx, args) => {
    // Verify transaction ownership
    await requireTransactionAccess(ctx, args.id);

    // Get old document for aggregate update
    const oldDoc = await ctx.db.get(args.id);
    if (!oldDoc) return args.id;

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    // Update aggregates if status changed (sortKey includes status)
    if (oldDoc.status !== args.status) {
      const newDoc = await ctx.db.get(id);
      if (newDoc) {
        await transactionCounts.replace(ctx, oldDoc, newDoc);
        // transactionSums sortKey doesn't include status, so no need to update
      }
    }

    return id;
  },
});;

// Delete a transaction
export const remove = mutation({
  args: { id: v.id("transactions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify transaction ownership
    await requireTransactionAccess(ctx, args.id);

    // Get doc before delete for aggregate update
    const oldDoc = await ctx.db.get(args.id);

    await ctx.db.delete(args.id);

    // Remove from aggregates
    if (oldDoc) {
      await transactionCounts.delete(ctx, oldDoc);
      await transactionSums.delete(ctx, oldDoc);
    }

    return null;
  },
});;
