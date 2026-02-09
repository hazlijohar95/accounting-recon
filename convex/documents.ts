import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { requireCompanyAccess, requireDocumentAccess, verifyQueryCompanyAccess, verifyQueryResourceAccess } from "./lib/auth";
import { documentDocValidator, documentIdValidator } from "./lib/validators";
import { logAuditEvent } from "./lib/auditLogger";

// Allowed file types for upload validation
const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Max file size (50MB) - validated post-upload
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * SECURITY: Sanitize filename to prevent path traversal and injection attacks
 * Server-side validation (defense in depth - client also validates)
 * - Removes directory separators (/, \, ..)
 * - Removes null bytes and control characters
 * - Limits length to 255 characters
 * - Preserves file extension
 */
// Rate limiting configuration for uploads
const UPLOAD_RATE_LIMIT = {
  maxUploads: 20,       // Maximum uploads allowed
  windowMs: 60 * 1000,  // Per minute (60 seconds)
};

function sanitizeFilename(filename: string): string {
  // Remove path separators and parent directory references
  let sanitized = filename
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    // Remove null bytes and control characters (ASCII 0-31)
    .replace(/[\x00-\x1f]/g, '')
    // Remove other potentially dangerous characters
    .replace(/[<>:"|?*]/g, '_')
    .trim();

  // Limit filename length (preserve extension if possible)
  if (sanitized.length > 255) {
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot > 0 && sanitized.length - lastDot <= 10) {
      // Has a reasonable extension (1-10 chars after last dot)
      const ext = sanitized.substring(lastDot);
      const baseName = sanitized.slice(0, 255 - ext.length);
      sanitized = `${baseName}${ext}`;
    } else {
      // No extension or extension too long - just truncate
      sanitized = sanitized.slice(0, 255);
    }
  }

  // Fallback for empty filenames
  if (!sanitized || sanitized === '.') {
    sanitized = 'unnamed_file';
  }

  return sanitized;
}

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
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(documentDocValidator),
  handler: async (ctx, args) => {
    // SECURITY: Verify company access (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
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
  args: {
    id: v.id("documents"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.union(documentDocValidator, v.null()),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) return null;

    // SECURITY: Verify ownership (workosUserId fallback for AuthKit failures)
    const { allowed } = await verifyQueryResourceAccess(ctx, document.companyId, args.workosUserId);
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

// ============ UPLOAD FUNCTIONS ============

/**
 * Generate a presigned URL for uploading a file to Convex storage.
 * Returns the upload URL that the client uses to POST the file.
 * SECURITY: Includes rate limiting to prevent abuse.
 */
export const generateUploadUrl = mutation({
  args: {
    companyId: v.id("companies"),
    workosUserId: v.optional(v.string()), // Fallback when AuthKit fails
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // SECURITY: Verify user owns the company
    await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

    // SECURITY: Check rate limit (sliding window algorithm)
    const now = Date.now();
    const windowStart = now - UPLOAD_RATE_LIMIT.windowMs;

    const rateLimitRecord = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();

    if (rateLimitRecord) {
      // Filter timestamps to only those within the window
      const recentTimestamps = rateLimitRecord.timestamps.filter(
        (ts) => ts > windowStart
      );

      if (recentTimestamps.length >= UPLOAD_RATE_LIMIT.maxUploads) {
        throw new Error(
          `Rate limit exceeded. Maximum ${UPLOAD_RATE_LIMIT.maxUploads} uploads per minute.`
        );
      }

      // Add new timestamp and update record
      await ctx.db.patch(rateLimitRecord._id, {
        timestamps: [...recentTimestamps, now],
        updatedAt: now,
      });
    } else {
      // First upload for this company - create record
      await ctx.db.insert("uploadRateLimits", {
        companyId: args.companyId,
        timestamps: [now],
        updatedAt: now,
      });
    }

    // Generate upload URL from Convex storage
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a URL to access a file in Convex storage (internal only).
 * SECURITY: This is an internalQuery - not exposed to clients.
 * Only callable from other Convex functions (actions/mutations).
 * URLs from Convex storage don't expire, so this can be called anytime.
 */
export const getStorageUrl = internalQuery({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
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
    contentType: v.string(), // MIME type for validation
    storageId: v.id("_storage"), // Convex storage ID from upload
    documentType: v.union(
      v.literal("bank_statement"),
      v.literal("invoice"),
      v.literal("receipt"),
      v.literal("other")
    ),
    workosUserId: v.optional(v.string()), // Fallback when AuthKit fails
  },
  returns: documentIdValidator,
  handler: async (ctx, args) => {
    // Verify company ownership
    const { user } = await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

    // SECURITY: Validate file type
    if (!ALLOWED_CONTENT_TYPES.includes(args.contentType)) {
      throw new Error("File type not allowed");
    }

    // SECURITY: Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // SECURITY: Sanitize filename (defense in depth - client also validates)
    const safeFileName = sanitizeFilename(args.fileName);

    const documentId = await ctx.db.insert("documents", {
      companyId: args.companyId,
      fileName: safeFileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      storageId: args.storageId,
      documentType: args.documentType,
      extractionStatus: "pending",
      uploadedAt: Date.now(),
    });

    // Log audit event
    await logAuditEvent(ctx, {
      companyId: args.companyId,
      userId: user._id,
      action: "document_upload",
      resourceType: "document",
      resourceId: documentId,
      metadata: {
        fileName: safeFileName,
        fileType: args.fileType,
        fileSize: args.fileSize,
        documentType: args.documentType,
      },
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
    workosUserId: v.optional(v.string()),
  },
  returns: documentIdValidator,
  handler: async (ctx, args) => {
    // Verify document ownership
    await requireDocumentAccess(ctx, args.id, args.workosUserId);

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

// Reset extraction for a single document (allows retry)
export const resetExtraction = mutation({
  args: {
    id: v.id("documents"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Verify document ownership
    const { document } = await requireDocumentAccess(ctx, args.id, args.workosUserId);

    // Only reset if stuck in processing or failed
    if (document.extractionStatus === "processing" || document.extractionStatus === "failed") {
      await ctx.db.patch(args.id, {
        extractionStatus: "pending",
        extractionProgress: undefined,
        extractionJobId: undefined,
        errorMessage: undefined,
      });
      console.log(`[Reset] Document ${args.id} reset to pending for retry`);
      return true;
    }

    return false;
  },
});

// Delete a document
export const remove = mutation({
  args: {
    id: v.id("documents"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify document ownership and get document
    const { user, company, document } = await requireDocumentAccess(ctx, args.id, args.workosUserId);

    // CASCADE DELETE: Clean up related data to prevent orphaned records
    // Note: Convex mutations are transactional — if any step throws, all changes roll back.
    // We track counts for the audit log.
    let transactionsDeleted = 0;
    let accrualDocsDeleted = 0;
    let matchesDeleted = 0;

    // 1. Find and clean up transactions referencing this document
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_source_document", (q) => q.eq("sourceDocumentId", args.id))
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
          matchesDeleted++;
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
      transactionsDeleted++;
    }

    // 2. Find and clean up accrualDocuments referencing this document
    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_source_document", (q) => q.eq("sourceDocumentId", args.id))
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
          matchesDeleted++;
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
      accrualDocsDeleted++;
    }

    // 3. Delete file from Convex storage if it exists
    if (document.storageId) {
      await ctx.storage.delete(document.storageId);
    }

    // 4. Log audit event before deletion
    await logAuditEvent(ctx, {
      companyId: company._id,
      userId: user._id,
      action: "document_delete",
      resourceType: "document",
      resourceId: args.id,
      metadata: {
        fileName: document.fileName,
        fileType: document.fileType,
        documentType: document.documentType,
        transactionsDeleted,
        accrualDocsDeleted,
        matchesDeleted,
      },
    });

    // 5. Delete the document record
    await ctx.db.delete(args.id);
    return null;
  },
});
