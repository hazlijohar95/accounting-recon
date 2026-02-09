"use client";

/**
 * PDF Extraction Hook
 *
 * Orchestrates the client-side PDF extraction workflow:
 * 1. Renders PDF pages to images using PDF.js
 * 2. Uploads page images to Convex storage
 * 3. Triggers Bedrock Vision extraction for each page
 * 4. Provides granular progress updates throughout
 *
 * @module hooks/usePdfExtraction
 */

import { useCallback, useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { renderPdfPages, getPdfPageCount, isPdfFile, type PageRenderResult } from "@/lib/pdf-renderer";
import { useOptionalAuth } from "@/components/auth-provider";

/**
 * Extraction progress state
 */
export interface ExtractionProgress {
  /** Current phase of extraction */
  phase: "idle" | "uploading" | "converting" | "extracting" | "processing" | "complete" | "failed";
  /** Current page being processed (1-indexed) */
  currentPage?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Human-readable status message */
  message: string;
  /** Total transactions extracted so far */
  transactionCount?: number;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Options for PDF extraction
 */
export interface PdfExtractionOptions {
  /** Called on each progress update */
  onProgress?: (progress: ExtractionProgress) => void;
  /** Called when extraction completes */
  onComplete?: (documentId: Id<"documents">, transactionCount: number, sessionId?: string) => void;
  /** Called when extraction fails */
  onError?: (documentId: Id<"documents"> | null, error: string) => void;
  /** When true, skip session creation after extraction (for upload analysis flow) */
  skipSessionCreation?: boolean;
}

/**
 * Result from the extraction hook
 */
export interface UsePdfExtractionResult {
  /** Trigger extraction for a PDF file */
  extractPdf: (
    file: File,
    companyId: Id<"companies">,
    documentType: "bank_statement" | "invoice" | "receipt" | "other"
  ) => Promise<Id<"documents"> | null>;
  /** Current extraction progress */
  progress: ExtractionProgress;
  /** Whether extraction is in progress */
  isExtracting: boolean;
  /** Cancel ongoing extraction */
  cancel: () => void;
}

/**
 * Hook for native PDF extraction
 *
 * @example
 * ```tsx
 * const { extractPdf, progress, isExtracting } = usePdfExtraction({
 *   onProgress: (p) => console.log(p.message),
 *   onComplete: (docId, count) => toast.success(`Extracted ${count} transactions`),
 * });
 *
 * const handleUpload = async (file: File) => {
 *   if (isPdfFile(file)) {
 *     await extractPdf(file, companyId, 'bank_statement');
 *   }
 * };
 * ```
 */
export function usePdfExtraction(options: PdfExtractionOptions = {}): UsePdfExtractionResult {
  const { onProgress, onComplete, onError, skipSessionCreation } = options;

  // Get auth context for WorkOS user ID
  const auth = useOptionalAuth();
  const workosUserId = auth?.user?.workosId;

  // Convex mutations and actions
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const updateExtractionPhase = useMutation(api.nativePdfExtraction.updateExtractionPhase);
  const storePageImage = useMutation(api.nativePdfExtraction.storePageImage);
  const extractPageWithBedrock = useAction(api.nativePdfExtraction.extractPageWithBedrock);
  const completeExtraction = useMutation(api.nativePdfExtraction.completeExtraction);
  const finalizeExtraction = useAction(api.nativePdfExtraction.finalizeExtraction);
  const failExtraction = useMutation(api.nativePdfExtraction.failExtraction);
  const cleanupPageImages = useMutation(api.nativePdfExtraction.cleanupPageImages);

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
        // ================================================================
        // Phase 1: Upload original PDF
        // ================================================================
        updateProgress({
          phase: "uploading",
          message: "Uploading document...",
        });

        // Generate upload URL
        const uploadUrl = await generateUploadUrl({
          companyId,
          workosUserId,
        });

        // Upload file to Convex storage
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
        // Phase 2: Convert PDF to images (browser-side)
        // ================================================================
        updateProgress({
          phase: "converting",
          message: "Converting PDF pages...",
          currentPage: 0,
          totalPages: 0,
        });

        // Get page count first
        const totalPages = await getPdfPageCount(file);

        updateProgress({
          phase: "converting",
          message: `Converting ${totalPages} pages...`,
          currentPage: 0,
          totalPages,
        });

        // Update document phase
        await updateExtractionPhase({
          documentId,
          phase: "converting",
          progress: {
            currentPage: 0,
            totalPages,
            phaseMessage: `Converting ${totalPages} pages...`,
          },
          workosUserId,
        });

        // Render pages and collect storage IDs
        const pageStorageIds: Array<{ pageNumber: number; storageId: Id<"_storage"> }> = [];

        for await (const page of renderPdfPages(file, {
          scale: 2.0, // Good quality for OCR
          format: "png",
          onProgress: (renderProgress) => {
            updateProgress({
              phase: "converting",
              message: renderProgress.message,
              currentPage: renderProgress.currentPage,
              totalPages: renderProgress.totalPages,
            });
          },
        })) {
          // Check for cancellation
          if (cancelledRef.current) {
            throw new Error("Extraction cancelled");
          }

          // Upload page image to Convex storage
          const pageUploadUrl = await generateUploadUrl({
            companyId,
            workosUserId,
          });

          const pageUploadResponse = await fetch(pageUploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: page.blob,
          });

          if (!pageUploadResponse.ok) {
            throw new Error(`Failed to upload page ${page.pageNumber}`);
          }

          const { storageId: pageStorageId } = await pageUploadResponse.json() as { storageId: Id<"_storage"> };

          // Store page reference
          await storePageImage({
            documentId,
            storageId: pageStorageId,
            pageNumber: page.pageNumber,
            totalPages,
            workosUserId,
          });

          pageStorageIds.push({
            pageNumber: page.pageNumber,
            storageId: pageStorageId,
          });

          updateProgress({
            phase: "converting",
            message: `Converted page ${page.pageNumber} of ${totalPages}`,
            currentPage: page.pageNumber,
            totalPages,
          });
        }

        // ================================================================
        // Phase 3: Extract data from each page via Bedrock
        // ================================================================
        updateProgress({
          phase: "extracting",
          message: "Extracting data from pages...",
          currentPage: 0,
          totalPages,
        });

        let totalTransactions = 0;
        let failedPages: number[] = [];

        // Process pages sequentially to respect rate limits
        for (const { pageNumber, storageId: pageStorageId } of pageStorageIds) {
          // Check for cancellation
          if (cancelledRef.current) {
            throw new Error("Extraction cancelled");
          }

          updateProgress({
            phase: "extracting",
            message: `Extracting page ${pageNumber} of ${totalPages}...`,
            currentPage: pageNumber,
            totalPages,
            transactionCount: totalTransactions,
          });

          const result = await extractPageWithBedrock({
            documentId,
            pageStorageId,
            pageNumber,
            totalPages,
            documentType,
            workosUserId,
          });

          if (result.success) {
            totalTransactions += result.transactionCount;
          } else {
            // Track failed pages but continue extracting remaining pages
            failedPages.push(pageNumber);
            console.warn(
              `[PdfExtraction] Page ${pageNumber}/${totalPages} failed: ${result.errorMessage}. Continuing with remaining pages.`
            );
          }

          updateProgress({
            phase: "extracting",
            message: failedPages.length > 0
              ? `Extracted ${totalTransactions} transactions (${failedPages.length} page${failedPages.length > 1 ? 's' : ''} failed)...`
              : `Extracted ${totalTransactions} transactions...`,
            currentPage: pageNumber,
            totalPages,
            transactionCount: totalTransactions,
          });
        }

        // If ALL pages failed, treat as complete failure
        if (failedPages.length === totalPages) {
          throw new Error(
            `All ${totalPages} pages failed extraction. Please try again or use a different file format.`
          );
        }

        // ================================================================
        // Phase 4: Complete extraction and optionally create session
        // ================================================================
        await completeExtraction({
          documentId,
          totalTransactions,
          workosUserId,
        });

        // Clean up temporary page images from storage (non-blocking)
        if (pageStorageIds.length > 0) {
          cleanupPageImages({
            documentId,
            storageIds: pageStorageIds.map((p) => p.storageId),
            workosUserId,
          }).catch((err) => {
            console.warn("[PdfExtraction] Page image cleanup failed (non-critical):", err);
          });
        }

        if (skipSessionCreation) {
          // Upload analysis flow: skip session creation, user reviews first
          updateProgress({
            phase: "complete",
            message: `Extraction complete! ${totalTransactions} transactions found.`,
            currentPage: totalPages,
            totalPages,
            transactionCount: totalTransactions,
          });

          onComplete?.(documentId, totalTransactions);
        } else {
          // Legacy flow: auto-create session
          updateProgress({
            phase: "processing",
            message: "Creating reconciliation session...",
            currentPage: totalPages,
            totalPages,
            transactionCount: totalTransactions,
          });

          const { sessionId } = await finalizeExtraction({
            documentId,
            totalTransactions,
          });

          updateProgress({
            phase: "complete",
            message: `Extraction complete! ${totalTransactions} transactions found.`,
            currentPage: totalPages,
            totalPages,
            transactionCount: totalTransactions,
          });

          onComplete?.(documentId, totalTransactions, sessionId);
        }
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
      updateExtractionPhase,
      storePageImage,
      extractPageWithBedrock,
      completeExtraction,
      finalizeExtraction,
      failExtraction,
      cleanupPageImages,
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

// Re-export isPdfFile for convenience
export { isPdfFile } from "@/lib/pdf-renderer";
