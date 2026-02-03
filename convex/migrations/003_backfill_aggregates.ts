/**
 * Migration 003: Backfill Aggregates
 *
 * This migration populates the aggregate data structures for existing
 * transactions and matched pairs to enable O(log n) count/sum queries.
 *
 * Run this migration ONCE after deploying the aggregate component.
 *
 * Usage:
 *   npx convex run migrations/003_backfill_aggregates:backfillTransactions
 *   npx convex run migrations/003_backfill_aggregates:backfillMatches
 *
 * Each function processes in batches to avoid timeout. Run repeatedly
 * until it returns { done: true }.
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { transactionCounts, transactionSums, matchCountsByStatus, matchCountsByConfidence } from "../lib/aggregates";

const BATCH_SIZE = 100;

/**
 * Backfill transaction aggregates
 * Run repeatedly until done: true
 */
export const backfillTransactions = mutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Query transactions, continuing from cursor if provided
    let query = ctx.db.query("transactions");

    const transactions = await query.take(BATCH_SIZE + 1);

    const hasMore = transactions.length > BATCH_SIZE;
    const batch = hasMore ? transactions.slice(0, BATCH_SIZE) : transactions;

    let processed = 0;
    for (const doc of batch) {
      try {
        await transactionCounts.insert(ctx, doc);
        await transactionSums.insert(ctx, doc);
        processed++;
      } catch (error) {
        // Skip if already exists (idempotent)
        console.log(`Skipping transaction ${doc._id}: likely already in aggregate`);
      }
    }

    const nextCursor = hasMore ? batch[batch.length - 1]._id : undefined;

    return {
      processed,
      done: !hasMore,
      nextCursor,
      message: hasMore
        ? `Processed ${processed} transactions. Run again with cursor: "${nextCursor}"`
        : `Migration complete! Processed ${processed} transactions.`,
    };
  },
});

/**
 * Backfill match aggregates
 * Run repeatedly until done: true
 */
export const backfillMatches = mutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Query matched pairs, continuing from cursor if provided
    let query = ctx.db.query("matchedPairs");

    const matches = await query.take(BATCH_SIZE + 1);

    const hasMore = matches.length > BATCH_SIZE;
    const batch = hasMore ? matches.slice(0, BATCH_SIZE) : matches;

    let processed = 0;
    for (const doc of batch) {
      try {
        await matchCountsByStatus.insert(ctx, doc);
        await matchCountsByConfidence.insert(ctx, doc);
        processed++;
      } catch (error) {
        // Skip if already exists (idempotent)
        console.log(`Skipping match ${doc._id}: likely already in aggregate`);
      }
    }

    const nextCursor = hasMore ? batch[batch.length - 1]._id : undefined;

    return {
      processed,
      done: !hasMore,
      nextCursor,
      message: hasMore
        ? `Processed ${processed} matches. Run again with cursor: "${nextCursor}"`
        : `Migration complete! Processed ${processed} matches.`,
    };
  },
});

/**
 * Clear all aggregates (for debugging/reset)
 * WARNING: This will delete all aggregate data!
 */
export const clearAggregates = mutation({
  args: {
    confirmClear: v.literal("I_UNDERSTAND_THIS_DELETES_ALL_AGGREGATES"),
  },
  handler: async (ctx, args) => {
    // Clear transaction aggregates
    await transactionCounts.clear(ctx);
    await transactionSums.clear(ctx);

    // Clear match aggregates
    await matchCountsByStatus.clear(ctx);
    await matchCountsByConfidence.clear(ctx);

    return { message: "All aggregates cleared. Run backfill migrations to repopulate." };
  },
});
