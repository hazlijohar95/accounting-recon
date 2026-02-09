/**
 * Upload Analysis Module
 *
 * AI-powered document classification and company verification.
 * Inserts an analysis checkpoint between extraction and reconciliation.
 *
 * Flow:
 * 1. createBatch — after files are uploaded
 * 2. checkReady — polls until all extractions complete
 * 3. runAnalysis — AI classifies documents + verifies company
 * 4. reclassifyDocument — user corrects misclassifications
 * 5. approveAndProceed — creates session, runs matching
 *
 * @module convex/uploadAnalysis
 */

import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireCompanyAccess, verifyQueryCompanyAccess } from "./lib/auth";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import {
  buildAnalysisPrompt,
  parseAnalysisResponse,
  computeStats,
  getBasisType,
  type CompanyContext,
  type DocumentContext,
} from "./lib/analysisUtils";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get an upload analysis by ID.
 * Real-time subscription for the analysis panel.
 */
export const get = query({
  args: {
    id: v.id("uploadAnalyses"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.id);
    if (!analysis) return null;

    const { allowed } = await verifyQueryCompanyAccess(ctx, analysis.companyId, args.workosUserId);
    if (!allowed) return null;

    return analysis;
  },
});

/**
 * Check if all documents in a batch have finished extraction.
 * Returns progress info for the waiting state.
 */
export const checkReady = query({
  args: {
    id: v.id("uploadAnalyses"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.id);
    if (!analysis) return null;

    const { allowed } = await verifyQueryCompanyAccess(ctx, analysis.companyId, args.workosUserId);
    if (!allowed) return null;

    let completed = 0;
    let failed = 0;
    const total = analysis.documentIds.length;

    for (const docId of analysis.documentIds) {
      const doc = await ctx.db.get(docId);
      if (!doc) continue;
      if (doc.extractionStatus === "completed") completed++;
      else if (doc.extractionStatus === "failed") failed++;
    }

    return {
      ready: completed + failed >= total,
      completed,
      total,
      failed,
    };
  },
});

/**
 * Get the most recent pending or ready analysis for a company.
 */
