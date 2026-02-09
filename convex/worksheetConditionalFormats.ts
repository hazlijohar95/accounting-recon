import { v, Infer } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireWorksheetAccess } from "./lib/auth"

/**
 * Worksheet Conditional Formatting CRUD Operations
 *
 * Provides rules for visual formatting based on cell values.
 * Supports presets for common reconciliation patterns (confidence bands, status colors).
 */

// =============================================================================
// Validators
// =============================================================================

const rangeValidator = v.object({
  startCell: v.optional(v.string()),
  endCell: v.optional(v.string()),
  columnIndex: v.optional(v.number()),
  rowIndex: v.optional(v.number()),
})

const operatorValidator = v.union(
  v.literal("gt"),
  v.literal("gte"),
  v.literal("lt"),
  v.literal("lte"),
  v.literal("eq"),
  v.literal("neq"),
  v.literal("contains"),
  v.literal("startsWith"),
  v.literal("endsWith"),
  v.literal("between")
)

const formattingValidator = v.object({
  backgroundColor: v.optional(v.string()),
  textColor: v.optional(v.string()),
  bold: v.optional(v.boolean()),
  italic: v.optional(v.boolean()),
  underline: v.optional(v.boolean()),
  strikethrough: v.optional(v.boolean()),
})

const conditionValidator = v.object({
  operator: operatorValidator,
  value: v.any(),
  value2: v.optional(v.any()),
  formatting: formattingValidator,
})

const ruleTypeValidator = v.union(
  v.literal("threshold"),
  v.literal("between"),
  v.literal("equals"),
  v.literal("contains"),
  v.literal("confidenceBand"),
  v.literal("statusColor"),
  v.literal("matchLayer")
)

// Inferred types from validators for type safety
type FormatCondition = Infer<typeof conditionValidator>

// =============================================================================
// Preset Definitions
// =============================================================================

/**
 * Confidence band preset colors (matches theme.ts)
 */
export const CONFIDENCE_BAND_CONDITIONS = [
  {
    operator: "gte" as const,
    value: 90,
    formatting: {
      backgroundColor: "#dcfce7", // green-100 (high confidence)
      textColor: "#166534", // green-800
    },
  },
  {
    operator: "between" as const,
    value: 70,
    value2: 89.99,
    formatting: {
      backgroundColor: "#fef3c7", // amber-100 (medium confidence)
      textColor: "#92400e", // amber-800
    },
  },
  {
    operator: "lt" as const,
    value: 70,
    formatting: {
      backgroundColor: "#fee2e2", // red-100 (low confidence)
      textColor: "#991b1b", // red-800
    },
  },
]

/**
 * Status color preset (matches theme.ts getStatusColor)
 */
export const STATUS_COLOR_CONDITIONS = [
  {
    operator: "eq" as const,
    value: "matched",
    formatting: {
      backgroundColor: "#dcfce7", // green-100
      textColor: "#166534",
    },
  },
  {
    operator: "eq" as const,
    value: "approved",
    formatting: {
      backgroundColor: "#dcfce7",
      textColor: "#166534",
    },
  },
  {
    operator: "eq" as const,
    value: "suggested",
    formatting: {
      backgroundColor: "#dbeafe", // blue-100
      textColor: "#1e40af",
    },
  },
  {
    operator: "eq" as const,
    value: "pending",
    formatting: {
      backgroundColor: "#fef3c7", // amber-100
      textColor: "#92400e",
    },
  },
  {
    operator: "eq" as const,
    value: "rejected",
    formatting: {
      backgroundColor: "#fee2e2", // red-100
      textColor: "#991b1b",
    },
  },
  {
    operator: "eq" as const,
    value: "suspense",
    formatting: {
      backgroundColor: "#fee2e2",
      textColor: "#991b1b",
    },
  },
]

/**
 * Match layer color preset (matches theme.ts getLayerColor)
 */
export const MATCH_LAYER_CONDITIONS = [
  {
    operator: "eq" as const,
    value: "exact",
    formatting: {
      backgroundColor: "#dcfce7", // green-100
      textColor: "#166534",
    },
  },
  {
    operator: "eq" as const,
    value: "window",
    formatting: {
      backgroundColor: "#e0f2fe", // sky-100
      textColor: "#0369a1",
    },
  },
  {
    operator: "eq" as const,
    value: "reference",
    formatting: {
      backgroundColor: "#f3e8ff", // purple-100
      textColor: "#7c3aed",
    },
  },
  {
    operator: "eq" as const,
    value: "fuzzy",
    formatting: {
      backgroundColor: "#fef3c7", // amber-100
      textColor: "#92400e",
    },
  },
  {
    operator: "eq" as const,
    value: "semantic",
    formatting: {
      backgroundColor: "#fce7f3", // pink-100
      textColor: "#be185d",
    },
  },
  {
    operator: "eq" as const,
    value: "manual",
    formatting: {
      backgroundColor: "#dbeafe", // blue-100
      textColor: "#1e40af",
    },
  },
]

// =============================================================================
// Queries
// =============================================================================

/**
 * List all conditional formatting rules for a worksheet
 */
export const listByWorksheet = query({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    enabledOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const rules = await ctx.db
      .query("worksheetConditionalFormats")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect()

    // Filter by enabled status if requested
    const filtered = args.enabledOnly
      ? rules.filter((r) => r.enabled)
      : rules

    // Sort by priority (higher priority applied later)
    return filtered.sort((a, b) => a.priority - b.priority)
  },
})

