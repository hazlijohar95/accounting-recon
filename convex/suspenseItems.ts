import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  validateAmount,
  validateDate,
  validateNonEmpty,
} from "./lib/validation";
import { requireCompanyAccess, requireSessionAccess, requireSuspenseItemAccess, verifyQueryCompanyAccess, verifyQuerySessionAccess, verifyQueryResourceAccess } from "./lib/auth";
import { validateBulkSize } from "./lib/validation";
import { BusinessErrors, ValidationErrors } from "./lib/errors";
import { suspenseItemDocValidator, suspenseItemIdValidator, suspenseCountsValidator } from "./lib/validators";

// ============ QUERIES ============

// Get a single suspense item by ID
export const get = query({
  args: { id: v.id("suspenseItems") },
  returns: v.union(suspenseItemDocValidator, v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    // SECURITY: Verify company access
    const { allowed } = await verifyQueryResourceAccess(ctx, item.companyId);
    if (!allowed) return null;

    return item;
  },
});

// List all suspense items for a company
export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    status: v.optional(
      v.union(v.literal("open"), v.literal("queried"), v.literal("resolved"))
    ),
  },
  returns: v.array(suspenseItemDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId);
    if (!allowed) return [];

    if (args.status) {
      return await ctx.db
        .query("suspenseItems")
        .withIndex("by_status", (q) =>
          q.eq("companyId", args.companyId).eq("status", args.status!)
        )
        .collect();
    }
    return await ctx.db
      .query("suspenseItems")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// List suspense items for a session
