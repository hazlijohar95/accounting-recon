/**
 * Worksheet Data Sources - CRUD operations
 *
 * Links worksheets to external data sources (reconciliation sessions, CSV imports, etc.)
 * Enables mixed-mode sheets with read-only linked columns and editable user columns.
 *
 * SECURITY: All mutations require worksheet access via requireWorksheetAccess().
 *
 * @module convex/worksheetDataSources
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  verifyQueryWorksheetAccess,
  requireWorksheetAccess,
} from "./lib/workspaceAuth";

// Source type validator
const sourceTypeValidator = v.union(
  v.literal("manual"),
  v.literal("reconciliation"),
  v.literal("csv_import")
);

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the data source for a worksheet.
 * Returns null if the worksheet has no linked data source (pure manual entry).
 * SECURITY: Requires authenticated user with company ownership.
 */
export const getByWorksheet = query({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { allowed } = await verifyQueryWorksheetAccess(ctx, args.worksheetId, args.workosUserId);
    if (!allowed) return null;

    return await ctx.db
      .query("worksheetDataSources")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .first();
  },
});

/**
 * List all data sources for a workspace.
 * Useful for showing which sheets have linked data.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access by checking first worksheet
    // (workspace access is validated through worksheet → workspace → company chain)
    const worksheets = await ctx.db
      .query("worksheets")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // If there are worksheets, verify access through one of them
    if (worksheets.length > 0) {
      const { allowed } = await verifyQueryWorksheetAccess(ctx, worksheets[0]._id, args.workosUserId);
      if (!allowed) return [];
    }

    // Get data sources for each worksheet
    const dataSources = await Promise.all(
      worksheets.map(async (ws) => {
        const source = await ctx.db
          .query("worksheetDataSources")
          .withIndex("by_worksheet", (q) => q.eq("worksheetId", ws._id))
          .first();
        return source ? { worksheetName: ws.name, ...source } : null;
      })
    );

    return dataSources.filter((ds) => ds !== null);
  },
});

/**
 * Check if a column is linked (read-only) for a worksheet.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const isColumnLinked = query({
  args: {
    worksheetId: v.id("worksheets"),
    columnIndex: v.number(),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { allowed } = await verifyQueryWorksheetAccess(ctx, args.worksheetId, args.workosUserId);
    if (!allowed) return false;

    const dataSource = await ctx.db
      .query("worksheetDataSources")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .first();

    if (!dataSource || !dataSource.readonly) {
      return false;
    }

    return dataSource.linkedColumns.includes(args.columnIndex);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new data source for a worksheet.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const create = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    sourceType: sourceTypeValidator,
    sourceConfig: v.any(),
    linkedColumns: v.array(v.number()),
    readonly: v.optional(v.boolean()),
    refreshInterval: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    const now = Date.now();

    // Check if worksheet already has a data source
    const existing = await ctx.db
      .query("worksheetDataSources")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .first();

    if (existing) {
      throw new Error("Worksheet already has a data source. Use update or remove first.");
    }

    return await ctx.db.insert("worksheetDataSources", {
      worksheetId: args.worksheetId,
      sourceType: args.sourceType,
      sourceConfig: args.sourceConfig,
      linkedColumns: args.linkedColumns,
      readonly: args.readonly ?? true,
      refreshInterval: args.refreshInterval,
      lastRefreshedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a data source's configuration.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const update = mutation({
  args: {
    id: v.id("worksheetDataSources"),
    sourceConfig: v.optional(v.any()),
    linkedColumns: v.optional(v.array(v.number())),
    readonly: v.optional(v.boolean()),
    refreshInterval: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Data source not found");
    }

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, existing.worksheetId, args.workosUserId);

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.sourceConfig !== undefined) {
      updates.sourceConfig = args.sourceConfig;
    }
    if (args.linkedColumns !== undefined) {
      updates.linkedColumns = args.linkedColumns;
    }
    if (args.readonly !== undefined) {
      updates.readonly = args.readonly;
    }
    if (args.refreshInterval !== undefined) {
      updates.refreshInterval = args.refreshInterval;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Update the lastRefreshedAt timestamp.
 * Called after data is refreshed from the source.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const updateRefreshTimestamp = mutation({
  args: {
    id: v.id("worksheetDataSources"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Data source not found");
    }

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, existing.worksheetId, args.workosUserId);

    const now = Date.now();
    await ctx.db.patch(args.id, {
      lastRefreshedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Add columns to the linked columns list.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const addLinkedColumns = mutation({
  args: {
    id: v.id("worksheetDataSources"),
    columnIndices: v.array(v.number()),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Data source not found");
    }

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, existing.worksheetId, args.workosUserId);

    // Merge and deduplicate column indices
    const merged = [...new Set([...existing.linkedColumns, ...args.columnIndices])];
    merged.sort((a, b) => a - b);

    await ctx.db.patch(args.id, {
      linkedColumns: merged,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove columns from the linked columns list.
 * This makes them editable again.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const removeLinkedColumns = mutation({
  args: {
    id: v.id("worksheetDataSources"),
    columnIndices: v.array(v.number()),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Data source not found");
    }

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, existing.worksheetId, args.workosUserId);

    const filtered = existing.linkedColumns.filter(
      (col) => !args.columnIndices.includes(col)
    );

    await ctx.db.patch(args.id, {
      linkedColumns: filtered,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a data source.
 * This unlinks the worksheet from the source but doesn't delete the data.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const remove = mutation({
  args: {
    id: v.id("worksheetDataSources"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return; // Already deleted, nothing to do
    }

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, existing.worksheetId, args.workosUserId);

    await ctx.db.delete(args.id);
  },
});

/**
 * Delete a data source by worksheet ID.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const removeByWorksheet = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    const dataSource = await ctx.db
      .query("worksheetDataSources")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .first();

    if (dataSource) {
      await ctx.db.delete(dataSource._id);
    }
  },
});
