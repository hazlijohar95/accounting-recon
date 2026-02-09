"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  useAppStore,
  Transaction,
  TransactionStatus,
  MatchPair,
  ReconciliationSession,
  AccrualDocument,
  SuspenseItem,
  useSelectedCompanyId,
} from "./store";
import { useOptionalAuth } from "@/components/auth-provider";

// Types for the data context
interface DataContextValue {
  // Mode
  isDemo: boolean;
  isConvexAvailable: boolean;

  // Data
  cashTransactions: Transaction[];
  accrualTransactions: Transaction[];
  accrualDocuments: AccrualDocument[];
  suspenseItems: SuspenseItem[];
  matches: MatchPair[];
  activeSession: ReconciliationSession | null;

  // Loading states
  isLoading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

interface DataProviderProps {
  children: ReactNode;
  companyId?: Id<"companies">;
  sessionId?: Id<"reconciliationSessions">;
}

/**
 * DataProvider that seamlessly switches between demo data and Convex data.
 *
 * When in demo mode, uses Zustand store.
 * When in real mode with Convex configured, fetches from Convex.
 * When in real mode without Convex, shows empty state.
 */
export function DataProvider({
  children,
  companyId: propsCompanyId,
  sessionId,
}: DataProviderProps) {
  const isDemo = useAppStore((s) => s.isDemo);
  const storeCompanyId = useSelectedCompanyId();
  const auth = useOptionalAuth();
  const workosUserId = auth?.user?.workosId;

  // Use props companyId if provided, otherwise use store's selected company
  const companyId = propsCompanyId ?? storeCompanyId ?? undefined;

  const demoData = useAppStore((s) => ({
    cashTransactions: s.cashTransactions,
    accrualTransactions: s.accrualTransactions,
    accrualDocuments: s.accrualDocuments,
    suspenseItems: s.suspenseItems,
    matches: s.matches,
    activeSession: s.activeSession,
  }));

  // Check if Convex is configured
  const isConvexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  // Convex queries (only run if not in demo mode and Convex is configured)
  const shouldFetchConvex = !isDemo && isConvexConfigured && companyId;

  const convexCashTransactions = useQuery(
    api.transactions.listByCompany,
    shouldFetchConvex ? { companyId, type: "cash", workosUserId } : "skip"
  );

  const convexAccrualTransactions = useQuery(
    api.transactions.listByCompany,
    shouldFetchConvex ? { companyId, type: "accrual", workosUserId } : "skip"
  );

  const convexMatches = useQuery(
    api.matches.listBySession,
    shouldFetchConvex && sessionId ? { sessionId, workosUserId } : "skip"
  );

  const convexSession = useQuery(
    api.sessions.get,
    shouldFetchConvex && sessionId ? { id: sessionId, workosUserId } : "skip"
  );

  // New queries for accrual documents and suspense items
  const convexAccrualDocuments = useQuery(
    api.accrualDocuments.listBySession,
    shouldFetchConvex && sessionId ? { sessionId, workosUserId } : "skip"
  );

  const convexSuspenseItems = useQuery(
    api.suspenseItems.listBySession,
    shouldFetchConvex && sessionId ? { sessionId, workosUserId } : "skip"
  );

  const value = useMemo<DataContextValue>(() => {
    if (isDemo) {
      // Demo mode - use Zustand data
      return {
        isDemo: true,
        isConvexAvailable: isConvexConfigured,
        cashTransactions: demoData.cashTransactions,
        accrualTransactions: demoData.accrualTransactions,
        accrualDocuments: demoData.accrualDocuments,
        suspenseItems: demoData.suspenseItems,
        matches: demoData.matches,
        activeSession: demoData.activeSession,
        isLoading: false,
      };
    }

    if (!isConvexConfigured) {
      // Real mode but no Convex - show empty
      return {
        isDemo: false,
        isConvexAvailable: false,
        cashTransactions: [],
        accrualTransactions: [],
        accrualDocuments: [],
        suspenseItems: [],
        matches: [],
        activeSession: null,
        isLoading: false,
      };
    }

    // Real mode with Convex - use Convex data
    const isLoading =
      convexCashTransactions === undefined ||
      convexAccrualTransactions === undefined;

    // Map Convex data to store format
    const mapTransaction = (t: NonNullable<typeof convexCashTransactions>[0]): Transaction => ({
      id: t._id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      status: t.status,
      matchId: t.matchId,
      category: t.category,
    });

    const mapMatch = (m: NonNullable<typeof convexMatches>[0]): MatchPair | null => {
      // Must have cash transaction
      if (!m.cashTransaction) {
        return null;
      }
      // Accept either old schema (accrualTransaction) or new schema (accrualDocument)
      if (!m.accrualTransaction && !m.accrualDocument) {
        return null;
      }

      // At this point, we've already verified m.accrualTransaction || m.accrualDocument exists
      // Create the accrualTransaction field (required for backwards compatibility)
      // Type is inferred as Transaction | null, which we guard against below
      const accrualTransaction = m.accrualTransaction
        ? mapTransaction(m.accrualTransaction)
        : m.accrualDocument
        ? {
            id: m.accrualDocument._id,
            date: m.accrualDocument.docDate,
            description: m.accrualDocument.description || m.accrualDocument.docNumber || "Accrual Document",
            amount: m.accrualDocument.amount,
            type: "accrual" as const,
            status: (m.accrualDocument.status === "matched" ? "matched" : "pending") as TransactionStatus,
            matchId: m.accrualDocument.matchId,
            category: m.accrualDocument.counterparty,
          }
        : (() => {
            // This should never happen due to early return, but provides type safety
            console.error('Match missing both accrualTransaction and accrualDocument:', m._id);
            return null;
          })();

      // Skip this match if we couldn't create the accrual transaction
      if (!accrualTransaction) {
        return null;
      }

      return {
        id: m._id,
        cashTransaction: mapTransaction(m.cashTransaction),
        accrualTransaction,
        // Map accrual document if available
        accrualDocument: m.accrualDocument ? mapAccrualDocument(m.accrualDocument) : undefined,
        confidence: m.confidence,
        matchLayer: m.matchLayer,
        approved: m.status === "approved",
      };
    };

    const mapSession = (s: NonNullable<typeof convexSession>): ReconciliationSession => ({
      id: s._id,
      name: s.name,
      createdAt: new Date(s.createdAt).toISOString().split("T")[0],
      status: s.status,
      progress: s.progress,
      totalCash: s.totalCashTransactions,
      totalAccrual: s.totalAccrualTransactions,
      matchedCount: s.matchedCount,
      suspenseCount: s.suspenseCount,
    });

    const mapAccrualDocument = (d: NonNullable<typeof convexAccrualDocuments>[0]): AccrualDocument => ({
      id: d._id,
      docType: d.docType,
      docNumber: d.docNumber,
      docDate: d.docDate,
      dueDate: d.dueDate,
      counterparty: d.counterparty,
      amount: d.amount,
      taxAmount: d.taxAmount,
      description: d.description,
      status: d.status,
      matchId: d.matchId,
    });

    const mapSuspenseItem = (s: NonNullable<typeof convexSuspenseItems>[0]): SuspenseItem => ({
      id: s._id,
      sourceType: s.sourceType,
      sourceId: s.sourceId,
      amount: s.amount,
      transactionDate: s.transactionDate,
      description: s.description,
      reason: s.reason,
      suggestedAction: s.suggestedAction,
      status: s.status,
      resolutionNotes: s.resolutionNotes,
    });

    return {
      isDemo: false,
      isConvexAvailable: true,
      cashTransactions: convexCashTransactions?.map(mapTransaction) ?? [],
      accrualTransactions: convexAccrualTransactions?.map(mapTransaction) ?? [],
      accrualDocuments: convexAccrualDocuments?.map(mapAccrualDocument) ?? [],
      suspenseItems: convexSuspenseItems?.map(mapSuspenseItem) ?? [],
      matches: convexMatches?.map(mapMatch).filter((m: MatchPair | null): m is MatchPair => m !== null) ?? [],
      activeSession: convexSession ? mapSession(convexSession) : null,
      isLoading,
    };
  }, [
    isDemo,
    isConvexConfigured,
    demoData,
    convexCashTransactions,
    convexAccrualTransactions,
    convexAccrualDocuments,
    convexSuspenseItems,
    convexMatches,
    convexSession,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Hook to access the current data context.
 */
export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

/**
 * Hook for direct access to data when DataProvider is not available.
 * Falls back to demo data from Zustand store.
 */
export function useDataFallback(): DataContextValue {
  const context = useContext(DataContext);
  const demoData = useAppStore((s) => ({
    isDemo: s.isDemo,
    cashTransactions: s.cashTransactions,
    accrualTransactions: s.accrualTransactions,
    accrualDocuments: s.accrualDocuments,
    suspenseItems: s.suspenseItems,
    matches: s.matches,
    activeSession: s.activeSession,
  }));

  if (context) {
    return context;
  }

  return {
    ...demoData,
    isConvexAvailable: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL),
    isLoading: false,
  };
}