export const listBySession = query({
  args: {
    sessionId: v.id("reconciliationSessions"),
    status: v.optional(
      v.union(v.literal("open"), v.literal("queried"), v.literal("resolved"))
    ),
  },
  returns: v.array(suspenseItemDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify session access
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId);
    if (!allowed) return [];

    // Use compound index when filtering by status
    if (args.status) {
      return await ctx.db
        .query("suspenseItems")
        .withIndex("by_session_status", (q) =>
          q.eq("sessionId", args.sessionId).eq("status", args.status!)
        )
        .collect();
    }

    return await ctx.db
      .query("suspenseItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Custom return type for getCounts (includes totalAmount)
const suspenseCountsReturnValidator = v.union(
  v.object({
    total: v.number(),
    open: v.number(),
    queried: v.number(),
    resolved: v.number(),
    totalAmount: v.number(),
  }),
  v.null()
);

// Get counts by status for a session
export const getCounts = query({
  args: { sessionId: v.id("reconciliationSessions") },
  returns: suspenseCountsReturnValidator,
  handler: async (ctx, args) => {
    // SECURITY: Verify session access
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId);
    if (!allowed) return null;

    const items = await ctx.db
      .query("suspenseItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      total: items.length,
      open: items.filter((i) => i.status === "open").length,
      queried: items.filter((i) => i.status === "queried").length,
      resolved: items.filter((i) => i.status === "resolved").length,
      totalAmount: items
        .filter((i) => i.status === "open")
        .reduce((sum, i) => sum + Math.abs(i.amount), 0),
    };
  },
});

// ============ MUTATIONS ============

// Create a new suspense item
export const create = mutation({
  args: {
    companyId: v.id("companies"),
    sessionId: v.id("reconciliationSessions"),
    sourceType: v.union(v.literal("cash"), v.literal("accrual")),
    // Typed ID union for referential integrity
    sourceId: v.union(v.id("transactions"), v.id("accrualDocuments")),
    amount: v.number(),
    transactionDate: v.string(),
    description: v.string(),
    reason: v.string(),
    suggestedAction: v.string(),
  },
  returns: suspenseItemIdValidator,
  handler: async (ctx, args) => {
    // Validate inputs
    validateAmount(args.amount, "amount");
    validateDate(args.transactionDate, "transactionDate");
    validateNonEmpty(args.description, "description");
    validateNonEmpty(args.reason, "reason");
    validateNonEmpty(args.suggestedAction, "suggestedAction");

    // Verify company ownership
    await requireCompanyAccess(ctx, args.companyId);

    // Verify session belongs to same company
    const { company } = await requireSessionAccess(ctx, args.sessionId);
    if (company._id !== args.companyId) {
      return BusinessErrors.sessionMismatch("Suspense item");
    }

    // Verify the source exists
    if (args.sourceType === "cash") {
      const txn = await ctx.db.get(args.sourceId as any);
      if (!txn) {
        return BusinessErrors.resourceNotFound("Transaction", args.sourceId);
      }
    } else {
      const doc = await ctx.db.get(args.sourceId as any);
      if (!doc) {
        return BusinessErrors.resourceNotFound("Accrual document", args.sourceId);
      }
    }

    const itemId = await ctx.db.insert("suspenseItems", {
      ...args,
      status: "open",
      createdAt: Date.now(),
    });
    return itemId;
  },
});;

// Bulk create suspense items (for matching engine results)
export const createBulk = mutation({
  args: {
    items: v.array(
      v.object({
        companyId: v.id("companies"),
        sessionId: v.id("reconciliationSessions"),
        sourceType: v.union(v.literal("cash"), v.literal("accrual")),
        // Typed ID union for referential integrity
        sourceId: v.union(v.id("transactions"), v.id("accrualDocuments")),
        amount: v.number(),
        transactionDate: v.string(),
        description: v.string(),
        reason: v.string(),
        suggestedAction: v.string(),
      })
    ),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      return [];
    }

    // SECURITY: Prevent DoS via excessive bulk imports
    validateBulkSize(args.items.length);

    // Verify ownership of all companies involved
    const companyIds = new Set(args.items.map((i) => i.companyId));
    for (const companyId of companyIds) {
      await requireCompanyAccess(ctx, companyId);
    }

    // Verify ownership of all sessions involved
    const sessionIds = new Set(args.items.map((i) => i.sessionId));
    for (const sessionId of sessionIds) {
      await requireSessionAccess(ctx, sessionId);
    }

    const now = Date.now();
    const ids: string[] = [];

    // Validate all items first before inserting any
    for (const item of args.items) {
      validateAmount(item.amount, "amount");
      validateDate(item.transactionDate, "transactionDate");
      validateNonEmpty(item.description, "description");
      validateNonEmpty(item.reason, "reason");
      validateNonEmpty(item.suggestedAction, "suggestedAction");
    }

    for (const item of args.items) {
      const itemId = await ctx.db.insert("suspenseItems", {
        ...item,
        status: "open",
        createdAt: now,
      });
      ids.push(itemId);
    }

    return ids;
  },
});;

// Mark as queried (sent to client for clarification)
export const markQueried = mutation({
  args: { id: v.id("suspenseItems") },
  returns: suspenseItemIdValidator,
  handler: async (ctx, args) => {
    // Verify item ownership
    await requireSuspenseItemAccess(ctx, args.id);

    await ctx.db.patch(args.id, {
      status: "queried",
    });
    return args.id;
  },
});

// Resolve a suspense item
export const resolve = mutation({
  args: {
    id: v.id("suspenseItems"),
    resolutionNotes: v.string(),
    // Keep for backwards compatibility, but prefer auth context
    resolvedBy: v.optional(v.id("users")),
  },
  returns: suspenseItemIdValidator,
  handler: async (ctx, args) => {
    // Verify item ownership and get user
    const { user } = await requireSuspenseItemAccess(ctx, args.id);

    validateNonEmpty(args.resolutionNotes, "resolutionNotes");

    await ctx.db.patch(args.id, {
      status: "resolved",
      resolutionNotes: args.resolutionNotes,
      resolvedAt: Date.now(),
      resolvedBy: user._id, // Server-derived from auth context
    });
    return args.id;
  },
});

// Reopen a resolved item
export const reopen = mutation({
  args: { id: v.id("suspenseItems") },
  returns: suspenseItemIdValidator,
  handler: async (ctx, args) => {
    // Verify item ownership
    await requireSuspenseItemAccess(ctx, args.id);

    await ctx.db.patch(args.id, {
      status: "open",
      resolutionNotes: undefined,
      resolvedAt: undefined,
      resolvedBy: undefined,
    });
    return args.id;
  },
});

// Delete a suspense item
export const remove = mutation({
  args: { id: v.id("suspenseItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify item ownership
    await requireSuspenseItemAccess(ctx, args.id);

    await ctx.db.delete(args.id);
    return null;
  },
});

