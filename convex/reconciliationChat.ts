/**
 * Reconciliation chat operations for the agentic assistant.
 *
 * Provides:
 * - Chat message history per reconciliation session (24h retention)
 * - Message creation and retrieval
 * - History clearing
 * - Expired message cleanup (via cron)
 *
 * @module convex/reconciliationChat
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import {
  verifyQuerySessionAccess,
  requireSessionAccess,
} from "./lib/auth";

const TWENTY_FOUR_HOURS = 86400000; // 24h in ms

// ============================================================================
// Chat Queries
// ============================================================================

/**
 * Get chat messages for a reconciliation session.
 */
export const getMessages = query({
  args: {
    sessionId: v.id("reconciliationSessions"),
    limit: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this session
    const { allowed } = await verifyQuerySessionAccess(
      ctx,
      args.sessionId,
      args.workosUserId
    );
    if (!allowed) return [];

    const limit = args.limit || 50;

    return await ctx.db
      .query("reconciliationChatMessages")
      .withIndex("by_session_time", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .order("asc")
      .take(limit);
  },
});

// ============================================================================
// Chat Mutations
// ============================================================================

/**
 * Add a message to the chat history.
 */
export const addMessage = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    metadata: v.optional(
      v.object({
        toolCalls: v.optional(
          v.array(
            v.object({
              toolName: v.string(),
              toolCallId: v.string(),
            })
          )
        ),
        stepCount: v.optional(v.number()),
      })
    ),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this session
    const { user, session } = await requireSessionAccess(
      ctx,
      args.sessionId,
      args.workosUserId
    );

    // Validate content length
    if (args.content.length > 100000) {
      throw new Error("Message too long (max 100000 characters)");
    }

    const now = Date.now();

    return await ctx.db.insert("reconciliationChatMessages", {
      sessionId: args.sessionId,
      companyId: session.companyId,
      userId: user._id,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
      createdAt: now,
      expiresAt: now + TWENTY_FOUR_HOURS,
    });
  },
});

/**
 * Clear chat history for a reconciliation session.
 */
export const clearHistory = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this session
    await requireSessionAccess(ctx, args.sessionId, args.workosUserId);

    // Delete in batches to avoid unbounded reads. The cron (deleteExpired)
    // will clean up any remaining messages if there are more than 500.
    const messages = await ctx.db
      .query("reconciliationChatMessages")
      .withIndex("by_session", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .take(500);

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return { deleted: messages.length };
  },
});

// ============================================================================
// Internal Mutations (for cron cleanup)
// ============================================================================

/**
 * Delete expired chat messages (older than 24h).
 * Called by cron every hour.
 */
export const deleteExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired messages using the by_expires index
    const expired = await ctx.db
      .query("reconciliationChatMessages")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(500); // Batch limit to avoid timeout

    for (const message of expired) {
      await ctx.db.delete(message._id);
    }

    if (expired.length > 0) {
      console.log(
        `[ReconciliationChat] Cleaned up ${expired.length} expired messages`
      );
    }

    return { deleted: expired.length };
  },
});
