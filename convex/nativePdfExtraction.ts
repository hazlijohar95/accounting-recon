/**
 * Native PDF Extraction Module
 *
 * Handles PDF extraction using browser-native PDF.js + Bedrock Vision.
 * Replaces Cloudinary-based extraction with zero external dependencies for PDF conversion.
 *
 * Architecture:
 * 1. Client renders PDF → images using PDF.js (lib/pdf-renderer.ts)
 * 2. Client uploads page images to Convex storage
 * 3. Server extracts data from each page via Bedrock Vision
 *
 * @module convex/nativePdfExtraction
 */

import { v } from "convex/values";
import { action, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { boundingBoxValidator } from "./lib/validators";
import { requireCompanyAccess, verifyQueryCompanyAccess } from "./lib/auth";
import {
  buildExtractionPrompt,
  buildClassificationPrompt,
  parseExtractionResult,
  parseClassificationResult,
  getUserFriendlyError,
  type ExtractionResult,
} from "./lib/extractionUtils";

// ============================================================================
// Type Definitions
// ============================================================================

/** Extraction phase literals for schema compatibility */
const extractionPhaseValidator = v.union(
  v.literal("uploading"),
  v.literal("converting"),
  v.literal("extracting"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("failed")
);

/** Progress tracking object */
const extractionProgressValidator = v.object({
  currentPage: v.number(),
  totalPages: v.number(),
  pagesCompleted: v.optional(v.number()),
  streamedTransactionCount: v.optional(v.number()),
  phaseMessage: v.optional(v.string()),
});

// ============================================================================
// Phase Update Mutations (for granular progress tracking)
// ============================================================================

/**
 * Update document extraction phase
 *
 * Called by the client-side hook to provide granular progress updates.
 */
export const updateExtractionPhase = mutation({
  args: {
    documentId: v.id("documents"),
    phase: extractionPhaseValidator,
    progress: v.optional(extractionProgressValidator),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, phase, progress, workosUserId }) => {
    // Get document to verify ownership
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify company access
    await requireCompanyAccess(ctx, document.companyId, workosUserId);

    // Update phase and progress
    const updateData: Record<string, unknown> = {
      extractionPhase: phase,
    };

    if (progress) {
      updateData.extractionProgress = progress;
    }

    // Map phase to extractionStatus for backward compatibility
    if (phase === "complete") {
      updateData.extractionStatus = "completed";
      updateData.processedAt = Date.now();
      updateData.extractionProgress = undefined;
    } else if (phase === "failed") {
      updateData.extractionStatus = "failed";
      updateData.processedAt = Date.now();
    } else if (phase !== "uploading") {
      updateData.extractionStatus = "processing";
    }

    await ctx.db.patch(documentId, updateData);
    return null;
  },
});

/**
 * Internal mutation for phase updates (for use within actions)
 */
export const updatePhaseInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    phase: extractionPhaseValidator,
    progress: v.optional(extractionProgressValidator),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, phase, progress, errorMessage }) => {
    const updateData: Record<string, unknown> = {
      extractionPhase: phase,
    };

    if (progress) {
      updateData.extractionProgress = progress;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    // Map phase to extractionStatus for backward compatibility
    if (phase === "complete") {
      updateData.extractionStatus = "completed";
      updateData.processedAt = Date.now();
      updateData.extractionProgress = undefined;
    } else if (phase === "failed") {
      updateData.extractionStatus = "failed";
      updateData.processedAt = Date.now();
    } else if (phase !== "uploading") {
      updateData.extractionStatus = "processing";
    }

    await ctx.db.patch(documentId, updateData);
    return null;
  },
});

// ============================================================================
// Page Image Storage
// ============================================================================

/**
 * Store a rendered page image and link it to the document
 *
 * Called after client renders a PDF page to image blob.
 * Returns storage ID for subsequent extraction.
 */
