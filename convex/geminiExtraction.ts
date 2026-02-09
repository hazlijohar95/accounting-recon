/**
 * Gemini Extraction Module
 *
 * Handles PDF extraction using Gemini 2.5 Flash (with 2.0 Flash fallback)
 * via Vertex AI REST API. Unlike Bedrock, Gemini accepts PDFs directly —
 * no client-side PDF→image conversion needed.
 *
 * Flow: Upload → single Convex action → fetch PDF → Gemini API (whole doc) → transactions
 *
 * @module convex/geminiExtraction
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  buildExtractionPrompt,
  buildClassificationPrompt,
  parseExtractionResult,
  parseClassificationResult,
  getUserFriendlyError,
  type ExtractionResult,
} from "./lib/extractionUtils";
import { getGeminiEndpoint } from "./lib/vertexAuth";

// ============================================================================
// Gemini Vertex AI Call
// ============================================================================

/**
 * Call Gemini via Vertex AI REST API with a PDF or image.
 *
 * @param fileBase64 - Base64-encoded file content
 * @param mimeType - MIME type of the file (application/pdf, image/jpeg, etc.)
 * @param documentType - Document type for prompt selection
 * @param modelId - Gemini model ID to use
 */
async function callGemini(
  fileBase64: string,
  mimeType: string,
  documentType: string,
  modelId: string,
): Promise<{ result: ExtractionResult; rawText: string }> {
  const prompt = buildExtractionPrompt(documentType, null, null);
  const endpoint = getGeminiEndpoint(modelId);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 32768,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
      finishReason?: string;
    }>;
  };

  // Detect output truncation
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    console.warn(
      `[GeminiExtraction] Response truncated (finishReason=MAX_TOKENS) for docType=${documentType}, model=${modelId}. ` +
      `Increase maxOutputTokens or split the document.`
    );
  }

  // Extract text from Gemini response
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates in Gemini response");
  }

  const parts = candidates[0].content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("No content parts in Gemini response");
  }

  const rawText = parts.map((p) => p.text || "").join("");
  if (!rawText) {
    throw new Error("Empty text in Gemini response");
  }

  const result = parseExtractionResult(rawText, documentType);
  return { result, rawText };
}

// ============================================================================
// Keyword-Based Heuristic Classification
// ============================================================================

/**
 * Keyword-based heuristic for document classification.
 * Used as a fallback when Gemini returns low confidence.
 * Returns the detected type or null if inconclusive.
 */
function classifyByKeywords(rawText: string): { documentType: string; confidence: number } | null {
  const text = rawText.toLowerCase();

  // Bank statement indicators
  const bankKeywords = [
    "opening balance", "closing balance", "statement date", "account statement",
    "bank statement", "withdrawal", "deposit", "balance brought forward",
    "balance carried forward", "debit", "credit", "account number",
    "statement period", "transaction history", "baki dibawa", "baki dihantar",
    "penyata akaun", "penyata bank", "pengeluaran", "simpanan",
  ];

  // Invoice indicators
  const invoiceKeywords = [
    "invoice number", "invoice date", "bill to", "amount due", "payment terms",
    "due date", "subtotal", "total amount", "tax invoice", "purchase order",
    "invois", "jumlah perlu dibayar",
  ];

  // Receipt indicators
  const receiptKeywords = [
    "receipt number", "payment received", "paid", "thank you for your payment",
    "resit", "official receipt",
  ];

  const bankScore = bankKeywords.filter(kw => text.includes(kw)).length;
  const invoiceScore = invoiceKeywords.filter(kw => text.includes(kw)).length;
  const receiptScore = receiptKeywords.filter(kw => text.includes(kw)).length;

  // Need at least 2 keyword matches to be meaningful
  const maxScore = Math.max(bankScore, invoiceScore, receiptScore);
  if (maxScore < 2) return null;

  if (bankScore > invoiceScore && bankScore > receiptScore) {
    return { documentType: "bank_statement", confidence: Math.min(75, 40 + bankScore * 8) };
  }
  if (invoiceScore > bankScore && invoiceScore > receiptScore) {
    return { documentType: "invoice", confidence: Math.min(75, 40 + invoiceScore * 8) };
  }
  if (receiptScore > bankScore && receiptScore > invoiceScore) {
    return { documentType: "receipt", confidence: Math.min(75, 40 + receiptScore * 8) };
  }

  return null;
}

