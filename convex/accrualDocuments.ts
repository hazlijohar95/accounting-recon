import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  validateAmount,
  validateDate,
  validateOptionalDate,
  validateOptionalAmount,
} from "./lib/validation";
import { requireCompanyAccess, requireAccrualDocAccess, requireSessionAccess, verifyQueryCompanyAccess, verifyQuerySessionAccess, verifyQueryResourceAccess } from "./lib/auth";
import { validateBulkSize, filterUndefinedValues } from "./lib/validation";
import { MAX_BULK_IMPORT_SIZE } from "./lib/constants";
import { BusinessErrors, ValidationErrors } from "./lib/errors";
import { accrualDocValidator, accrualDocIdValidator, accrualCountsValidator } from "./lib/validators";

// ============ QUERIES ============

// Get a single accrual document by ID
export const get = query({
  args: {
    id: v.id("accrualDocuments"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.union(accrualDocValidator, v.null()),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    // SECURITY: Verify company access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryResourceAccess(ctx, doc.companyId, args.workosUserId);
    if (!allowed) return null;

    return doc;
  },
});

// List all accrual documents for a company
export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("matched"),
        v.literal("partial"),
        v.literal("suspense")
      )
    ),
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(accrualDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return [];

    if (args.status) {
      return await ctx.db
        .query("accrualDocuments")
        .withIndex("by_status", (q) =>
          q.eq("companyId", args.companyId).eq("status", args.status!)
        )
        .collect();
    }
    return await ctx.db
      .query("accrualDocuments")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// List accrual documents for a session
export const listBySession = query({
  args: {
    sessionId: v.id("reconciliationSessions"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("matched"),
        v.literal("partial"),
        v.literal("suspense")
      )
    ),
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(accrualDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify session access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQuerySessionAccess(ctx, args.sessionId, args.workosUserId);
    if (!allowed) return [];

    // Use compound index when filtering by status
    if (args.status) {
      return await ctx.db
        .query("accrualDocuments")
        .withIndex("by_session_status", (q) =>
          q.eq("sessionId", args.sessionId).eq("status", args.status!)
        )
        .collect();
    }

    return await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Get accrual document by source document ID
export const getBySourceDocument = query({
  args: {
    sourceDocumentId: v.id("documents"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.union(accrualDocValidator, v.null()),
  handler: async (ctx, args) => {
    // Get the source document to check company access
    const sourceDoc = await ctx.db.get(args.sourceDocumentId);
    if (!sourceDoc) return null;

    // SECURITY: Verify company access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryResourceAccess(ctx, sourceDoc.companyId, args.workosUserId);
    if (!allowed) return null;

    // Find accrual document by source document ID
    const docs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_company", (q) => q.eq("companyId", sourceDoc.companyId))
      .filter((q) => q.eq(q.field("sourceDocumentId"), args.sourceDocumentId))
      .first();

    return docs;
  },
});

// Get counts by status for a company
export const getCounts = query({
  args: {
    companyId: v.id("companies"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.union(accrualCountsValidator, v.null()),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return null;

    const docs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return {
      total: docs.length,
      pending: docs.filter((d) => d.status === "pending").length,
      matched: docs.filter((d) => d.status === "matched").length,
      partial: docs.filter((d) => d.status === "partial").length,
      suspense: docs.filter((d) => d.status === "suspense").length,
    };
  },
});

// ============ MUTATIONS ============

// Create a new accrual document
export const create = mutation({
  args: {
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")),
    docType: v.union(
      v.literal("sales_invoice"),
      v.literal("purchase_invoice"),
      v.literal("pos_report"),
      v.literal("settlement"),
      v.literal("receipt")
    ),
    docNumber: v.optional(v.string()),
    docDate: v.string(),
    dueDate: v.optional(v.string()),
    counterparty: v.optional(v.string()),
    amount: v.number(),
    taxAmount: v.optional(v.number()),
    description: v.optional(v.string()),
    lineItems: v.optional(v.string()),
    sourceDocumentId: v.optional(v.id("documents")),
    extractedText: v.optional(v.string()),
    workosUserId: v.optional(v.string()),
  },
  returns: accrualDocIdValidator,
  handler: async (ctx, args) => {
    // Validate inputs
    validateAmount(args.amount, "amount");
    validateDate(args.docDate, "docDate");
    validateOptionalDate(args.dueDate, "dueDate");
    validateOptionalAmount(args.taxAmount, "taxAmount");

    // Verify company ownership
    await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

    // If sessionId provided, verify session belongs to same company
    if (args.sessionId) {
      const { company } = await requireSessionAccess(ctx, args.sessionId, args.workosUserId);
      if (company._id !== args.companyId) {
        return BusinessErrors.sessionMismatch("Accrual document");
      }
    }

    const docId = await ctx.db.insert("accrualDocuments", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
    return docId;
  },
});

// Bulk create accrual documents (for extraction results)
export const createBulk = mutation({
  args: {
    documents: v.array(
      v.object({
        companyId: v.id("companies"),
        sessionId: v.optional(v.id("reconciliationSessions")),
        docType: v.union(
          v.literal("sales_invoice"),
          v.literal("purchase_invoice"),
          v.literal("pos_report"),
          v.literal("settlement"),
          v.literal("receipt")
        ),
        docNumber: v.optional(v.string()),
        docDate: v.string(),
        dueDate: v.optional(v.string()),
        counterparty: v.optional(v.string()),
        amount: v.number(),
        taxAmount: v.optional(v.number()),
        description: v.optional(v.string()),
        lineItems: v.optional(v.string()),
        sourceDocumentId: v.optional(v.id("documents")),
        extractedText: v.optional(v.string()),
      })
    ),
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    if (args.documents.length === 0) {
      return [];
    }

    // SECURITY: Prevent DoS via excessive bulk imports
    validateBulkSize(args.documents.length);

    // Verify ownership of all companies involved
    const companyIds = new Set(args.documents.map((d) => d.companyId));
    for (const companyId of companyIds) {
      await requireCompanyAccess(ctx, companyId, args.workosUserId);
    }

    // Verify ownership of all sessions involved
    const sessionIds = new Set(
      args.documents
        .map((d) => d.sessionId)
        .filter((id): id is NonNullable<typeof id> => id !== undefined)
    );
    for (const sessionId of sessionIds) {
      await requireSessionAccess(ctx, sessionId, args.workosUserId);
    }

    const now = Date.now();
    const ids: string[] = [];

    // Validate all documents first before inserting any
    for (const doc of args.documents) {
      validateAmount(doc.amount, "amount");
      validateDate(doc.docDate, "docDate");
      validateOptionalDate(doc.dueDate, "dueDate");
      validateOptionalAmount(doc.taxAmount, "taxAmount");
    }

    for (const doc of args.documents) {
      const docId = await ctx.db.insert("accrualDocuments", {
        ...doc,
        status: "pending",
        createdAt: now,
      });
      ids.push(docId);
    }

    return ids;
  },
});

// Update an accrual document
export const update = mutation({
  args: {
    id: v.id("accrualDocuments"),
    docNumber: v.optional(v.string()),
    docDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    counterparty: v.optional(v.string()),
    amount: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    description: v.optional(v.string()),
    lineItems: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("matched"),
        v.literal("partial"),
        v.literal("suspense")
      )
    ),
    matchId: v.optional(v.id("matchedPairs")),
    workosUserId: v.optional(v.string()),
  },
  returns: accrualDocIdValidator,
  handler: async (ctx, args) => {
    const { id, workosUserId, ...updates } = args;

    // Verify document ownership
    await requireAccrualDocAccess(ctx, id, workosUserId);

    // Validate optional updates
    validateOptionalAmount(updates.amount, "amount");
    validateOptionalDate(updates.docDate, "docDate");
    validateOptionalDate(updates.dueDate, "dueDate");
    validateOptionalAmount(updates.taxAmount, "taxAmount");

    // Filter out undefined values
    await ctx.db.patch(id, filterUndefinedValues(updates));
    return id;
  },
});

// Delete an accrual document
export const remove = mutation({
  args: {
    id: v.id("accrualDocuments"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify document ownership
    await requireAccrualDocAccess(ctx, args.id, args.workosUserId);

    await ctx.db.delete(args.id);
    return null;
  },
});

// Mark as matched
export const markMatched = mutation({
  args: {
    id: v.id("accrualDocuments"),
    matchId: v.id("matchedPairs"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify document ownership
    await requireAccrualDocAccess(ctx, args.id, args.workosUserId);

    await ctx.db.patch(args.id, {
      status: "matched",
      matchId: args.matchId,
    });
    return null;
  },
});

// Reset to pending (when match is rejected)
export const resetToPending = mutation({
  args: {
    id: v.id("accrualDocuments"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify document ownership
    await requireAccrualDocAccess(ctx, args.id, args.workosUserId);

    await ctx.db.patch(args.id, {
      status: "pending",
      matchId: undefined,
    });
    return null;
  },
});


