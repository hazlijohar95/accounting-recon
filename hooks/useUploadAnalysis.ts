"use client";

/**
 * Upload Analysis Hook
 *
 * Manages the lifecycle of an upload analysis batch:
 * 1. Create batch after files are uploaded
 * 2. Wait for extractions to complete
 * 3. Auto-trigger AI analysis
 * 4. Allow reclassification
 * 5. Approve and proceed to reconciliation
 *
 * @module hooks/useUploadAnalysis
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useWorkosUserId } from "@/lib/convex-hooks/shared";

export type AnalysisPhase = "idle" | "waiting" | "analyzing" | "ready" | "approved";

export interface UseUploadAnalysisOptions {
  companyId: Id<"companies"> | null;
  enabled?: boolean;
}

export interface UseUploadAnalysisReturn {
  analysisId: Id<"uploadAnalyses"> | null;
  analysis: ReturnType<typeof useQuery<typeof api.uploadAnalysis.get>> | null;
  phase: AnalysisPhase;
  extractionProgress: { completed: number; total: number; failed: number } | null;

  createBatch: (documentIds: Id<"documents">[]) => Promise<Id<"uploadAnalyses">>;
  addDocuments: (documentIds: Id<"documents">[]) => Promise<void>;
  reclassify: (
    docId: Id<"documents">,
    classification: string,
    basisType: "cash" | "accrual",
  ) => Promise<void>;
  approve: () => Promise<Id<"reconciliationSessions">>;
  dismiss: () => Promise<void>;
}

export function useUploadAnalysis({
  companyId,
  enabled = true,
}: UseUploadAnalysisOptions) {
  const workosUserId = useWorkosUserId();
  const [analysisId, setAnalysisId] = useState<Id<"uploadAnalyses"> | null>(null);
  const analysisTriggeredRef = useRef(false);

  // Convex mutations/actions
  const createBatchMutation = useMutation(api.uploadAnalysis.createBatch);
  const addDocumentsMutation = useMutation(api.uploadAnalysis.addDocuments);
  const reclassifyMutation = useMutation(api.uploadAnalysis.reclassifyDocument);
  const dismissMutation = useMutation(api.uploadAnalysis.dismiss);
  const runAnalysisAction = useAction(api.uploadAnalysis.runAnalysis);
  const approveAction = useAction(api.uploadAnalysis.approveAndProceed);

  // Real-time analysis subscription
  const analysis = useQuery(
    api.uploadAnalysis.get,
    analysisId && enabled ? { id: analysisId, workosUserId } : "skip",
  );

  // Check extraction readiness
  const readiness = useQuery(
    api.uploadAnalysis.checkReady,
    analysisId && enabled ? { id: analysisId, workosUserId } : "skip",
  );

  // Derive phase from analysis status
  const phase: AnalysisPhase = (() => {
    if (!analysisId || !analysis) return "idle";
    switch (analysis.status) {
      case "pending":
        return "waiting";
      case "analyzing":
        return "analyzing";
      case "ready":
        return "ready";
      case "approved":
        return "approved";
      case "dismissed":
        return "idle";
      default:
        return "idle";
    }
  })();

  // Auto-trigger analysis when all extractions are done
  useEffect(() => {
    if (
      !analysisId ||
      !readiness?.ready ||
      !analysis ||
      analysis.status !== "pending" ||
      analysisTriggeredRef.current
    ) {
      return;
    }

    analysisTriggeredRef.current = true;

    runAnalysisAction({ analysisId }).catch((err) => {
      console.error("[useUploadAnalysis] Analysis failed:", err);
      analysisTriggeredRef.current = false;
    });
  }, [analysisId, readiness?.ready, analysis?.status, runAnalysisAction]);

  // Reset trigger flag when analysis resets to pending (e.g., after addDocuments)
  useEffect(() => {
    if (analysis?.status === "pending") {
      analysisTriggeredRef.current = false;
    }
  }, [analysis?.status]);

  const createBatch = useCallback(
    async (documentIds: Id<"documents">[]) => {
      if (!companyId) throw new Error("No company selected");

      const id = await createBatchMutation({
        companyId,
        documentIds,
        workosUserId,
      });

      setAnalysisId(id);
      analysisTriggeredRef.current = false;
      return id;
    },
    [companyId, createBatchMutation, workosUserId],
  );

  const addDocuments = useCallback(
    async (documentIds: Id<"documents">[]) => {
      if (!analysisId) throw new Error("No active analysis");

      await addDocumentsMutation({
        analysisId,
        documentIds,
        workosUserId,
      });
      analysisTriggeredRef.current = false;
    },
    [analysisId, addDocumentsMutation, workosUserId],
  );

  const reclassify = useCallback(
    async (
      docId: Id<"documents">,
      classification: string,
      basisType: "cash" | "accrual",
    ) => {
      if (!analysisId) throw new Error("No active analysis");

      await reclassifyMutation({
        analysisId,
        documentId: docId,
        classification,
        basisType,
        workosUserId,
      });
    },
    [analysisId, reclassifyMutation, workosUserId],
  );

  const approve = useCallback(async () => {
    if (!analysisId) throw new Error("No active analysis");

    const { sessionId } = await approveAction({
      analysisId,
      workosUserId,
    });

    return sessionId;
  }, [analysisId, approveAction, workosUserId]);

  const dismiss = useCallback(async () => {
    if (!analysisId) throw new Error("No active analysis");

    await dismissMutation({
      analysisId,
      workosUserId,
    });

    setAnalysisId(null);
  }, [analysisId, dismissMutation, workosUserId]);

  return {
    analysisId,
    analysis: enabled ? analysis ?? null : null,
    phase,
    extractionProgress: readiness
      ? { completed: readiness.completed, total: readiness.total, failed: readiness.failed }
      : null,
    createBatch,
    addDocuments,
    reclassify,
    approve,
    dismiss,
  };
}
