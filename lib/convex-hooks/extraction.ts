// @ts-nocheck - Generated Convex API types are stale; run `npx convex dev` to regenerate
"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";

// ============ EXTRACTION QUEUE HOOKS ============

/**
 * Hook to get queue statistics for a company.
 * Shows total queued, processing, completed, and failed counts.
 */
export function useQueueStats(companyId: Id<"companies"> | undefined) {
  return useQuery(
    api.extractionQueue.getQueueStats,
    companyId ? { companyId } : "skip"
  );
}

/**
 * Hook to get active extraction queues for a company.
 */
export function useActiveQueues(companyId: Id<"companies"> | undefined) {
  return useQuery(
    api.extractionQueue.getActiveQueues,
    companyId ? { companyId } : "skip"
  );
}

/**
 * Hook to get a document's position in the extraction queue.
 * Returns null if the document is not in a queue.
 */
export function useDocumentQueuePosition(documentId: Id<"documents"> | undefined) {
  return useQuery(
    api.extractionQueue.getDocumentQueuePosition,
    documentId ? { documentId } : "skip"
  );
}

/**
 * Hook to create a new extraction queue.
 */
export function useCreateQueue() {
  const mutation = useMutation(api.extractionQueue.createQueue);
  return useCallback(
    (args: {
      companyId: Id<"companies">;
      documentIds: Id<"documents">[];
      batchName?: string;
      priority?: number;
    }) => mutation(args),
    [mutation]
  );
}

/**
 * Hook to cancel an extraction queue.
 */
export function useCancelQueue() {
  const mutation = useMutation(api.extractionQueue.cancelQueue);
  return useCallback(
    (queueId: Id<"extractionQueue">) => mutation({ queueId }),
    [mutation]
  );
}

/**
 * Hook to start processing an extraction queue.
 */
export function useStartQueueProcessing() {
  const action = useAction(api.extractionQueue.startQueueProcessing);
  return useCallback(
    (queueId: Id<"extractionQueue">) => action({ queueId }),
    [action]
  );
}

/**
 * Hook to pause an extraction queue.
 */
export function usePauseQueue() {
  const mutation = useMutation(api.extractionQueue.pauseQueue);
  return useCallback(
    (queueId: Id<"extractionQueue">) => mutation({ queueId }),
    [mutation]
  );
}

/**
 * Hook to resume a paused extraction queue.
 */
export function useResumeQueue() {
  const mutation = useMutation(api.extractionQueue.resumeQueue);
  return useCallback(
    (queueId: Id<"extractionQueue">) => mutation({ queueId }),
    [mutation]
  );
}

// ============ DLQ MANAGEMENT HOOKS ============

/**
 * Hook to get failed items (DLQ) for a company.
 */
export function useFailedItems(companyId: Id<"companies"> | null) {
  return useQuery(
    api.extractionQueue.getFailedItems,
    companyId ? { companyId } : "skip"
  );
}

/**
 * Hook to retry a single failed item.
 */
export function useRetryFailedItem() {
  const mutation = useMutation(api.extractionQueue.retryFailedItem);
  return useCallback(
    (itemId: Id<"extractionQueueItems">) => mutation({ itemId }),
    [mutation]
  );
}

/**
 * Hook to bulk retry specific DLQ items by their IDs.
 */
export function useBulkRetryDLQ() {
  const mutation = useMutation(api.extractionQueue.bulkRetryItems);
  return useCallback(
    (itemIds: Id<"extractionQueueItems">[]) => mutation({ itemIds }),
    [mutation]
  );
}

/**
 * Hook to delete a DLQ item.
 */
export function useDeleteDLQItem() {
  const mutation = useMutation(api.extractionQueue.deleteDLQItem);
  return useCallback(
    (itemId: Id<"extractionQueueItems">) => mutation({ itemId }),
    [mutation]
  );
}
