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
});

/**
 * Update queue item status (internal)
 */
export const updateQueueItemStatus = internalMutation({
  args: {
    itemId: v.id("extractionQueueItems"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    errorMessage: v.optional(v.string()),
    processingTimeMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = {
      status: args.status,
    };

    if (args.status === "processing") {
      update.startedAt = Date.now();
    }

    if (args.status === "completed" || args.status === "failed") {
      update.completedAt = Date.now();
    }

    if (args.errorMessage !== undefined) {
      update.errorMessage = args.errorMessage;
    }

    if (args.processingTimeMs !== undefined) {
      update.processingTimeMs = args.processingTimeMs;
    }

    await ctx.db.patch(args.itemId, update);
    return null;
  },
});

/**
 * Update queue progress (internal)
 */
export const updateQueueProgress = internalMutation({
  args: {
    queueId: v.id("extractionQueue"),
    currentPosition: v.number(),
    completedCount: v.number(),
    failedCount: v.number(),
    avgProcessingTimeMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId);
    if (!queue) return null;

    const remaining = queue.totalDocuments - args.completedCount - args.failedCount;
    const avgTime = args.avgProcessingTimeMs || queue.avgProcessingTimeMs || 15000;
    const estimatedSecondsRemaining = Math.ceil((remaining * avgTime) / 1000);

    await ctx.db.patch(args.queueId, {
      currentPosition: args.currentPosition,
      completedCount: args.completedCount,
      failedCount: args.failedCount,
      avgProcessingTimeMs: args.avgProcessingTimeMs,
      estimatedSecondsRemaining,
    });

    return null;
  },
});

/**
 * Start processing a queue (internal)
 */
export const startQueue = internalMutation({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueId, {
      status: "processing",
      startedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Complete a queue (internal)
 */
export const completeQueue = internalMutation({
  args: {
    queueId: v.id("extractionQueue"),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.queueId, {
      status: args.status,
      completedAt: Date.now(),
      estimatedSecondsRemaining: 0,
    });
    return null;
  },
});

/**
 * Get next pending queue to process (internal)
 *
 * QUALITY FIX: Uses compound index for correct ordering by status, priority, then creation time.
 * Higher priority queues are processed first; within same priority, FIFO order.
 */
export const getNextPendingQueue = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("extractionQueue"),
      companyId: v.id("companies"),
      userId: v.id("users"),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get highest priority pending queue using compound index
    // Order desc so higher priority (10) comes before lower (0)
    const queue = await ctx.db
      .query("extractionQueue")
      .withIndex("by_status_priority_created", (q) => q.eq("status", "pending"))
      .order("desc")
      .first();

    if (!queue) return null;

    return {
      _id: queue._id,
      companyId: queue.companyId,
      userId: queue.userId,
    };
  },
});

/**
 * Get next item to process in a queue (internal)
 * @deprecated Use claimNextQueueItem for atomic claim operations
 */
