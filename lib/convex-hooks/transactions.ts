"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { useWorkosUserId, withWorkosUserId } from "./shared";

// ============ TRANSACTION HOOKS ============

export function useCompanyTransactions(
  companyId: Id<"companies"> | undefined,
  options?: {
    type?: "cash" | "accrual";
    status?: "pending" | "matched" | "suspense";
    limit?: number;
  }
) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.transactions.listByCompany,
    companyId
      ? withWorkosUserId(
          {
            companyId,
            type: options?.type,
            status: options?.status,
            limit: options?.limit,
          },
          workosUserId
        )
      : "skip"
  );
}

export function useSessionTransactions(
  sessionId: Id<"reconciliationSessions"> | undefined,
  type?: "cash" | "accrual"
) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.transactions.listBySession,
    sessionId
      ? withWorkosUserId({ sessionId, type }, workosUserId)
      : "skip"
  );
}

export function useCreateTransaction() {
  const mutation = useMutation(api.transactions.create);
  const workosUserId = useWorkosUserId();
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
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

export function useCreateBulkTransactions() {
  const mutation = useMutation(api.transactions.createBulk);
  const workosUserId = useWorkosUserId();
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
    ) => mutation(withWorkosUserId({ transactions }, workosUserId)),
    [mutation, workosUserId]
  );
}

// ============ TRANSACTION UPDATE HOOKS (Phase 3) ============

/**
 * Hook to update a single transaction (inline editing).
 */
export function useUpdateTransaction() {
  const mutation = useMutation(api.transactions.update);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: {
      id: Id<"transactions">;
      date?: string;
      description?: string;
      amount?: number;
      reference?: string;
      category?: string;
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

/**
 * Hook to bulk update transaction status.
 */
export function useBulkUpdateStatus() {
  const mutation = useMutation(api.transactions.bulkUpdateStatus);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: {
      ids: Id<"transactions">[];
      status: "pending" | "matched" | "suspense";
    }) => mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}

/**
 * Hook to bulk delete transactions.
 */
export function useBulkDeleteTransactions() {
  const mutation = useMutation(api.transactions.bulkDelete);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (ids: Id<"transactions">[]) => mutation(withWorkosUserId({ ids }, workosUserId)),
    [mutation, workosUserId]
  );
}

/**
 * Hook to bulk update transaction category.
 */
export function useBulkUpdateCategory() {
  const mutation = useMutation(api.transactions.bulkUpdateCategory);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (args: { ids: Id<"transactions">[]; category: string }) =>
      mutation(withWorkosUserId(args, workosUserId)),
    [mutation, workosUserId]
  );
}