export const storePageImage = mutation({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    pageNumber: v.number(),
    totalPages: v.number(),
    workosUserId: v.optional(v.string()),
  },
  returns: v.id("_storage"),
  handler: async (ctx, { documentId, storageId, pageNumber, totalPages, workosUserId }) => {
    // Get document to verify ownership
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify company access
    await requireCompanyAccess(ctx, document.companyId, workosUserId);

    // Update progress to show conversion phase
    await ctx.db.patch(documentId, {
      extractionPhase: "converting",
      extractionProgress: {
        currentPage: pageNumber,
        totalPages,
        pagesCompleted: pageNumber,
        phaseMessage: `Converting page ${pageNumber} of ${totalPages}...`,
      },
    });

    return storageId;
  },
});

// ============================================================================
// Bedrock Vision Extraction
// ============================================================================

/**
 * Extract data from a single page image using Bedrock Vision
 *
 * Called sequentially for each page after upload.
 * Streams extracted transactions to the database immediately.
 */
export const extractPageWithBedrock = action({
  args: {
    documentId: v.id("documents"),
    pageStorageId: v.id("_storage"),
    pageNumber: v.number(),
    totalPages: v.number(),
    documentType: v.string(),
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    transactionCount: v.number(),
    errorMessage: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { documentId, pageStorageId, pageNumber, totalPages, documentType, workosUserId } = args;

    // Validate page number bounds
    if (pageNumber < 1 || pageNumber > totalPages) {
      throw new Error(`Invalid page ${pageNumber} (must be 1-${totalPages})`);
    }

    try {
      // Update progress to extracting phase
      await ctx.runMutation(internal.nativePdfExtraction.updatePhaseInternal, {
        documentId,
        phase: "extracting",
        progress: {
          currentPage: pageNumber,
          totalPages,
          pagesCompleted: pageNumber - 1,
          phaseMessage: `Extracting page ${pageNumber} of ${totalPages}...`,
        },
      });

      // Get image URL from storage
      const imageUrl = await ctx.storage.getUrl(pageStorageId);
      if (!imageUrl) {
        throw new Error(`Image not found for page ${pageNumber}`);
      }

      // Get document and company for data insertion
      const document = await ctx.runQuery(internal.nativePdfExtraction.getDocumentInfo, {
        documentId,
      });

      if (!document) {
        throw new Error("Document not found");
      }

      // Determine effective document type:
      // - For page 1 with "other": run LLM classification and persist to DB
      // - For pages 2+: prefer DB value (page 1 may have already classified it)
      let effectiveDocType = documentType;

      if (pageNumber > 1 && documentType === "other" && document.documentType !== "other") {
        // Page 1 already classified — use the persisted type
        effectiveDocType = document.documentType;
      } else if (effectiveDocType === "other" && pageNumber === 1) {
        // First page, ambiguous type — classify with LLM
        await ctx.runMutation(internal.nativePdfExtraction.updatePhaseInternal, {
          documentId,
          phase: "extracting",
          progress: {
            currentPage: pageNumber,
            totalPages,
            phaseMessage: "Classifying document type...",
          },
        });

        const classification = await classifyPageWithBedrock(imageUrl);
        if (classification.confidence >= 60) {
          effectiveDocType = classification.documentType;
          // Update the document record with classified type
          await ctx.runMutation(internal.nativePdfExtraction.updateDocumentTypeInternal, {
            documentId,
            documentType: effectiveDocType as "bank_statement" | "invoice" | "receipt" | "other",
          });
        }
      }

      // Call Bedrock Vision for extraction
      const extractionResult = await callBedrockVision(imageUrl, effectiveDocType, pageNumber, totalPages);

      // Stream transactions to database (for bank statements)
      let transactionCount = 0;

      if (effectiveDocType === "bank_statement" && extractionResult.transactions?.length) {
        const streamResult = await ctx.runMutation(internal.nativePdfExtraction.streamPageTransactions, {
          documentId,
          companyId: document.companyId,
          transactions: extractionResult.transactions,
          pageNumber,
          totalPages,
        });
        transactionCount = streamResult.insertedCount;
      }

      // Handle invoice/receipt extraction
      if (extractionResult.invoiceData && pageNumber === 1) {
        await ctx.runMutation(internal.nativePdfExtraction.insertAccrualDocument, {
          documentId,
          companyId: document.companyId,
          invoiceData: extractionResult.invoiceData,
        });
        transactionCount = 1;
      }

      // Update document with metadata from first page
      if (pageNumber === 1 && (extractionResult.bankName || extractionResult.periodStart || extractionResult.accountHolderName || extractionResult.companyNameOnDocument || extractionResult.currency)) {
        await ctx.runMutation(internal.nativePdfExtraction.updateDocumentMetadata, {
          documentId,
          bankName: extractionResult.bankName,
          accountHolderName: extractionResult.accountHolderName,
          accountNumber: extractionResult.accountNumber,
          periodStart: extractionResult.periodStart,
          periodEnd: extractionResult.periodEnd,
          confidence: extractionResult.confidence,
          // Agent enrichment fields
          extractedCompanyName: extractionResult.companyNameOnDocument,
          extractedCounterparties: extractionResult.extractedCounterparties,
          extractedCurrency: extractionResult.currency,
        });
      }

      return {
        success: true,
        transactionCount,
      };
    } catch (error) {
      console.error(`[NativeExtraction] Page ${pageNumber} failed:`, error);

      const errorMessage = error instanceof Error ? error.message : "Unknown extraction error";

      // Update progress to reflect the failure but don't mark the whole document as failed.
      // The client will decide whether to continue or stop based on how many pages succeeded.
      await ctx.runMutation(internal.nativePdfExtraction.updatePhaseInternal, {
        documentId,
        phase: "extracting",
        progress: {
          currentPage: pageNumber,
          totalPages,
          pagesCompleted: pageNumber,
          phaseMessage: `Page ${pageNumber} failed: ${getUserFriendlyError(errorMessage)}`,
        },
      });

      return {
        success: false,
        transactionCount: 0,
        errorMessage: getUserFriendlyError(errorMessage),
      };
    }
  },
});

