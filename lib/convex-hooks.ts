"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useCallback } from "react";

// ============ USER HOOKS ============

/**
 * Get user by email from Convex.
 * Named useConvexCurrentUser to avoid collision with useCurrentUser from lib/store.ts
 */
export function useConvexCurrentUser(email: string | undefined) {
  return useQuery(
    api.users.getByEmail,
    email ? { email } : "skip"
  );
}

export function useCreateUser() {
  const mutation = useMutation(api.users.create);
  return useCallback(
    (args: {
      email: string;
      name?: string;
      avatarUrl?: string;
      workosId?: string;
    }) => mutation(args),
    [mutation]
  );
}

// ============ COMPANY HOOKS ============

export function useCompany(id: Id<"companies"> | undefined, workosUserId?: string) {
  return useQuery(api.companies.get, id ? { id, workosUserId } : "skip");
}

/**
 * Hook to fetch companies for a user.
 * Prefers workosUserId for authentication lookup.
 * The backend will resolve workosUserId to the user's Convex _id.
 */
export function useUserCompanies(
  ownerId: Id<"users"> | undefined,
  workosUserId?: string
) {
  // Always include workosUserId if available, as it's the primary auth mechanism
  const queryArgs = workosUserId
    ? { workosUserId, ownerId }
    : ownerId
      ? { ownerId }
      : null;

  return useQuery(
    api.companies.listByOwner,
    queryArgs ?? "skip"
  );
}

export function useCreateCompany() {
  const mutation = useMutation(api.companies.create);
  return useCallback(
    (args: {
      name: string;
      registrationNumber?: string;
      industry?: string;
      fiscalYearEnd?: string;
      bankName?: string;
      currency: string;
      ownerId: Id<"users">;
    }) => mutation(args),
    [mutation]
  );
}

export function useUpdateCompany() {
  const mutation = useMutation(api.companies.update);
  return useCallback(
    (args: {
      id: Id<"companies">;
      name?: string;
      registrationNumber?: string;
      industry?: string;
      fiscalYearEnd?: string;
      bankName?: string;
      currency?: string;
    }) => mutation(args),
    [mutation]
  );
}

export function useDeleteCompany() {
  const mutation = useMutation(api.companies.remove);
  return useCallback(
    (id: Id<"companies">) => mutation({ id }),
    [mutation]
  );
}

// ============ TRANSACTION HOOKS ============

export function useCompanyTransactions(
  companyId: Id<"companies"> | undefined,
  options?: {
    type?: "cash" | "accrual";
    status?: "pending" | "matched" | "suspense";
    limit?: number;
  }
) {
  return useQuery(
    api.transactions.listByCompany,
    companyId
      ? {
          companyId,
          type: options?.type,
          status: options?.status,
          limit: options?.limit,
        }
      : "skip"
  );
}

export function useSessionTransactions(
  sessionId: Id<"reconciliationSessions"> | undefined,
  type?: "cash" | "accrual"
) {
  return useQuery(
    api.transactions.listBySession,
    sessionId ? { sessionId, type } : "skip"
  );
}

export function useCreateTransaction() {
  const mutation = useMutation(api.transactions.create);
  return useCallback(
    (args: {
      companyId: Id<"companies">;
      sessionId?: Id<"reconciliationSessions">;
      date: string;
      description: string;
      reference?: string;
      amount: number;
      type: "cash" | "accrual";
      category?: string;
      sourceDocumentId?: Id<"documents">;
    }) => mutation(args),
    [mutation]
  );
}

export function useCreateBulkTransactions() {
  const mutation = useMutation(api.transactions.createBulk);
  return useCallback(
    (
      transactions: Array<{
        companyId: Id<"companies">;
        sessionId?: Id<"reconciliationSessions">;
        date: string;
        description: string;
        reference?: string;
        amount: number;
        type: "cash" | "accrual";
        category?: string;
      }>
    ) => mutation({ transactions }),
    [mutation]
  );
}

// ============ MATCH HOOKS ============

export function useSessionMatches(
  sessionId: Id<"reconciliationSessions"> | undefined,
  status?: "pending" | "approved" | "rejected"
) {
  return useQuery(
    api.matches.listBySession,
    sessionId ? { sessionId, status } : "skip"
  );
}

