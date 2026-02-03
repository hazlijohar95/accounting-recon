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
} from "./lib/auth";
import { ValidationErrors } from "./lib/errors";
import { WORKSPACE_LIMITS } from "./lib/constants";
import {
  verifyQueryWorkspaceAccess,
  verifyQueryWorksheetAccess,
  requireWorkspaceAccess,
  requireWorksheetAccess,
} from "./lib/workspaceAuth";
import {
  validateNameLength,
  validateDescriptionLength,
  validateFormulaLength,
  validateCellValue,
  validateCells,
  validateColumnKeyFormat,
  validateBatchSize,
  clampColumnWidth,
} from "./lib/workspaceValidators";
import {
  deleteWorksheetCascade,
  deleteAgentJobsForRow,
  clearCellsForColumn,
  deleteTrashRows,
  deleteTrashColumns,
} from "./lib/workspaceCascade";

// ============================================================================
// Workspace Queries
// ============================================================================

/**
 * List all workspaces for a company.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const listWorkspaces = query({
  args: {
    companyId: v.id("companies"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this company (with workosUserId fallback)
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
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
  args: {
    workspaceId: v.id("workspaces"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace (with workosUserId fallback)
    const { allowed, workspace } = await verifyQueryWorkspaceAccess(ctx, args.workspaceId, args.workosUserId);
    if (!allowed) return null;

    return workspace;
  },
});

/**
 * Get workspace with all its worksheets.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const getWorkspaceWithWorksheets = query({
  args: {
    workspaceId: v.id("workspaces"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace (with workosUserId fallback)
    const { allowed, workspace } = await verifyQueryWorkspaceAccess(ctx, args.workspaceId, args.workosUserId);
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
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this company (derives user from auth context)
    const { user } = await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

    // Validate name length
    validateNameLength(args.name);
    if (args.description) {
      validateDescriptionLength(args.description);
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
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    await requireWorkspaceAccess(ctx, args.workspaceId, args.workosUserId);

    // Validate input lengths
    if (args.name !== undefined) {
      validateNameLength(args.name);
    }
    if (args.description !== undefined) {
      validateDescriptionLength(args.description);
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
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    await requireWorkspaceAccess(ctx, args.workspaceId, args.workosUserId);

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
 * NOTE: Soft-deleted items are excluded by default.
 */
export const getWorksheetData = query({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.optional(v.string()),
    includeDeleted: v.optional(v.boolean()), // For viewing trash
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet (with workosUserId fallback)
    const { allowed, worksheet } = await verifyQueryWorksheetAccess(ctx, args.worksheetId, args.workosUserId);
    if (!allowed || !worksheet) return null;

    // Check if worksheet itself is deleted
    if (worksheet.deletedAt && !args.includeDeleted) return null;

    const allColumns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Filter out soft-deleted columns unless includeDeleted is true
    const columns = args.includeDeleted
      ? allColumns
      : allColumns.filter((c) => !c.deletedAt);

    // Sort columns by order
    columns.sort((a, b) => a.order - b.order);

    const allRows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Filter out soft-deleted rows unless includeDeleted is true
    const rows = args.includeDeleted
      ? allRows
      : allRows.filter((r) => !r.deletedAt);

    // Sort rows by rowNumber
    rows.sort((a, b) => a.rowNumber - b.rowNumber);

    return { worksheet, columns, rows };
  },
});

/**
 * Get cell statuses for a worksheet (for real-time updates).
 * This query is subscribed to separately to get live status updates
 * without needing to refetch all data.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const getCellStatuses = query({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { allowed } = await verifyQueryWorksheetAccess(ctx, args.worksheetId, args.workosUserId);
    if (!allowed) return [];

    const rows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    return rows.map((row) => ({
      rowId: row._id,
      cells: row.cells,
      cellStatus: row.cellStatus || {},
      cellErrors: row.cellErrors,
      updatedAt: row.updatedAt,
    }));
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
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this workspace
    await requireWorkspaceAccess(ctx, args.workspaceId, args.workosUserId);

    // Validate name length
    validateNameLength(args.name);

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
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

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
    inputColumnId: v.optional(v.id("worksheetColumns")),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    // Validate inputs
    validateNameLength(args.name);
    if (args.formula) {
      validateFormulaLength(args.formula);
    }

    // Validate inputColumnId if provided
    if (args.inputColumnId) {
      const inputColumn = await ctx.db.get(args.inputColumnId);
      if (!inputColumn || inputColumn.worksheetId !== args.worksheetId) {
        throw new Error("Invalid input column");
      }
    }

    // Get current max order
    const columns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    // Limit number of columns
    if (columns.length >= WORKSPACE_LIMITS.MAX_COLUMNS_PER_WORKSHEET) {
      throw new Error(`Maximum columns reached (${WORKSPACE_LIMITS.MAX_COLUMNS_PER_WORKSHEET})`);
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
      inputColumnId: args.inputColumnId,
    });

    // Update worksheet's updatedAt
    await ctx.db.patch(args.worksheetId, { updatedAt: Date.now() });

    return columnId;
  },
});

/**
 * Delete a column (soft delete by default).
 * SECURITY: Requires authenticated user with company ownership.
 * Note: Soft delete keeps cell data in rows, which allows restoration.
 * Use permanent=true to actually remove the column and clear cell data.
 */