/**
 * Complete extraction - finalize document after all pages processed
 */
export const completeExtraction = mutation({
  args: {
    documentId: v.id("documents"),
    totalTransactions: v.number(),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, totalTransactions, workosUserId }) => {
    // Get document to verify ownership
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify company access
    await requireCompanyAccess(ctx, document.companyId, workosUserId);

    // Mark extraction as complete
    await ctx.db.patch(documentId, {
      extractionPhase: "complete",
      extractionStatus: "completed",
      extractedTransactionCount: totalTransactions,
      processedAt: Date.now(),
      extractionProgress: undefined,
    });

    return null;
  },
});

/**
 * Finalize extraction: create/link reconciliation session and run matching.
 *
 * Mirrors geminiExtraction.ts steps 8-9. Called by the client hook after
 * all pages have been extracted and completeExtraction has been called.
 */
export const finalizeExtraction = action({
  args: {
    documentId: v.id("documents"),
    totalTransactions: v.number(),
  },
  returns: v.object({
    sessionId: v.optional(v.id("reconciliationSessions")),
  }),
  handler: async (ctx, { documentId, totalTransactions }) => {
    let sessionId: Id<"reconciliationSessions"> | undefined;

    try {
      // Get document info for companyId
      const document = await ctx.runQuery(internal.nativePdfExtraction.getDocumentInfo, {
        documentId,
      });

      if (!document) {
        return { sessionId: undefined };
      }

      // Get company owner for session creation
      const ownerId = await ctx.runQuery(internal.geminiExtraction.getCompanyOwner, {
        companyId: document.companyId,
      });

      if (!ownerId) {
        return { sessionId: undefined };
      }

      // Create or reuse session, link all unassigned transactions and accrual docs
      sessionId = await ctx.runMutation(internal.sessions.autoCreateAndLink, {
        companyId: document.companyId,
        userId: ownerId,
      });

      // Run matching if both cash and accrual sides exist AND session is still draft
      // The status check prevents duplicate matching when concurrent extractions complete
      if (sessionId) {
        const counts = await ctx.runQuery(internal.sessions.getSessionCounts, { sessionId });
        if (counts.cashCount > 0 && counts.accrualCount > 0 && counts.status === "draft") {
          await ctx.runMutation(internal.sessions.updateStatusInternal, {
            id: sessionId,
            status: "processing",
          });

          try {
            await ctx.runAction(api.sessions.runMatching, {
              sessionId,
              useLLM: false,
            });

            await ctx.runMutation(internal.sessions.updateStatusInternal, {
              id: sessionId,
              status: "review",
            });
          } catch (matchError) {
            console.warn("[NativeExtraction] Matching failed, session still available:", matchError);
            await ctx.runMutation(internal.sessions.updateStatusInternal, {
              id: sessionId,
              status: "review",
            });
          }
        }
      }
    } catch (error) {
      console.warn("[NativeExtraction] Session creation failed:", error);
    }

    return { sessionId };
  },
});