export function useMatchCounts(sessionId: Id<"reconciliationSessions"> | undefined) {
  return useQuery(
    api.matches.getCounts,
    sessionId ? { sessionId } : "skip"
  );
}

export function useApproveMatch() {
  const mutation = useMutation(api.matches.approve);
  return useCallback(
    (id: Id<"matchedPairs">, reviewerId?: Id<"users">) =>
      mutation({ id, reviewerId }),
    [mutation]
  );
}

export function useRejectMatch() {
  const mutation = useMutation(api.matches.reject);
  return useCallback(
    (id: Id<"matchedPairs">, reviewerId?: Id<"users">) =>
      mutation({ id, reviewerId }),
    [mutation]
  );
}

export function useApproveHighConfidenceMatches() {
  const mutation = useMutation(api.matches.approveHighConfidence);
  return useCallback(
    (sessionId: Id<"reconciliationSessions">, reviewerId?: Id<"users">) =>
      mutation({ sessionId, reviewerId }),
    [mutation]
  );
}

// ============ SESSION HOOKS ============

export function useSession(id: Id<"reconciliationSessions"> | undefined) {
  return useQuery(api.sessions.get, id ? { id } : "skip");
}

export function useSessionWithStats(id: Id<"reconciliationSessions"> | undefined) {
  return useQuery(api.sessions.getWithStats, id ? { id } : "skip");
}

export function useCompanySessions(
  companyId: Id<"companies"> | undefined,
  status?: "draft" | "processing" | "review" | "completed"
) {
  return useQuery(
    api.sessions.listByCompany,
    companyId ? { companyId, status } : "skip"
  );
}

export function useCreateSession() {
  const mutation = useMutation(api.sessions.create);
  return useCallback(
    (args: {
      companyId: Id<"companies">;
      name: string;
      periodStart?: string;
      periodEnd?: string;
      createdBy: Id<"users">;
    }) => mutation(args),
    [mutation]
  );
}

export function useUpdateSessionStatus() {
  const mutation = useMutation(api.sessions.updateStatus);
  return useCallback(
    (
      id: Id<"reconciliationSessions">,
      status: "draft" | "processing" | "review" | "completed"
    ) => mutation({ id, status }),
    [mutation]
  );
}

export function useUpdateSessionProgress() {
  const mutation = useMutation(api.sessions.updateProgress);
  return useCallback(
    (
      id: Id<"reconciliationSessions">,
      progress: number,
      matchedCount?: number,
      suspenseCount?: number
    ) => mutation({ id, progress, matchedCount, suspenseCount }),
    [mutation]
  );
}

export function useDeleteSession() {
  const mutation = useMutation(api.sessions.remove);
  return useCallback(
    (id: Id<"reconciliationSessions">) => mutation({ id }),
    [mutation]
  );
}

// ============ DOCUMENT HOOKS ============

export function useCompanyDocuments(
  companyId: Id<"companies"> | undefined,
  documentType?: "bank_statement" | "invoice" | "receipt" | "other"
) {
  return useQuery(
    api.documents.listByCompany,
    companyId ? { companyId, documentType } : "skip"
  );
}

/**
 * Generate an upload URL for Convex file storage.
 * Returns a presigned URL to which the client can POST the file.
 */
export function useGenerateUploadUrl() {
  const mutation = useMutation(api.documents.generateUploadUrl);
  return useCallback(
    (args: { companyId: Id<"companies"> }) => mutation(args),
    [mutation]
  );
}

/**
 * Create a document record after uploading to Convex storage.
 */
export function useCreateDocument() {
  const mutation = useMutation(api.documents.create);
  return useCallback(
    (args: {
      companyId: Id<"companies">;
      fileName: string;
      fileType: string;
      fileSize: number;
      contentType: string;
      storageId: Id<"_storage">;
      documentType: "bank_statement" | "invoice" | "receipt" | "other";
    }) => mutation(args),
    [mutation]
  );
}

export function useUpdateDocumentExtraction() {
  const mutation = useMutation(api.documents.updateExtractionStatus);
  return useCallback(
    (args: {
      id: Id<"documents">;
      extractionStatus: "pending" | "processing" | "completed" | "failed";
      extractedText?: string;
    }) => mutation(args),
    [mutation]
  );
}

