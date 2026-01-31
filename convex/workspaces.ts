/**
 * Workspace CRUD operations for the agentic spreadsheet feature.
 *
 * Provides queries and mutations for:
 * - Workspaces (collections of worksheets)
 * - Worksheets (individual spreadsheet tabs)
 * - Columns (schema definitions)
 * - Rows (cell data)
 *
 * @module convex/workspaces
 */

import { v } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import {
  requireCompanyAccess,
  verifyQueryCompanyAccess,
  getOptionalAuth,
} from "./lib/auth";
import {
  PermissionErrors,
  ResourceErrors,
  ValidationErrors,
} from "./lib/errors";

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Maximum allowed length for cell values to prevent DoS
 */
const MAX_CELL_VALUE_LENGTH = 100_000; // 100KB per cell
const MAX_CELLS_PER_ROW = 100;

/**
 * Verify workspace access for queries (returns allowed flag instead of throwing).
 * Uses standard auth helpers from lib/auth.
 */
async function verifyQueryWorkspaceAccess(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">
): Promise<{ allowed: boolean; user: Doc<"users"> | null; workspace: Doc<"workspaces"> | null }> {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    return { allowed: false, user: null, workspace: null };
  }

  const { allowed, user } = await verifyQueryCompanyAccess(ctx, workspace.companyId);
  return { allowed, user, workspace };
}

/**
 * Verify worksheet access for queries.
 */
async function verifyQueryWorksheetAccess(
  ctx: QueryCtx,
  worksheetId: Id<"worksheets">
): Promise<{ allowed: boolean; user: Doc<"users"> | null; worksheet: Doc<"worksheets"> | null; workspace: Doc<"workspaces"> | null }> {
  const worksheet = await ctx.db.get(worksheetId);
  if (!worksheet) {
    return { allowed: false, user: null, worksheet: null, workspace: null };
  }

  const { allowed, user, workspace } = await verifyQueryWorkspaceAccess(ctx, worksheet.workspaceId);
  return { allowed, user, worksheet, workspace };
}

/**
 * Require workspace access for mutations (throws if unauthorized).
 * Uses standard auth helpers from lib/auth.
 */
async function requireWorkspaceAccess(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">
): Promise<{ user: Doc<"users">; workspace: Doc<"workspaces">; company: Doc<"companies"> }> {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    return ResourceErrors.notFound("Workspace", workspaceId);
  }

  const { user, company } = await requireCompanyAccess(ctx, workspace.companyId);
  return { user, workspace, company };
}

/**
 * Require worksheet access for mutations.
 */
async function requireWorksheetAccess(
  ctx: MutationCtx,
  worksheetId: Id<"worksheets">
): Promise<{ user: Doc<"users">; worksheet: Doc<"worksheets">; workspace: Doc<"workspaces">; company: Doc<"companies"> }> {
  const worksheet = await ctx.db.get(worksheetId);
  if (!worksheet) {
    return ResourceErrors.notFound("Worksheet", worksheetId);
  }

  const { user, workspace, company } = await requireWorkspaceAccess(ctx, worksheet.workspaceId);
  return { user, worksheet, workspace, company };
}

/**
 * Validate cell value to prevent DoS attacks.
 */
function validateCellValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    return value.length <= MAX_CELL_VALUE_LENGTH;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  // For objects/arrays, stringify and check length
  try {
    const str = JSON.stringify(value);
    return str.length <= MAX_CELL_VALUE_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Validate cells object.
 */
function validateCells(cells: Record<string, unknown>): { valid: boolean; error?: string } {
  const keys = Object.keys(cells);
  if (keys.length > MAX_CELLS_PER_ROW) {
    return { valid: false, error: `Too many cells (max ${MAX_CELLS_PER_ROW})` };
  }
  for (const [key, value] of Object.entries(cells)) {
    if (!key.match(/^col_\d+$/)) {
      return { valid: false, error: `Invalid column key: ${key}` };
    }
    if (!validateCellValue(value)) {
      return { valid: false, error: `Cell value too large for ${key}` };
    }
  }
  return { valid: true };
}

// ============================================================================
// Workspace Queries
// ============================================================================

/**
 * List all workspaces for a company.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const listWorkspaces = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this company
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId);
    if (!allowed) return [];

    return await ctx.db
      .query("workspaces")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

/**
 * Get a single workspace by ID.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const getWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    const { allowed, workspace } = await verifyQueryWorkspaceAccess(ctx, args.workspaceId);
    if (!allowed) return null;

    return workspace;
  },
});

/**
 * Get workspace with all its worksheets.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const getWorkspaceWithWorksheets = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    const { allowed, workspace } = await verifyQueryWorkspaceAccess(ctx, args.workspaceId);
    if (!allowed || !workspace) return null;

    const worksheets = await ctx.db
      .query("worksheets")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return { ...workspace, worksheets };
  },
});

// ============================================================================
// Workspace Mutations
// ============================================================================

/**
 * Create a new workspace.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const createWorkspace = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this company (derives user from auth context)
    const { user } = await requireCompanyAccess(ctx, args.companyId);

    // Validate name length
    if (args.name.length > 255) {
      ValidationErrors.outOfRange("name", undefined, 255);
    }
    if (args.description && args.description.length > 1000) {
      ValidationErrors.outOfRange("description", undefined, 1000);
    }

    const now = Date.now();

    const workspaceId = await ctx.db.insert("workspaces", {
      companyId: args.companyId,
      name: args.name,
      description: args.description,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Create a default worksheet
    await ctx.db.insert("worksheets", {
      workspaceId,
      name: "Sheet 1",
      createdAt: now,
      updatedAt: now,
    });

    return workspaceId;
  },
});

/**
 * Update workspace name/description.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const updateWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    await requireWorkspaceAccess(ctx, args.workspaceId);

    // Validate input lengths
    if (args.name !== undefined && args.name.length > 255) {
      ValidationErrors.outOfRange("name", undefined, 255);
    }
    if (args.description !== undefined && args.description.length > 1000) {
      ValidationErrors.outOfRange("description", undefined, 1000);
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.workspaceId, updates);
  },
});

/**
 * Delete a workspace and all its worksheets, rows, columns.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    await requireWorkspaceAccess(ctx, args.workspaceId);

    // Get all worksheets
    const worksheets = await ctx.db
      .query("worksheets")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Delete rows, columns, and agent jobs for each worksheet
    for (const worksheet of worksheets) {
      const rows = await ctx.db
        .query("worksheetRows")
        .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheet._id))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }

      const columns = await ctx.db
        .query("worksheetColumns")
        .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheet._id))
        .collect();
      for (const column of columns) {
        await ctx.db.delete(column._id);
      }

      const jobs = await ctx.db
        .query("agentJobs")
        .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheet._id))
        .collect();
      for (const job of jobs) {
        await ctx.db.delete(job._id);
      }

      await ctx.db.delete(worksheet._id);
    }

    // Delete the workspace
    await ctx.db.delete(args.workspaceId);
  },
});

// ============================================================================
// Worksheet Queries
// ============================================================================

/**
 * Get a worksheet with all its columns and rows.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const getWorksheetData = query({
  args: { worksheetId: v.id("worksheets") },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { allowed, worksheet } = await verifyQueryWorksheetAccess(ctx, args.worksheetId);
    if (!allowed || !worksheet) return null;

    const columns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Sort columns by order
    columns.sort((a, b) => a.order - b.order);

    const rows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Sort rows by rowNumber
    rows.sort((a, b) => a.rowNumber - b.rowNumber);

    return { worksheet, columns, rows };
  },
});

// ============================================================================
// Worksheet Mutations
// ============================================================================

/**
 * Create a new worksheet in a workspace.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const createWorksheet = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    await requireWorkspaceAccess(ctx, args.workspaceId);

    // Validate name length
    if (args.name.length > 255) {
      ValidationErrors.outOfRange("name", undefined, 255);
    }

    const now = Date.now();

    const worksheetId = await ctx.db.insert("worksheets", {
      workspaceId: args.workspaceId,
      name: args.name,
      createdAt: now,
      updatedAt: now,
    });

    // Update workspace's updatedAt
    await ctx.db.patch(args.workspaceId, { updatedAt: now });

    return worksheetId;
  },
});

/**
 * Delete a worksheet and all its data.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const deleteWorksheet = mutation({
  args: {
    worksheetId: v.id("worksheets"),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId);

    // Delete all rows
    const rows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    // Delete all columns
    const columns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();
    for (const column of columns) {
      await ctx.db.delete(column._id);
    }

    // Delete all agent jobs
    const jobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    // Delete the worksheet
    await ctx.db.delete(args.worksheetId);
  },
});

// ============================================================================
// Column Mutations
// ============================================================================

/**
 * Add a new column to a worksheet.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const addColumn = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    name: v.string(),
    columnType: v.union(v.literal("text"), v.literal("number"), v.literal("formula")),
    formula: v.optional(v.string()),
    dataSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId);

    // Validate inputs
    if (args.name.length > 255) {
      ValidationErrors.outOfRange("name", undefined, 255);
    }
    if (args.formula && args.formula.length > 10000) {
      ValidationErrors.outOfRange("formula", undefined, 10000);
    }

    // Get current max order
    const columns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Limit number of columns
    if (columns.length >= MAX_CELLS_PER_ROW) {
      throw new Error(`Maximum columns reached (${MAX_CELLS_PER_ROW})`);
    }

    const maxOrder = columns.length > 0
      ? Math.max(...columns.map((c) => c.order))
      : -1;

    const columnId = await ctx.db.insert("worksheetColumns", {
      worksheetId: args.worksheetId,
      order: maxOrder + 1,
      name: args.name,
      columnType: args.columnType,
      formula: args.formula,
      dataSource: args.dataSource,
    });

    // Update worksheet's updatedAt
    await ctx.db.patch(args.worksheetId, { updatedAt: Date.now() });

    return columnId;
  },
});

/**
 * Delete a column and update row data.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const deleteColumn = mutation({
  args: {
    columnId: v.id("worksheetColumns"),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, column.worksheetId);

    const columnKey = `col_${column.order}`;

    // Remove this column's data from all rows
    const rows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", column.worksheetId))
      .collect();

    for (const row of rows) {
      const newCells = { ...row.cells };
      delete newCells[columnKey];

      const newStatus = { ...row.cellStatus };
      delete newStatus[columnKey];

      const newErrors = row.cellErrors ? { ...row.cellErrors } : undefined;
      if (newErrors) delete newErrors[columnKey];

      await ctx.db.patch(row._id, {
        cells: newCells,
        cellStatus: newStatus,
        cellErrors: newErrors,
        updatedAt: Date.now(),
      });
    }

    // Delete the column
    await ctx.db.delete(args.columnId);
  },
});

// ============================================================================
// Row Mutations
// ============================================================================

/**
 * Add a new row to a worksheet.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const addRow = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    cells: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId);

    // Validate cells if provided
    if (args.cells) {
      const validation = validateCells(args.cells);
      if (!validation.valid) {
        ValidationErrors.invalidInput("cells", validation.error);
      }
    }

    // Get current max row number
    const rows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    const maxRowNumber = rows.length > 0
      ? Math.max(...rows.map((r) => r.rowNumber))
      : -1;

    const now = Date.now();

    const rowId = await ctx.db.insert("worksheetRows", {
      worksheetId: args.worksheetId,
      rowNumber: maxRowNumber + 1,
      cells: args.cells || {},
      cellStatus: {},
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.worksheetId, { updatedAt: now });

    return rowId;
  },
});

/**
 * Add multiple rows at once (for bulk import).
 * SECURITY: Requires authenticated user with company ownership.
 */
export const addRows = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    rowsData: v.array(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId);

    // Limit batch size to prevent DoS
    const MAX_BATCH_SIZE = 1000;
    if (args.rowsData.length > MAX_BATCH_SIZE) {
      ValidationErrors.bulkLimitExceeded(MAX_BATCH_SIZE, args.rowsData.length);
    }

    // Validate all cells
    for (const cells of args.rowsData) {
      const validation = validateCells(cells);
      if (!validation.valid) {
        ValidationErrors.invalidInput("cells", validation.error);
      }
    }

    // Get current max row number
    const existingRows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    let nextRowNumber = existingRows.length > 0
      ? Math.max(...existingRows.map((r) => r.rowNumber)) + 1
      : 0;

    const now = Date.now();
    const rowIds: Id<"worksheetRows">[] = [];

    for (const cells of args.rowsData) {
      const rowId = await ctx.db.insert("worksheetRows", {
        worksheetId: args.worksheetId,
        rowNumber: nextRowNumber++,
        cells,
        cellStatus: {},
        createdAt: now,
        updatedAt: now,
      });
      rowIds.push(rowId);
    }

    await ctx.db.patch(args.worksheetId, { updatedAt: now });

    return rowIds;
  },
});