export const getLatestForCompany = query({
  args: {
    companyId: v.id("companies"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return null;

    // Find pending or ready analyses
    const analyses = await ctx.db
      .query("uploadAnalyses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();

    return analyses.find(
      (a) => a.status === "pending" || a.status === "analyzing" || a.status === "ready"
    ) ?? null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create an analysis batch after files are uploaded.
 * Builds initial classifications from document records.
 */
export const createBatch = mutation({
  args: {
    companyId: v.id("companies"),
    documentIds: v.array(v.id("documents")),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCompanyAccess(ctx, args.companyId, args.workosUserId);

    // Build initial classifications from document records
    const classifications = [];
    for (const docId of args.documentIds) {
      const doc = await ctx.db.get(docId);
      if (!doc) continue;

      classifications.push({
        documentId: docId,
        fileName: doc.fileName,
        aiClassification: doc.documentType,
        basisType: getBasisType(doc.documentType) as "cash" | "accrual",
        confidence: 0, // Will be updated by AI
        extractionStatus: doc.extractionStatus,
        pageCount: doc.extractionProgress?.totalPages,
        transactionCount: doc.extractedTransactionCount,
      });
    }

    const now = Date.now();
    const analysisId = await ctx.db.insert("uploadAnalyses", {
      companyId: args.companyId,
      userId: user._id,
      status: "pending",
      documentIds: args.documentIds,
      documentClassifications: classifications,
      stats: computeStats(classifications),
      createdAt: now,
      updatedAt: now,
    });

    return analysisId;
  },
});

/**
 * Add more documents to an existing analysis.
 * Resets status to pending so analysis re-runs after extraction.
 */
export const addDocuments = mutation({
  args: {
    analysisId: v.id("uploadAnalyses"),
    documentIds: v.array(v.id("documents")),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) throw new Error("Analysis not found");

    await requireCompanyAccess(ctx, analysis.companyId, args.workosUserId);

    // Build classifications for new documents
    const newClassifications = [];
    for (const docId of args.documentIds) {
      const doc = await ctx.db.get(docId);
      if (!doc) continue;
      newClassifications.push({
        documentId: docId,
        fileName: doc.fileName,
        aiClassification: doc.documentType,
        basisType: getBasisType(doc.documentType) as "cash" | "accrual",
        confidence: 0,
        extractionStatus: doc.extractionStatus,
        pageCount: doc.extractionProgress?.totalPages,
        transactionCount: doc.extractedTransactionCount,
      });
    }

    const allDocIds = [...analysis.documentIds, ...args.documentIds];
    const allClassifications = [...analysis.documentClassifications, ...newClassifications];

    await ctx.db.patch(args.analysisId, {
      documentIds: allDocIds,
      documentClassifications: allClassifications,
      stats: computeStats(allClassifications),
      status: "pending",
      detectedCompany: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * User overrides AI classification for a document.
 * Updates both the analysis record and the document itself.
 */
export const reclassifyDocument = mutation({
  args: {
    analysisId: v.id("uploadAnalyses"),
    documentId: v.id("documents"),
    classification: v.string(),
    basisType: v.union(v.literal("cash"), v.literal("accrual")),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) throw new Error("Analysis not found");

    await requireCompanyAccess(ctx, analysis.companyId, args.workosUserId);

    // Update the classification in the analysis record
    const updatedClassifications = analysis.documentClassifications.map((c) => {
      if (c.documentId === args.documentId) {
        return {
          ...c,
          userOverride: {
            classification: args.classification,
            basisType: args.basisType,
          },
        };
      }
      return c;
    });

    await ctx.db.patch(args.analysisId, {
      documentClassifications: updatedClassifications,
      stats: computeStats(updatedClassifications),
      updatedAt: Date.now(),
    });

    // Also update the document record
    await ctx.db.patch(args.documentId, {
      aiClassification: args.classification,
      aiBasisType: args.basisType,
    });
  },
});

/**
 * Mark analysis as approved.
 */
export const markApproved = mutation({
  args: {
    analysisId: v.id("uploadAnalyses"),
    sessionId: v.id("reconciliationSessions"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) throw new Error("Analysis not found");

    await requireCompanyAccess(ctx, analysis.companyId, args.workosUserId);

    await ctx.db.patch(args.analysisId, {
      status: "approved",
      sessionId: args.sessionId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Dismiss the analysis (user skips).
 */
export const dismiss = mutation({
  args: {
    analysisId: v.id("uploadAnalyses"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) throw new Error("Analysis not found");

    await requireCompanyAccess(ctx, analysis.companyId, args.workosUserId);

    await ctx.db.patch(args.analysisId, {
      status: "dismissed",
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Internal Mutations (called from actions)
// ============================================================================

/**
 * Update analysis status.
 */
export const setStatus = internalMutation({
  args: {
    analysisId: v.id("uploadAnalyses"),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("ready"),
      v.literal("approved"),
      v.literal("dismissed")
    ),
  },
  handler: async (ctx, { analysisId, status }) => {
    await ctx.db.patch(analysisId, {
      status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Store AI analysis results.
 */
export const storeResults = internalMutation({
  args: {
    analysisId: v.id("uploadAnalyses"),
    detectedCompany: v.object({
      name: v.string(),
      registrationNumber: v.optional(v.string()),
      bankName: v.optional(v.string()),
      accountNumber: v.optional(v.string()),
      matchStatus: v.union(
        v.literal("match"),
        v.literal("partial_match"),
        v.literal("mismatch"),
        v.literal("unknown")
      ),
      matchDetails: v.optional(v.string()),
    }),
    documentClassifications: v.array(v.object({
      documentId: v.id("documents"),
      fileName: v.string(),
      aiClassification: v.string(),
      basisType: v.union(v.literal("cash"), v.literal("accrual")),
      confidence: v.number(),
      reason: v.optional(v.string()),
      userOverride: v.optional(v.object({
        classification: v.string(),
        basisType: v.union(v.literal("cash"), v.literal("accrual")),
      })),
      pageCount: v.optional(v.number()),
      transactionCount: v.optional(v.number()),
      extractionStatus: v.string(),
      errorMessage: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { analysisId, detectedCompany, documentClassifications }) => {
    await ctx.db.patch(analysisId, {
      detectedCompany,
      documentClassifications,
      stats: computeStats(documentClassifications),
      status: "ready",
      updatedAt: Date.now(),
    });

    // Update individual document records with AI classification
    for (const doc of documentClassifications) {
      await ctx.db.patch(doc.documentId, {
        aiClassification: doc.aiClassification,
        aiBasisType: doc.basisType,
        aiClassificationConfidence: doc.confidence,
        uploadAnalysisId: analysisId,
      });
    }
  },
});

// ============================================================================
// Internal Queries
// ============================================================================

/**
 * Get analysis data for the action (bypasses auth).
 */
export const getInternal = internalQuery({
  args: { analysisId: v.id("uploadAnalyses") },
  handler: async (ctx, { analysisId }) => {
    return await ctx.db.get(analysisId);
  },
});

/**
 * Get document details for analysis.
 */
export const getDocumentsForAnalysis = internalQuery({
  args: { documentIds: v.array(v.id("documents")) },
  handler: async (ctx, { documentIds }) => {
    const docs = [];
    for (const id of documentIds) {
      const doc = await ctx.db.get(id);
      if (doc) docs.push(doc);
    }
    return docs;
  },
});

/**
 * Get company details for analysis.
 */
export const getCompanyForAnalysis = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    return await ctx.db.get(companyId);
  },
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Run AI analysis on a batch of documents.
 *
 * Gathers extracted text + company context, calls Bedrock for
 * classification + company verification, stores results.
 */
export const runAnalysis = action({
  args: {
    analysisId: v.id("uploadAnalyses"),
  },
  handler: async (ctx, { analysisId }) => {
    // Set status to analyzing
    await ctx.runMutation(internal.uploadAnalysis.setStatus, {
      analysisId,
      status: "analyzing",
    });

    try {
      // Get analysis record
      const analysis = await ctx.runQuery(internal.uploadAnalysis.getInternal, {
        analysisId,
      });
      if (!analysis) throw new Error("Analysis not found");

      // Get company info
      const company = await ctx.runQuery(internal.uploadAnalysis.getCompanyForAnalysis, {
        companyId: analysis.companyId,
      });
      if (!company) throw new Error("Company not found");

      // Get all documents
      const documents = await ctx.runQuery(internal.uploadAnalysis.getDocumentsForAnalysis, {
        documentIds: analysis.documentIds,
      });

      // Build company context
      const companyCtx: CompanyContext = {
        name: company.name,
        tradingAs: company.tradingAs ?? undefined,
        registrationNumber: company.registrationNumber ?? undefined,
        primaryBank: company.primaryBank ?? company.bankName ?? undefined,
        primaryAccountNumber: company.primaryAccountNumber ?? undefined,
      };

      // Build document contexts
      const docContexts: DocumentContext[] = documents.map((doc: typeof documents[number]) => ({
        documentId: doc._id as string,
        fileName: doc.fileName,
        documentType: doc.documentType,
        extractedText: doc.extractedText ?? undefined,
        bankType: doc.bankType ?? undefined,
        accountHolderName: doc.accountHolderName ?? undefined,
        accountNumber: doc.accountNumber ?? undefined,
        periodStart: doc.periodStart ?? undefined,
        periodEnd: doc.periodEnd ?? undefined,
        transactionCount: doc.extractedTransactionCount ?? undefined,
        extractionStatus: doc.extractionStatus,
      }));

      // For large batches, chunk into groups of 10
      // Company detection only needs first few documents
      const CHUNK_SIZE = 10;
      const chunks: DocumentContext[][] = [];
      for (let i = 0; i < docContexts.length; i += CHUNK_SIZE) {
        chunks.push(docContexts.slice(i, i + CHUNK_SIZE));
      }

      // Process chunks (for small batches this is just one call)
      let combinedResponse: ReturnType<typeof parseAnalysisResponse> | null = null;

      // Set up Bedrock client once (reused across chunks)
      const region = process.env.AWS_REGION || "us-east-1";
      const analysisModelId = process.env.ANALYSIS_MODEL_ID || process.env.EXTRACTION_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";
      const bedrock = createAmazonBedrock({
        region,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      });

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const prompt = buildAnalysisPrompt(companyCtx, chunk);

        const { text: rawText } = await generateText({
          model: bedrock(analysisModelId),
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          maxOutputTokens: 4096,
        });

        const chunkDocIds = chunk.map((d) => d.documentId);
        const chunkResult = parseAnalysisResponse(rawText, chunkDocIds);

        if (!combinedResponse) {
          combinedResponse = chunkResult;
        } else {
          // Merge document results, keep first company verification
          combinedResponse.documents.push(...chunkResult.documents);
        }
      }

      if (!combinedResponse) {
        throw new Error("No analysis results produced");
      }

      // Build final classifications with document metadata
      // Only include documents whose IDs are in the known set (prevents AI hallucinating IDs)
      const knownDocIdSet = new Set(analysis.documentIds.map((id: Id<"documents">) => id as string));

      const finalClassifications = combinedResponse.documents
        .filter((aiDoc) => knownDocIdSet.has(aiDoc.documentId))
        .map((aiDoc) => {
          const sourceDoc = documents.find((d: typeof documents[number]) => (d._id as string) === aiDoc.documentId);
          const existingClassification = analysis.documentClassifications.find(
            (c: typeof analysis.documentClassifications[number]) => (c.documentId as string) === aiDoc.documentId
          );

          return {
            documentId: aiDoc.documentId as Id<"documents">,
            fileName: sourceDoc?.fileName || existingClassification?.fileName || "Unknown",
            aiClassification: aiDoc.classification,
            basisType: aiDoc.basisType,
            confidence: aiDoc.confidence,
            // Sanitize: convert null → undefined for Convex v.optional() compatibility
            reason: aiDoc.reason ?? undefined,
            userOverride: existingClassification?.userOverride ?? undefined,
            pageCount: sourceDoc?.extractionProgress?.totalPages ?? undefined,
            transactionCount: sourceDoc?.extractedTransactionCount ?? undefined,
            extractionStatus: sourceDoc?.extractionStatus || "pending",
            errorMessage: sourceDoc?.errorMessage ?? undefined,
          };
        });

      // Store results
      // Sanitize AI response: Convex v.optional() accepts undefined but NOT null.
      // AI models frequently return null for missing fields, so we must convert.
      const verification = combinedResponse.companyVerification;
      await ctx.runMutation(internal.uploadAnalysis.storeResults, {
        analysisId,
        detectedCompany: {
          name: verification.detectedName || "Unknown",
          registrationNumber: verification.registrationNumber ?? undefined,
          bankName: verification.bankName ?? undefined,
          accountNumber: verification.accountNumber ?? undefined,
          matchStatus: verification.matchStatus,
          matchDetails: verification.matchDetails ?? undefined,
        },
        documentClassifications: finalClassifications,
      });

      return { success: true };
    } catch (error) {
      console.error("[UploadAnalysis] AI analysis failed:", error);

      // Reset to ready so user can still proceed
      await ctx.runMutation(internal.uploadAnalysis.setStatus, {
        analysisId,
        status: "ready",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      };
    }
  },
});

/**
 * Approve analysis and create reconciliation session.
 *
 * Applies any reclassifications, creates session, links data, runs matching.
 */
export const approveAndProceed = action({
  args: {
    analysisId: v.id("uploadAnalyses"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, { analysisId, workosUserId }) => {
    // Get analysis
    const analysis = await ctx.runQuery(internal.uploadAnalysis.getInternal, {
      analysisId,
    });
    if (!analysis) throw new Error("Analysis not found");

    // Apply reclassifications to document types and re-extract if needed
    const docsToReExtract: Array<{ documentId: Id<"documents">; companyId: Id<"companies"> }> = [];

    for (const docClass of analysis.documentClassifications) {
      const effectiveClassification = docClass.userOverride?.classification ?? docClass.aiClassification;
      const effectiveBasis = docClass.userOverride?.basisType ?? docClass.basisType;

      // Map classification to document type
      const docType = mapClassificationToDocType(effectiveClassification);

      await ctx.runMutation(internal.uploadAnalysis.updateDocumentClassification, {
        documentId: docClass.documentId,
        documentType: docType,
        aiBasisType: effectiveBasis,
      });

      // Check if document needs re-extraction:
      // Type changed AND has 0 extracted transactions
      const originalType = docClass.aiClassification;
      const hasZeroResults = !docClass.transactionCount || docClass.transactionCount === 0;
      if (docType !== originalType && hasZeroResults) {
        docsToReExtract.push({
          documentId: docClass.documentId,
          companyId: analysis.companyId,
        });
      }
    }

    // Re-extract documents that were reclassified and had 0 results
    for (const doc of docsToReExtract) {
      try {
        console.log(
          `[UploadAnalysis] Re-extracting document ${doc.documentId} after reclassification`
        );
        await ctx.runAction(api.geminiExtraction.reExtractDocument, {
          documentId: doc.documentId,
          companyId: doc.companyId,
        });
      } catch (reExtractError) {
        console.warn(
          `[UploadAnalysis] Re-extraction failed for ${doc.documentId}:`,
          reExtractError instanceof Error ? reExtractError.message : reExtractError
        );
        // Don't block session creation if re-extraction fails
      }
    }

    // Create session using the existing autoCreateAndLink flow
    const sessionId = await ctx.runMutation(internal.sessions.autoCreateAndLink, {
      companyId: analysis.companyId,
      userId: analysis.userId,
    });

    // Mark analysis as approved
    await ctx.runMutation(internal.uploadAnalysis.setStatus, {
      analysisId,
      status: "approved",
    });

    // Update sessionId on analysis
    await ctx.runMutation(internal.uploadAnalysis.linkSession, {
      analysisId,
      sessionId,
    });

    // Run matching if both sides have data
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
        console.warn("[UploadAnalysis] Matching failed:", matchError);
        await ctx.runMutation(internal.sessions.updateStatusInternal, {
          id: sessionId,
          status: "review",
        });
      }
    }

    return { sessionId };
  },
});

// ============================================================================
// Additional Internal Mutations
// ============================================================================

/**
 * Update a document's type and basis after reclassification.
 */
export const updateDocumentClassification = internalMutation({
  args: {
    documentId: v.id("documents"),
    documentType: v.union(
      v.literal("bank_statement"),
      v.literal("invoice"),
      v.literal("receipt"),
      v.literal("other")
    ),
    aiBasisType: v.union(v.literal("cash"), v.literal("accrual")),
  },
  handler: async (ctx, { documentId, documentType, aiBasisType }) => {
    await ctx.db.patch(documentId, {
      documentType,
      aiBasisType,
    });
  },
});

/**
 * Link a session to the analysis record.
 */
export const linkSession = internalMutation({
  args: {
    analysisId: v.id("uploadAnalyses"),
    sessionId: v.id("reconciliationSessions"),
  },
  handler: async (ctx, { analysisId, sessionId }) => {
    await ctx.db.patch(analysisId, {
      sessionId,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map a classification string to the documents table documentType union.
 */
function mapClassificationToDocType(
  classification: string,
): "bank_statement" | "invoice" | "receipt" | "other" {
  switch (classification) {
    case "bank_statement":
    case "cash_book":
    case "payment_voucher":
      return "bank_statement";
    case "invoice":
    case "sales_invoice":
    case "purchase_invoice":
    case "credit_note":
      return "invoice";
    case "receipt":
    case "pos_report":
    case "settlement":
      return "receipt";
    default:
      return "other";
  }
}