export function useDeleteDocument() {
  const mutation = useMutation(api.documents.remove);
  return useCallback(
    (id: Id<"documents">) => mutation({ id }),
    [mutation]
  );
}


// ============ MATCHING HOOKS ============

export function useRunMatching() {
  const action = useAction(api.sessions.runMatching);
  return useCallback(
    (sessionId: Id<"reconciliationSessions">, useLLM?: boolean) =>
      action({ sessionId, useLLM }),
    [action]
  );
}

export function usePreviewMatching() {
  const action = useAction(api.sessions.previewMatching);
  return useCallback(
    (sessionId: Id<"reconciliationSessions">) => action({ sessionId }),
    [action]
  );
}

// ============ ACCRUAL DOCUMENT HOOKS ============

export function useCompanyAccrualDocs(
  companyId: Id<"companies"> | undefined,
  status?: "pending" | "matched" | "partial" | "suspense"
) {
  return useQuery(
    api.accrualDocuments.listByCompany,
    companyId ? { companyId, status } : "skip"
  );
}

export function useSessionAccrualDocs(
  sessionId: Id<"reconciliationSessions"> | undefined,
  status?: "pending" | "matched" | "partial" | "suspense"
) {
  return useQuery(
    api.accrualDocuments.listBySession,
    sessionId ? { sessionId, status } : "skip"
  );
}

export function useAccrualDocCounts(companyId: Id<"companies"> | undefined) {
  return useQuery(
    api.accrualDocuments.getCounts,
    companyId ? { companyId } : "skip"
  );
}

// ============ SUSPENSE ITEM HOOKS ============

export function useCompanySuspenseItems(
  companyId: Id<"companies"> | undefined,
  status?: "open" | "queried" | "resolved"
) {
  return useQuery(
    api.suspenseItems.listByCompany,
    companyId ? { companyId, status } : "skip"
  );
}

export function useSessionSuspenseItems(
  sessionId: Id<"reconciliationSessions"> | undefined,
  status?: "open" | "queried" | "resolved"
) {
  return useQuery(
    api.suspenseItems.listBySession,
    sessionId ? { sessionId, status } : "skip"
  );
}

export function useSuspenseItemCounts(
  sessionId: Id<"reconciliationSessions"> | undefined
) {
  return useQuery(
    api.suspenseItems.getCounts,
    sessionId ? { sessionId } : "skip"
  );
}

export function useResolveSuspenseItem() {
  const mutation = useMutation(api.suspenseItems.resolve);
  return useCallback(
    (id: Id<"suspenseItems">, resolutionNotes: string) =>
      mutation({ id, resolutionNotes }),
    [mutation]
  );
}

// ============ ANALYTICS HOOKS ============

export function useMonthlyCashFlow(companyId: Id<"companies"> | undefined) {
  return useQuery(
    api.analytics.getMonthlyCashFlow,
    companyId ? { companyId, months: 12 } : "skip"
  );
}

export function useExpenseBreakdown(companyId: Id<"companies"> | undefined) {
  return useQuery(
    api.analytics.getExpenseBreakdown,
    companyId ? { companyId, limit: 6 } : "skip"
  );
}

export function useTopExpenses(companyId: Id<"companies"> | undefined) {
  return useQuery(
    api.analytics.getTopExpenses,
    companyId ? { companyId, limit: 5 } : "skip"
  );
}

export function useReconciliationStats(companyId: Id<"companies"> | undefined) {
  return useQuery(
    api.analytics.getReconciliationStats,
    companyId ? { companyId } : "skip"
  );
}

// ============ DOCUMENT RETRIEVAL HOOKS ============

export function useDocument(documentId: Id<"documents"> | undefined) {
  return useQuery(
    api.documents.get,
    documentId ? { id: documentId } : "skip"
  );
}

// ============ EXTRACTION HOOKS ============

export function useTriggerExtraction() {
  const action = useAction(api.extraction.triggerExtraction);
  return useCallback(
    (documentId: Id<"documents">) => action({ documentId }),
    [action]
  );
}

// ============ ACTIVITY HOOKS ============

export function useRecentActivity(companyId: Id<"companies"> | undefined, limit?: number) {
  return useQuery(
    api.analytics.getRecentActivity,
    companyId ? { companyId, limit: limit || 10 } : "skip"
  );
}

// ============ ONBOARDING HOOKS ============

