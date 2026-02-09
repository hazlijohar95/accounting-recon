"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { useWorkosUserId, withWorkosUserId } from "./shared";

// ============ DOCUMENT HOOKS ============

export function useCompanyDocuments(
  companyId: Id<"companies"> | undefined,
  documentType?: "bank_statement" | "invoice" | "receipt" | "other"
) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.documents.listByCompany,
    companyId
      ? withWorkosUserId({ companyId, documentType }, workosUserId)
      : "skip"
  );
}

/**
 * Generate an upload URL for Convex file storage.
 * Returns a presigned URL to which the client can POST the file.
 * Includes workosUserId for auth fallback when AuthKit fails.
 */
export function useGenerateUploadUrl() {
  const mutation = useMutation(api.documents.generateUploadUrl);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: { companyId: Id<"companies"> }) =>
      mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

/**
 * Create a document record after uploading to Convex storage.
 * Includes workosUserId for auth fallback when AuthKit fails.
 */
export function useCreateDocument() {
  const mutation = useMutation(api.documents.create);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: {
      companyId: Id<"companies">;
      fileName: string;
      fileType: string;
      fileSize: number;
      contentType: string;
      storageId: Id<"_storage">;
      documentType: "bank_statement" | "invoice" | "receipt" | "other";
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useUpdateDocumentExtraction() {
  const mutation = useMutation(api.documents.updateExtractionStatus);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: {
      id: Id<"documents">;
      extractionStatus: "pending" | "processing" | "completed" | "failed";
      extractedText?: string;
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useDeleteDocument() {
  const mutation = useMutation(api.documents.remove);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (id: Id<"documents">) => mutation(withWorkosUserId({ id }, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useResetExtraction() {
  const mutation = useMutation(api.documents.resetExtraction);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (id: Id<"documents">) => mutation(withWorkosUserId({ id }, workosUserId)),
    [mutation, workosUserId]
  );
}

// ============ DOCUMENT RETRIEVAL HOOKS ============

export function useDocument(documentId: Id<"documents"> | undefined) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.documents.get,
    documentId ? withWorkosUserId({ id: documentId }, workosUserId) : "skip"
  );
}

/**
 * Hook to get extraction results including the document and any associated accrual document.
 * For bank statements: returns document with transaction count
 * For invoices/receipts: returns document + accrual document with extracted details
 */
export function useExtractionResult(documentId: Id<"documents"> | undefined) {
  const document = useDocument(documentId);

  // Only query for accrual document if it's an invoice or receipt
  const shouldQueryAccrual =
    document?.documentType === "invoice" ||
    document?.documentType === "receipt";

  const workosUserId = useWorkosUserId();
  const accrualDocument = useQuery(
    api.accrualDocuments.getBySourceDocument,
    shouldQueryAccrual && documentId
      ? withWorkosUserId({ sourceDocumentId: documentId }, workosUserId)
      : "skip"
  );

  return {
    document,
    accrualDocument: shouldQueryAccrual ? accrualDocument : null,
    isLoading: document === undefined || (shouldQueryAccrual && accrualDocument === undefined),
  };
}

// ============ EXTRACTION HOOKS ============

/**
 * Trigger document extraction via ML service.
 * Includes workosUserId for auth fallback when AuthKit fails.
 */
export function useTriggerExtraction() {
  const action = useAction(api.extraction.triggerExtraction);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (documentId: Id<"documents">) => action({ documentId, workosUserId }),
    [action, workosUserId]
  );
}