/**
 * Mark extraction as failed
 */
export const failExtraction = mutation({
  args: {
    documentId: v.id("documents"),
    errorMessage: v.string(),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, errorMessage, workosUserId }) => {
    // Get document to verify ownership
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify company access
    await requireCompanyAccess(ctx, document.companyId, workosUserId);

    // Mark extraction as failed
    await ctx.db.patch(documentId, {
      extractionPhase: "failed",
      extractionStatus: "failed",
      errorMessage,
      processedAt: Date.now(),
      extractionProgress: undefined,
    });

    return null;
  },
});

// ============================================================================
// Internal Queries
// ============================================================================

export const getDocumentInfo = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.object({
      companyId: v.id("companies"),
      documentType: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return null;
    return {
      companyId: doc.companyId,
      documentType: doc.documentType,
    };
  },
});

// ============================================================================
// Internal Mutations
// ============================================================================

/**
 * Stream transactions from a page immediately after extraction
 */
export const streamPageTransactions = internalMutation({
  args: {
    documentId: v.id("documents"),
    companyId: v.id("companies"),
    transactions: v.array(
      v.object({
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        reference: v.optional(v.string()),
      })
    ),
    pageNumber: v.number(),
    totalPages: v.number(),
  },
  returns: v.object({
    insertedCount: v.number(),
    totalStreamed: v.number(),
  }),
  handler: async (ctx, { documentId, companyId, transactions, pageNumber, totalPages }) => {
    const now = Date.now();
    let insertedCount = 0;

    for (const tx of transactions) {
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
      insertedCount++;
    }

    // Get current progress to calculate total
    const document = await ctx.db.get(documentId);
    const currentProgress = document?.extractionProgress;
    const previousStreamedCount = currentProgress?.streamedTransactionCount || 0;
    const totalStreamed = previousStreamedCount + insertedCount;

    // Update progress
    await ctx.db.patch(documentId, {
      extractionProgress: {
        currentPage: pageNumber,
        totalPages,
        pagesCompleted: pageNumber,
        streamedTransactionCount: totalStreamed,
        phaseMessage: `Extracted ${totalStreamed} transactions...`,
      },
    });

    return { insertedCount, totalStreamed };
  },
});

/**
 * Insert accrual document (for invoices/receipts)
 */
