"use client";

/**
 * Agent Findings for Reconciliation Hook
 *
 * Provides agent intelligence context on the /reconcile page by subscribing
 * to the agent session and its unresolved findings via the reconciliation
 * session ID.
 *
 * Data flow:
 *   reconciliationSessionId
 *     → agentSession.getForReconciliation (agent session with summary)
 *     → agentEngine.getFindingsForReconciliation (unresolved findings, sorted by severity)
 *
 * Both queries already exist on the backend with proper auth checks and indexes.
 * This hook is the React wrapper that provides real-time subscriptions.
 *
 * @module hooks/useAgentFindingsForReconciliation
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { AgentFindingData, FindingSeverity } from "@/hooks/useAgentSession";

// ============================================================================
// Types
// ============================================================================

export interface AgentReconciliationContext {
  /** The linked agent session (null if no session was linked or still loading) */
  agentSession: {
    _id: Id<"agentSessions">;
    summary?: string;
    status: string;
  } | null;

  /** Unresolved findings (open + acknowledged), sorted by severity */
  findings: AgentFindingData[];

  /** Count of unresolved findings by severity */
  findingCounts: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };

  /** True if there are any unresolved critical findings */
  hasUnresolvedCritical: boolean;

  /** Highest severity among unresolved findings */
  highestSeverity: FindingSeverity | null;

  /** True while either query is still loading initial data */
  isLoading: boolean;

  /** True if an agent session exists for this reconciliation */
  hasAgentContext: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentFindingsForReconciliation(
  reconciliationSessionId: Id<"reconciliationSessions"> | undefined,
  workosUserId?: string,
): AgentReconciliationContext {
  // --------------------------------------------------------------------------
  // Real-time subscriptions
  // --------------------------------------------------------------------------

  // Get the agent session linked to this reconciliation session
  const rawAgentSession = useQuery(
    api.agentSession.getForReconciliation,
    reconciliationSessionId
      ? { reconciliationSessionId, workosUserId }
      : "skip",
  );

  // Get unresolved findings for this reconciliation session
  const rawFindings = useQuery(
    api.agentEngine.getFindingsForReconciliation,
    reconciliationSessionId
      ? { reconciliationSessionId, workosUserId }
      : "skip",
  );

  // --------------------------------------------------------------------------
  // Derived state
  // --------------------------------------------------------------------------

  const agentSession = useMemo(() => {
    if (!rawAgentSession) return null;
    return {
      _id: rawAgentSession._id as Id<"agentSessions">,
      summary: rawAgentSession.summary ?? undefined,
      status: rawAgentSession.status as string,
    };
  }, [rawAgentSession]);

  const findings = useMemo<AgentFindingData[]>(() => {
    if (!rawFindings) return [];
    // Map raw Convex documents to the frontend type.
    // The query already filters to open + acknowledged and sorts by severity.
    // Convex codegen returns `any` for complex document array returns,
    // so we define the expected shape inline for type safety.
    return (rawFindings as Array<{
      _id: Id<"agentFindings">;
      type: string;
      severity: string;
      title: string;
      description: string;
      details?: string | null;
      status: string;
      userResponse?: string | null;
      relatedDocumentIds?: string[] | null;
      relatedTransactionIds?: string[] | null;
      createdAt: number;
      resolvedAt?: number | null;
    }>).map((f) => ({
      _id: f._id,
      type: f.type,
      severity: f.severity as FindingSeverity,
      title: f.title,
      description: f.description,
      details: f.details ?? undefined,
      status: f.status as AgentFindingData["status"],
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

    for (const f of findings) {
      if (f.severity === "critical") critical++;
      else if (f.severity === "warning") warning++;
      else info++;
    }

    return { critical, warning, info, total: findings.length };
  }, [findings]);

  const hasUnresolvedCritical = findingCounts.critical > 0;

  const highestSeverity = useMemo<FindingSeverity | null>(() => {
    if (findingCounts.critical > 0) return "critical";
    if (findingCounts.warning > 0) return "warning";
    if (findingCounts.info > 0) return "info";
    return null;
  }, [findingCounts]);

  // Loading: either query hasn't returned yet (undefined means still loading in Convex)
  const isLoading =
    reconciliationSessionId !== undefined &&
    (rawAgentSession === undefined || rawFindings === undefined);

  const hasAgentContext = agentSession !== null;

  return {
    agentSession,
    findings,
    findingCounts,
    hasUnresolvedCritical,
    highestSeverity,
    isLoading,
    hasAgentContext,
  };
}
