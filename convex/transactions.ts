import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCompanyAccess, requireTransactionAccess, requireSessionAccess, verifyQueryCompanyAccess, verifyQuerySessionAccess, verifyQueryResourceAccess } from "./lib/auth";
import { validateAmount, validateBulkSize, validateDate } from "./lib/validation";
import { MAX_BULK_IMPORT_SIZE } from "./lib/constants";
import { BusinessErrors, ResourceErrors, ValidationErrors } from "./lib/errors";
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
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(transactionDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
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
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(transactionDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify session access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId, args.workosUserId);
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
  args: {
    id: v.id("transactions"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.union(transactionDocValidator, v.null()),
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.id);
    if (!transaction) return null;

    // SECURITY: Verify ownership (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryResourceAccess(ctx, transaction.companyId, args.workosUserId);
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
    workosUserId: v.optional(v.string()),
  },
  returns: transactionIdValidator,
  handler: async (ctx, args) => {
    // Verify company ownership
    await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

    validateDate(args.date, "date");
    validateAmount(args.amount, "amount");

    // If sessionId provided, verify session belongs to same company
    if (args.sessionId) {
      const { company } = await requireSessionAccess(ctx, args.sessionId, args.workosUserId);
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
    workosUserId: v.optional(v.string()),
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
      await requireCompanyAccess(ctx, companyId, args.workosUserId);
    }

    // Verify ownership of all sessions involved
    const sessionIds = new Set(
      args.transactions
        .map((t) => t.sessionId)
        .filter((id): id is NonNullable<typeof id> => id !== undefined)
    );
    for (const sessionId of sessionIds) {
      await requireSessionAccess(ctx, sessionId, args.workosUserId);
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
    workosUserId: v.optional(v.string()),
  },
  returns: transactionIdValidator,
  handler: async (ctx, args) => {
    // Verify transaction ownership
    await requireTransactionAccess(ctx, args.id, args.workosUserId);

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
  args: {
    id: v.id("transactions"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify transaction ownership
    await requireTransactionAccess(ctx, args.id, args.workosUserId);

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
});

// ============ INLINE EDITING (Phase 3) ============

/**
 * Update a single transaction (inline editing)
 * Tracks which fields were edited by the user
 */
export const update = mutation({
  args: {
    id: v.id("transactions"),
    date: v.optional(v.string()),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    reference: v.optional(v.string()),
    category: v.optional(v.string()),
    workosUserId: v.optional(v.string()),
  },
  returns: transactionIdValidator,
  handler: async (ctx, args) => {
    // Verify transaction ownership
    const { user } = await requireTransactionAccess(ctx, args.id, args.workosUserId);

    // Get current transaction
    const transaction = await ctx.db.get(args.id);
    if (!transaction) {
      return ResourceErrors.notFound("Transaction");
    }

    // Validate updated fields
    if (args.date !== undefined) {
      validateDate(args.date, "date");
    }
    if (args.amount !== undefined) {
      validateAmount(args.amount, "amount");
    }

    // Track which fields were edited
    const editedFields: string[] = [...(transaction.editedFields || [])];
    if (args.date !== undefined && args.date !== transaction.date) {
      if (!editedFields.includes("date")) editedFields.push("date");
    }
    if (args.description !== undefined && args.description !== transaction.description) {
      if (!editedFields.includes("description")) editedFields.push("description");
    }
    if (args.amount !== undefined && args.amount !== transaction.amount) {
      if (!editedFields.includes("amount")) editedFields.push("amount");
    }
    if (args.reference !== undefined && args.reference !== transaction.reference) {
      if (!editedFields.includes("reference")) editedFields.push("reference");
    }
    if (args.category !== undefined && args.category !== transaction.category) {
      if (!editedFields.includes("category")) editedFields.push("category");
    }

    // Build update object (only include changed fields)
    const updates: Record<string, unknown> = {
      editedFields,
      editedAt: Date.now(),
      editedBy: user._id,
    };

    if (args.date !== undefined) updates.date = args.date;
    if (args.description !== undefined) updates.description = args.description;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.reference !== undefined) updates.reference = args.reference;
    if (args.category !== undefined) updates.category = args.category;

    // Update aggregates if amount changed
    const oldDoc = transaction;
    await ctx.db.patch(args.id, updates);

    if (args.amount !== undefined && args.amount !== oldDoc.amount) {
      const newDoc = await ctx.db.get(args.id);
      if (newDoc) {
        await transactionSums.replace(ctx, oldDoc, newDoc);
      }
    }

    return args.id;
  },
});

// ============ BULK ACTIONS (Phase 3) ============

/**
 * Bulk update transaction status
 * Used for bulk approve/reject actions
 */
export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("transactions")),
    status: v.union(
      v.literal("pending"),
      v.literal("matched"),
      v.literal("suspense")
    ),
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({
    updated: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    // SECURITY: Limit bulk operations - throw to match return type
    if (args.ids.length > MAX_BULK_IMPORT_SIZE) {
      throw ValidationErrors.bulkLimitExceeded(MAX_BULK_IMPORT_SIZE, args.ids.length);
    }

    let updated = 0;
    let failed = 0;

    for (const id of args.ids) {
      try {
        // Verify ownership for each transaction
        await requireTransactionAccess(ctx, id, args.workosUserId);

        const oldDoc = await ctx.db.get(id);
        if (!oldDoc) {
          console.error(`[BulkUpdateStatus] Transaction ${id} not found`);
          failed++;
          continue;
        }

        await ctx.db.patch(id, { status: args.status });

        // Update aggregates if status changed
        if (oldDoc.status !== args.status) {
          const newDoc = await ctx.db.get(id);
          if (newDoc) {
            await transactionCounts.replace(ctx, oldDoc, newDoc);
          }
        }

        updated++;
      } catch (error) {
        // SECURITY: Log failures for audit trail
        console.error(`[BulkUpdateStatus] Failed for ${id}:`, error);
        failed++;
      }
    }

    return { updated, failed };
  },
});

