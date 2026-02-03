"use client";

/**
 * Custom hook for reconciliation data management.
 *
 * Bridges Convex backend data with the UI format, handling:
 * - Demo mode vs Real mode switching
 * - Data transformation from Convex to UI format
 * - Real-time subscriptions via Convex queries
 * - Session state management
 *
 * @module lib/use-reconcile-data
 */

import { useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import {
  useIsDemo,
  useMatchesSafe,
  useCashTransactionsSafe,
  useAccrualDocumentsSafe,
  useSuspenseItemsSafe,
  useActiveSessionSafe,
  useAppStore,
  MatchPair,
  Transaction,
  AccrualDocument,
  SuspenseItem,
  MatchConfidence,
  TransactionStatus,
  AccrualDocStatus,
} from "@/lib/store";

// Types for Convex enriched match (from matches.ts listBySession)
interface ConvexEnrichedMatch {
  _id: Id<"matchedPairs">;
  _creationTime: number;
  sessionId: Id<"reconciliationSessions">;
  cashTransactionId: Id<"transactions">;
  accrualDocumentId?: Id<"accrualDocuments">;
  accrualTransactionId?: Id<"transactions">;
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  matchLayer: 1 | 2 | 3 | 4 | 5 | 6;
  matchReason?: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: number;
  reviewedBy?: Id<"users">;
  createdAt: number;
  // Enriched fields
  cashTransaction: Doc<"transactions"> | null;
  accrualTransaction: Doc<"transactions"> | null; // Legacy
  accrualDocument: Doc<"accrualDocuments"> | null;
}

interface ConvexSuspenseItem {
  _id: Id<"suspenseItems">;
  _creationTime: number;
  companyId: Id<"companies">;
  sessionId: Id<"reconciliationSessions">;
  sourceType: "cash" | "accrual";
  sourceId: Id<"transactions"> | Id<"accrualDocuments">;
  amount: number;
  transactionDate: string;
  description: string;
  reason: string;
  suggestedAction: string;
  status: "open" | "queried" | "resolved";
  resolutionNotes?: string;
  createdAt: number;
}

/**
 * Transform Convex match to UI MatchPair format
 */
function convexMatchToUIMatch(match: ConvexEnrichedMatch): MatchPair | null {
  // Need valid cash transaction
  if (!match.cashTransaction) return null;

  // Create cash transaction in UI format
  const cashTransaction: Transaction = {
    id: match.cashTransactionId,
    date: match.cashTransaction.date,
    description: match.cashTransaction.description,
    amount: match.cashTransaction.amount,
    type: "cash",
    status: match.cashTransaction.status as TransactionStatus,
    matchId: match._id,
    confidence: match.confidence,
    category: match.cashTransaction.category,
  };

  // Create accrual transaction in UI format (from accrualDocument or legacy accrualTransaction)
  let accrualTransaction: Transaction;
  let accrualDocument: AccrualDocument | undefined;

  if (match.accrualDocument) {
    // New format: accrualDocument
    accrualDocument = {
      id: match.accrualDocumentId!,
      docType: match.accrualDocument.docType,
      docNumber: match.accrualDocument.docNumber,
      docDate: match.accrualDocument.docDate,
      dueDate: match.accrualDocument.dueDate,
      counterparty: match.accrualDocument.counterparty,
      amount: match.accrualDocument.amount,
      taxAmount: match.accrualDocument.taxAmount,
      description: match.accrualDocument.description,
      status: match.accrualDocument.status as AccrualDocStatus,
      matchId: match._id,
    };

    // Create synthetic transaction for backward compatibility
    accrualTransaction = {
      id: `accrual-${match.accrualDocumentId}`,
      date: match.accrualDocument.docDate,
      description:
        match.accrualDocument.description ||
        `${match.accrualDocument.docNumber || ""} - ${match.accrualDocument.counterparty || ""}`,
      amount: match.accrualDocument.amount,
      type: "accrual",
      status: "matched",
      matchId: match._id,
      category: match.accrualDocument.docType,
    };
  } else if (match.accrualTransaction) {
    // Legacy format: accrualTransaction
    accrualTransaction = {
      id: match.accrualTransactionId!,
      date: match.accrualTransaction.date,
      description: match.accrualTransaction.description,
      amount: match.accrualTransaction.amount,
      type: "accrual",
      status: match.accrualTransaction.status as TransactionStatus,
      matchId: match._id,
      category: match.accrualTransaction.category,
    };
  } else {
    // No accrual data, skip
    return null;
  }

  return {
    id: match._id,
    cashTransaction,
    accrualTransaction,
    accrualDocument,
    confidence: match.confidence,
    confidenceScore: match.confidenceScore,
    matchLayer: match.matchLayer,
    matchReason: match.matchReason,
    approved: match.status === "approved",
  };
}

/**
 * Transform Convex suspense item to UI format
 */
function convexSuspenseToUITransaction(item: ConvexSuspenseItem): Transaction {
  return {
    id: item._id,
    date: item.transactionDate,
    description: item.description,
    amount: item.amount,
    type: item.sourceType,
    status: "suspense",
  };
}

export interface UseReconcileDataResult {
  // Data
  matches: MatchPair[];
  pendingMatches: MatchPair[];
  approvedMatches: MatchPair[];
  rejectedMatches: MatchPair[];
  suspenseTransactions: Transaction[];

  // Session info
  sessionId: Id<"reconciliationSessions"> | null;
  sessionName: string | undefined;

  // Loading state
  isLoading: boolean;

  // Mode info
  isDemo: boolean;

  // Raw counts (for tabs)
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    suspense: number;
  };
}

