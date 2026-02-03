/**
 * Worksheet chat operations for conversational AI queries on spreadsheet data.
 *
 * Provides:
 * - Chat message history per worksheet
 * - Message creation and retrieval
 * - History clearing
 *
 * @module convex/worksheetChat
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  verifyQueryWorksheetAccess,
  requireWorksheetAccess,
} from "./lib/workspaceAuth";

// ============================================================================
// Chat Queries
// ============================================================================

/**
 * Get chat messages for a worksheet.
 */
export const getMessages = query({
  args: {
    worksheetId: v.id("worksheets"),
    limit: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { allowed } = await verifyQueryWorksheetAccess(ctx, args.worksheetId, args.workosUserId);
    if (!allowed) return [];

    const limit = args.limit || 50;

    return await ctx.db
      .query("worksheetMessages")
      .withIndex("by_worksheet_time", (q) => q.eq("worksheetId", args.worksheetId))
      .order("asc")
      .take(limit);
  },
});

/**
 * Get recent messages (for context building).
 */
export const getRecentMessages = query({
  args: {
    worksheetId: v.id("worksheets"),
    limit: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { allowed } = await verifyQueryWorksheetAccess(ctx, args.worksheetId, args.workosUserId);
    if (!allowed) return [];

    const limit = args.limit || 10;

    const messages = await ctx.db
      .query("worksheetMessages")
      .withIndex("by_worksheet_time", (q) => q.eq("worksheetId", args.worksheetId))
      .order("desc")
      .take(limit);

    // Return in chronological order
    return messages.reverse();
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
    worksheetId: v.id("worksheets"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    metadata: v.optional(v.object({
      referencedCells: v.optional(v.array(v.object({
        rowNumber: v.number(),
        columnKey: v.string(),
      }))),
      toolCalls: v.optional(v.array(v.object({
        name: v.string(),
        result: v.optional(v.string()),
      }))),
    })),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    // Validate content length
    if (args.content.length > 50000) {
      throw new Error("Message too long (max 50000 characters)");
    }

    return await ctx.db.insert("worksheetMessages", {
      worksheetId: args.worksheetId,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

/**
 * Clear chat history for a worksheet.
 */
export const clearHistory = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    const messages = await ctx.db
      .query("worksheetMessages")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    return { deleted: messages.length };
  },
});