export function useOnboardingProgress(userId: string | undefined) {
  return useQuery(
    api.onboarding.getProgress,
    userId ? { userId } : "skip"
  );
}

export function useSaveOnboardingProgress() {
  const mutation = useMutation(api.onboarding.saveProgress);
  return useCallback(
    (args: {
      userId: string;
      currentStep: number;
      data: {
        companyName?: string;
        industryCategory?: string;
        taxRegistered?: string;
        taxNumber?: string;
        primaryBank?: string;
        fiscalYearEnd?: string;
      };
      isCompleted?: boolean;
    }) => mutation(args),
    [mutation]
  );
}

export function useMarkOnboardingCompleted() {
  const mutation = useMutation(api.onboarding.markCompleted);
  return useCallback(
    (userId: string) => mutation({ userId }),
    [mutation]
  );
}

export function useDeleteOnboardingProgress() {
  const mutation = useMutation(api.onboarding.deleteProgress);
  return useCallback(
    (userId: string) => mutation({ userId }),
    [mutation]
  );
}

// ============ USER PREFERENCES HOOKS ============

export interface UserPreferences {
  theme: string;
  dateFormat: string;
  numberFormat: string;
  emailNotifications: {
    reconciliationComplete: boolean;
    weeklyDigest: boolean;
    newFeatures: boolean;
  };
}

/**
 * Hook to get user preferences with real-time updates.
 * Returns default values for unauthenticated users.
 */
export function useUserPreferences() {
  return useQuery(api.settings.getUserPreferences);
}

/**
 * Hook to update user preferences.
 * Supports partial updates - only pass the fields you want to change.
 */
export function useUpdateUserPreferences() {
  const mutation = useMutation(api.settings.updateUserPreferences);
  return useCallback(
    (args: {
      dateFormat?: string;
      numberFormat?: string;
      emailReconciliation?: boolean;
      emailWeeklyDigest?: boolean;
      emailProductUpdates?: boolean;
    }) => mutation(args),
    [mutation]
  );
}

// ============ MODE-AWARE COMBINED HOOKS ============
// These hooks automatically return demo data in demo mode, or real Convex data in real mode.
// They combine the store selectors with Convex queries for seamless mode switching.

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
  type SuspenseItem,
  type Transaction,
  type MatchPair,
  type ReconciliationSession,
} from "./store";

/**
 * Mode-aware hook for accrual documents.
 * Returns demo data in demo mode, Convex data in real mode.
 */
export function useAccrualDocumentsCombined(): {
  data: AccrualDocument[];
  isLoading: boolean;
  error: Error | null;
} {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoData = useStoreAccrualDocuments();

  // Query Convex in real mode (skip in demo mode)
  const convexData = useCompanyAccrualDocs(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return { data: demoData, isLoading: false, error: null };
  }

  // Transform Convex data to match store type
  const transformedData: AccrualDocument[] = (convexData ?? []).map((doc) => ({
    id: doc._id,
    docType: doc.docType,
    docNumber: doc.docNumber,
    docDate: doc.docDate,
    dueDate: doc.dueDate,
    counterparty: doc.counterparty,
    amount: doc.amount,
    taxAmount: doc.taxAmount,
    description: doc.description,
    status: doc.status,
    matchId: doc.matchId,
  }));

  return {
    data: transformedData,
    isLoading: convexData === undefined,
    error: null,
  };
}

/**
 * Mode-aware hook for suspense items.
 * Returns demo data in demo mode, Convex data in real mode.
 */
export function useSuspenseItemsCombined(): {
  data: SuspenseItem[];
  isLoading: boolean;
  error: Error | null;
} {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoData = useStoreSuspenseItems();

  // Query Convex in real mode (skip in demo mode)
  const convexData = useCompanySuspenseItems(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return { data: demoData, isLoading: false, error: null };
  }

  // Transform Convex data to match store type
  const transformedData: SuspenseItem[] = (convexData ?? []).map((item) => ({
    id: item._id,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    amount: item.amount,
    transactionDate: item.transactionDate,
    description: item.description,
    reason: item.reason,
    suggestedAction: item.suggestedAction,
    status: item.status,
    resolutionNotes: item.resolutionNotes,
  }));

  return {
    data: transformedData,
    isLoading: convexData === undefined,
    error: null,
  };
}

