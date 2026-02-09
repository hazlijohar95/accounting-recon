/**
 * Extraction Functions
 *
 * Document extraction routing:
 * - PDFs: Use native extraction (client-side PDF.js + Bedrock Vision)
 *   - See convex/nativePdfExtraction.ts and hooks/usePdfExtraction.ts
 * - Images: Route to Cloudinary + Bedrock Vision (legacy)
 *   - See convex/cloudinaryExtraction.ts
 *
 * NOTE: For PDFs, extraction is now handled entirely client-side via the
 * usePdfExtraction hook. This action is only used for non-PDF images.
 *
 * @module convex/extraction
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ResourceErrors, BusinessErrors, ValidationErrors } from "./lib/errors";
import { documentDocValidator } from "./lib/validators";

// ============ ACTION ============

/**
 * Trigger extraction for a document
 *
 * ROUTING:
 * - PDF files: Should use native extraction via usePdfExtraction hook (client-side)
 *   This action will still work for PDFs but routes to Cloudinary (legacy)
 * - Image files: Routes to Cloudinary + Claude Vision extraction
 *
 * For best performance with PDFs, use the usePdfExtraction hook which:
 * 1. Renders PDF pages client-side using PDF.js (no Cloudinary needed)
 * 2. Uploads page images to Convex storage
 * 3. Calls Bedrock Vision for each page
 *
 * This action is kept for backward compatibility and for image extraction.
 */
export const triggerExtraction = action({
  args: {
    documentId: v.id("documents"),
    workosUserId: v.optional(v.string()), // Fallback when AuthKit fails
    force: v.optional(v.boolean()), // Force re-extraction even if stuck in processing
  },
  returns: v.object({ jobId: v.string(), success: v.boolean(), message: v.optional(v.string()) }),
  handler: async (ctx, args): Promise<{ jobId: string; success: boolean; message?: string }> => {
    // Route to Cloudinary + Claude Vision extraction
    // NOTE: For PDFs, prefer using native extraction via usePdfExtraction hook
    return await ctx.runAction(api.cloudinaryExtraction.triggerCloudinaryExtraction, {
      documentId: args.documentId,
      workosUserId: args.workosUserId,
      force: args.force,
    });
  },
});

// ============ INTERNAL QUERIES ============
// NOTE: These are kept for backwards compatibility with existing webhook handlers

export const getDocument = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.union(documentDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

// ============ INTERNAL MUTATIONS ============

export const updateDocumentStatus = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = {
      extractionStatus: args.status,
    };
    if (args.errorMessage) {
      update.errorMessage = args.errorMessage;
    }
    if (args.status === "completed" || args.status === "failed") {
      update.processedAt = Date.now();
    }
    await ctx.db.patch(args.documentId, update);
    return null;
  },
});

export const updateDocumentJobId = internalMutation({
  args: {
    documentId: v.id("documents"),
    jobId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, { extractionJobId: args.jobId });
    return null;
  },
});

/**
 * Handle extraction results from ML service webhook
 */
export const handleExtractionResults = internalMutation({
  args: {
    documentId: v.string(),
    companyId: v.string(),
    jobId: v.string(),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    extractionConfidence: v.optional(v.number()),
    transactionCount: v.optional(v.number()),
    bankType: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    transactions: v.optional(
      v.array(
        v.object({
          date: v.string(),
          description: v.string(),
          reference: v.optional(v.string()),
          amount: v.number(),
        })
      )
    ),
    accrualDocument: v.optional(
      v.object({
        docType: v.string(),
        docNumber: v.optional(v.string()),
        docDate: v.string(),
        dueDate: v.optional(v.string()),
        counterparty: v.optional(v.string()),
        amount: v.number(),
        taxAmount: v.optional(v.number()),
        description: v.optional(v.string()),
        lineItems: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const documentId = args.documentId as Id<"documents">;
    const companyId = args.companyId as Id<"companies">;

    // SECURITY: Verify document exists and belongs to claimed company
    const document = await ctx.db.get(documentId);
    if (!document) {
      return ResourceErrors.notFound("Document", args.documentId);
    }
    if (document.companyId !== companyId) {
      console.error(
        `SECURITY: Company ID mismatch - document belongs to ${document.companyId}, webhook claimed ${companyId}`
      );
      return BusinessErrors.conflict("Company ID mismatch - potential cross-tenant attack");
    }

    // Update document status
    const updateData: Record<string, unknown> = {
      extractionStatus: args.status === "completed" ? "completed" : "failed",
      processedAt: Date.now(),
    };

    if (args.errorMessage) updateData.errorMessage = args.errorMessage;
    if (args.extractedText) updateData.extractedText = args.extractedText;
    if (args.extractionConfidence !== undefined) updateData.extractionConfidence = args.extractionConfidence;
    if (args.transactionCount !== undefined) updateData.extractedTransactionCount = args.transactionCount;
    if (args.bankType) updateData.bankType = args.bankType;
    if (args.periodStart) updateData.periodStart = args.periodStart;
    if (args.periodEnd) updateData.periodEnd = args.periodEnd;

    await ctx.db.patch(documentId, updateData);

    // Insert extracted transactions (for bank statements)
    if (args.transactions && args.transactions.length > 0) {
      const now = Date.now();
      for (const tx of args.transactions) {
        await ctx.db.insert("transactions", {
          companyId,
          date: tx.date,
          description: tx.description,
          reference: tx.reference,
          amount: tx.amount,
          type: "cash",
          status: "pending",
          sourceDocumentId: documentId,
          createdAt: now,
        });
      }
    }

    // Insert extracted accrual document (for invoices/receipts)
    if (args.accrualDocument) {
      const doc = args.accrualDocument;
      const validDocTypes = ["sales_invoice", "purchase_invoice", "pos_report", "settlement", "receipt"] as const;

      if (!validDocTypes.includes(doc.docType as typeof validDocTypes[number])) {
        console.error(`SECURITY: Invalid docType received via webhook: ${doc.docType}`);
        return ValidationErrors.invalidInput("docType", `Invalid document type: ${doc.docType}`);
      }

      await ctx.db.insert("accrualDocuments", {
        companyId,
        docType: doc.docType as typeof validDocTypes[number],
        docNumber: doc.docNumber,
        docDate: doc.docDate,
        dueDate: doc.dueDate,
        counterparty: doc.counterparty,
        amount: doc.amount,
        taxAmount: doc.taxAmount,
        description: doc.description,
        lineItems: doc.lineItems,
        sourceDocumentId: documentId,
        extractedText: args.extractedText,
        status: "pending",
        createdAt: Date.now(),
      });
    }
    return null;
  },
});