export const deleteColumn = mutation({
  args: {
    columnId: v.id("worksheetColumns"),
    workosUserId: v.optional(v.string()),
    permanent: v.optional(v.boolean()), // Set to true for hard delete
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId);

    const columnKey = `col_${column.order}`;
    const now = Date.now();

    // Check for dependent formula columns - block deletion if dependencies exist
    const dependentColumns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_input_column", (q) => q.eq("inputColumnId", args.columnId))
      .collect();

    // Only check non-deleted dependent columns
    const activeDependents = dependentColumns.filter(c => !c.deletedAt);
    if (activeDependents.length > 0) {
      const depNames = activeDependents.map(c => `"${c.name}"`).join(", ");
      throw new Error(
        `Cannot delete: ${activeDependents.length} formula column(s) depend on this column: ${depNames}. ` +
        `Please update or delete those columns first.`
      );
    }

    if (args.permanent) {
      // Hard delete - remove column and clear cell data from all rows
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
          updatedAt: now,
        });
      }

      await ctx.db.delete(args.columnId);
    } else {
      // Soft delete - mark as deleted but keep cell data for recovery
      await ctx.db.patch(args.columnId, {
        deletedAt: now,
      });
    }

    await ctx.db.patch(column.worksheetId, { updatedAt: now });
  },
});

/**
 * Update a column's properties (name, formula, inputColumnId).
 * SECURITY: Requires authenticated user with company ownership.
 */
export const updateColumn = mutation({
  args: {
    columnId: v.id("worksheetColumns"),
    name: v.optional(v.string()),
    formula: v.optional(v.string()),
    inputColumnId: v.optional(v.union(v.id("worksheetColumns"), v.null())),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId);

    // Validate inputs
    if (args.name !== undefined) {
      validateNameLength(args.name);
    }
    if (args.formula !== undefined) {
      validateFormulaLength(args.formula);
    }

    // Validate inputColumnId if provided
    if (args.inputColumnId !== undefined && args.inputColumnId !== null) {
      const inputColumn = await ctx.db.get(args.inputColumnId);
      if (!inputColumn || inputColumn.worksheetId !== column.worksheetId) {
        throw new Error("Invalid input column");
      }
      // Prevent formula column from referencing itself
      if (args.inputColumnId === args.columnId) {
        throw new Error("Formula column cannot reference itself as input");
      }
      // Prevent referencing another formula column
      if (inputColumn.columnType === "formula") {
        throw new Error("Cannot use another formula column as input");
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.formula !== undefined) updates.formula = args.formula;
    if (args.inputColumnId !== undefined) {
      updates.inputColumnId = args.inputColumnId === null ? undefined : args.inputColumnId;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.columnId, updates);
      await ctx.db.patch(column.worksheetId, { updatedAt: Date.now() });
    }
  },
});

/**
 * Reorder columns in a worksheet by updating their order values.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const reorderColumns = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    columnIds: v.array(v.id("worksheetColumns")),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    // Verify all columns belong to this worksheet
    const columns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    const columnIdSet = new Set(columns.map((c) => c._id));
    for (const columnId of args.columnIds) {
      if (!columnIdSet.has(columnId)) {
        throw new Error("Invalid column ID - column does not belong to this worksheet");
      }
    }

    // Update order values based on position in array
    const now = Date.now();
    for (let i = 0; i < args.columnIds.length; i++) {
      await ctx.db.patch(args.columnIds[i], { order: i });
    }

    await ctx.db.patch(args.worksheetId, { updatedAt: now });
  },
});

/**
 * Update a column's width.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const updateColumnWidth = mutation({
  args: {
    columnId: v.id("worksheetColumns"),
    width: v.number(),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId);

    // Validate width
    const validWidth = clampColumnWidth(args.width);

    await ctx.db.patch(args.columnId, { width: validWidth });
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
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

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
      version: 0, // Initialize version for optimistic concurrency
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
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    // Limit batch size to prevent DoS
    validateBatchSize(args.rowsData.length, "addRows");

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
        version: 0, // Initialize version for optimistic concurrency
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
 *
 * Supports optimistic concurrency control via the expectedVersion parameter.
 * If provided, the update will only succeed if the row's current version matches.
 * This prevents lost updates when multiple users edit the same cell.
 */
