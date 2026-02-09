"use client";

/**
 * Gemini Extraction Hook
 *
 * Simplified extraction hook that sends files directly to Gemini
 * via a single Convex action — no client-side PDF.js rendering needed.
 *
 * Flow:
 * 1. Upload file to Convex storage (same as Bedrock)
 * 2. Call extractWithGemini action (handles everything server-side)
 * 3. Track progress via extractionPhase on the document
 *
 * @module hooks/useGeminiExtraction
 */

import { useCallback, useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useOptionalAuth } from "@/components/auth-provider";
import type { ExtractionProgress, PdfExtractionOptions, UsePdfExtractionResult } from "./usePdfExtraction";

/** Gemini inline data limit (20MB) */
const GEMINI_MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Hook for Gemini-based extraction.
 *
 * Returns the same interface as usePdfExtraction so it's a drop-in replacement.
 * The key difference: no PDF.js rendering step — Gemini accepts PDFs natively.
 */
export function useGeminiExtraction(options: PdfExtractionOptions = {}): UsePdfExtractionResult {
  const { onProgress, onComplete, onError, skipSessionCreation } = options;

  // Auth context
  const auth = useOptionalAuth();
  const workosUserId = auth?.user?.workosId;

  // Convex mutations and actions
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const extractWithGemini = useAction(api.geminiExtraction.extractWithGemini);
  const failExtraction = useMutation(api.nativePdfExtraction.failExtraction);

  // State
  const [progress, setProgress] = useState<ExtractionProgress>({
    phase: "idle",
    message: "Ready",
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const cancelledRef = useRef(false);

  // Update progress helper
  const updateProgress = useCallback(
    (newProgress: ExtractionProgress) => {
      setProgress(newProgress);
      onProgress?.(newProgress);
    },
    [onProgress]
  );

  // Cancel extraction
  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  // Main extraction function
  const extractPdf = useCallback(
    async (
      file: File,
      companyId: Id<"companies">,
      documentType: "bank_statement" | "invoice" | "receipt" | "other"
    ): Promise<Id<"documents"> | null> => {
      // Reset state
      cancelledRef.current = false;
      setIsExtracting(true);

      let documentId: Id<"documents"> | null = null;

      try {
        // Size guard: Gemini inline limit is 20MB
        if (file.size > GEMINI_MAX_FILE_SIZE) {
          console.warn(
            `[GeminiExtraction] File ${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB, ` +
            `exceeds Gemini ${GEMINI_MAX_FILE_SIZE / 1024 / 1024}MB limit`
          );
          throw new Error(
            `File is too large for Gemini extraction (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
            `Maximum is ${GEMINI_MAX_FILE_SIZE / 1024 / 1024}MB.`
          );
        }

        // ================================================================
        // Phase 1: Upload original file to Convex storage
        // ================================================================
        updateProgress({
          phase: "uploading",
          message: "Uploading document...",
        });

        const uploadUrl = await generateUploadUrl({
          companyId,
          workosUserId,
        });

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const { storageId } = await uploadResponse.json() as { storageId: Id<"_storage"> };

        // Get file extension
        const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

        // Create document record
        documentId = await createDocument({
          companyId,
          fileName: file.name,
          fileType: fileExtension,
          fileSize: file.size,
          contentType: file.type,
          storageId,
          documentType,
          workosUserId,
        });

        // Check for cancellation
        if (cancelledRef.current) {
          throw new Error("Extraction cancelled");
        }

        // ================================================================
        // Phase 2: Call Gemini extraction (single action, no PDF.js!)
        // ================================================================
        updateProgress({
          phase: "extracting",
          message: "Extracting with Gemini...",
        });

        const result = await extractWithGemini({
          documentId,
          workosUserId,
          skipSessionCreation,
        });

        // Check for cancellation
        if (cancelledRef.current) {
          throw new Error("Extraction cancelled");
        }

        if (!result.success) {
          throw new Error(result.errorMessage || "Gemini extraction failed");
        }

        // ================================================================
        // Phase 3: Complete
        // ================================================================
        updateProgress({
          phase: "complete",
          message: `Extraction complete! ${result.transactionCount} transactions found.`,
          transactionCount: result.transactionCount,
        });

        onComplete?.(documentId, result.transactionCount, result.sessionId);
        setIsExtracting(false);

        return documentId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        updateProgress({
          phase: "failed",
          message: "Extraction failed",
          errorMessage,
        });

        // Update document status if we have a document ID
        if (documentId) {
          await failExtraction({
            documentId,
            errorMessage,
            workosUserId,
          }).catch(console.error);
        }

        onError?.(documentId, errorMessage);
        setIsExtracting(false);

        return null;
      }
    },
    [
      generateUploadUrl,
      createDocument,
      extractWithGemini,
      failExtraction,
      workosUserId,
      updateProgress,
      onComplete,
      onError,
    ]
  );

  return {
    extractPdf,
    progress,
    isExtracting,
    cancel,
  };
}
