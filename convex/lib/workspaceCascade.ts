/**
 * Workspace Cascade Deletion Helpers
 *
 * Centralized cascade deletion logic for workspace operations.
 * Used by: workspaces.ts (deleteWorkspace, deleteWorksheet, emptyTrash)
 *
 * @module convex/lib/workspace-cascade
 */

import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Delete all data associated with a worksheet.
 * Includes: rows, columns, agent jobs.
 */
export async function deleteWorksheetCascade(
  ctx: MutationCtx,
  worksheetId: Id<"worksheets">
): Promise<void> {
  // Delete all rows
  const rows = await ctx.db
    .query("worksheetRows")
    .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheetId))
    .collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }

  // Delete all columns
  const columns = await ctx.db
    .query("worksheetColumns")
    .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheetId))
    .collect();
  for (const column of columns) {
    await ctx.db.delete(column._id);
  }

  // Delete all agent jobs
  const jobs = await ctx.db
    .query("agentJobs")
    .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheetId))
    .collect();
  for (const job of jobs) {
    await ctx.db.delete(job._id);
  }
}

/**
 * Delete agent jobs associated with a row.
 */
export async function deleteAgentJobsForRow(
  ctx: MutationCtx,
  rowId: Id<"worksheetRows">
): Promise<void> {
  const jobs = await ctx.db
    .query("agentJobs")
    .withIndex("by_row", (q) => q.eq("rowId", rowId))
    .collect();
  for (const job of jobs) {
    await ctx.db.delete(job._id);
  }
}

/**
 * Clear cell data for a specific column from all rows in a worksheet.
 * Also clears associated status and error data.
 */
export async function clearCellsForColumn(
  ctx: MutationCtx,
  worksheetId: Id<"worksheets">,
  columnKey: string
): Promise<void> {
  const rows = await ctx.db
    .query("worksheetRows")
    .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheetId))
    .collect();

  const now = Date.now();
  for (const row of rows) {
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
        updatedAt: now,
      });
    }
  }
}

/**
 * Delete all soft-deleted rows from a worksheet.
 * Also deletes associated agent jobs.
 */
export async function deleteTrashRows(
  ctx: MutationCtx,
  worksheetId: Id<"worksheets">
): Promise<void> {
  const rows = await ctx.db
    .query("worksheetRows")
    .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheetId))
    .collect();

  for (const row of rows) {
    if (row.deletedAt) {
      await deleteAgentJobsForRow(ctx, row._id);
      await ctx.db.delete(row._id);
    }
  }
}

/**
 * Delete all soft-deleted columns from a worksheet.
 * Also clears cell data for those columns from remaining rows.
 */
export async function deleteTrashColumns(
  ctx: MutationCtx,
  worksheetId: Id<"worksheets">
): Promise<void> {
  const columns = await ctx.db
    .query("worksheetColumns")
    .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheetId))
    .collect();

  for (const column of columns) {
    if (column.deletedAt) {
      const columnKey = `col_${column.order}`;
      await clearCellsForColumn(ctx, worksheetId, columnKey);
      await ctx.db.delete(column._id);
    }
  }
}
