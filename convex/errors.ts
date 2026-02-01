import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getOptionalAuth } from "./lib/auth";

/**
 * Self-Hosted Error Monitoring Module
 *
 * Provides error logging, retrieval, and management without external dependencies.
 * Stores errors in Convex with deduplication via fingerprinting.
 *
 * @module convex/errors
 */

// ============ MUTATIONS ============

/**
 * Log an error from the client or server.
 * Deduplicates errors based on fingerprint (message + stack hash).
 */
export const logError = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    type: v.union(
      v.literal("uncaught"),
      v.literal("promise"),
      v.literal("boundary"),
      v.literal("api"),
      v.literal("convex"),
      v.literal("manual")
    ),
    url: v.string(),
    userAgent: v.optional(v.string()),
    componentName: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx);
    const now = Date.now();

    // Create fingerprint for deduplication (hash of message + stack)
    const fingerprintSource = `${args.message}::${args.stack || ""}::${args.type}`;
    const fingerprint = await hashString(fingerprintSource);

    // Check for existing error with same fingerprint
    const existing = await ctx.db
      .query("errors")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", fingerprint))
      .first();

    if (existing) {
      // Increment count and update last seen
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        lastSeenAt: now,
        // Update metadata if provided (newer context might be more useful)
        ...(args.metadata && { metadata: args.metadata }),
        // Update URL if different (error happening on different pages)
        ...(args.url !== existing.url && { url: args.url }),
      });
      return { errorId: existing._id, deduplicated: true };
    }

    // Create new error entry
    const errorId = await ctx.db.insert("errors", {
      message: args.message,
      stack: args.stack,
      type: args.type,
      url: args.url,
      userAgent: args.userAgent,
      userId: user?._id,
      componentName: args.componentName,
      metadata: args.metadata,
      fingerprint,
      count: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      isResolved: false,
    });

    return { errorId, deduplicated: false };
  },
});

/**
 * Mark an error as resolved.
 */
export const resolveError = mutation({
  args: {
    errorId: v.id("errors"),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx);
    const error = await ctx.db.get(args.errorId);

    if (!error) {
      throw new Error("Error not found");
    }

    await ctx.db.patch(args.errorId, {
      isResolved: true,
      resolvedAt: Date.now(),
      resolvedBy: user?._id,
    });

    return { success: true };
  },
});

/**
 * Mark an error as unresolved (reopen).
 */
export const unresolveError = mutation({
  args: {
    errorId: v.id("errors"),
  },
  handler: async (ctx, args) => {
    const error = await ctx.db.get(args.errorId);

    if (!error) {
      throw new Error("Error not found");
    }

    await ctx.db.patch(args.errorId, {
      isResolved: false,
      resolvedAt: undefined,
      resolvedBy: undefined,
    });

    return { success: true };
  },
});

/**
 * Delete a single error.
 */
export const deleteError = mutation({
  args: {
    errorId: v.id("errors"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.errorId);
    return { success: true };
  },
});

/**
 * Clear all resolved errors.
 */
export const clearResolvedErrors = mutation({
  args: {},
  handler: async (ctx) => {
    const resolved = await ctx.db
      .query("errors")
      .withIndex("by_resolved", (q) => q.eq("isResolved", true))
      .collect();

    for (const error of resolved) {
      await ctx.db.delete(error._id);
    }

    return { deleted: resolved.length };
  },
});

/**
 * Clear errors older than a specified number of days.
 */
export const clearOldErrors = mutation({
  args: {
    daysOld: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.daysOld * 24 * 60 * 60 * 1000;

    const oldErrors = await ctx.db
      .query("errors")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("lastSeenAt"), cutoff))
      .collect();

    for (const error of oldErrors) {
      await ctx.db.delete(error._id);
    }

    return { deleted: oldErrors.length };
  },
});

// ============ QUERIES ============

/**
 * List errors with pagination and filtering.
 */
export const listErrors = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("uncaught"),
        v.literal("promise"),
        v.literal("boundary"),
        v.literal("api"),
        v.literal("convex"),
        v.literal("manual")
      )
    ),
    showResolved: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const showResolved = args.showResolved ?? false;

    let query;

    if (args.type) {
      // Filter by type
      query = ctx.db
        .query("errors")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc");
    } else if (!showResolved) {
      // Only unresolved errors
      query = ctx.db
        .query("errors")
        .withIndex("by_resolved", (q) => q.eq("isResolved", false))
        .order("desc");
    } else {
      // All errors
      query = ctx.db
        .query("errors")
        .withIndex("by_created")
        .order("desc");
    }

    let errors = await query.take(limit + 1);

    // Filter by search if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      errors = errors.filter(
        (e) =>
          e.message.toLowerCase().includes(searchLower) ||
          e.url.toLowerCase().includes(searchLower) ||
          e.componentName?.toLowerCase().includes(searchLower)
      );
    }

    // Filter resolved if needed (when using type filter)
    if (args.type && !showResolved) {
      errors = errors.filter((e) => !e.isResolved);
    }

    const hasMore = errors.length > limit;
    if (hasMore) {
      errors = errors.slice(0, limit);
    }

    return {
      errors,
      hasMore,
      nextCursor: hasMore ? errors[errors.length - 1]._id : undefined,
    };
  },
});

/**
 * Get a single error by ID.
 */
export const getError = query({
  args: {
    errorId: v.id("errors"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.errorId);
  },
});

/**
 * Get error statistics for the dashboard.
 */
export const getErrorStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const allErrors = await ctx.db
      .query("errors")
      .withIndex("by_created")
      .filter((q) => q.gte(q.field("lastSeenAt"), cutoff))
      .collect();

    // Count by type
    const byType: Record<string, number> = {};
    for (const error of allErrors) {
      byType[error.type] = (byType[error.type] || 0) + error.count;
    }

    // Count by day
    const byDay: Record<string, number> = {};
    for (const error of allErrors) {
      const date = new Date(error.lastSeenAt).toISOString().split("T")[0];
      byDay[date] = (byDay[date] || 0) + error.count;
    }

    // Top errors by occurrence
    const sortedByCount = [...allErrors].sort((a, b) => b.count - a.count);
    const topErrors = sortedByCount.slice(0, 5).map((e) => ({
      id: e._id,
      message: e.message,
      count: e.count,
      type: e.type,
    }));

    // Unresolved count
    const unresolvedCount = allErrors.filter((e) => !e.isResolved).length;
    const totalOccurrences = allErrors.reduce((sum, e) => sum + e.count, 0);

    return {
      totalErrors: allErrors.length,
      totalOccurrences,
      unresolvedCount,
      byType,
      byDay,
      topErrors,
      period: { days, from: new Date(cutoff).toISOString() },
    };
  },
});

// ============ INTERNAL MUTATIONS ============

/**
 * Internal mutation for scheduled cleanup of old errors.
 * Called by cron job.
 */
export const scheduledCleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete errors older than 30 days
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldErrors = await ctx.db
      .query("errors")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("lastSeenAt"), cutoff))
      .collect();

    for (const error of oldErrors) {
      await ctx.db.delete(error._id);
    }

    return { deleted: oldErrors.length };
  },
});

// ============ HELPERS ============

/**
 * Simple hash function for fingerprinting.
 * Uses a basic string hash for deduplication.
 */
async function hashString(str: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and ensure positive
  return Math.abs(hash).toString(16).padStart(8, "0");
}