export const insertAccrualDocument = internalMutation({
  args: {
    documentId: v.id("documents"),
    companyId: v.id("companies"),
    invoiceData: v.object({
      docType: v.string(),
      docNumber: v.optional(v.string()),
      docDate: v.string(),
      dueDate: v.optional(v.string()),
      counterparty: v.optional(v.string()),
      amount: v.number(),
      taxAmount: v.optional(v.number()),
      description: v.optional(v.string()),
      lineItems: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, companyId, invoiceData }) => {
    const validDocTypes = ["sales_invoice", "purchase_invoice", "pos_report", "settlement", "receipt"] as const;
    const docType = validDocTypes.includes(invoiceData.docType as typeof validDocTypes[number])
      ? invoiceData.docType as typeof validDocTypes[number]
      : "receipt";

    await ctx.db.insert("accrualDocuments", {
      companyId,
      docType,
      docNumber: invoiceData.docNumber,
      docDate: invoiceData.docDate,
      dueDate: invoiceData.dueDate,
      counterparty: invoiceData.counterparty,
      amount: invoiceData.amount,
      taxAmount: invoiceData.taxAmount,
      description: invoiceData.description,
      lineItems: invoiceData.lineItems,
      sourceDocumentId: documentId,
      status: "pending",
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Clean up temporary page images from Convex storage after extraction completes.
 * Called by the client hook after all pages have been extracted to free storage space.
 */
export const cleanupPageImages = mutation({
  args: {
    documentId: v.id("documents"),
    storageIds: v.array(v.id("_storage")),
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, { documentId, storageIds, workosUserId }) => {
    // Verify ownership before deleting storage items
    const document = await ctx.db.get(documentId);
    if (!document) return { deleted: 0 };
    await requireCompanyAccess(ctx, document.companyId, workosUserId);

    let deleted = 0;
    for (const storageId of storageIds) {
      try {
        await ctx.storage.delete(storageId);
        deleted++;
      } catch (error) {
        // Non-critical: log but don't fail the operation
        console.warn(`[NativeExtraction] Failed to delete page image ${storageId}:`, error);
      }
    }
    return { deleted };
  },
});

/**
 * Update document type after LLM classification
 */
export const updateDocumentTypeInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    documentType: v.union(
      v.literal("bank_statement"),
      v.literal("invoice"),
      v.literal("receipt"),
      v.literal("other"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, documentType }) => {
    await ctx.db.patch(documentId, { documentType });
    return null;
  },
});

/**
 * Update document metadata from extraction
 */
export const updateDocumentMetadata = internalMutation({
  args: {
    documentId: v.id("documents"),
    bankName: v.optional(v.string()),
    accountHolderName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    confidence: v.optional(v.number()),
    // Agent enrichment fields
    extractedCompanyName: v.optional(v.string()),
    extractedCounterparties: v.optional(v.array(v.string())),
    extractedCurrency: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, bankName, accountHolderName, accountNumber, periodStart, periodEnd, confidence, extractedCompanyName, extractedCounterparties, extractedCurrency }) => {
    const updateData: Record<string, unknown> = {};

    if (bankName) {
      updateData.bankType = bankName.toLowerCase().replace(/\s+/g, "_");
    }
    if (accountHolderName) updateData.accountHolderName = accountHolderName;
    if (accountNumber) updateData.accountNumber = accountNumber;
    if (periodStart) updateData.periodStart = periodStart;
    if (periodEnd) updateData.periodEnd = periodEnd;
    if (confidence !== undefined) updateData.extractionConfidence = confidence;
    // Agent enrichment
    if (extractedCompanyName) updateData.extractedCompanyName = extractedCompanyName;
    if (extractedCounterparties && extractedCounterparties.length > 0) {
      updateData.extractedCounterparties = extractedCounterparties;
    }
    if (extractedCurrency) updateData.extractedCurrency = extractedCurrency;

    if (Object.keys(updateData).length > 0) {
      await ctx.db.patch(documentId, updateData);
    }

    return null;
  },
});

// ============================================================================
// Bedrock Vision Classification & Extraction
// ============================================================================

/**
 * Classify a document page using Bedrock Vision.
 * Uses a fast, low-token call to determine bank_statement vs invoice vs receipt.
 */
async function classifyPageWithBedrock(
  imageUrl: string,
): Promise<{ documentType: string; confidence: number }> {
  const region = process.env.AWS_REGION || "us-east-1";
  const modelId = process.env.EXTRACTION_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  const bedrock = createAmazonBedrock({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

  const prompt = buildClassificationPrompt();

  try {
    const { text } = await generateText({
      model: bedrock(modelId),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: new URL(imageUrl),
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0.1,
      maxOutputTokens: 256,
    });

    return parseClassificationResult(text, "other");
  } catch (error) {
    console.warn("[NativeExtraction] Classification failed, using fallback:", error);
    return { documentType: "other", confidence: 0 };
  }
}

/**
 * Call Bedrock Vision to extract data from an image
 */
async function callBedrockVision(
  imageUrl: string,
  documentType: string,
  currentPage: number,
  totalPages: number
): Promise<ExtractionResult> {
  const region = process.env.AWS_REGION || "us-east-1";
  const modelId = process.env.EXTRACTION_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  const bedrock = createAmazonBedrock({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

  const prompt = buildExtractionPrompt(documentType, currentPage, totalPages);

  const { text } = await generateText({
    model: bedrock(modelId),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: new URL(imageUrl),
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    temperature: 0.1,
    maxOutputTokens: 40960,
  });

  return parseExtractionResult(text, documentType);
}
