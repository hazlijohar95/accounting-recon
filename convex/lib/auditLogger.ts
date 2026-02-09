// @ts-nocheck - Generated Convex types are stale; run `npx convex dev` to regenerate
/**
 * Audit Logger Module
 *
 * Centralized audit logging for all user actions.
 * Provides full audit trail for compliance and debugging.
 *
 * @module convex/lib/auditLogger
 */

import { v, Infer } from "convex/values";
import { MutationCtx, QueryCtx, internalMutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================================================
// Type Definitions
// ============================================================================

export const auditActionValidator = v.union(
  // Document actions
  v.literal("document_upload"),
  v.literal("document_delete"),
  // Extraction actions
  v.literal("extraction_start"),
  v.literal("extraction_complete"),
  v.literal("extraction_fail"),
  v.literal("extraction_retry"),
  // Match actions
  v.literal("match_create"),
  v.literal("match_approve"),
  v.literal("match_reject"),
  v.literal("match_manual"),
  v.literal("match_bulk_approve"),
  v.literal("match_bulk_reject"),
  // Session actions
  v.literal("session_create"),
  v.literal("session_start"),
  v.literal("session_complete"),
  // Export actions
  v.literal("export_generate"),
  v.literal("export_download"),
  // Settings actions
  v.literal("settings_change"),
  v.literal("company_update"),
  // Queue actions
  v.literal("queue_create"),
  v.literal("queue_pause"),
  v.literal("queue_resume"),
  v.literal("queue_cancel"),
  // Transaction actions
  v.literal("transaction_edit"),
  v.literal("transaction_delete"),
  // Suspense actions
  v.literal("suspense_query"),
  v.literal("suspense_resolve")
);

export const resourceTypeValidator = v.union(
  v.literal("document"),
  v.literal("transaction"),
  v.literal("accrualDocument"),
  v.literal("match"),
  v.literal("session"),
  v.literal("company"),
  v.literal("queue"),
  v.literal("suspense"),
  v.literal("export")
);

export type AuditAction = Infer<typeof auditActionValidator>;
export type ResourceType = Infer<typeof resourceTypeValidator>;

export interface AuditEventInput {
  companyId: Id<"companies">;
  userId: Id<"users">;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditFilters {
  action?: AuditAction;
  resourceType?: ResourceType;
  userId?: Id<"users">;
  startTime?: number;
  endTime?: number;
}

export interface PaginationOpts {
  limit?: number;
  cursor?: string;
}

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * Log an audit event (internal use via mutations)
 *
 * Usage:
 * ```ts
 * await logAuditEvent(ctx, {
 *   companyId: company._id,
 *   userId: user._id,
 *   action: "document_upload",
 *   resourceType: "document",
 *   resourceId: document._id,
 *   metadata: { fileName: document.fileName }
 * });
 * ```
 */
export async function logAuditEvent(
  ctx: MutationCtx,
  event: AuditEventInput
): Promise<Id<"auditLog">> {
  const auditId = await ctx.db.insert("auditLog", {
    companyId: event.companyId,
    userId: event.userId,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    metadata: event.metadata,
    timestamp: Date.now(),
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
  });

  return auditId;
}

/**
 * Log multiple audit events in a batch (for bulk operations)
 */
export async function logBulkAuditEvents(
  ctx: MutationCtx,
  events: AuditEventInput[]
): Promise<Id<"auditLog">[]> {
  const auditIds: Id<"auditLog">[] = [];
  const timestamp = Date.now();

  for (const event of events) {
    const auditId = await ctx.db.insert("auditLog", {
      companyId: event.companyId,
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata,
      timestamp,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });
    auditIds.push(auditId);
  }

  return auditIds;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get audit trail for a company with optional filters and pagination
 */
export async function getAuditTrail(
  ctx: QueryCtx,
  companyId: Id<"companies">,
  filters?: AuditFilters,
  pagination?: PaginationOpts
): Promise<{
  events: Array<{
    _id: Id<"auditLog">;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId?: string;
    userId: Id<"users">;
    timestamp: number;
    metadata?: unknown;
  }>;
  nextCursor: string | null;
}> {
  const limit = pagination?.limit ?? 50;

  // Base query on company
  let queryBuilder = ctx.db
    .query("auditLog")
    .withIndex("by_company_time", (q) => q.eq("companyId", companyId))
    .order("desc");

  // Collect all results
  const allEvents = await queryBuilder.collect();

  // Apply filters manually (Convex doesn't support complex filters with index queries)
  let filteredEvents = allEvents;

  if (filters?.action) {
    filteredEvents = filteredEvents.filter((e) => e.action === filters.action);
  }

  if (filters?.resourceType) {
    filteredEvents = filteredEvents.filter((e) => e.resourceType === filters.resourceType);
  }

  if (filters?.userId) {
    filteredEvents = filteredEvents.filter((e) => e.userId === filters.userId);
  }

  if (filters?.startTime) {
    filteredEvents = filteredEvents.filter((e) => e.timestamp >= filters.startTime!);
  }

  if (filters?.endTime) {
    filteredEvents = filteredEvents.filter((e) => e.timestamp <= filters.endTime!);
  }

  // Apply cursor-based pagination
  let startIndex = 0;
  if (pagination?.cursor) {
    const cursorIndex = filteredEvents.findIndex((e) => e._id === pagination.cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < filteredEvents.length
      ? paginatedEvents[paginatedEvents.length - 1]?._id ?? null
      : null;

  return {
    events: paginatedEvents.map((e) => ({
      _id: e._id,
      action: e.action,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      userId: e.userId,
      timestamp: e.timestamp,
      metadata: e.metadata,
    })),
    nextCursor,
  };
}

/**
 * Get history for a specific resource
 */
export async function getResourceHistory(
  ctx: QueryCtx,
  resourceType: ResourceType,
  resourceId: string,
  limit: number = 100
): Promise<
  Array<{
    _id: Id<"auditLog">;
    action: AuditAction;
    userId: Id<"users">;
    timestamp: number;
    metadata?: unknown;
  }>
> {
  const events = await ctx.db
    .query("auditLog")
    .withIndex("by_resource", (q) =>
      q.eq("resourceType", resourceType).eq("resourceId", resourceId)
    )
    .order("desc")
    .take(limit);

  return events.map((e) => ({
    _id: e._id,
    action: e.action,
    userId: e.userId,
    timestamp: e.timestamp,
    metadata: e.metadata,
  }));
}

/**
 * Get user's recent activity
 */
export async function getUserActivity(
  ctx: QueryCtx,
  userId: Id<"users">,
  limit: number = 50
): Promise<
  Array<{
    _id: Id<"auditLog">;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId?: string;
    companyId: Id<"companies">;
    timestamp: number;
  }>
> {
  const events = await ctx.db
    .query("auditLog")
    .withIndex("by_user_time", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);

  return events.map((e) => ({
    _id: e._id,
    action: e.action,
    resourceType: e.resourceType,
    resourceId: e.resourceId,
    companyId: e.companyId,
    timestamp: e.timestamp,
  }));
}

// ============================================================================
// Convex Exposed Functions (Internal Mutations)
// ============================================================================

/**
 * Internal mutation to log an audit event
 * Use this from other mutations via ctx.runMutation
 */
export const logAudit = internalMutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    action: auditActionValidator,
    resourceType: resourceTypeValidator,
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("auditLog"),
  handler: async (ctx, args) => {
    return await logAuditEvent(ctx, args);
  },
});

/**
 * Query to get company audit trail
 */
export const getCompanyAuditTrail = query({
  args: {
    companyId: v.id("companies"),
    filters: v.optional(
      v.object({
        action: v.optional(auditActionValidator),
        resourceType: v.optional(resourceTypeValidator),
        userId: v.optional(v.id("users")),
        startTime: v.optional(v.number()),
        endTime: v.optional(v.number()),
      })
    ),
    pagination: v.optional(
      v.object({
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    events: v.array(
      v.object({
        _id: v.id("auditLog"),
        action: auditActionValidator,
        resourceType: resourceTypeValidator,
        resourceId: v.optional(v.string()),
        userId: v.id("users"),
        timestamp: v.number(),
        metadata: v.optional(v.any()),
      })
    ),
    nextCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    return await getAuditTrail(ctx, args.companyId, args.filters, args.pagination);
  },
});

/**
 * Query to get resource history
 */
export const getAuditHistoryForResource = query({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("auditLog"),
      action: auditActionValidator,
      userId: v.id("users"),
      timestamp: v.number(),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    return await getResourceHistory(ctx, args.resourceType, args.resourceId, args.limit);
  },
});

/**
 * Query to get user activity
 */
export const getUserAuditActivity = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("auditLog"),
      action: auditActionValidator,
      resourceType: resourceTypeValidator,
      resourceId: v.optional(v.string()),
      companyId: v.id("companies"),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await getUserActivity(ctx, args.userId, args.limit);
  },
});

// ============================================================================
// Helper Functions for Common Audit Patterns
// ============================================================================

/**
 * Create a document audit helper
 */
export function createDocumentAuditHelper(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  userId: Id<"users">
) {
  return {
    async logUpload(documentId: Id<"documents">, fileName: string, fileSize: number) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "document_upload",
        resourceType: "document",
        resourceId: documentId,
        metadata: { fileName, fileSize },
      });
    },

    async logDelete(documentId: Id<"documents">, fileName: string) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "document_delete",
        resourceType: "document",
        resourceId: documentId,
        metadata: { fileName },
      });
    },

    async logExtractionStart(documentId: Id<"documents">) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "extraction_start",
        resourceType: "document",
        resourceId: documentId,
      });
    },

    async logExtractionComplete(documentId: Id<"documents">, transactionCount: number) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "extraction_complete",
        resourceType: "document",
        resourceId: documentId,
        metadata: { transactionCount },
      });
    },

    async logExtractionFail(documentId: Id<"documents">, errorMessage: string) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "extraction_fail",
        resourceType: "document",
        resourceId: documentId,
        metadata: { errorMessage },
      });
    },
  };
}

