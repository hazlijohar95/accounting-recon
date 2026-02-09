"use client";

/**
 * Upload Analysis Convex Hook Wrappers
 *
 * Thin wrappers that inject workosUserId for auth fallback.
 * Follows the same pattern as other convex-hooks files.
 *
 * @module lib/convex-hooks/analysis
 */

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { useWorkosUserId, withWorkosUserId } from "./shared";

/**
 * Subscribe to an upload analysis record (real-time).
 */
export function useUploadAnalysisQuery(analysisId: Id<"uploadAnalyses"> | null) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.uploadAnalysis.get,
    analysisId ? withWorkosUserId({ id: analysisId }, workosUserId) : "skip",
  );
}

/**
 * Check if all documents in a batch have finished extraction.
 */
export function useCheckAnalysisReady(analysisId: Id<"uploadAnalyses"> | null) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.uploadAnalysis.checkReady,
    analysisId ? withWorkosUserId({ id: analysisId }, workosUserId) : "skip",
  );
}

/**
 * Get the latest pending/ready analysis for a company.
 */
export function useLatestAnalysis(companyId: Id<"companies"> | null) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.uploadAnalysis.getLatestForCompany,
    companyId ? withWorkosUserId({ companyId }, workosUserId) : "skip",
  );
}

/**
 * Reclassify a document in an analysis batch.
 */
export function useReclassifyDocument() {
  const mutation = useMutation(api.uploadAnalysis.reclassifyDocument);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: {
      analysisId: Id<"uploadAnalyses">;
      documentId: Id<"documents">;
      classification: string;
      basisType: "cash" | "accrual";
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId],
  );
}

/**
 * Approve analysis and proceed to reconciliation.
 */
export function useApproveAnalysis() {
  const action = useAction(api.uploadAnalysis.approveAndProceed);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: { analysisId: Id<"uploadAnalyses"> }) =>
      action(withWorkosUserId(args, workosUserId)),
    [action, workosUserId],
  );
}

/**
 * Dismiss (skip) analysis.
 */
export function useDismissAnalysis() {
  const mutation = useMutation(api.uploadAnalysis.dismiss);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: { analysisId: Id<"uploadAnalyses"> }) =>
      mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId],
  );
}
