"use client";

/**
 * Agent Session Hook
 *
 * Manages the lifecycle of an intelligent upload agent session:
 * 1. Subscribe to active agent session for the company (real-time)
 * 2. Subscribe to agent findings (real-time, sorted by severity)
 * 3. Respond to findings (acknowledge, resolve, dismiss)
 * 4. Proceed to reconciliation (creates session + links agent context)
 * 5. Dismiss the agent session
 *
 * Follows the same patterns as useUploadAnalysis — Convex subscriptions
 * with auth fallback via workosUserId.
 *
 * @module hooks/useAgentSession
 */

import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useWorkosUserId } from "@/lib/convex-hooks/shared";

// ============================================================================
// Types
// ============================================================================

export type AgentStep = "upload" | "analyze" | "validate" | "proceed";
export type AgentSessionStatus = "active" | "analyzing" | "ready" | "proceeded" | "dismissed" | "expired";

export type FindingSeverity = "critical" | "warning" | "info";
export type FindingStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export interface AgentFindingData {
  _id: Id<"agentFindings">;
  type: string; // AgentFindingType on the backend; string here for resilience to new types
  severity: FindingSeverity;
  title: string;
  description: string;
  details?: string;
  status: FindingStatus;
  userResponse?: string;
  relatedDocumentIds?: Id<"documents">[];
  relatedTransactionIds?: Id<"transactions">[];
  createdAt: number;
  resolvedAt?: number;
}

export interface UseAgentSessionOptions {
  companyId: Id<"companies"> | null;
  enabled?: boolean;
}

export interface UseAgentSessionReturn {
  // Session state
  sessionId: Id<"agentSessions"> | null;
  session: {
    status: AgentSessionStatus;
    currentStep: AgentStep;
    documentIds: Id<"documents">[];
    summary?: string;
    companyLanes?: Array<{
      detectedCompanyName: string;
      companyId?: Id<"companies">;
      documentIds: Id<"documents">[];
      isSelected: boolean;
    }>;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  } | null;

  // Findings (real-time, sorted by severity)
  findings: AgentFindingData[];
  findingCounts: { critical: number; warning: number; info: number; total: number };
  hasUnresolvedCritical: boolean;

  // Derived state
  isActive: boolean;
  isAnalyzing: boolean;
  isReady: boolean;
  hasProceeded: boolean;

