import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireWorksheetAccess } from "./lib/auth"

/**
 * Worksheet Columns CRUD Operations
 *
 * Handles column definition management including data validation settings.
 */

// =============================================================================
// Validators
// =============================================================================

const validationValidator = v.object({
  type: v.union(
    v.literal("list"),
    v.literal("number"),
    v.literal("date"),
    v.literal("text")
  ),
  allowedValues: v.optional(v.array(v.string())),
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  pattern: v.optional(v.string()),
  required: v.optional(v.boolean()),
  errorMessage: v.optional(v.string()),
})

// =============================================================================
// Queries
// =============================================================================

/**
 * List columns for a worksheet
 */
export const listByWorksheet = query({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const columns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect()

    // Filter deleted if not requested
    const filtered = args.includeDeleted
      ? columns
      : columns.filter((col) => !col.deletedAt)

    // Sort by order
    return filtered.sort((a, b) => a.order - b.order)
  },
})

/**
 * Get a single column by ID
 */
export const get = query({
  args: {
    id: v.id("worksheetColumns"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.id)
    if (!column || column.deletedAt) {
      return null
    }

    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId)
    return column
  },
})

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new column
 */
export const create = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    name: v.string(),
    columnType: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("formula")
    ),
    formula: v.optional(v.string()),
    dataSource: v.optional(v.string()),
    width: v.optional(v.number()),
    inputColumnId: v.optional(v.id("worksheetColumns")),
    validation: v.optional(validationValidator),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    // Get max order
    const existingColumns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect()
    const maxOrder = existingColumns.length > 0
      ? Math.max(...existingColumns.map((c) => c.order))
      : -1

    return ctx.db.insert("worksheetColumns", {
      worksheetId: args.worksheetId,
      name: args.name,
      columnType: args.columnType,
      order: maxOrder + 1,
      formula: args.formula,
      dataSource: args.dataSource,
      width: args.width,
      inputColumnId: args.inputColumnId,
      validation: args.validation,
    })
  },
})

/**
 * Update a column's properties
 */
export const update = mutation({
  args: {
    id: v.id("worksheetColumns"),
    workosUserId: v.string(),
    name: v.optional(v.string()),
    columnType: v.optional(v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("formula")
    )),
    formula: v.optional(v.string()),
    dataSource: v.optional(v.string()),
    width: v.optional(v.number()),
    inputColumnId: v.optional(v.id("worksheetColumns")),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.id)
    if (!column) {
      throw new Error("Column not found")
    }
    if (column.deletedAt) {
      throw new Error("Column has been deleted")
    }

    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId)

    const { id, workosUserId, ...updates } = args
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates)
    }

    return id
  },
})

/**
 * Update column validation settings
 */
export const updateValidation = mutation({
  args: {
    id: v.id("worksheetColumns"),
    workosUserId: v.string(),
    validation: v.optional(validationValidator),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.id)
    if (!column) {
      throw new Error("Column not found")
    }
    if (column.deletedAt) {
      throw new Error("Column has been deleted")
    }

    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId)

    // Update validation (undefined clears validation)
    await ctx.db.patch(args.id, {
      validation: args.validation,
    })

    return args.id
  },
})

/**
 * Soft delete a column
 */
export const remove = mutation({
  args: {
    id: v.id("worksheetColumns"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.id)
    if (!column) {
      throw new Error("Column not found")
    }

    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId)

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
    })

    return args.id
  },
})

/**
 * Reorder columns
 */
export const reorder = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    columnIds: v.array(v.id("worksheetColumns")),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    // Update order for each column
    for (let i = 0; i < args.columnIds.length; i++) {
      const column = await ctx.db.get(args.columnIds[i])
      if (column && column.worksheetId === args.worksheetId && !column.deletedAt) {
        await ctx.db.patch(args.columnIds[i], { order: i })
      }
    }
  },
})