/**
 * Mode-aware hook for cash transactions.
 * Returns demo data in demo mode, Convex data in real mode.
 */
export function useCashTransactionsCombined(): {
  data: Transaction[];
  isLoading: boolean;
  error: Error | null;
} {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoData = useStoreCashTransactions();

  // Query Convex in real mode (skip in demo mode)
  const convexData = useCompanyTransactions(
    isDemo ? undefined : companyId ?? undefined,
    { type: "cash" }
  );

  if (isDemo) {
    return { data: demoData, isLoading: false, error: null };
  }

  // Transform Convex data to match store type
  const transformedData: Transaction[] = (convexData ?? []).map((tx) => ({
    id: tx._id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    status: tx.status,
    matchId: tx.matchId,
    category: tx.category,
  }));

  return {
    data: transformedData,
    isLoading: convexData === undefined,
    error: null,
  };
}

/**
 * Mode-aware hook for reconciliation stats.
 * Returns demo data in demo mode, Convex data in real mode.
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
  error: Error | null;
} {
  const isDemo = useIsDemo();
  const companyId = useSelectedCompanyId();
  const demoCashTxns = useStoreCashTransactions();
  const demoMatches = useStoreMatches();

  // Query Convex in real mode
  const reconStats = useReconciliationStats(isDemo ? undefined : companyId ?? undefined);
  const cashTxns = useCompanyTransactions(
    isDemo ? undefined : companyId ?? undefined,
    { type: "cash" }
  );

  if (isDemo) {
    const totalCashIn = demoCashTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalCashOut = demoCashTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const matchedCount = demoMatches.filter(m => m.approved).length;
    const pendingCount = demoMatches.filter(m => !m.approved).length;
    const suspenseCount = demoCashTxns.filter(t => t.status === "suspense").length;
    const total = matchedCount + pendingCount + suspenseCount;
    const matchRate = total > 0 ? Math.round((matchedCount / total) * 100) : 0;

    return {
      data: { totalCashIn, totalCashOut, matchedCount, pendingCount, suspenseCount, matchRate },
      isLoading: false,
      error: null,
    };
  }

  const isLoading = reconStats === undefined || cashTxns === undefined;

  const totalCashIn = (cashTxns ?? []).filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalCashOut = (cashTxns ?? []).filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const matchedCount = reconStats?.matched ?? 0;
  const pendingCount = reconStats?.pending ?? 0;
  const suspenseCount = reconStats?.suspense ?? 0;
  const matchRate = reconStats?.matchRate ?? 0;

  return {
    data: { totalCashIn, totalCashOut, matchedCount, pendingCount, suspenseCount, matchRate },
    isLoading,
    error: null,
  };
}

// ============ MODE-AWARE SAFE HOOKS (P0-1/P0-2 FIX) ============
// These hooks return plain arrays (API compatible with store selectors)
// but properly query Convex in real mode instead of returning empty arrays.

/**
 * Mode-aware hook for accrual documents with automatic Convex queries.
 *
 * Seamlessly switches between demo and real mode:
 * - **Demo mode:** Returns documents from Zustand store (no network calls)
 * - **Real mode:** Queries Convex backend by company ID
 *
 * @returns Array of accrual documents in UI format. Returns `[]` while loading
 * in real mode (use `useAccrualDocumentsWithState` if you need loading state).
 *
 * @example
 * ```tsx
 * function DocumentList() {
 *   const documents = useAccrualDocumentsSafe()
 *
 *   if (documents.length === 0) {
 *     return <EmptyState /> // Could be loading or actually empty
 *   }
 *
 *   return <List items={documents} />
 * }
 * ```
 *
 * @see useAccrualDocumentsWithState - Use this if you need loading/error states
 * @see useAccrualDocumentsCombined - Full combined hook with error handling
 */
export function useAccrualDocumentsSafe(): AccrualDocument[] {
  const isDemo = useIsDemo();
  const demoData = useStoreAccrualDocuments();
  const companyId = useSelectedCompanyId();

  // Query Convex in real mode
  const realData = useCompanyAccrualDocs(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return demoData;
  }

  // Transform Convex data to store format
  return (realData ?? []).map((doc) => ({
    id: doc._id,
    docType: doc.docType,
    docNumber: doc.docNumber,
    docDate: doc.docDate,
    dueDate: doc.dueDate,
    counterparty: doc.counterparty,
    amount: doc.amount,
    taxAmount: doc.taxAmount,
    description: doc.description,
    status: doc.status,
    matchId: doc.matchId,
  }));
}