// ============================================================================
// Gemini Document Classification
// ============================================================================

/**
 * Classify a document's type using Gemini before full extraction.
 * Uses a fast, low-token call to determine bank_statement vs invoice vs receipt.
 * Falls back to keyword heuristic if Gemini returns low confidence.
 */
async function classifyWithGemini(
  fileBase64: string,
  mimeType: string,
  modelId: string,
): Promise<{ documentType: string; confidence: number }> {
  const prompt = buildClassificationPrompt();
  const endpoint = getGeminiEndpoint(modelId);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(
      `[GeminiExtraction] Classification API error ${response.status}: ${errorBody.slice(0, 300)}. ` +
      `Falling back to documentType="other".`
    );
    return { documentType: "other", confidence: 0 };
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  const classification = parseClassificationResult(rawText, "other");
  console.log(
    `[GeminiExtraction] Classification result: type="${classification.documentType}", ` +
    `confidence=${classification.confidence}%`
  );
  return classification;
}

// ============================================================================
// Gemini Phase Tracking
// ============================================================================

/**
 * Internal mutation for Gemini phase updates.
 * Simpler than Bedrock since there's no per-page tracking.
 * Phases: uploading → extracting → processing → complete/failed
 */
export const updateGeminiPhase = internalMutation({
  args: {
    documentId: v.id("documents"),
    phase: v.union(
      v.literal("uploading"),
      v.literal("extracting"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("failed")
    ),
    phaseMessage: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, phase, phaseMessage, errorMessage }) => {
    const updateData: Record<string, unknown> = {
      extractionPhase: phase,
    };

    if (phaseMessage) {
      updateData.extractionProgress = {
        currentPage: 1,
        totalPages: 1,
        phaseMessage,
      };
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
// Main Extraction Action
// ============================================================================

/**
 * Extract data from a document using Gemini via Vertex AI.
 *
 * Handles the entire extraction workflow in a single action:
 * 1. Fetch document record for storageId, documentType, companyId
 * 2. Get PDF bytes from Convex storage and convert to base64
 * 3. Call Gemini 2.5 Flash (primary model)
 * 4. If failure or low confidence, retry with Gemini 2.0 Flash (fallback)
 * 5. Store results using existing internal mutations
 * 6. Mark extraction complete/failed
 */
export const extractWithGemini = action({
  args: {
    documentId: v.id("documents"),
    workosUserId: v.optional(v.string()),
    skipSessionCreation: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    transactionCount: v.number(),
    errorMessage: v.optional(v.string()),
    modelUsed: v.optional(v.string()),
    sessionId: v.optional(v.id("reconciliationSessions")),
  }),
  handler: async (ctx, { documentId, workosUserId, skipSessionCreation }) => {
    const primaryModel = process.env.GEMINI_PRIMARY_MODEL || "gemini-2.5-flash";
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash";

    try {
      // Step 1: Get document info
      const document = await ctx.runQuery(internal.nativePdfExtraction.getDocumentInfo, {
        documentId,
      });

      if (!document) {
        throw new Error("Document not found");
      }

      // Step 2: Update phase to extracting
      await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
        documentId,
        phase: "extracting",
        phaseMessage: "Sending document to Gemini...",
      });

      // Step 3: Get file from Convex storage
      // We need to get the storage URL from the document's storageId
      const docRecord = await ctx.runQuery(internal.geminiExtraction.getDocumentStorageInfo, {
        documentId,
      });

      if (!docRecord?.storageId) {
        throw new Error("Document has no associated storage file");
      }

      const fileUrl = await ctx.storage.getUrl(docRecord.storageId);
      if (!fileUrl) {
        throw new Error("Could not get URL for stored document");
      }

      // Fetch the file bytes
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch document file: ${fileResponse.status}`);
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      const fileBase64 = arrayBufferToBase64(fileBuffer);

      // Determine MIME type from file extension
      const mimeType = getMimeType(docRecord.fileType);

      // Step 4a: Classify document type if ambiguous ("other")
      let effectiveDocType = document.documentType;
      if (effectiveDocType === "other") {
        await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
          documentId,
          phase: "extracting",
          phaseMessage: "Classifying document type...",
        });

        const classification = await classifyWithGemini(fileBase64, mimeType, primaryModel);
        if (classification.confidence >= 30 && classification.documentType !== "other") {
          // Accept Gemini classification at lower threshold — even 30% confidence
          // is usually correct about the TYPE, just uncertain about the confidence value.
          effectiveDocType = classification.documentType;
          await ctx.runMutation(internal.geminiExtraction.updateDocumentType, {
            documentId,
            documentType: effectiveDocType as "bank_statement" | "invoice" | "receipt" | "other",
          });
          if (classification.confidence < 60) {
            console.log(
              `[GeminiExtraction] Accepted low-confidence classification: type="${effectiveDocType}" ` +
              `confidence=${classification.confidence}% (threshold lowered from 60 to 30)`
            );
          }
        } else {
          // Gemini classification failed or returned "other" — log for debugging.
          // The extraction step below uses a universal prompt for "other" that can still
          // find transactions, and auto-upgrade logic at the post-extraction step handles it.
          console.warn(
            `[GeminiExtraction] Classification inconclusive: type="${classification.documentType}" ` +
            `confidence=${classification.confidence}%. Will use universal extraction prompt.`
          );
        }
      }

      // Step 4b: Call Gemini primary model
      let extractionResult: ExtractionResult;
      let extractedRawText = "";
      let modelUsed = primaryModel;

      try {
        await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
          documentId,
          phase: "extracting",
          phaseMessage: `Extracting with ${primaryModel}...`,
        });

        const { result, rawText } = await callGemini(
          fileBase64,
          mimeType,
          effectiveDocType,
          primaryModel,
        );
        extractionResult = result;
        extractedRawText = rawText;
      } catch (primaryError) {
        // Step 5: Fallback to secondary model
        console.warn(
          `[GeminiExtraction] Primary model ${primaryModel} failed, trying fallback ${fallbackModel}:`,
          primaryError instanceof Error ? primaryError.message : primaryError
        );

        await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
          documentId,
          phase: "extracting",
          phaseMessage: `Retrying with ${fallbackModel}...`,
        });

        const { result, rawText } = await callGemini(
          fileBase64,
          mimeType,
          effectiveDocType,
          fallbackModel,
        );
        extractionResult = result;
        extractedRawText = rawText;
        modelUsed = fallbackModel;
      }

      // If primary model returned low confidence, try fallback
      if (extractionResult.confidence < 70 && modelUsed === primaryModel) {
        console.warn(
          `[GeminiExtraction] Low confidence (${extractionResult.confidence}%) from ${primaryModel}, trying fallback`
        );

        await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
          documentId,
          phase: "extracting",
          phaseMessage: `Low confidence, retrying with ${fallbackModel}...`,
        });

        try {
          const { result: fallbackResult, rawText: fallbackRawText } = await callGemini(
            fileBase64,
            mimeType,
            effectiveDocType,
            fallbackModel,
          );

          // Use fallback result if it has better confidence
          if (fallbackResult.confidence > extractionResult.confidence) {
            extractionResult = fallbackResult;
            extractedRawText = fallbackRawText;
            modelUsed = fallbackModel;
          }
        } catch (fallbackError) {
          // Keep the primary result even with low confidence
          console.warn(
            "[GeminiExtraction] Fallback also failed, keeping primary result:",
            fallbackError instanceof Error ? fallbackError.message : fallbackError
          );
        }
      }

      // Store rawText as extractedText (capped at 10KB for storage efficiency)
      if (extractedRawText) {
        const cappedText = extractedRawText.length > 10240
          ? extractedRawText.slice(0, 10240) + "\n... [truncated]"
          : extractedRawText;
        await ctx.runMutation(internal.geminiExtraction.storeExtractedText, {
          documentId,
          extractedText: cappedText,
        });
      }

      // Step 6: Process results
      await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
        documentId,
        phase: "processing",
        phaseMessage: "Saving extracted data...",
      });

      let transactionCount = 0;

      // Store transactions if Gemini found any, regardless of original classification.
      // Auto-upgrade document type to bank_statement when transactions are present.
      if (extractionResult.transactions?.length) {
        if (effectiveDocType !== "bank_statement") {
          console.log(
            `[GeminiExtraction] Auto-upgrading document type from "${effectiveDocType}" to "bank_statement" ` +
            `(found ${extractionResult.transactions.length} transactions)`
          );
          effectiveDocType = "bank_statement";
          await ctx.runMutation(internal.geminiExtraction.updateDocumentType, {
            documentId,
            documentType: "bank_statement",
          });
        }
        const streamResult = await ctx.runMutation(internal.nativePdfExtraction.streamPageTransactions, {
          documentId,
          companyId: document.companyId,
          transactions: extractionResult.transactions,
          pageNumber: 1,
          totalPages: 1,
        });
        transactionCount = streamResult.insertedCount;
      }

      // If still classified as "other" after extraction, try keyword heuristic on the raw text.
      // This catches cases where Gemini classification failed (0% confidence) AND the universal
      // extraction prompt didn't return transactions in a structured format.
      if (effectiveDocType === "other" && extractedRawText && !extractionResult.transactions?.length && !extractionResult.invoiceData) {
        const heuristic = classifyByKeywords(extractedRawText);
        if (heuristic) {
          console.log(
            `[GeminiExtraction] Keyword heuristic classified document as "${heuristic.documentType}" ` +
            `(confidence=${heuristic.confidence}%) after Gemini classification failed`
          );
          effectiveDocType = heuristic.documentType;
          await ctx.runMutation(internal.geminiExtraction.updateDocumentType, {
            documentId,
            documentType: effectiveDocType as "bank_statement" | "invoice" | "receipt" | "other",
          });
        }
      }

      // Store invoice/receipt data
      if (extractionResult.invoiceData) {
        await ctx.runMutation(internal.nativePdfExtraction.insertAccrualDocument, {
          documentId,
          companyId: document.companyId,
          invoiceData: extractionResult.invoiceData,
        });
        transactionCount = 1;
      }

      // Update document metadata
      if (extractionResult.bankName || extractionResult.periodStart) {
        await ctx.runMutation(internal.nativePdfExtraction.updateDocumentMetadata, {
          documentId,
          bankName: extractionResult.bankName,
          periodStart: extractionResult.periodStart,
          periodEnd: extractionResult.periodEnd,
          confidence: extractionResult.confidence,
        });
      }

      // Step 7: Mark complete
      await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
        documentId,
        phase: "complete",
        phaseMessage: `Extracted ${transactionCount} transactions`,
      });

      // Also update the extracted transaction count
      await ctx.runMutation(internal.geminiExtraction.setExtractedCount, {
        documentId,
        count: transactionCount,
      });

      // Step 8: Auto-create session and link transactions for reconciliation
      // Skip if caller wants to handle session creation separately (upload analysis flow)
      let sessionId: Id<"reconciliationSessions"> | undefined;
      if (!skipSessionCreation) {
        try {
          const ownerId = await ctx.runQuery(internal.geminiExtraction.getCompanyOwner, {
            companyId: document.companyId,
          });

          if (ownerId) {
            sessionId = await ctx.runMutation(internal.sessions.autoCreateAndLink, {
              companyId: document.companyId,
              userId: ownerId,
            });

            // Step 9: Run matching if both cash and accrual sides exist AND session is still draft
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
                  console.warn("[GeminiExtraction] Matching failed, session still available:", matchError);
                  await ctx.runMutation(internal.sessions.updateStatusInternal, {
                    id: sessionId,
                    status: "review",
                  });
                }
              }
            }
          }
        } catch (sessionError) {
          console.warn("[GeminiExtraction] Session creation failed:", sessionError);
          // Don't fail the extraction just because session creation failed
        }
      }

      return {
        success: true,
        transactionCount,
        modelUsed,
        sessionId,
      };
    } catch (error) {
      console.error("[GeminiExtraction] Failed:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown extraction error";

      await ctx.runMutation(internal.geminiExtraction.updateGeminiPhase, {
        documentId,
        phase: "failed",
        errorMessage: getUserFriendlyError(errorMessage),
      });

      return {
        success: false,
        transactionCount: 0,
        errorMessage: getUserFriendlyError(errorMessage),
      };
    }
  },
});

// ============================================================================
// Internal Queries
// ============================================================================

/**
 * Get document storage info for fetching the file
 */
export const getDocumentStorageInfo = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      fileType: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc || !doc.storageId) return null;
    return {
      storageId: doc.storageId,
      fileType: doc.fileType,
    };
  },
});

/**
 * Get company owner ID for session creation
 */
export const getCompanyOwner = internalQuery({
  args: { companyId: v.id("companies") },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, { companyId }) => {
    const company = await ctx.db.get(companyId);
    return company?.ownerId ?? null;
  },
});

/**
 * Update document type after LLM classification
 */
export const updateDocumentType = internalMutation({
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
 * Set extracted transaction count on completion
 */
export const setExtractedCount = internalMutation({
  args: {
    documentId: v.id("documents"),
    count: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, count }) => {
    await ctx.db.patch(documentId, {
      extractedTransactionCount: count,
    });
    return null;
  },
});

/**
 * Store extracted text from Gemini response on the document record.
 * Enables upload analysis company verification and debugging.
 */
export const storeExtractedText = internalMutation({
  args: {
    documentId: v.id("documents"),
    extractedText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, extractedText }) => {
    await ctx.db.patch(documentId, { extractedText });
    return null;
  },
});

// ============================================================================
// Re-extraction Support
// ============================================================================

/**
 * Clear previously extracted transactions and accrual documents for a source document.
 * Used before re-extraction when a document is reclassified.
 */
export const clearDocumentExtractions = internalMutation({
  args: {
    documentId: v.id("documents"),
    // companyId kept for backward compatibility but no longer needed for queries
    companyId: v.optional(v.id("companies")),
  },
  returns: v.null(),
  handler: async (ctx, { documentId }) => {
    // Delete transactions linked to this document (using index for O(1) lookup)
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_source_document", (q) => q.eq("sourceDocumentId", documentId))
      .collect();

    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    // Delete accrual documents linked to this document (using index for O(1) lookup)
    const accrualDocs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_source_document", (q) => q.eq("sourceDocumentId", documentId))
      .collect();

    for (const doc of accrualDocs) {
      await ctx.db.delete(doc._id);
    }

    // Reset extraction fields on the document
    await ctx.db.patch(documentId, {
      extractedTransactionCount: 0,
      extractionStatus: "pending",
      extractionPhase: undefined,
      extractedText: undefined,
      errorMessage: undefined,
    });

    return null;
  },
});

/**
 * Re-extract a document after reclassification.
 * Clears old extraction data and runs extraction with the corrected type.
 */
export const reExtractDocument = action({
  args: {
    documentId: v.id("documents"),
    companyId: v.id("companies"),
  },
  returns: v.object({
    success: v.boolean(),
    transactionCount: v.number(),
    errorMessage: v.optional(v.string()),
  }),
  handler: async (ctx, { documentId, companyId }) => {
    // Clear old extractions
    await ctx.runMutation(internal.geminiExtraction.clearDocumentExtractions, {
      documentId,
      companyId,
    });

    console.log(`[GeminiExtraction] Re-extracting document ${documentId} after reclassification`);

    // Re-run extraction (skip session creation — caller handles that)
    const result = await ctx.runAction(api.geminiExtraction.extractWithGemini, {
      documentId,
      skipSessionCreation: true,
    });

    return {
      success: result.success,
      transactionCount: result.transactionCount,
      errorMessage: result.errorMessage,
    };
  },
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert ArrayBuffer to base64 string.
 * Uses Buffer.from() for efficient conversion in the Convex Node.js runtime.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

/**
 * Map file extension to MIME type for Gemini inline data.
 */
function getMimeType(fileType: string): string {
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return mimeMap[fileType.toLowerCase()] || "application/pdf";
}
