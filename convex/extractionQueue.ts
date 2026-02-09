// @ts-nocheck - Generated Convex types are stale; run `npx convex dev` to regenerate
/**
 * Extraction Queue Management
 *
 * Handles batch document processing for 50+ document workflows.
 * Features:
 * - Priority-based queue processing
 * - Real-time progress tracking
 * - Pause/resume capability
 * - Estimated time remaining
 *
 * @module convex/extractionQueue
 */

import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authKit } from "./auth";
import { requireAuth } from "./lib/auth";

// ============================================================================
// Type Definitions
// ============================================================================

export interface QueueStats {
  totalQueued: number;
  processing: number;
  completed: number;
  failed: number;
  estimatedTimeRemaining: number | null;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all active queues for a company
 */
export const getActiveQueues = query({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.array(v.object({
    _id: v.id("extractionQueue"),
    batchName: v.optional(v.string()),
    status: v.string(),
    totalDocuments: v.number(),
    completedCount: v.number(),
    failedCount: v.number(),
    currentPosition: v.number(),
    estimatedSecondsRemaining: v.optional(v.number()),
    priority: v.number(),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    // Get non-completed queues
    const queues = await ctx.db
      .query("extractionQueue")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .collect();

    return queues.map((q) => ({
      _id: q._id,
      batchName: q.batchName,
      status: q.status,
      totalDocuments: q.totalDocuments,
      completedCount: q.completedCount,
      failedCount: q.failedCount,
      currentPosition: q.currentPosition,
      estimatedSecondsRemaining: q.estimatedSecondsRemaining,
      priority: q.priority,
      createdAt: q.createdAt,
      startedAt: q.startedAt,
    }));
  },
});

/**
 * Get queue items for a specific queue
 */
export const getQueueItems = query({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.array(v.object({
    _id: v.id("extractionQueueItems"),
    documentId: v.id("documents"),
    position: v.number(),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    processingTimeMs: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_queue_position", (q) => q.eq("queueId", args.queueId))
      .collect();

    return items.map((item) => ({
      _id: item._id,
      documentId: item.documentId,
      position: item.position,
      status: item.status,
      errorMessage: item.errorMessage,
      processingTimeMs: item.processingTimeMs,
    }));
  },
});

/**
 * Get global queue stats for display
 */
export const getQueueStats = query({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.object({
    totalQueued: v.number(),
    processing: v.number(),
    completed: v.number(),
    failed: v.number(),
    estimatedSecondsRemaining: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const queues = await ctx.db
      .query("extractionQueue")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .collect();

    let totalQueued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let totalEstimatedSeconds = 0;

    for (const queue of queues) {
      totalQueued += queue.totalDocuments;
      processing += queue.status === "processing" ? 1 : 0;
      completed += queue.completedCount;
      failed += queue.failedCount;
      if (queue.estimatedSecondsRemaining) {
        totalEstimatedSeconds += queue.estimatedSecondsRemaining;
      }
    }

    return {
      totalQueued,
      processing,
      completed,
      failed,
      estimatedSecondsRemaining: totalEstimatedSeconds > 0 ? totalEstimatedSeconds : null,
    };
  },
});

/**
 * Get position of a specific document in queue
 */
export const getDocumentQueuePosition = query({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.union(
    v.object({
      queueId: v.id("extractionQueue"),
      position: v.number(),
      totalInQueue: v.number(),
      status: v.string(),
      estimatedWaitSeconds: v.union(v.number(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find the queue item for this document
    const queueItem = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .first();

    if (!queueItem || queueItem.status === "completed" || queueItem.status === "failed") {
      return null;
    }

    // Get the queue
    const queue = await ctx.db.get(queueItem.queueId);
    if (!queue || queue.status === "completed" || queue.status === "cancelled") {
      return null;
    }

    // Calculate estimated wait time
    const documentsAhead = queueItem.position - queue.currentPosition;
    const avgTimeMs = queue.avgProcessingTimeMs || 15000; // Default 15s per doc
    const estimatedWaitSeconds = documentsAhead > 0 ? Math.ceil((documentsAhead * avgTimeMs) / 1000) : null;

    return {
      queueId: queueItem.queueId,
      position: queueItem.position + 1, // 1-indexed for display
      totalInQueue: queue.totalDocuments,
      status: queueItem.status,
      estimatedWaitSeconds,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new extraction queue with multiple documents
 */
export const createQueue = mutation({
  args: {
    companyId: v.id("companies"),
    documentIds: v.array(v.id("documents")),
    batchName: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  returns: v.id("extractionQueue"),
  handler: async (ctx, args) => {
    // Get current user
    let userId: Id<"users"> | null = null;
    try {
      const authUser = await authKit.getAuthUser(ctx);
      if (authUser) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_workos", (q) => q.eq("workosId", authUser.id))
          .first();
        userId = user?._id || null;
      }
    } catch {
      // Auth failed
    }

    if (!userId) {
      throw new Error("Authentication required");
    }

    // SECURITY: Validate all documents belong to the specified company
    // This prevents cross-company queue creation
    for (const docId of args.documentIds) {
      const doc = await ctx.db.get(docId);
      if (!doc) {
        throw new Error(`Document ${docId} not found`);
      }
      if (doc.companyId !== args.companyId) {
        console.error(`[Queue] Document ${docId} belongs to different company - potential security issue`);
        throw new Error(`Document ${docId} not authorized for this company`);
      }
    }

    const now = Date.now();

    // Create the queue
    const queueId = await ctx.db.insert("extractionQueue", {
      companyId: args.companyId,
      userId,
      batchName: args.batchName,
      status: "pending",
      totalDocuments: args.documentIds.length,
      completedCount: 0,
      failedCount: 0,
      currentPosition: 0,
      priority: args.priority ?? 0,
      createdAt: now,
    });

    // Create queue items for each document
    for (let i = 0; i < args.documentIds.length; i++) {
      await ctx.db.insert("extractionQueueItems", {
        queueId,
        documentId: args.documentIds[i],
        position: i,
        status: "pending",
      });
    }

    return queueId;
  },
});

/**
 * Cancel a queue
 */
export const cancelQueue = mutation({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId);
    if (!queue) {
      return false;
    }

    // Can only cancel pending or processing queues
    if (queue.status !== "pending" && queue.status !== "processing") {
      return false;
    }

    await ctx.db.patch(args.queueId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    // Mark all pending items as skipped
    const pendingItems = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_queue_status", (q) =>
        q.eq("queueId", args.queueId).eq("status", "pending")
      )
      .collect();

    for (const item of pendingItems) {
      await ctx.db.patch(item._id, { status: "skipped" });
    }

    return true;
  },
});;

// ============ SCHEDULED JOBS ============

/**
 * Process retryable queue items whose nextRetryAt has passed.
 *
 * This is the missing scheduler that completes the exponential backoff retry system.
 * Items that fail extraction get a `nextRetryAt` timestamp set by `scheduleRetry`.
 * This cron picks up items whose retry time has arrived and requeues them.
 *
 * Called by a cron job every 30 seconds.
 */
export const processRetryableItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get items with nextRetryAt in the past that are still pending
    const items = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_next_retry")
      .collect();

    const retryable = items.filter(
      (item) =>
        item.status === "pending" &&
        item.nextRetryAt !== undefined &&
        item.nextRetryAt <= now
    );

    if (retryable.length === 0) return;

    let processedCount = 0;

    for (const item of retryable) {
      // Get the parent queue to check it's still active
      const queue = await ctx.db.get(item.queueId);
      if (!queue || queue.status === "cancelled") continue;

      // Reset the item for processing — clear nextRetryAt so it's picked up
      // by the normal queue processor
      await ctx.db.patch(item._id, {
        nextRetryAt: undefined,
      });

      // Reactivate queue if it was marked completed/failed
      if (queue.status === "completed" || queue.status === "failed") {
        await ctx.db.patch(item.queueId, {
          status: "processing",
          completedAt: undefined,
        });
      }

      processedCount++;
    }

    if (processedCount > 0) {
      console.log(`[QueueRetry] Requeued ${processedCount} item(s) for retry`);
    }
  },
});

/**
 * Get all failed items (DLQ items) for a company.
 * Joins with documents and extractionQueue tables to return enriched data
 * that the DLQ view needs for display.
 */
export const getFailedItems = query({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.array(v.object({
    _id: v.id("extractionQueueItems"),
    queueId: v.id("extractionQueue"),
    documentId: v.id("documents"),
    documentName: v.string(),
    queueName: v.optional(v.string()),
    priority: v.number(),
    retryCount: v.number(),
    maxRetries: v.number(),
    lastError: v.optional(v.string()),
    failedAt: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get all queues for this company
    const queues = await ctx.db
      .query("extractionQueue")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const queueMap = new Map(queues.map((q) => [q._id, q]));

    // Get all DLQ items
    const dlqItems = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_dlq", (q) => q.eq("isDLQ", true))
      .collect();

    // Filter to only company's queues and enrich with joined data
    const enrichedItems = await Promise.all(
      dlqItems
        .filter((item) => queueMap.has(item.queueId))
        .map(async (item) => {
          const doc = await ctx.db.get(item.documentId);
          const queue = queueMap.get(item.queueId);
          return {
            _id: item._id,
            queueId: item.queueId,
            documentId: item.documentId,
            documentName: doc?.fileName ?? "Unknown document",
            queueName: queue?.batchName,
            priority: queue?.priority ?? 0,
            retryCount: item.retryCount ?? 0,
            maxRetries: item.maxRetries ?? 3,
            lastError: item.lastError,
            failedAt: item.completedAt ?? item._creationTime,
            createdAt: item._creationTime,
          };
        })
    );

    return enrichedItems;
  },
});

/**
 * Get items that are ready for retry (nextRetryAt has passed)
 */
export const getRetryableItems = internalQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("extractionQueueItems"),
    queueId: v.id("extractionQueue"),
    documentId: v.id("documents"),
  })),
  handler: async (ctx) => {
    const now = Date.now();

    // Get pending items with nextRetryAt in the past
    const items = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_next_retry")
      .collect();

    return items
      .filter(
        (item) =>
          item.status === "pending" &&
          item.nextRetryAt !== undefined &&
          item.nextRetryAt <= now
      )
      .map((item) => ({
        _id: item._id,
        queueId: item.queueId,
        documentId: item.documentId,
      }));
  },
});

/**
 * Bulk retry all DLQ items for a queue
 */
export const bulkRetryDLQ = mutation({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.number(), // Number of items queued for retry
  handler: async (ctx, args) => {
    const dlqItems = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_queue_status", (q) =>
        q.eq("queueId", args.queueId).eq("status", "failed")
      )
      .filter((q) => q.eq(q.field("isDLQ"), true))
      .collect();

    let retriedCount = 0;

    for (const item of dlqItems) {
      await ctx.db.patch(item._id, {
        status: "pending",
        retryCount: 0,
        lastError: undefined,
        nextRetryAt: undefined,
        isDLQ: false,
        startedAt: undefined,
        completedAt: undefined,
      });
      retriedCount++;
    }

    // Reactivate queue if needed
    const queue = await ctx.db.get(args.queueId);
    if (queue && retriedCount > 0 && (queue.status === "completed" || queue.status === "failed")) {
      await ctx.db.patch(args.queueId, {
        status: "processing",
        completedAt: undefined,
      });
    }

    return retriedCount;
  },
});

/**
 * Bulk retry specific DLQ items by their IDs.
 * Used by the DLQ view where users select individual items to retry.
 */
export const bulkRetryItems = mutation({
  args: {
    itemIds: v.array(v.id("extractionQueueItems")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    let retried = 0;
    const queueIdsToReactivate = new Set<Id<"extractionQueue">>();
    const verifiedQueues = new Map<string, boolean>();

    for (const itemId of args.itemIds) {
      const item = await ctx.db.get(itemId);
      if (!item || !(item.status === "failed" || item.isDLQ)) continue;

      // Verify ownership: item → queue → company → owner (cached per queue)
      const queueKey = item.queueId as string;
      if (!verifiedQueues.has(queueKey)) {
        const queue = await ctx.db.get(item.queueId);
        if (!queue) {
          verifiedQueues.set(queueKey, false);
          continue;
        }
        const company = await ctx.db.get(queue.companyId);
        verifiedQueues.set(queueKey, !!company && company.ownerId === user._id);
      }
      if (!verifiedQueues.get(queueKey)) continue;

      await ctx.db.patch(itemId, {
        status: "pending",
        retryCount: 0,
        lastError: undefined,
        nextRetryAt: undefined,
        isDLQ: false,
        startedAt: undefined,
        completedAt: undefined,
      });
      retried++;
      queueIdsToReactivate.add(item.queueId);
    }

    // Reactivate parent queues if needed
    for (const queueId of queueIdsToReactivate) {
      const queue = await ctx.db.get(queueId);
      if (queue && (queue.status === "completed" || queue.status === "failed")) {
        await ctx.db.patch(queueId, {
          status: "processing",
          completedAt: undefined,
        });
      }
    }

    return retried;
  },
});;

/**
 * Delete a DLQ item permanently
 */
export const deleteDLQItem = mutation({
  args: {
    itemId: v.id("extractionQueueItems"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isDLQ) return false;

    // Verify ownership: item → queue → company → owner
    const queue = await ctx.db.get(item.queueId);
    if (!queue) return false;
    const company = await ctx.db.get(queue.companyId);
    if (!company || company.ownerId !== user._id) {
      throw new Error("Access denied: you do not own this resource");
    }

    await ctx.db.delete(args.itemId);

    // Update queue failed count
    if (queue) {
      await ctx.db.patch(item.queueId, {
        failedCount: Math.max(0, queue.failedCount - 1),
      });
    }

    return true;
  },
});;
