/**
 * Migration 004: Clear All Data (Dev Only)
 *
 * Wipes all user-uploaded data, sessions, matches, chat, etc.
 * Preserves: users, companies (account/org data).
 *
 * Usage:
 *   npx convex run migrations/004_clear_all_data:clearAll
 *
 * Run backfill aggregates after:
 *   npx convex run migrations/003_backfill_aggregates:clearAggregates '{"confirmClear": "I_UNDERSTAND_THIS_DELETES_ALL_AGGREGATES"}'
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";

const TABLES_TO_CLEAR = [
  "transactions",
  "documents",
  "matchedPairs",
  "reconciliationSessions",
  "accrualDocuments",
  "suspenseItems",
  "categories",
  "pdfExportJobs",
  "exportJobs",
  "onboardingProgress",
  "workspaces",
  "worksheets",
  "worksheetColumns",
  "worksheetRows",
  "agentJobs",
  "companyCredits",
  "creditTransactions",
  "worksheetDataSources",
  "worksheetConditionalFormats",
  "worksheetCharts",
  "sheetTemplates",
  "uploadAnalyses",
  "counters",
  "extractionQueue",
  "extractionQueueItems",
  "userPreferences",
  "rateLimits",
  "uploadRateLimits",
  "reconciliationChatMessages",
  "worksheetMessages",
  "errors",
  "auditLog",
] as const;

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const results: Record<string, number> = {};

    for (const table of TABLES_TO_CLEAR) {
      let deleted = 0;
      // Delete in batches to avoid timeouts
      const docs = await (ctx.db.query(table as any) as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
      if (deleted > 0) {
        results[table] = deleted;
      }
    }

    // Also clear file storage
    // Note: _storage docs can't be queried the same way, 
    // but uploaded files become orphaned once documents table is cleared

    return {
      message: "All data cleared. Run clearAggregates next.",
      deleted: results,
      preserved: ["users", "companies"],
    };
  },
});