/**
 * Mode-aware hook for suspense items with automatic Convex queries.
 *
 * Seamlessly switches between demo and real mode:
 * - **Demo mode:** Returns items from Zustand store (no network calls)
 * - **Real mode:** Queries Convex backend by company ID
 *
 * @returns Array of suspense items in UI format. Returns `[]` while loading.
 *
 * @example
 * ```tsx
 * function SuspenseQueue() {
 *   const items = useSuspenseItemsSafe()
 *
 *   return (
 *     <div>
 *       <h2>Suspense Items ({items.length})</h2>
 *       {items.map(item => (
 *         <SuspenseCard key={item.id} item={item} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @see useSuspenseItemsWithState - Use this if you need loading state
 */
export function useSuspenseItemsSafe(): SuspenseItem[] {
  const isDemo = useIsDemo();
  const demoData = useStoreSuspenseItems();
  const companyId = useSelectedCompanyId();

  // Query Convex in real mode
  const realData = useCompanySuspenseItems(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return demoData;
  }

  // Transform Convex data to store format
  return (realData ?? []).map((item) => ({
    id: item._id,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    amount: item.amount,
    transactionDate: item.transactionDate,
    description: item.description,
    reason: item.reason,
    suggestedAction: item.suggestedAction,
    status: item.status,
    resolutionNotes: item.resolutionNotes,
  }));
}

/**
 * Mode-aware hook for cash transactions with automatic Convex queries.
 *
 * Seamlessly switches between demo and real mode:
 * - **Demo mode:** Returns transactions from Zustand store (no network calls)
 * - **Real mode:** Queries Convex backend by company ID, filtered to cash type
 *
 * @returns Array of cash transactions in UI format. Returns `[]` while loading.
 *
 * @example
 * ```tsx
 * function CashTransactionTable() {
 *   const transactions = useCashTransactionsSafe()
 *
 *   const totals = useMemo(() => ({
 *     inflows: transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
 *     outflows: transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
 *   }), [transactions])
 *
 *   return <Table data={transactions} totals={totals} />
 * }
 * ```
 *
 * @see useCashTransactionsWithState - Use this if you need loading state
 */
export function useCashTransactionsSafe(): Transaction[] {
  const isDemo = useIsDemo();
  const demoData = useStoreCashTransactions();
  const companyId = useSelectedCompanyId();

  // Query Convex in real mode
  const realData = useCompanyTransactions(
    isDemo ? undefined : companyId ?? undefined,
    { type: "cash" }
  );

  if (isDemo) {
    return demoData;
  }

  // Transform Convex data to store format
  return (realData ?? []).map((tx) => ({
    id: tx._id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    status: tx.status,
    matchId: tx.matchId,
    category: tx.category,
  }));
}

/**
 * Mode-aware hook for match pairs.
 *
 * Seamlessly switches between demo and real mode:
 * - **Demo mode:** Returns matches from Zustand store (no network calls)
 * - **Real mode:** Returns empty array (matches should be fetched per-session)
 *
 * **Note:** In real mode, use `useReconcileData` or `useSessionMatches` for
 * proper session-based match fetching. This hook is primarily for demo mode
 * compatibility with existing components.
 *
 * @returns Array of match pairs. In real mode, returns `[]`.
 *
 * @example
 * ```tsx
 * // Demo mode usage
 * function MatchList() {
 *   const matches = useMatchesSafe()
 *
 *   return (
 *     <ul>
 *       {matches.map(match => (
 *         <MatchRow key={match.id} match={match} />
 *       ))}
 *     </ul>
 *   )
 * }
 *
 * // Real mode: use session-based fetching instead
 * function RealModeMatchList({ sessionId }: { sessionId: Id<"reconciliationSessions"> }) {
 *   const matches = useSessionMatches(sessionId)
 *   // ...
 * }
 * ```
 *
 * @see useSessionMatches - For real mode session-based match fetching
 */
