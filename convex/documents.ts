import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { requireCompanyAccess, requireDocumentAccess, verifyQueryCompanyAccess, verifyQueryResourceAccess } from "./lib/auth";
import { documentDocValidator, documentIdValidator } from "./lib/validators";

// ============ QUERIES ============

// Get documents for a company
export const listByCompany = query({
  args: {
    companyId: v.id("companies"),
    documentType: v.optional(
      v.union(
        v.literal("bank_statement"),
        v.literal("invoice"),
        v.literal("receipt"),
        v.literal("other")
      )
    ),
  },
  returns: v.array(documentDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId);
    if (!allowed) return [];

    // Use compound index when filtering by documentType
    let documents;
    if (args.documentType) {
      documents = await ctx.db
        .query("documents")
        .withIndex("by_company_documentType", (q) =>
          q.eq("companyId", args.companyId).eq("documentType", args.documentType!)
        )
        .collect();
    } else {
      documents = await ctx.db
        .query("documents")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect();
    }

    // Sort by upload date descending
    return documents.sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
});

// Get a single document
export const get = query({
  args: { id: v.id("documents") },
  returns: v.union(documentDocValidator, v.null()),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) return null;

    // SECURITY: Verify ownership
    const { allowed } = await verifyQueryResourceAccess(ctx, document.companyId);
    if (!allowed) return null;

    return document;
  },
});

// Get documents pending extraction
// SECURITY: Changed from query to internalQuery to prevent unauthorized access
// This should only be called by internal system operations, not user-facing endpoints
export const getPendingExtraction = internalQuery({
  args: {},
  returns: v.array(documentDocValidator),
  handler: async (ctx) => {
    // Internal query - only callable from other Convex functions
    // Returns all pending documents for background processing
    return await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("extractionStatus", "pending"))
      .collect();
  },
});

// ============ MUTATIONS ============

// Create document record (after upload to storage)
export const create = mutation({
  args: {
    companyId: v.id("companies"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    storageId: v.optional(v.string()),
    storageUrl: v.optional(v.string()),
    documentType: v.union(
      v.literal("bank_statement"),
      v.literal("invoice"),
      v.literal("receipt"),
      v.literal("other")
    ),
  },
  returns: documentIdValidator,
  handler: async (ctx, args) => {
    // Verify company ownership
    await requireCompanyAccess(ctx, args.companyId);

    const documentId = await ctx.db.insert("documents", {
      ...args,
      extractionStatus: "pending",
      uploadedAt: Date.now(),
    });
    return documentId;
  },
});

// Update extraction status
export const updateExtractionStatus = mutation({
  args: {
    id: v.id("documents"),
    extractionStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    extractedText: v.optional(v.string()),
  },
  returns: documentIdValidator,
  handler: async (ctx, args) => {
    // Verify document ownership
    await requireDocumentAccess(ctx, args.id);

    const { id, ...updates } = args;

    const patchData: Record<string, unknown> = {
      extractionStatus: updates.extractionStatus,
    };

    if (updates.extractedText !== undefined) {
      patchData.extractedText = updates.extractedText;
    }

    if (
      updates.extractionStatus === "completed" ||
      updates.extractionStatus === "failed"
    ) {
      patchData.processedAt = Date.now();
    }

    await ctx.db.patch(id, patchData);
    return id;
  },
});

// Delete a document
export const remove = mutation({
  args: { id: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify document ownership and get document
    const { document } = await requireDocumentAccess(ctx, args.id);

    // CASCADE DELETE: Clean up related data to prevent orphaned records

    // 1. Find and clean up transactions referencing this document
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", document.companyId))
      .filter((q) => q.eq(q.field("sourceDocumentId"), args.id))
      .collect();

    for (const txn of transactions) {
      // Clean up any matches involving this transaction
      if (txn.matchId) {
        const match = await ctx.db.get(txn.matchId);
        if (match) {
          // Reset the other side of the match first
          if (match.cashTransactionId === txn._id) {
            // This is the cash side - reset accrual side
            if (match.accrualDocumentId) {
              await ctx.db.patch(match.accrualDocumentId, {
                status: "pending",
                matchId: undefined,
              });
            }
            if (match.accrualTransactionId) {
              await ctx.db.patch(match.accrualTransactionId, {
                status: "pending",
                matchId: undefined,
              });
            }
          } else {
            // This is the accrual side - reset cash side
            await ctx.db.patch(match.cashTransactionId, {
              status: "pending",
              matchId: undefined,
            });
          }
          // Delete the match
          await ctx.db.delete(match._id);
        }
      }

      // Clean up suspense items referencing this transaction
      if (txn.sessionId) {
        const suspenseItems = await ctx.db
          .query("suspenseItems")
          .withIndex("by_session", (q) => q.eq("sessionId", txn.sessionId!))
          .filter((q) => q.eq(q.field("sourceId"), txn._id))
          .collect();

        for (const item of suspenseItems) {
          await ctx.db.delete(item._id);
        }
      }

      // Delete the transaction
      await ctx.db.delete(txn._id);
    }

    // 2. Find and clean up accrualDocuments referencing this document
    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_company", (q) => q.eq("companyId", document.companyId))
      .filter((q) => q.eq(q.field("sourceDocumentId"), args.id))
      .collect();

    for (const doc of accrualDocs) {
      // Clean up any matches involving this accrual document
      if (doc.matchId) {
        const match = await ctx.db.get(doc.matchId);
        if (match) {
          // Reset cash side
          await ctx.db.patch(match.cashTransactionId, {
            status: "pending",
            matchId: undefined,
          });
          // Delete the match
          await ctx.db.delete(match._id);
        }
      }

      // Clean up suspense items referencing this accrual document
      if (doc.sessionId) {
        const suspenseItems = await ctx.db
          .query("suspenseItems")
          .withIndex("by_session", (q) => q.eq("sessionId", doc.sessionId!))
          .filter((q) => q.eq(q.field("sourceId"), doc._id))
          .collect();

        for (const item of suspenseItems) {
          await ctx.db.delete(item._id);
        }
      }

      // Delete the accrual document
      await ctx.db.delete(doc._id);
    }

    // 3. Delete the document itself
    // TODO: Delete from cloud storage (R2/S3) - implement in Phase C
    await ctx.db.delete(args.id);
    return null;
  },
});;;
