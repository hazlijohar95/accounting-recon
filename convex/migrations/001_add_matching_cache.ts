/**
 * Migration 001: Add Matching Cache Table
 *
 * This migration adds the matchingCache table to the schema.
 * Run this migration by deploying the updated schema.
 *
 * Steps:
 * 1. Update schema.ts with the matchingCache table definition
 * 2. Run: npx convex deploy
 *
 * Rollback:
 * 1. Remove the matchingCache table from schema.ts
 * 2. Run: npx convex deploy
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Check if migration is needed
 */
export const checkMigrationStatus = query({
  args: {},
  returns: v.object({
    needsMigration: v.boolean(),
    currentVersion: v.number(),
    targetVersion: v.number(),
  }),
  handler: async () => {
    // NOTE: matchingCache table was planned but not implemented.
    // This migration is a placeholder for future cache optimization.
    // When ready, add matchingCache to schema.ts first, then update this.
    return {
      needsMigration: true, // Table not yet added to schema
      currentVersion: 0,
      targetVersion: 1,
    };
  },
});

/**
 * Migration instructions
 *
 * Add this to schema.ts:
 *
 * ```typescript
 * // Matching cache for performance optimization
 * matchingCache: defineTable({
 *   sessionId: v.id("reconciliationSessions"),
 *   cacheKey: v.string(),
 *   layer: v.number(),
 *   results: v.array(
 *     v.object({
 *       cashTransactionId: v.string(),
 *       accrualDocumentId: v.string(),
 *       confidenceScore: v.number(),
 *       matchLayer: v.number(),
 *       matchReason: v.string(),
 *     })
 *   ),
 *   createdAt: v.number(),
 *   expiresAt: v.number(),
 * })
 *   .index("by_session", ["sessionId"])
 *   .index("by_session_key", ["sessionId", "cacheKey"])
 *   .index("by_expires", ["expiresAt"]),
 * ```
 */
export const getMigrationInstructions = query({
  args: {},
  returns: v.string(),
  handler: async () => {
    return `
Migration 001: Add Matching Cache Table

1. Open convex/schema.ts
2. Add the matchingCache table definition (see comments in this file)
3. Run: npx convex deploy
4. Verify by running: npx convex run migrations/001_add_matching_cache:checkMigrationStatus
    `.trim();
  },
});