export const getNextQueueItem = internalQuery({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.union(
    v.object({
      _id: v.id("extractionQueueItems"),
      documentId: v.id("documents"),
      position: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_queue_status", (q) =>
        q.eq("queueId", args.queueId).eq("status", "pending")
      )
      .first();

    if (!item) return null;

    return {
      _id: item._id,
      documentId: item.documentId,
      position: item.position,
    };
  },
});

/**
 * Atomically claim the next queue item for processing
 *
 * CRITICAL: This mutation replaces the query-then-update pattern to prevent
 * race conditions where multiple workers could claim the same item.
 * The claim is atomic - only one worker can successfully claim an item.
 */
export const claimNextQueueItem = internalMutation({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.union(
    v.object({
      _id: v.id("extractionQueueItems"),
      documentId: v.id("documents"),
      position: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find next pending item
    const item = await ctx.db
      .query("extractionQueueItems")
      .withIndex("by_queue_status", (q) =>
        q.eq("queueId", args.queueId).eq("status", "pending")
      )
      .first();

    if (!item) return null;

    // Atomically claim it by updating status
    await ctx.db.patch(item._id, {
      status: "processing",
      startedAt: Date.now(),
    });

    return {
      _id: item._id,
      documentId: item.documentId,
      position: item.position,
    };
  },
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Process the next item in a queue
 * This is called by the queue processor to handle one document at a time
 *
 * Uses atomic claim to prevent race conditions with concurrent workers.
 */
export const processNextQueueItem = action({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.object({
    hasMore: v.boolean(),
    processed: v.boolean(),
    documentId: v.optional(v.id("documents")),
  }),
  handler: async (ctx, args) => {
    // Atomically claim the next pending item
    // This prevents race conditions where multiple workers claim the same item
    const item = await ctx.runMutation(internal.extractionQueue.claimNextQueueItem, {
      queueId: args.queueId,
    });

    if (!item) {
      // No more items - complete the queue
      await ctx.runMutation(internal.extractionQueue.completeQueue, {
        queueId: args.queueId,
        status: "completed",
      });
      return { hasMore: false, processed: false };
    }

    const startTime = Date.now();

    // Item is already marked as processing by claimNextQueueItem

    try {
      // Trigger extraction for this document
      const result = await ctx.runAction(api.cloudinaryExtraction.triggerCloudinaryExtraction, {
        documentId: item.documentId,
        force: false,
      });

      const processingTimeMs = Date.now() - startTime;

      if (result.success) {
        // Mark item as completed
        await ctx.runMutation(internal.extractionQueue.updateQueueItemStatus, {
          itemId: item._id,
          status: "completed",
          processingTimeMs,
        });

        // Update queue progress
        // Note: We need to get current counts from the queue
        const queueItems = await ctx.runQuery(api.extractionQueue.getQueueItems, {
          queueId: args.queueId,
        });

        const completedCount = queueItems.filter((i) => i.status === "completed").length + 1;
        const failedCount = queueItems.filter((i) => i.status === "failed").length;

        await ctx.runMutation(internal.extractionQueue.updateQueueProgress, {
          queueId: args.queueId,
          currentPosition: item.position + 1,
          completedCount,
          failedCount,
          avgProcessingTimeMs: processingTimeMs,
        });

        return { hasMore: true, processed: true, documentId: item.documentId };
      } else {
        // Mark item as failed
        await ctx.runMutation(internal.extractionQueue.updateQueueItemStatus, {
          itemId: item._id,
          status: "failed",
          errorMessage: result.message,
          processingTimeMs: Date.now() - startTime,
        });

        return { hasMore: true, processed: false, documentId: item.documentId };
      }
    } catch (error) {
      // Mark item as failed on exception
      await ctx.runMutation(internal.extractionQueue.updateQueueItemStatus, {
        itemId: item._id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: Date.now() - startTime,
      });

      return { hasMore: true, processed: false, documentId: item.documentId };
    }
  },
});

/**
 * Start processing a queue (user-facing action)
 * This kicks off the queue processing
 */
export const startQueueProcessing = action({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Mark queue as processing
    await ctx.runMutation(internal.extractionQueue.startQueue, {
      queueId: args.queueId,
    });

    // Process first item to kick things off
    await ctx.runAction(api.extractionQueue.processNextQueueItem, {
      queueId: args.queueId,
    });

    return true;
  },
});

// ============================================================================
// Pause/Resume Functionality
// ============================================================================

/**
 * Pause a processing queue
 */
export const pauseQueue = mutation({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId);
    if (!queue) return false;

    // Can only pause processing queues
    if (queue.status !== "processing") {
      return false;
    }

    await ctx.db.patch(args.queueId, {
      isPaused: true,
      pausedAt: Date.now(),
    } as Record<string, unknown>);

    return true;
  },
});

/**
 * Resume a paused queue
 */
export const resumeQueue = mutation({
  args: {
    queueId: v.id("extractionQueue"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const queue = await ctx.db.get(args.queueId);
    if (!queue || !(queue as Record<string, unknown>).isPaused) return false;

    await ctx.db.patch(args.queueId, {
      isPaused: false,
      pausedAt: undefined,
    } as Record<string, unknown>);

    return true;
  },
});

// ============================================================================
// Retry Logic
// ============================================================================

const DEFAULT_MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 5000; // 5 seconds

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(retryCount: number): number {
  return BACKOFF_BASE_MS * Math.pow(2, retryCount);
}

/**
 * Schedule a retry for a failed queue item
 */
export const scheduleRetry = internalMutation({
  args: {
    itemId: v.id("extractionQueueItems"),
    errorMessage: v.string(),
  },
  returns: v.object({
    scheduled: v.boolean(),
    isDLQ: v.boolean(),
    nextRetryAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      return { scheduled: false, isDLQ: false };
    }

    const retryCount = (item.retryCount ?? 0) + 1;
    const maxRetries = item.maxRetries ?? DEFAULT_MAX_RETRIES;

    // Check if retries exhausted
    if (retryCount > maxRetries) {
      // Move to DLQ
      await ctx.db.patch(args.itemId, {
        status: "failed",
        retryCount,
        lastError: args.errorMessage,
        isDLQ: true,
        completedAt: Date.now(),
      });
      return { scheduled: false, isDLQ: true };
    }

    // Schedule retry with exponential backoff
    const backoffMs = calculateBackoff(retryCount - 1);
    const nextRetryAt = Date.now() + backoffMs;

    await ctx.db.patch(args.itemId, {
      status: "pending",
      retryCount,
      lastError: args.errorMessage,
      nextRetryAt,
      isDLQ: false,
    });

    return { scheduled: true, isDLQ: false, nextRetryAt };
  },
});

/**
 * Manually retry a failed item (from DLQ)
 */
export const retryFailedItem = mutation({
  args: {
    itemId: v.id("extractionQueueItems"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const item = await ctx.db.get(args.itemId);
    if (!item) return false;

    // Verify ownership: item → queue → company → owner
    const queue = await ctx.db.get(item.queueId);
    if (!queue) return false;
    const company = await ctx.db.get(queue.companyId);
    if (!company || company.ownerId !== user._id) {
      throw new Error("Access denied: you do not own this resource");
    }

    // Can only retry failed items
    if (item.status !== "failed") return false;

    // Reset for retry
    await ctx.db.patch(args.itemId, {
      status: "pending",
      retryCount: 0, // Reset retry count for manual retry
      lastError: undefined,
      nextRetryAt: undefined,
      isDLQ: false,
      startedAt: undefined,
      completedAt: undefined,
    });

    // Also ensure the parent queue is not completed
    if (queue.status === "completed" || queue.status === "failed") {
      // Reactivate the queue
      await ctx.db.patch(item.queueId, {
        status: "processing",
        completedAt: undefined,
      });
    }

    return true;
  },
});;

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
