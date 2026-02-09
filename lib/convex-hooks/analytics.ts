"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useWorkosUserId, withWorkosUserId } from "./shared";

// ============ ANALYTICS HOOKS ============

export function useMonthlyCashFlow(companyId: Id<"companies"> | undefined) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.analytics.getMonthlyCashFlow,
    companyId
      ? withWorkosUserId({ companyId, months: 12 }, workosUserId)
      : "skip"
  );
}

export function useExpenseBreakdown(companyId: Id<"companies"> | undefined) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.analytics.getExpenseBreakdown,
    companyId
      ? withWorkosUserId({ companyId, limit: 6 }, workosUserId)
      : "skip"
  );
}

export function useTopExpenses(companyId: Id<"companies"> | undefined) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.analytics.getTopExpenses,
    companyId
      ? withWorkosUserId({ companyId, limit: 5 }, workosUserId)
      : "skip"
  );
}

/**
 * Reconciliation stats including match counts AND cash totals.
 * All computed server-side via O(log n) aggregates -- no client-side summation needed.
 */
export function useReconciliationStats(companyId: Id<"companies"> | undefined) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.analytics.getReconciliationStats,
    companyId ? withWorkosUserId({ companyId }, workosUserId) : "skip"
  );
}

// ============ ACTIVITY HOOKS ============

export function useRecentActivity(companyId: Id<"companies"> | undefined, limit?: number) {
  const workosUserId = useWorkosUserId();
  return useQuery(
    api.analytics.getRecentActivity,
    companyId
      ? withWorkosUserId({ companyId, limit: limit ?? 10 }, workosUserId)
      : "skip"
  );
}