/**
 * Hook to get reconciliation data with automatic demo/real mode switching.
 *
 * In demo mode: Returns data from Zustand store
 * In real mode: Returns data from Convex with real-time subscriptions
 *
 * @param convexSessionId - The Convex session ID to fetch data for (real mode)
 */
export function useReconcileData(
  convexSessionId?: Id<"reconciliationSessions">
): UseReconcileDataResult {
  const isDemo = useIsDemo();

  // Demo mode data from Zustand store
  const storeMatches = useMatchesSafe();
  const storeSuspense = useSuspenseItemsSafe();
  const storeActiveSession = useActiveSessionSafe();

  // Real mode data from Convex - only query when NOT in demo mode AND have session ID
  const shouldQuery = !isDemo && !!convexSessionId;

  const convexMatches = useQuery(
    api.matches.listBySession,
    shouldQuery ? { sessionId: convexSessionId! } : "skip"
  );

  const convexSuspense = useQuery(
    api.suspenseItems.listBySession,
    shouldQuery ? { sessionId: convexSessionId! } : "skip"
  );

  const convexSession = useQuery(
    api.sessions.get,
    shouldQuery ? { id: convexSessionId! } : "skip"
  );

  // Transform and memoize data
  const result = useMemo((): UseReconcileDataResult => {
    if (isDemo) {
      // Demo mode: use store data directly
      const pending = storeMatches.filter((m) => !m.approved);
      const approved = storeMatches.filter((m) => m.approved);

      // Convert suspense items to transactions for display
      const suspenseTransactions = storeSuspense.map((item): Transaction => ({
        id: item.id,
        date: item.transactionDate,
        description: item.description,
        amount: item.amount,
        type: item.sourceType,
        status: "suspense",
      }));

      return {
        matches: storeMatches,
        pendingMatches: pending,
        approvedMatches: approved,
        rejectedMatches: [],
        suspenseTransactions,
        sessionId: storeActiveSession?.id as Id<"reconciliationSessions"> | null,
        sessionName: storeActiveSession?.name,
        isLoading: false,
        isDemo: true,
        counts: {
          pending: pending.length,
          approved: approved.length,
          rejected: 0,
          suspense: suspenseTransactions.length,
        },
      };
    }

    // Real mode: transform Convex data
    const isLoading = convexMatches === undefined || convexSuspense === undefined;

    if (isLoading) {
      return {
        matches: [],
        pendingMatches: [],
        approvedMatches: [],
        rejectedMatches: [],
        suspenseTransactions: [],
        sessionId: convexSessionId || null,
        sessionName: convexSession?.name,
        isLoading: true,
        isDemo: false,
        counts: { pending: 0, approved: 0, rejected: 0, suspense: 0 },
      };
    }

    // Transform Convex matches to UI format
    const allMatches = (convexMatches || [])
      .map(convexMatchToUIMatch)
      .filter((m): m is MatchPair => m !== null);

    const pending = allMatches.filter((m) => !m.approved);
    const approved = allMatches.filter((m) => m.approved);
    // Note: We could also track rejected matches if needed
    const rejected: MatchPair[] = [];

    // Transform suspense items
    const suspenseTransactions = (convexSuspense || []).map(
      convexSuspenseToUITransaction
    );

    return {
      matches: allMatches,
      pendingMatches: pending,
      approvedMatches: approved,
      rejectedMatches: rejected,
      suspenseTransactions,
      sessionId: convexSessionId || null,
      sessionName: convexSession?.name,
      isLoading: false,
      isDemo: false,
      counts: {
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        suspense: suspenseTransactions.length,
      },
    };
  }, [
    isDemo,
    storeMatches,
    storeSuspense,
    storeActiveSession,
    convexMatches,
    convexSuspense,
    convexSession,
    convexSessionId,
  ]);

  return result;
}

/**
 * Hook to get and set the active session ID.
 * Handles persistence and mode switching.
 */
export function useActiveSessionId(): [
  Id<"reconciliationSessions"> | null,
  (id: Id<"reconciliationSessions"> | null) => void
] {
  const isDemo = useIsDemo();
  const storeSession = useActiveSessionSafe();

  // Get session ID
  const sessionId = useMemo(() => {
    if (isDemo && storeSession?.id) {
      // In demo mode, the store session ID is a string like "s1"
      // We can still use it but it won't work with Convex queries
      return storeSession.id as Id<"reconciliationSessions">;
    }
    // In real mode, we need to get the session ID from somewhere
    // This could be from URL params, localStorage, or user selection
    return null;
  }, [isDemo, storeSession]);

  // Set session ID (for now, just updates the store)
  const setSessionId = useCallback(
    (_id: Id<"reconciliationSessions"> | null) => {
      // TODO: In real mode, persist to localStorage or URL
      // For now, session selection is handled elsewhere
    },
    []
  );

  return [sessionId, setSessionId];
}
