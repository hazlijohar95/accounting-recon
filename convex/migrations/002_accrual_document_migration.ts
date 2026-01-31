/**
 * Migration 002: Migrate matchedPairs from accrualTransactionId to accrualDocumentId
 *
 * This migration updates all matchedPairs records to use the new
 * accrualDocumentId field instead of the legacy accrualTransactionId.
 *
 * The migration is designed to be:
 * - Idempotent (safe to run multiple times)
 * - Non-destructive (keeps old field until verified)
 * - Reversible (can rollback by querying either field)
 */

import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Check migration status
 */
export const checkMigrationStatus = query({
  args: {},
  returns: v.object({
    totalPairs: v.number(),
    migratedPairs: v.number(),
    legacyOnlyPairs: v.number(),
    needsMigration: v.boolean(),
  }),
  handler: async (ctx) => {
    const allPairs = await ctx.db.query("matchedPairs").collect();

    let migratedPairs = 0;
    let legacyOnlyPairs = 0;

    for (const pair of allPairs) {
      if (pair.accrualDocumentId) {
        migratedPairs++;
      } else if (pair.accrualTransactionId) {
        legacyOnlyPairs++;
      }
    }

    return {
      totalPairs: allPairs.length,
      migratedPairs,
      legacyOnlyPairs,
      needsMigration: legacyOnlyPairs > 0,
    };
  },
});

/**
 * Run the migration
 *
 * Note: This assumes accrualTransactionId was pointing to an ID
 * that now exists in accrualDocuments. If your data model differs,
 * adjust the migration logic accordingly.
 */
export const migrateMatchedPairs = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    migrated: v.number(),
    skipped: v.number(),
    errors: v.number(),
    total: v.number(),
    complete: v.boolean(),
  }),
  handler: async (ctx, { batchSize = 100 }) => {
    // Get pairs that need migration
    const pairs = await ctx.db
      .query("matchedPairs")
      .filter((q) =>
        q.and(
          q.neq(q.field("accrualTransactionId"), undefined),
          q.eq(q.field("accrualDocumentId"), undefined)
        )
      )
      .take(batchSize);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const pair of pairs) {
      if (!pair.accrualTransactionId) {
        skipped++;
        continue;
      }

      try {
        // Copy the ID to the new field
        // Note: In a real migration, you might need to look up the
        // corresponding accrualDocument ID if they're different entities
        await ctx.db.patch(pair._id, {
          accrualDocumentId: pair.accrualTransactionId as any,
        });
        migrated++;
      } catch (error) {
        console.error(
          `Failed to migrate pair ${pair._id}:`,
          error
        );
        errors++;
      }
    }

    // Check if there are more to migrate
    const remaining = await ctx.db
      .query("matchedPairs")
      .filter((q) =>
        q.and(
          q.neq(q.field("accrualTransactionId"), undefined),
          q.eq(q.field("accrualDocumentId"), undefined)
        )
      )
      .first();

    return {
      migrated,
      skipped,
      errors,
      total: pairs.length,
      complete: remaining === null,
    };
  },
});

/**
 * Cleanup legacy field after migration is verified
 *
 * WARNING: Only run this after verifying all queries use the new field
 */
export const cleanupLegacyFields = mutation({
  args: {
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    cleaned: v.number(),
    remaining: v.number(),
    dryRun: v.boolean(),
  }),
  handler: async (ctx, { batchSize = 100, dryRun = true }) => {
    // Get pairs with legacy field
    const pairs = await ctx.db
      .query("matchedPairs")
      .filter((q) => q.neq(q.field("accrualTransactionId"), undefined))
      .take(batchSize);

    let cleaned = 0;

    if (!dryRun) {
      for (const pair of pairs) {
        // Remove legacy field by setting to undefined
        await ctx.db.patch(pair._id, {
          accrualTransactionId: undefined,
        });
        cleaned++;
      }
    }

    // Check remaining
    const remaining = await ctx.db
      .query("matchedPairs")
      .filter((q) => q.neq(q.field("accrualTransactionId"), undefined))
      .collect();

    return {
      cleaned: dryRun ? 0 : cleaned,
      remaining: remaining.length - (dryRun ? 0 : cleaned),
      dryRun,
    };
  },
});

/**
 * Rollback migration if needed
 */
export const rollbackMigration = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    rolledBack: v.number(),
    remaining: v.number(),
  }),
  handler: async (ctx, { batchSize = 100 }) => {
    // Get pairs that were migrated but still have legacy field
    const pairs = await ctx.db
      .query("matchedPairs")
      .filter((q) =>
        q.and(
          q.neq(q.field("accrualDocumentId"), undefined),
          q.neq(q.field("accrualTransactionId"), undefined)
        )
      )
      .take(batchSize);

    let rolledBack = 0;

    for (const pair of pairs) {
      // Clear the new field, keep legacy
      await ctx.db.patch(pair._id, {
        accrualDocumentId: undefined,
      });
      rolledBack++;
    }

    const remaining = await ctx.db
      .query("matchedPairs")
      .filter((q) =>
        q.and(
          q.neq(q.field("accrualDocumentId"), undefined),
          q.neq(q.field("accrualTransactionId"), undefined)
        )
      )
      .collect();

    return {
      rolledBack,
      remaining: remaining.length - rolledBack,
    };
  },
});