/**
 * Create a match audit helper
 */
export function createMatchAuditHelper(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  userId: Id<"users">
) {
  return {
    async logCreate(
      matchId: Id<"matchedPairs">,
      layer: number,
      confidenceScore: number,
      cashTxnId: string,
      accrualDocId?: string
    ) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "match_create",
        resourceType: "match",
        resourceId: matchId,
        metadata: { layer, confidenceScore, cashTxnId, accrualDocId },
      });
    },

    async logApprove(matchId: Id<"matchedPairs">) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "match_approve",
        resourceType: "match",
        resourceId: matchId,
      });
    },

    async logReject(matchId: Id<"matchedPairs">, reason?: string) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "match_reject",
        resourceType: "match",
        resourceId: matchId,
        metadata: reason ? { reason } : undefined,
      });
    },

    async logManual(
      matchId: Id<"matchedPairs">,
      cashTxnId: string,
      accrualDocId: string
    ) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "match_manual",
        resourceType: "match",
        resourceId: matchId,
        metadata: { cashTxnId, accrualDocId },
      });
    },

    async logBulkApprove(matchIds: string[], count: number) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "match_bulk_approve",
        resourceType: "match",
        metadata: { matchIds: matchIds.slice(0, 10), count },
      });
    },

    async logBulkReject(matchIds: string[], count: number) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "match_bulk_reject",
        resourceType: "match",
        metadata: { matchIds: matchIds.slice(0, 10), count },
      });
    },
  };
}

