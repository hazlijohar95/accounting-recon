"use client";

import { useMemo } from "react";
import {
  useIsDemo,
  useSelectedCompanyId,
  useAccrualDocuments as useStoreAccrualDocuments,
  useSuspenseItems as useStoreSuspenseItems,
  useCashTransactions as useStoreCashTransactions,
  useMatches as useStoreMatches,
  useSessions as useStoreSessions,
  useActiveSession as useStoreActiveSession,
  type AccrualDocument,
  type AccrualDocType,
  type AccrualDocStatus,
  type SuspenseItem,
  type SuspenseStatus,
  type Transaction,
  type TransactionStatus,
  type MatchPair,
  type ReconciliationSession,
} from "@/lib/store";

import { useCompanyAccrualDocs, useCompanySuspenseItems } from "./accrual";
import { useCompanyTransactions } from "./transactions";
import { useReconciliationStats } from "./analytics";
import { useCompanySessions } from "./sessions";
import { useMatchCounts } from "./matches";

// ============================================================================
// GENERIC MODE-AWARE HOOK FACTORY
// ============================================================================
// Eliminates the repetitive pattern of:
//   1. Check isDemo -> return store data
//   2. Query Convex -> transform -> return with loading state

interface ModeAwareResult<T> {
  data: T[];
  isLoading: boolean;
}

/**
 * Creates a mode-aware hook result from demo data and optional Convex data.
 * Memoized to prevent unnecessary re-renders.
 */
function useModeAwareData<TConvex, TStore>(
  isDemo: boolean,
  demoData: TStore[],
  convexData: TConvex[] | undefined,
  transform: (item: TConvex) => TStore
): ModeAwareResult<TStore> {
  return useMemo(() => {
    if (isDemo) return { data: demoData, isLoading: false };
    const data = (convexData ?? []).map(transform);
    return { data, isLoading: convexData === undefined };
  }, [isDemo, demoData, convexData, transform]);
}

