import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireWorksheetAccess } from "./lib/auth"

/**
 * Worksheet Charts CRUD Operations
 *
 * Provides chart management for spreadsheet data visualization.
 * Charts are rendered client-side using Recharts, stored in Convex.
 */

// =============================================================================
// Validators
// =============================================================================

const chartTypeValidator = v.union(
  v.literal("bar"),
  v.literal("line"),
  v.literal("pie"),
  v.literal("area"),
  v.literal("scatter")
)

const chartOptionsValidator = v.object({
  showLegend: v.boolean(),
  showLabels: v.boolean(),
  showGrid: v.optional(v.boolean()),
  animate: v.boolean(),
  colors: v.optional(v.array(v.string())),
  orientation: v.optional(v.union(v.literal("horizontal"), v.literal("vertical"))),
  showDots: v.optional(v.boolean()),
  height: v.optional(v.number()),
})

// =============================================================================
// Queries
// =============================================================================

/**
 * List all charts for a worksheet
 */
export const listByWorksheet = query({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const charts = await ctx.db
      .query("worksheetCharts")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect()

    // Sort by position
    return charts.sort((a, b) => a.position - b.position)
  },
})

/**
 * Get a single chart by ID
 */
export const get = query({
  args: {
    id: v.id("worksheetCharts"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const chart = await ctx.db.get(args.id)
    if (!chart) return null

    await requireWorksheetAccess(ctx, chart.worksheetId, args.workosUserId)
    return chart
  },
})

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new chart
 */
export const create = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    title: v.string(),
    chartType: chartTypeValidator,
    dataRange: v.string(),
    labelColumn: v.optional(v.number()),
    valueColumns: v.array(v.number()),
    options: v.optional(chartOptionsValidator),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const now = Date.now()

    // Get next position
    const existingCharts = await ctx.db
      .query("worksheetCharts")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect()
    const position = existingCharts.length

    const defaultOptions = {
      showLegend: true,
      showLabels: true,
      showGrid: true,
      animate: true,
      orientation: "vertical" as const,
      showDots: true,
      height: 300,
    }

    return ctx.db.insert("worksheetCharts", {
      worksheetId: args.worksheetId,
      title: args.title,
      chartType: args.chartType,
      dataRange: args.dataRange,
      labelColumn: args.labelColumn,
      valueColumns: args.valueColumns,
      options: { ...defaultOptions, ...args.options },
      position,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update a chart
 */
export const update = mutation({
  args: {
    id: v.id("worksheetCharts"),
    workosUserId: v.string(),
    title: v.optional(v.string()),
    chartType: v.optional(chartTypeValidator),
    dataRange: v.optional(v.string()),
    labelColumn: v.optional(v.number()),
    valueColumns: v.optional(v.array(v.number())),
    options: v.optional(chartOptionsValidator),
  },
  handler: async (ctx, args) => {
    const chart = await ctx.db.get(args.id)
    if (!chart) {
      throw new Error("Chart not found")
    }

    await requireWorksheetAccess(ctx, chart.worksheetId, args.workosUserId)

    const updates: Partial<typeof chart> = {
      updatedAt: Date.now(),
    }

    if (args.title !== undefined) updates.title = args.title
    if (args.chartType !== undefined) updates.chartType = args.chartType
    if (args.dataRange !== undefined) updates.dataRange = args.dataRange
    if (args.labelColumn !== undefined) updates.labelColumn = args.labelColumn
    if (args.valueColumns !== undefined) updates.valueColumns = args.valueColumns
    if (args.options !== undefined) updates.options = { ...chart.options, ...args.options }

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

/**
 * Delete a chart
 */
export const remove = mutation({
  args: {
    id: v.id("worksheetCharts"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const chart = await ctx.db.get(args.id)
    if (!chart) {
      throw new Error("Chart not found")
    }

    await requireWorksheetAccess(ctx, chart.worksheetId, args.workosUserId)

    await ctx.db.delete(args.id)

    // Reorder remaining charts
    const remaining = await ctx.db
      .query("worksheetCharts")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", chart.worksheetId))
      .collect()

    const sorted = remaining.sort((a, b) => a.position - b.position)
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].position !== i) {
        await ctx.db.patch(sorted[i]._id, { position: i })
      }
    }

    return true
  },
})

/**
 * Reorder charts
 */
export const reorder = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    chartIds: v.array(v.id("worksheetCharts")),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const now = Date.now()

    for (let i = 0; i < args.chartIds.length; i++) {
      const chart = await ctx.db.get(args.chartIds[i])
      if (chart && chart.worksheetId === args.worksheetId) {
        await ctx.db.patch(args.chartIds[i], {
          position: i,
          updatedAt: now,
        })
      }
    }

    return true
  },
})