/**
 * Create a session audit helper
 */
export function createSessionAuditHelper(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  userId: Id<"users">
) {
  return {
    async logCreate(sessionId: Id<"reconciliationSessions">, name: string) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "session_create",
        resourceType: "session",
        resourceId: sessionId,
        metadata: { name },
      });
    },

    async logStart(sessionId: Id<"reconciliationSessions">) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "session_start",
        resourceType: "session",
        resourceId: sessionId,
      });
    },

    async logComplete(
      sessionId: Id<"reconciliationSessions">,
      stats: { matchedCount: number; suspenseCount: number }
    ) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "session_complete",
        resourceType: "session",
        resourceId: sessionId,
        metadata: stats,
      });
    },
  };
}

/**
 * Create a queue audit helper
 */
export function createQueueAuditHelper(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  userId: Id<"users">
) {
  return {
    async logCreate(queueId: Id<"extractionQueue">, documentCount: number, batchName?: string) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "queue_create",
        resourceType: "queue",
        resourceId: queueId,
        metadata: { documentCount, batchName },
      });
    },

    async logPause(queueId: Id<"extractionQueue">) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "queue_pause",
        resourceType: "queue",
        resourceId: queueId,
      });
    },

    async logResume(queueId: Id<"extractionQueue">) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "queue_resume",
        resourceType: "queue",
        resourceId: queueId,
      });
    },

    async logCancel(queueId: Id<"extractionQueue">, reason?: string) {
      return logAuditEvent(ctx, {
        companyId,
        userId,
        action: "queue_cancel",
        resourceType: "queue",
        resourceId: queueId,
        metadata: reason ? { reason } : undefined,
      });
    },
  };
}