  // Actions
  addDocuments: (documentIds: Id<"documents">[]) => Promise<void>;
  removeDocuments: (documentIds: Id<"documents">[]) => Promise<void>;
  requestReanalysis: () => Promise<void>;
  updateStep: (step: AgentStep) => Promise<void>;
  respondToFinding: (
    findingId: Id<"agentFindings">,
    status: "acknowledged" | "resolved" | "dismissed",
    userResponse?: string,
  ) => Promise<void>;
  toggleLaneSelection: (laneIndex: number, isSelected: boolean) => Promise<void>;
  setAllLanesSelection: (mode: "all" | "primary_only") => Promise<void>;
  proceed: () => Promise<Id<"reconciliationSessions">>;
  dismiss: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentSession({
  companyId,
  enabled = true,
}: UseAgentSessionOptions): UseAgentSessionReturn {
  const workosUserId = useWorkosUserId();

  // --------------------------------------------------------------------------
  // Real-time subscriptions
  // --------------------------------------------------------------------------

  // Subscribe to the active agent session for this company
  const rawSession = useQuery(
    api.agentSession.getActiveForCompany,
    companyId && enabled ? { companyId, workosUserId } : "skip",
  );

  const sessionId = rawSession?._id ?? null;

  // Subscribe to findings for the active session
  const rawFindings = useQuery(
    api.agentEngine.getFindingsForSession,
    sessionId && enabled ? { agentSessionId: sessionId, workosUserId } : "skip",
  );

  // --------------------------------------------------------------------------
  // Convex mutations and actions
  // --------------------------------------------------------------------------

  const addDocumentsMutation = useMutation(api.agentSession.addDocuments);
  const removeDocumentsMutation = useMutation(api.agentSession.removeDocuments);
  const updateStepMutation = useMutation(api.agentSession.updateStep);
  const respondToFindingMutation = useMutation(api.agentSession.respondToFinding);
  const toggleLaneMutation = useMutation(api.agentSession.toggleLaneSelection);
  const setAllLanesMutation = useMutation(api.agentSession.setAllLanesSelection);
  const proceedAction = useAction(api.agentSession.proceed);
  const triggerReanalysisAction = useAction(api.agentSession.triggerReanalysis);
  const dismissMutation = useMutation(api.agentSession.dismiss);

  // --------------------------------------------------------------------------
  // Derived state
  // --------------------------------------------------------------------------

  const session = useMemo(() => {
    if (!rawSession) return null;
    return {
      status: rawSession.status as AgentSessionStatus,
      currentStep: rawSession.currentStep as AgentStep,
      documentIds: rawSession.documentIds as Id<"documents">[],
      summary: rawSession.summary ?? undefined,
      companyLanes: rawSession.companyLanes ?? undefined,
      tokenUsage: rawSession.tokenUsage ?? undefined,
    };
  }, [rawSession]);

  const findings = useMemo<AgentFindingData[]>(() => {
    if (!rawFindings) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawFindings.map((f: any) => ({
      _id: f._id as Id<"agentFindings">,
      type: f.type,
      severity: f.severity as FindingSeverity,
      title: f.title,
      description: f.description,
      details: f.details ?? undefined,
      status: f.status as FindingStatus,
      userResponse: f.userResponse ?? undefined,
      relatedDocumentIds: f.relatedDocumentIds as Id<"documents">[] | undefined,
      relatedTransactionIds: f.relatedTransactionIds as Id<"transactions">[] | undefined,
      createdAt: f.createdAt,
      resolvedAt: f.resolvedAt ?? undefined,
    }));
  }, [rawFindings]);

  const findingCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let info = 0;
    let total = 0;

    for (const f of findings) {
      if (f.status === "open" || f.status === "acknowledged") {
        total++;
        if (f.severity === "critical") critical++;
        else if (f.severity === "warning") warning++;
        else info++;
      }
    }

    return { critical, warning, info, total };
  }, [findings]);

  const hasUnresolvedCritical = findingCounts.critical > 0;

  const isActive = session?.status === "active";
  const isAnalyzing = session?.status === "analyzing";
  const isReady = session?.status === "ready";
  const hasProceeded = session?.status === "proceeded";

  // --------------------------------------------------------------------------
  // Callbacks
  // --------------------------------------------------------------------------

  const addDocuments = useCallback(
    async (documentIds: Id<"documents">[]) => {
      if (!sessionId) throw new Error("No active agent session");
      await addDocumentsMutation({ sessionId, documentIds, workosUserId });
    },
    [sessionId, addDocumentsMutation, workosUserId],
  );

  const removeDocuments = useCallback(
    async (documentIds: Id<"documents">[]) => {
      if (!sessionId) throw new Error("No active agent session");
      await removeDocumentsMutation({ sessionId, documentIds, workosUserId });
    },
    [sessionId, removeDocumentsMutation, workosUserId],
  );

  /**
   * Request a re-analysis of the current document set.
   * Called when the user adds more files after analysis completed.
   *
   * Calls the triggerReanalysis action which:
   * 1. Resets the session to "active" if it's in "ready" state
   * 2. Schedules runAgentAnalysisInternal to re-run the full pipeline
   * 3. CAS in tryStartAnalysis prevents duplicate concurrent analyses
   */
  const requestReanalysis = useCallback(
    async () => {
      if (!sessionId) throw new Error("No active agent session");
      await triggerReanalysisAction({ sessionId, workosUserId });
    },
    [sessionId, triggerReanalysisAction, workosUserId],
  );

  const updateStep = useCallback(
    async (step: AgentStep) => {
      if (!sessionId) throw new Error("No active agent session");
      await updateStepMutation({ sessionId, step, workosUserId });
    },
    [sessionId, updateStepMutation, workosUserId],
  );

  const respondToFinding = useCallback(
    async (
      findingId: Id<"agentFindings">,
      status: "acknowledged" | "resolved" | "dismissed",
      userResponse?: string,
    ) => {
      await respondToFindingMutation({
        findingId,
        status,
        userResponse,
        workosUserId,
      });
    },
    [respondToFindingMutation, workosUserId],
  );

  const toggleLaneSelection = useCallback(
    async (laneIndex: number, isSelected: boolean) => {
      if (!sessionId) throw new Error("No active agent session");
      await toggleLaneMutation({ sessionId, laneIndex, isSelected, workosUserId });
    },
    [sessionId, toggleLaneMutation, workosUserId],
  );

  const setAllLanesSelection = useCallback(
    async (mode: "all" | "primary_only") => {
      if (!sessionId) throw new Error("No active agent session");
      await setAllLanesMutation({ sessionId, mode, workosUserId });
    },
    [sessionId, setAllLanesMutation, workosUserId],
  );

  const proceed = useCallback(async () => {
    if (!sessionId) throw new Error("No active agent session");
    const result = await proceedAction({ sessionId, workosUserId });
    return result.reconciliationSessionId;
  }, [sessionId, proceedAction, workosUserId]);

  const dismiss = useCallback(async () => {
    if (!sessionId) throw new Error("No active agent session");
    await dismissMutation({ sessionId, workosUserId });
  }, [sessionId, dismissMutation, workosUserId]);

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------

  return {
    sessionId,
    session,
    findings,
    findingCounts,
    hasUnresolvedCritical,
    isActive,
    isAnalyzing,
    isReady,
    hasProceeded,
    addDocuments,
    removeDocuments,
    requestReanalysis,
    updateStep,
    respondToFinding,
    toggleLaneSelection,
    setAllLanesSelection,
    proceed,
    dismiss,
  };
}