export function useMatchesSafe(): MatchPair[] {
  const isDemo = useIsDemo();
  const demoData = useStoreMatches();

  // In real mode, matches should be fetched per session via useReconcileData
  // This hook is primarily for demo mode compatibility
  if (isDemo) {
    return demoData;
  }

  // Real mode: return empty - use useReconcileData for proper session-based fetching
  // This maintains backward compatibility while directing users to the proper hook
  return [];
}

/**
 * Mode-aware hook for reconciliation sessions with automatic Convex queries.
 *
 * Seamlessly switches between demo and real mode:
 * - **Demo mode:** Returns sessions from Zustand store (no network calls)
 * - **Real mode:** Queries Convex backend by company ID
 *
 * @returns Array of reconciliation sessions in UI format. Returns `[]` while loading.
 *
 * @example
 * ```tsx
 * function SessionSelector() {
 *   const sessions = useSessionsSafe()
 *
 *   return (
 *     <select>
 *       <option value="">Select a session...</option>
 *       {sessions.map(session => (
 *         <option key={session.id} value={session.id}>
 *           {session.name} ({session.status})
 *         </option>
 *       ))}
 *     </select>
 *   )
 * }
 * ```
 *
 * @see useSessionsWithState - Use this if you need loading state
 */
export function useSessionsSafe(): ReconciliationSession[] {
  const isDemo = useIsDemo();
  const demoData = useStoreSessions();
  const companyId = useSelectedCompanyId();

  // Query Convex in real mode
  const realData = useCompanySessions(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return demoData;
  }

  // Transform Convex data to store format
  return (realData ?? []).map((session) => ({
    id: session._id,
    name: session.name,
    createdAt: new Date(session._creationTime).toISOString().split('T')[0],
    status: session.status,
    progress: session.progress ?? 0,
    totalCash: 0, // Would need separate query
    totalAccrual: 0, // Would need separate query
    matchedCount: session.matchedCount ?? 0,
    suspenseCount: session.suspenseCount ?? 0,
  }));
}

/**
 * Mode-aware hook for the currently active reconciliation session.
 *
 * Seamlessly switches between demo and real mode:
 * - **Demo mode:** Returns active session from Zustand store
 * - **Real mode:** Returns `null` (active session tracked via URL params)
 *
 * **Note:** In real mode, the active session is typically determined by URL
 * parameters (e.g., `/reconcile/[sessionId]`). This hook is primarily for
 * demo mode compatibility.
 *
 * @returns The active session, or `null` if none is active or in real mode.
 *
 * @example
 * ```tsx
 * function SessionHeader() {
 *   const activeSession = useActiveSessionSafe()
 *
 *   if (!activeSession) {
 *     return <span>No session selected</span>
 *   }
 *
 *   return (
 *     <div>
 *       <h2>{activeSession.name}</h2>
 *       <ProgressBar value={activeSession.progress} />
 *     </div>
 *   )
 * }
 * ```
 *
 * @see useSession - For fetching a specific session by ID in real mode
 */
export function useActiveSessionSafe(): ReconciliationSession | null {
  const isDemo = useIsDemo();
  const demoData = useStoreActiveSession();

  if (isDemo) {
    return demoData;
  }

  // Real mode: active session is tracked via URL params, not store
  return null;
}

// ============ WITH-STATE HOOK VARIANTS ============
// These hooks expose loading state alongside data for components that need to
// distinguish between "loading" and "empty" states.

/**
 * Mode-aware hook for accrual documents with loading state.
 *
 * Seamlessly switches between demo and real mode:
 * - **Demo mode:** Returns documents from Zustand store (no network calls)
 * - **Real mode:** Queries Convex backend by company ID
 *
 * @returns Object with data array and loading state
 *
 * @example
 * ```tsx
 * function DocumentList() {
 *   const { data: documents, isLoading } = useAccrualDocumentsWithState()
 *
 *   if (isLoading) {
 *     return <Skeleton />
 *   }
 *
 *   if (documents.length === 0) {
 *     return <EmptyState />
 *   }
 *
 *   return <List items={documents} />
 * }
 * ```
 *
 * @see useAccrualDocumentsSafe - Use this if you don't need loading state
 */