/**
 * Update a cell value in a row.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const updateCell = mutation({
  args: {
    rowId: v.id("worksheetRows"),
    columnKey: v.string(), // e.g., "col_0"
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, row.worksheetId);

    // Validate column key format
    if (!args.columnKey.match(/^col_\d+$/)) {
      ValidationErrors.invalidFormat("columnKey", "col_N (e.g., col_0)");
    }

    // Validate cell value
    if (!validateCellValue(args.value)) {
      ValidationErrors.outOfRange("value", undefined, MAX_CELL_VALUE_LENGTH);
    }

    const newCells = { ...row.cells, [args.columnKey]: args.value };

    await ctx.db.patch(args.rowId, {
      cells: newCells,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a row.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const deleteRow = mutation({
  args: {
    rowId: v.id("worksheetRows"),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, row.worksheetId);

    // Delete any pending agent jobs for this row
    const jobs = await ctx.db
      .query("agentJobs")
      .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
      .collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    await ctx.db.delete(args.rowId);
    await ctx.db.patch(row.worksheetId, { updatedAt: Date.now() });
  },
});

/**
 * Delete multiple rows.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const deleteRows = mutation({
  args: {
    rowIds: v.array(v.id("worksheetRows")),
  },
  handler: async (ctx, args) => {
    // Limit batch size
    const MAX_BATCH_SIZE = 1000;
    if (args.rowIds.length > MAX_BATCH_SIZE) {
      ValidationErrors.bulkLimitExceeded(MAX_BATCH_SIZE, args.rowIds.length);
    }

    let worksheetId: Id<"worksheets"> | null = null;
    let hasVerifiedAccess = false;

    for (const rowId of args.rowIds) {
      const row = await ctx.db.get(rowId);
      if (!row) continue;

      worksheetId = row.worksheetId;

      // SECURITY: Verify access once (all rows should be from same worksheet)
      if (!hasVerifiedAccess) {
        await requireWorksheetAccess(ctx, row.worksheetId);
        hasVerifiedAccess = true;
      }

      // Delete any pending agent jobs for this row
      const jobs = await ctx.db
        .query("agentJobs")
        .withIndex("by_row", (q) => q.eq("rowId", rowId))
        .collect();
      for (const job of jobs) {
        await ctx.db.delete(job._id);
      }

      await ctx.db.delete(rowId);
    }

    if (worksheetId) {
      await ctx.db.patch(worksheetId, { updatedAt: Date.now() });
    }
  },
});

// ============================================================================
// Internal Mutations (for webhooks and scheduled functions)
// ============================================================================

/**
 * Update cell status (called by agent job system).
 */
export const updateCellStatus = internalMutation({
  args: {
    rowId: v.id("worksheetRows"),
    columnKey: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("error")
    ),
    value: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) return;

    const newStatus = { ...row.cellStatus, [args.columnKey]: args.status };
    const updates: Record<string, unknown> = {
      cellStatus: newStatus,
      updatedAt: Date.now(),
    };

    if (args.value !== undefined) {
      updates.cells = { ...row.cells, [args.columnKey]: args.value };
    }

    if (args.error !== undefined) {
      updates.cellErrors = { ...(row.cellErrors || {}), [args.columnKey]: args.error };
    } else if (args.status === "complete") {
      // Clear error on success
      const newErrors = { ...(row.cellErrors || {}) };
      delete newErrors[args.columnKey];
      if (Object.keys(newErrors).length > 0) {
        updates.cellErrors = newErrors;
      } else {
        updates.cellErrors = undefined;
      }
    }

    await ctx.db.patch(args.rowId, updates);
  },
});