export const updateCell = mutation({
  args: {
    rowId: v.id("worksheetRows"),
    columnKey: v.string(), // e.g., "col_0"
    value: v.any(),
    workosUserId: v.optional(v.string()),
    expectedVersion: v.optional(v.number()), // For optimistic concurrency
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, row.worksheetId, args.workosUserId);

    // Validate column key format
    if (!validateColumnKeyFormat(args.columnKey)) {
      ValidationErrors.invalidFormat("columnKey", "col_N (e.g., col_0)");
    }

    // Validate cell value
    if (!validateCellValue(args.value)) {
      ValidationErrors.outOfRange("value", undefined, WORKSPACE_LIMITS.MAX_CELL_VALUE_LENGTH);
    }

    // OPTIMISTIC CONCURRENCY: Check version if provided
    const currentVersion = row.version ?? 0;
    if (args.expectedVersion !== undefined && args.expectedVersion !== currentVersion) {
      throw new Error(
        `Concurrent edit detected: expected version ${args.expectedVersion}, ` +
        `but row is at version ${currentVersion}. Please refresh and try again.`
      );
    }

    const newCells = { ...row.cells, [args.columnKey]: args.value };

    await ctx.db.patch(args.rowId, {
      cells: newCells,
      version: currentVersion + 1, // Increment version on every update
      updatedAt: Date.now(),
    });

    // Return the new version so client can track it
    return { version: currentVersion + 1 };
  },
});

/**
 * Delete a row (soft delete).
 * SECURITY: Requires authenticated user with company ownership.
 * Use permanentDeleteRow for hard deletion.
 */
