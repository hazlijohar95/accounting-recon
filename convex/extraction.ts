/**
 * Extraction Functions
 *
 * Handles document extraction via the ML service.
 * Uses async webhook pattern - action returns immediately, ML calls back when done.
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authKit } from "./auth";
import { AuthErrors, ResourceErrors, BusinessErrors, ValidationErrors } from "./lib/errors";
import { documentDocValidator } from "./lib/validators";

// ML Service URL from environment
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ============ ACTION ============

/**
 * Trigger extraction for a document
 *
 * Called after a document is uploaded to start the extraction process.
 * Returns immediately with job_id - ML service calls webhook when done.
 */
export const triggerExtraction = action({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.object({ jobId: v.string(), success: v.boolean() }),
  handler: async (ctx, args): Promise<{ jobId: string; success: boolean }> => {
    const isProduction = process.env.NODE_ENV === "production";

    // SECURITY: Verify user is authenticated
    let authUser: { id: string } | null = null;
    try {
      authUser = await authKit.getAuthUser(ctx);
    } catch {
      // SECURITY: In production, AuthKit failure is fatal
      if (isProduction) {
        console.error("SECURITY: AuthKit failed in production during extraction");
        return AuthErrors.serviceUnavailable();
      }
      // AuthKit not configured - allow for development/demo mode only
      console.warn("AuthKit not configured, skipping auth check in extraction (dev mode only)");
    }

    // SECURITY: Block unauthenticated access in production
    if (!authUser && isProduction) {
      return AuthErrors.unauthorized("Authentication required for extraction");
    }

    // Get document details
    const document = await ctx.runQuery(internal.extraction.getDocument, {
      documentId: args.documentId,
    });

    if (!document) {
      return ResourceErrors.notFound("Document", args.documentId);
    }

    // SECURITY: Verify ownership if user is authenticated
    if (authUser) {
      const user = await ctx.runQuery(api.users.getByWorkosId, {
        workosId: authUser.id,
      });

      if (!user) {
        return AuthErrors.userNotFound();
      }

      const company = await ctx.runQuery(api.companies.get, {
        id: document.companyId,
      });

      if (!company || company.ownerId !== user._id) {
        return AuthErrors.unauthorized("You don't have access to this document");
      }
    }

    if (!document.storageId) {
      return ValidationErrors.missingField("storageId");
    }

    // Get storage URL from Convex storage (URLs don't expire)
    // SECURITY: Using internal query - not exposed to clients
    const storageUrl = await ctx.runQuery(internal.documents.getStorageUrl, {
      storageId: document.storageId,
    });

    if (!storageUrl) {
      return ValidationErrors.missingField("storageUrl (file not found in storage)");
    }

    // Update document status to processing
    await ctx.runMutation(internal.extraction.updateDocumentStatus, {
      documentId: args.documentId,
      status: "processing",
    });

    try {
      // Call ML service - returns immediately with job_id
      // Note: Convex storage URLs don't expire, so ML service has unlimited time to fetch
      const response = await fetch(`${ML_SERVICE_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: args.documentId,
          company_id: document.companyId,
          storage_url: storageUrl,
          file_name: document.fileName,
          file_type: document.fileType,
          document_type: document.documentType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ML service error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as { job_id: string };

      // Store the job ID
      await ctx.runMutation(internal.extraction.updateDocumentJobId, {
        documentId: args.documentId,
        jobId: result.job_id,
      });

      return { jobId: result.job_id, success: true };
    } catch (error) {
      // Update status to failed
      await ctx.runMutation(internal.extraction.updateDocumentStatus, {
        documentId: args.documentId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});

// ============ INTERNAL QUERIES ============

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
