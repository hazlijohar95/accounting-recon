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

export function useUserCompanies(
  ownerId: Id<"users"> | undefined,
  workosUserId?: string
) {
  return useQuery(
    api.companies.listByOwner,
    ownerId || workosUserId ? { ownerId, workosUserId } : "skip"
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

export function useCreateDocument() {
  const mutation = useMutation(api.documents.create);
  return useCallback(
    (args: {
      companyId: Id<"companies">;
      fileName: string;
      fileType: string;
      fileSize: number;
      storageId?: string;
      storageUrl?: string;
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