/**
 * Get a single conditional formatting rule by ID
 */
export const get = query({
  args: {
    id: v.id("worksheetConditionalFormats"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id)
    if (!rule) return null

    await requireWorksheetAccess(ctx, rule.worksheetId, args.workosUserId)
    return rule
  },
})

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new conditional formatting rule
 */
export const create = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    name: v.string(),
    range: rangeValidator,
    ruleType: ruleTypeValidator,
    conditions: v.array(conditionValidator),
    priority: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const now = Date.now()

    // Get max priority if not specified
    let priority = args.priority
    if (priority === undefined) {
      const existingRules = await ctx.db
        .query("worksheetConditionalFormats")
        .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
        .collect()
      priority = existingRules.length > 0
        ? Math.max(...existingRules.map((r) => r.priority)) + 1
        : 0
    }

    return ctx.db.insert("worksheetConditionalFormats", {
      worksheetId: args.worksheetId,
      name: args.name,
      range: args.range,
      ruleType: args.ruleType,
      conditions: args.conditions,
      priority,
      enabled: args.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Create a preset conditional formatting rule
 */
export const createPreset = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    presetType: v.union(
      v.literal("confidenceBand"),
      v.literal("statusColor"),
      v.literal("matchLayer")
    ),
    /** Column index to apply the preset to */
    columnIndex: v.number(),
    /** Optional custom name */
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const now = Date.now()

    // Get conditions based on preset type using proper typing
    let conditions: FormatCondition[]
    let defaultName: string

    switch (args.presetType) {
      case "confidenceBand":
        conditions = CONFIDENCE_BAND_CONDITIONS.map((c) => ({
          operator: c.operator,
          value: c.value,
          value2: c.value2,
          formatting: c.formatting,
        }))
        defaultName = "Confidence Highlighting"
        break
      case "statusColor":
        conditions = STATUS_COLOR_CONDITIONS.map((c) => ({
          operator: c.operator,
          value: c.value,
          formatting: c.formatting,
        }))
        defaultName = "Status Colors"
        break
      case "matchLayer":
        conditions = MATCH_LAYER_CONDITIONS.map((c) => ({
          operator: c.operator,
          value: c.value,
          formatting: c.formatting,
        }))
        defaultName = "Match Layer Colors"
        break
    }

    // Get max priority
    const existingRules = await ctx.db
      .query("worksheetConditionalFormats")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect()
    const priority = existingRules.length > 0
      ? Math.max(...existingRules.map((r) => r.priority)) + 1
      : 0

    return ctx.db.insert("worksheetConditionalFormats", {
      worksheetId: args.worksheetId,
      name: args.name ?? defaultName,
      range: { columnIndex: args.columnIndex },
      ruleType: args.presetType,
      conditions,
      priority,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update a conditional formatting rule
 */
export const update = mutation({
  args: {
    id: v.id("worksheetConditionalFormats"),
    workosUserId: v.string(),
    name: v.optional(v.string()),
    range: v.optional(rangeValidator),
    ruleType: v.optional(ruleTypeValidator),
    conditions: v.optional(v.array(conditionValidator)),
    priority: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id)
    if (!rule) {
      throw new Error("Conditional format rule not found")
    }

    await requireWorksheetAccess(ctx, rule.worksheetId, args.workosUserId)

    const updates: Partial<typeof rule> = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) updates.name = args.name
    if (args.range !== undefined) updates.range = args.range
    if (args.ruleType !== undefined) updates.ruleType = args.ruleType
    if (args.conditions !== undefined) updates.conditions = args.conditions
    if (args.priority !== undefined) updates.priority = args.priority
    if (args.enabled !== undefined) updates.enabled = args.enabled

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

/**
 * Toggle a conditional formatting rule on/off
 */
export const toggle = mutation({
  args: {
    id: v.id("worksheetConditionalFormats"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id)
    if (!rule) {
      throw new Error("Conditional format rule not found")
    }

    await requireWorksheetAccess(ctx, rule.worksheetId, args.workosUserId)

    await ctx.db.patch(args.id, {
      enabled: !rule.enabled,
      updatedAt: Date.now(),
    })
    return !rule.enabled
  },
})

/**
 * Delete a conditional formatting rule
 */
export const remove = mutation({
  args: {
    id: v.id("worksheetConditionalFormats"),
    workosUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id)
    if (!rule) {
      throw new Error("Conditional format rule not found")
    }

    await requireWorksheetAccess(ctx, rule.worksheetId, args.workosUserId)

    await ctx.db.delete(args.id)
    return true
  },
})

/**
 * Reorder rules by updating priorities
 */
export const reorder = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.string(),
    /** Array of rule IDs in new priority order (first = lowest priority) */
    ruleIds: v.array(v.id("worksheetConditionalFormats")),
  },
  handler: async (ctx, args) => {
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId)

    const now = Date.now()

    // Update each rule's priority based on position in array
    for (let i = 0; i < args.ruleIds.length; i++) {
      const rule = await ctx.db.get(args.ruleIds[i])
      if (rule && rule.worksheetId === args.worksheetId) {
        await ctx.db.patch(args.ruleIds[i], {
          priority: i,
          updatedAt: now,
        })
      }
    }

    return true
  },
})