export function useAccrualDocumentsWithState(): {
  data: AccrualDocument[];
  isLoading: boolean;
} {
  const isDemo = useIsDemo();
  const demoData = useStoreAccrualDocuments();
  const companyId = useSelectedCompanyId();
  const realData = useCompanyAccrualDocs(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return { data: demoData, isLoading: false };
  }

  const transformedData: AccrualDocument[] = (realData ?? []).map((doc) => ({
    id: doc._id,
    docType: doc.docType,
    docNumber: doc.docNumber,
    docDate: doc.docDate,
    dueDate: doc.dueDate,
    counterparty: doc.counterparty,
    amount: doc.amount,
    taxAmount: doc.taxAmount,
    description: doc.description,
    status: doc.status,
    matchId: doc.matchId,
  }));

  return {
    data: transformedData,
    isLoading: realData === undefined,
  };
}

/**
 * Mode-aware hook for suspense items with loading state.
 *
 * @returns Object with data array and loading state
 *
 * @example
 * ```tsx
 * function SuspenseList() {
 *   const { data: items, isLoading } = useSuspenseItemsWithState()
 *
 *   if (isLoading) return <Skeleton />
 *   return <List items={items} />
 * }
 * ```
 *
 * @see useSuspenseItemsSafe - Use this if you don't need loading state
 */
export function useSuspenseItemsWithState(): {
  data: SuspenseItem[];
  isLoading: boolean;
} {
  const isDemo = useIsDemo();
  const demoData = useStoreSuspenseItems();
  const companyId = useSelectedCompanyId();
  const realData = useCompanySuspenseItems(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return { data: demoData, isLoading: false };
  }

  const transformedData: SuspenseItem[] = (realData ?? []).map((item) => ({
    id: item._id,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    amount: item.amount,
    transactionDate: item.transactionDate,
    description: item.description,
    reason: item.reason,
    suggestedAction: item.suggestedAction,
    status: item.status,
    resolutionNotes: item.resolutionNotes,
  }));

  return {
    data: transformedData,
    isLoading: realData === undefined,
  };
}

/**
 * Mode-aware hook for cash transactions with loading state.
 *
 * @returns Object with data array and loading state
 *
 * @example
 * ```tsx
 * function TransactionList() {
 *   const { data: transactions, isLoading } = useCashTransactionsWithState()
 *
 *   if (isLoading) return <Skeleton />
 *   return <List items={transactions} />
 * }
 * ```
 *
 * @see useCashTransactionsSafe - Use this if you don't need loading state
 */
export function useCashTransactionsWithState(): {
  data: Transaction[];
  isLoading: boolean;
} {
  const isDemo = useIsDemo();
  const demoData = useStoreCashTransactions();
  const companyId = useSelectedCompanyId();
  const realData = useCompanyTransactions(
    isDemo ? undefined : companyId ?? undefined,
    { type: "cash" }
  );

  if (isDemo) {
    return { data: demoData, isLoading: false };
  }

  const transformedData: Transaction[] = (realData ?? []).map((tx) => ({
    id: tx._id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    status: tx.status,
    matchId: tx.matchId,
    category: tx.category,
  }));

  return {
    data: transformedData,
    isLoading: realData === undefined,
  };
}

/**
 * Mode-aware hook for sessions with loading state.
 *
 * @returns Object with data array and loading state
 *
 * @example
 * ```tsx
 * function SessionList() {
 *   const { data: sessions, isLoading } = useSessionsWithState()
 *
 *   if (isLoading) return <Skeleton />
 *   return <List items={sessions} />
 * }
 * ```
 *
 * @see useSessionsSafe - Use this if you don't need loading state
 */
export function useSessionsWithState(): {
  data: ReconciliationSession[];
  isLoading: boolean;
} {
  const isDemo = useIsDemo();
  const demoData = useStoreSessions();
  const companyId = useSelectedCompanyId();
  const realData = useCompanySessions(isDemo ? undefined : companyId ?? undefined);

  if (isDemo) {
    return { data: demoData, isLoading: false };
  }

  const transformedData: ReconciliationSession[] = (realData ?? []).map((session) => ({
    id: session._id,
    name: session.name,
    createdAt: new Date(session._creationTime).toISOString().split('T')[0],
    status: session.status,
    progress: session.progress ?? 0,
    totalCash: 0,
    totalAccrual: 0,
    matchedCount: session.matchedCount ?? 0,
    suspenseCount: session.suspenseCount ?? 0,
  }));

  return {
    data: transformedData,
    isLoading: realData === undefined,
  };
}