/**
 * Bulk delete transactions
 */
export const bulkDelete = mutation({
  args: {
    ids: v.array(v.id("transactions")),
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({
    deleted: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    // SECURITY: Limit bulk operations - throw to match return type
    if (args.ids.length > MAX_BULK_IMPORT_SIZE) {
      throw ValidationErrors.bulkLimitExceeded(MAX_BULK_IMPORT_SIZE, args.ids.length);
    }

    let deleted = 0;
    let failed = 0;

    for (const id of args.ids) {
      try {
        // Verify ownership for each transaction
        await requireTransactionAccess(ctx, id, args.workosUserId);

        const oldDoc = await ctx.db.get(id);
        await ctx.db.delete(id);

        // Remove from aggregates
        if (oldDoc) {
          await transactionCounts.delete(ctx, oldDoc);
          await transactionSums.delete(ctx, oldDoc);
        }

        deleted++;
      } catch (error) {
        // SECURITY: Log failures for audit trail
        console.error(`[BulkDelete] Failed for ${id}:`, error);
        failed++;
      }
    }

    return { deleted, failed };
  },
});

/**
 * Bulk update category
 */
export const bulkUpdateCategory = mutation({
  args: {
    ids: v.array(v.id("transactions")),
    category: v.string(),
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({
    updated: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    // SECURITY: Limit bulk operations - throw to match return type
    if (args.ids.length > MAX_BULK_IMPORT_SIZE) {
      throw ValidationErrors.bulkLimitExceeded(MAX_BULK_IMPORT_SIZE, args.ids.length);
    }

    let updated = 0;
    let failed = 0;

    for (const id of args.ids) {
      try {
        await requireTransactionAccess(ctx, id, args.workosUserId);
        await ctx.db.patch(id, { category: args.category });
        updated++;
      } catch (error) {
        // SECURITY: Log failures for audit trail
        console.error(`[BulkUpdateCategory] Failed for ${id}:`, error);
        failed++;
      }
    }

    return { updated, failed };
  },
});
