"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";
import { useWorkosUserId, withWorkosUserId } from "./shared";

// ============ ACCRUAL DOCUMENT HOOKS ============

export function useCompanyAccrualDocs(
  companyId: Id<"companies"> | undefined,
  status?: "pending" | "matched" | "partial" | "suspense"
) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.accrualDocuments.listByCompany,
    companyId ? withWorkosUserId({ companyId, status }, workosUserId) : "skip"
  );
}

export function useSessionAccrualDocs(
  sessionId: Id<"reconciliationSessions"> | undefined,
  status?: "pending" | "matched" | "partial" | "suspense"
) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.accrualDocuments.listBySession,
    sessionId ? withWorkosUserId({ sessionId, status }, workosUserId) : "skip"
  );
}

export function useAccrualDocCounts(companyId: Id<"companies"> | undefined) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.accrualDocuments.getCounts,
    companyId ? withWorkosUserId({ companyId }, workosUserId) : "skip"
  );
}

// ============ SUSPENSE ITEM HOOKS ============

export function useCompanySuspenseItems(
  companyId: Id<"companies"> | undefined,
  status?: "open" | "queried" | "resolved"
) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.suspenseItems.listByCompany,
    companyId ? withWorkosUserId({ companyId, status }, workosUserId) : "skip"
  );
}

export function useSessionSuspenseItems(
  sessionId: Id<"reconciliationSessions"> | undefined,
  status?: "open" | "queried" | "resolved",
  workosUserId?: string
) {
  return useQuery(
    api.suspenseItems.listBySession,
    sessionId ? withWorkosUserId({ sessionId, status }, workosUserId) : "skip"
  );
}

export function useSuspenseItemCounts(
  sessionId: Id<"reconciliationSessions"> | undefined,
  workosUserId?: string
) {
  return useQuery(
    api.suspenseItems.getCounts,
    sessionId ? withWorkosUserId({ sessionId }, workosUserId) : "skip"
  );
}

export function useResolveSuspenseItem() {
  const mutation = useMutation(api.suspenseItems.resolve);
  const workosUserId = useWorkosUserId();
  return useCallback(
    (id: Id<"suspenseItems">, resolutionNotes: string) =>
      mutation(withWorkosUserId({ id, resolutionNotes }, workosUserId)),
    [mutation, workosUserId]
  );
}