export const deleteRow = mutation({
  args: {
    rowId: v.id("worksheetRows"),
    workosUserId: v.optional(v.string()),
    permanent: v.optional(v.boolean()), // Set to true for hard delete
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, row.worksheetId, args.workosUserId);

    const now = Date.now();

    if (args.permanent) {
      // Hard delete - actually remove the row
      const jobs = await ctx.db
        .query("agentJobs")
        .withIndex("by_row", (q) => q.eq("rowId", args.rowId))
        .collect();
      for (const job of jobs) {
        await ctx.db.delete(job._id);
      }
      await ctx.db.delete(args.rowId);
    } else {
      // Soft delete - mark as deleted but keep data for recovery
      await ctx.db.patch(args.rowId, {
        deletedAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(row.worksheetId, { updatedAt: now });
  },
});

/**
 * Delete multiple rows (soft delete by default).
 * SECURITY: Requires authenticated user with company ownership.
 * All rows MUST belong to the same worksheet - cross-worksheet deletion is not allowed.
 */
export const deleteRows = mutation({
  args: {
    rowIds: v.array(v.id("worksheetRows")),
    workosUserId: v.optional(v.string()),
    permanent: v.optional(v.boolean()), // Set to true for hard delete
  },
  handler: async (ctx, args) => {
    if (args.rowIds.length === 0) return;

    // Limit batch size
    validateBatchSize(args.rowIds.length, "deleteRows");

    // SECURITY FIX: Collect all rows first and verify they all belong to the same worksheet
    const rows: Array<{ id: Id<"worksheetRows">; worksheetId: Id<"worksheets"> }> = [];
    let commonWorksheetId: Id<"worksheets"> | null = null;

    for (const rowId of args.rowIds) {
      const row = await ctx.db.get(rowId);
      if (!row) continue;

      // Verify all rows belong to the same worksheet
      if (commonWorksheetId === null) {
        commonWorksheetId = row.worksheetId;
      } else if (row.worksheetId !== commonWorksheetId) {
        // SECURITY: Prevent cross-worksheet deletion attack
        throw new Error(
          "Security violation: Cannot delete rows from multiple worksheets in a single request. " +
          "All rows must belong to the same worksheet."
        );
      }

      rows.push({ id: rowId, worksheetId: row.worksheetId });
    }

    // If no valid rows found, nothing to do
    if (rows.length === 0 || commonWorksheetId === null) return;

    // SECURITY: Verify access to the worksheet (only need to check once since all rows are in same worksheet)
    await requireWorksheetAccess(ctx, commonWorksheetId, args.workosUserId);

    const now = Date.now();

    // Now safe to delete all rows
    for (const row of rows) {
      if (args.permanent) {
        // Hard delete - actually remove the row and its jobs
        const jobs = await ctx.db
          .query("agentJobs")
          .withIndex("by_row", (q) => q.eq("rowId", row.id))
          .collect();
        for (const job of jobs) {
          await ctx.db.delete(job._id);
        }
        await ctx.db.delete(row.id);
      } else {
        // Soft delete - mark as deleted but keep data for recovery
        await ctx.db.patch(row.id, {
          deletedAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(commonWorksheetId, { updatedAt: now });
  },
});

// ============================================================================
// Soft Delete Recovery (Trash)
// ============================================================================

/**
 * Get deleted items (trash) for a worksheet.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const getDeletedItems = query({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    const { allowed } = await verifyQueryWorksheetAccess(ctx, args.worksheetId, args.workosUserId);
    if (!allowed) return { rows: [], columns: [] };

    const allRows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    const deletedRows = allRows
      .filter((r) => r.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)); // Most recent first

    const allColumns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    const deletedColumns = allColumns
      .filter((c) => c.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)); // Most recent first

    return { rows: deletedRows, columns: deletedColumns };
  },
});

/**
 * Restore a soft-deleted row.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const restoreRow = mutation({
  args: {
    rowId: v.id("worksheetRows"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.rowId);
    if (!row) return;

    // Only restore if actually deleted
    if (!row.deletedAt) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, row.worksheetId, args.workosUserId);

    const now = Date.now();
    await ctx.db.patch(args.rowId, {
      deletedAt: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(row.worksheetId, { updatedAt: now });
  },
});

/**
 * Restore multiple soft-deleted rows.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const restoreRows = mutation({
  args: {
    rowIds: v.array(v.id("worksheetRows")),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rowIds.length === 0) return;

    validateBatchSize(args.rowIds.length, "restoreRows");

    let worksheetId: Id<"worksheets"> | null = null;
    const now = Date.now();

    for (const rowId of args.rowIds) {
      const row = await ctx.db.get(rowId);
      if (!row || !row.deletedAt) continue;

      // First row - verify access
      if (!worksheetId) {
        worksheetId = row.worksheetId;
        await requireWorksheetAccess(ctx, worksheetId, args.workosUserId);
      } else if (row.worksheetId !== worksheetId) {
        throw new Error("All rows must belong to the same worksheet");
      }

      await ctx.db.patch(rowId, {
        deletedAt: undefined,
        updatedAt: now,
      });
    }

    if (worksheetId) {
      await ctx.db.patch(worksheetId, { updatedAt: now });
    }
  },
});

/**
 * Restore a soft-deleted column.
 * SECURITY: Requires authenticated user with company ownership.
 */
export const restoreColumn = mutation({
  args: {
    columnId: v.id("worksheetColumns"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) return;

    // Only restore if actually deleted
    if (!column.deletedAt) return;

    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, column.worksheetId, args.workosUserId);

    const now = Date.now();
    await ctx.db.patch(args.columnId, {
      deletedAt: undefined,
    });
    await ctx.db.patch(column.worksheetId, { updatedAt: now });
  },
});

/**
 * Permanently delete all items in trash (empty trash).
 * SECURITY: Requires authenticated user with company ownership.
 */
export const emptyTrash = mutation({
  args: {
    worksheetId: v.id("worksheets"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this worksheet
    await requireWorksheetAccess(ctx, args.worksheetId, args.workosUserId);

    const now = Date.now();

    // Permanently delete all soft-deleted rows
    const rows = await ctx.db
      .query("worksheetRows")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    for (const row of rows) {
      if (row.deletedAt) {
        // Delete agent jobs first
        const jobs = await ctx.db
          .query("agentJobs")
          .withIndex("by_row", (q) => q.eq("rowId", row._id))
          .collect();
        for (const job of jobs) {
          await ctx.db.delete(job._id);
        }
        await ctx.db.delete(row._id);
      }
    }

    // Permanently delete all soft-deleted columns
    const columns = await ctx.db
      .query("worksheetColumns")
      .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
      .collect();

    for (const column of columns) {
      if (column.deletedAt) {
        const columnKey = `col_${column.order}`;
        // Clear cell data for this column from remaining rows
        const activeRows = await ctx.db
          .query("worksheetRows")
          .withIndex("by_worksheet", (q) => q.eq("worksheetId", args.worksheetId))
          .collect();

        for (const row of activeRows) {
          if (row.cells[columnKey] !== undefined) {
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
            });
          }
        }
        await ctx.db.delete(column._id);
      }
    }

    await ctx.db.patch(args.worksheetId, { updatedAt: now });
  },
});

// ============================================================================
// Internal Mutations (for webhooks and scheduled functions)
// ============================================================================

/**
 * Update cell status (called by agent job system).
 * Internal mutation - always increments version for consistency.
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

    const currentVersion = row.version ?? 0;
    const newStatus = { ...row.cellStatus, [args.columnKey]: args.status };
    const updates: Record<string, unknown> = {
      cellStatus: newStatus,
      version: currentVersion + 1, // Always increment version
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