// ============================================================================
// TRANSFORM FUNCTIONS (stable references via module scope)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformAccrualDoc = (doc: any): AccrualDocument => ({
  id: doc._id,
  docType: (doc.docType ?? "sales_invoice") as AccrualDocType,
  docNumber: doc.docNumber,
  docDate: doc.docDate,
  dueDate: doc.dueDate,
  counterparty: doc.counterparty,
  amount: doc.amount,
  taxAmount: doc.taxAmount,
  description: doc.description,
  status: (doc.status ?? "pending") as AccrualDocStatus,
  matchId: doc.matchId,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformSuspenseItem = (item: any): SuspenseItem => ({
  id: item._id,
  sourceType: item.sourceType,
  sourceId: item.sourceId,
  amount: item.amount,
  transactionDate: item.transactionDate,
  description: item.description ?? "",
  reason: item.reason ?? "",
  suggestedAction: item.suggestedAction ?? "",
  status: (item.status ?? "open") as SuspenseStatus,
  resolutionNotes: item.resolutionNotes,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformTransaction = (tx: any): Transaction => ({
  id: tx._id,
  date: tx.date,
  description: tx.description,
  amount: tx.amount,
  type: tx.type as "cash" | "accrual",
  status: (tx.status ?? "pending") as TransactionStatus,
  matchId: tx.matchId,
  category: tx.category,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformSession = (session: any): ReconciliationSession => ({
  id: session._id,
  name: session.name,
  createdAt: new Date(session._creationTime).toISOString().split("T")[0],
  status: session.status as ReconciliationSession["status"],
  progress: session.progress ?? 0,
  totalCash: 0,
  totalAccrual: 0,
  matchedCount: session.matchedCount ?? 0,
  suspenseCount: session.suspenseCount ?? 0,
});

// ============================================================================
// MODE-AWARE COMBINED HOOKS
// ============================================================================
// Each data type has ONE hook with `{ data, isLoading }`. The `*Safe` variants
// below are thin wrappers that return just the array for backward compatibility.

/**
 * Mode-aware hook for accrual documents.
 */
export function useAccrualDocumentsCombined(): ModeAwareResult<AccrualDocument> {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoData = useStoreAccrualDocuments();
  const convexData = useCompanyAccrualDocs(isDemo ? undefined : companyId ?? undefined);
  return useModeAwareData(isDemo, demoData, convexData, transformAccrualDoc);
}

/**
 * Mode-aware hook for suspense items.
 */
export function useSuspenseItemsCombined(): ModeAwareResult<SuspenseItem> {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoData = useStoreSuspenseItems();
  const convexData = useCompanySuspenseItems(isDemo ? undefined : companyId ?? undefined);
  return useModeAwareData(isDemo, demoData, convexData, transformSuspenseItem);
}

/**
 * Mode-aware hook for cash transactions.
 */
export function useCashTransactionsCombined(): ModeAwareResult<Transaction> {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoData = useStoreCashTransactions();
  const convexData = useCompanyTransactions(
    isDemo ? undefined : companyId ?? undefined,
    { type: "cash" }
  );
  return useModeAwareData(isDemo, demoData, convexData, transformTransaction);
}

/**
 * Mode-aware hook for reconciliation stats.
 *
 * In real mode, all values come from a single server-side query using
 * O(log n) aggregates -- no client-side transaction fetching needed.
 */
export function useReconciliationStatsCombined(): {
  data: {
    totalCashIn: number;
    totalCashOut: number;
    matchedCount: number;
    pendingCount: number;
    suspenseCount: number;
    matchRate: number;
  };
  isLoading: boolean;
} {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoCashTxns = useStoreCashTransactions();
  const demoMatches = useStoreMatches();

  // Single query -- returns counts AND sums from server-side aggregates
  const reconStats = useReconciliationStats(isDemo ? undefined : companyId ?? undefined);

  return useMemo(() => {
    if (isDemo) {
      const totalCashIn = demoCashTxns
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      const totalCashOut = demoCashTxns
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const matchedCount = demoMatches.filter((m) => m.approved).length;
      const pendingCount = demoMatches.filter((m) => !m.approved).length;
      const suspenseCount = demoCashTxns.filter((t) => t.status === "suspense").length;
      const total = matchedCount + pendingCount + suspenseCount;
      const matchRate = total > 0 ? Math.round((matchedCount / total) * 100) : 0;

      return {
        data: { totalCashIn, totalCashOut, matchedCount, pendingCount, suspenseCount, matchRate },
        isLoading: false,
      };
    }

    // Real mode: all values from the server-side aggregate query
    const stats = reconStats as
      | {
          matched: number;
          pending: number;
          suspense: number;
          total: number;
          matchRate: number;
          totalCashIn: number;
          totalCashOut: number;
        }
      | undefined;

    return {
      data: {
        totalCashIn: stats?.totalCashIn ?? 0,
        totalCashOut: stats?.totalCashOut ?? 0,
        matchedCount: stats?.matched ?? 0,
        pendingCount: stats?.pending ?? 0,
        suspenseCount: stats?.suspense ?? 0,
        matchRate: stats?.matchRate ?? 0,
      },
      isLoading: reconStats === undefined,
    };
  }, [isDemo, demoCashTxns, demoMatches, reconStats]);
}

/**
 * Mode-aware hook for sessions.
 */
export function useSessionsCombined(): ModeAwareResult<ReconciliationSession> {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoData = useStoreSessions();
  const convexData = useCompanySessions(isDemo ? undefined : companyId ?? undefined);
  return useModeAwareData(isDemo, demoData, convexData, transformSession);
}

// ============================================================================
// DASHBOARD WORKFLOW HOOK
// ============================================================================
// Provides match counts for the active session so the dashboard can show
// proper workflow guidance ("N matches ready for review") in real mode.

export interface DashboardWorkflowData {
  /** Whether documents have been uploaded */
  hasDocuments: boolean;
  /** Session currently being processed */
  isProcessing: boolean;
  /** Number of matches pending review */
  pendingMatchCount: number;
  /** Number of approved matches */
  approvedMatchCount: number;
  /** Total matches in the active session */
  totalMatchCount: number;
  /** Whether data is still loading */
  isLoading: boolean;
}

/**
 * Mode-aware hook that provides workflow state for the dashboard.
 *
 * In real mode, uses the active session's match counts via O(log n) aggregates
 * instead of returning empty arrays.
 */
export function useDashboardWorkflow(
  activeSessionId: string | null | undefined
): DashboardWorkflowData {
  const isDemo = useIsDemo();
  const demoCashTxns = useStoreCashTransactions();
  const demoAccrualDocs = useStoreAccrualDocuments();
  const demoMatches = useStoreMatches();
  const demoActiveSession = useStoreActiveSession();

  // In real mode, fetch match counts for the active session via aggregates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchCounts = useMatchCounts(
    !isDemo && activeSessionId ? (activeSessionId as any) : undefined
  );

  return useMemo(() => {
    if (isDemo) {
      const hasDocuments = demoCashTxns.length > 0 || demoAccrualDocs.length > 0;
      const pendingMatchCount = demoMatches.filter((m) => !m.approved).length;
      const approvedMatchCount = demoMatches.filter((m) => m.approved).length;

      return {
        hasDocuments,
        isProcessing: demoActiveSession?.status === "processing",
        pendingMatchCount,
        approvedMatchCount,
        totalMatchCount: demoMatches.length,
        isLoading: false,
      };
    }

    // Real mode: use server-side match counts
    return {
      hasDocuments: true, // If they have a session, they have documents
      isProcessing: false, // Determined by session status in the dashboard
      pendingMatchCount: matchCounts?.pending ?? 0,
      approvedMatchCount: matchCounts?.approved ?? 0,
      totalMatchCount: matchCounts?.total ?? 0,
      isLoading: activeSessionId ? matchCounts === undefined : false,
    };
  }, [
    isDemo, demoCashTxns, demoAccrualDocs, demoMatches, demoActiveSession,
    activeSessionId, matchCounts,
  ]);
}

// ============================================================================
// PLAIN ARRAY HOOKS (backward compatibility)
// ============================================================================
// Return plain arrays with no loading state. Use the *Combined variants
// when you need to distinguish "loading" from "empty".

export function useAccrualDocumentsSafe(): AccrualDocument[] {
  const { data } = useAccrualDocumentsCombined();
  return data;
}

export function useSuspenseItemsSafe(): SuspenseItem[] {
  const { data } = useSuspenseItemsCombined();
  return data;
}

export function useCashTransactionsSafe(): Transaction[] {
  const { data } = useCashTransactionsCombined();
  return data;
}

/**
 * Mode-aware hook for match pairs.
 *
 * In real mode, returns `[]` -- matches should be fetched per-session
 * via `useSessionMatches`. For dashboard workflow state, use
 * `useDashboardWorkflow` which fetches counts via aggregates.
 */
export function useMatchesSafe(): MatchPair[] {
  const isDemo = useIsDemo();
  const demoData = useStoreMatches();
  return isDemo ? demoData : [];
}

export function useSessionsSafe(): ReconciliationSession[] {
  const { data } = useSessionsCombined();
  return data;
}

export function useActiveSessionSafe(): ReconciliationSession | null {
  const isDemo = useIsDemo();
  const demoData = useStoreActiveSession();
  return isDemo ? demoData : null;
}
