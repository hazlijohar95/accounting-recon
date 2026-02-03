/**
 * Aggregate definitions for O(log n) counts and sums
 *
 * Uses @convex-dev/aggregate component to replace O(n) .collect() + filter patterns
 * with efficient server-side aggregations.
 *
 * @see https://www.convex.dev/components/aggregate
 *
 * IMPORTANT: This component is in ALPHA status. APIs may change before v1.0.
 * All aggregate logic is isolated here for easy updates.
 */

import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";
import { DataModel, Id } from "../_generated/dataModel";

// ============================================================================
// TRANSACTION AGGREGATES
// ============================================================================

/**
 * Transaction counts by company + type + status
 * Used for: Dashboard reconciliation stats (getReconciliationStats)
 *
 * Key structure: [companyId, type, status]
 * - Count all cash transactions: prefix: [companyId, "cash"]
 * - Count matched cash: prefix: [companyId, "cash", "matched"]
 * - Count pending cash: prefix: [companyId, "cash", "pending"]
 */
export const transactionCounts = new TableAggregate<{
  Key: [Id<"companies">, string, string]; // [companyId, type, status]
  DataModel: DataModel;
  TableName: "transactions";
}>(components.aggregate, {
  sortKey: (doc) => [doc.companyId, doc.type, doc.status],
});

/**
 * Transaction sums by company + type + flow direction
 * Used for: Cash flow analytics (getMonthlyCashFlow)
 *
 * Key structure: [companyId, type, flowDirection]
 * - flowDirection: "inflow" (amount > 0) or "outflow" (amount < 0)
 */
export const transactionSums = new TableAggregate<{
  Key: [Id<"companies">, string, string]; // [companyId, type, "inflow"|"outflow"]
  DataModel: DataModel;
  TableName: "transactions";
  SumValue: number;
}>(components.aggregate, {
  sortKey: (doc) => [
    doc.companyId,
    doc.type,
    doc.amount > 0 ? "inflow" : "outflow",
  ],
  sumValue: (doc) => Math.abs(doc.amount),
});

// ============================================================================
// MATCHED PAIRS AGGREGATES
// ============================================================================

/**
 * Match counts by session + status
 * Used for: Session stats (getCounts in matches.ts)
 *
 * Key structure: [sessionId, status]
 * - Count all matches: prefix: [sessionId]
 * - Count pending: prefix: [sessionId, "pending"]
 * - Count approved: prefix: [sessionId, "approved"]
 */
export const matchCountsByStatus = new TableAggregate<{
  Key: [Id<"reconciliationSessions">, string]; // [sessionId, status]
  DataModel: DataModel;
  TableName: "matchedPairs";
}>(components.aggregate, {
  sortKey: (doc) => [doc.sessionId, doc.status],
});

/**
 * Match counts by session + confidence level
 * Used for: Session stats (getCounts in matches.ts)
 *
 * Key structure: [sessionId, confidence]
 * - Count high confidence: prefix: [sessionId, "high"]
 * - Count medium confidence: prefix: [sessionId, "medium"]
 */
export const matchCountsByConfidence = new TableAggregate<{
  Key: [Id<"reconciliationSessions">, string]; // [sessionId, confidence]
  DataModel: DataModel;
  TableName: "matchedPairs";
}>(components.aggregate, {
  sortKey: (doc) => [doc.sessionId, doc.confidence],
});

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Transaction document type for aggregate operations
 * Must match the schema in convex/schema.ts
 */
export type TransactionDoc = {
  _id: Id<"transactions">;
  companyId: Id<"companies">;
  sessionId?: Id<"reconciliationSessions">;
  date: string;
  description: string;
  reference?: string;
  amount: number;
  type: "cash" | "accrual";
  status: "pending" | "matched" | "suspense";
  category?: string;
  matchId?: Id<"matchedPairs">;
  sourceDocumentId?: Id<"documents">;
  createdAt: number;
};

/**
 * MatchedPair document type for aggregate operations
 */
export type MatchedPairDoc = {
  _id: Id<"matchedPairs">;
  sessionId: Id<"reconciliationSessions">;
  cashTransactionId: Id<"transactions">;
  accrualTransactionId?: Id<"transactions">;
  accrualDocumentId?: Id<"accrualDocuments">;
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  matchLayer: 1 | 2 | 3 | 4 | 5 | 6;
  matchReason?: string;
  status: "pending" | "approved" | "rejected";
  matchedAmount?: number;
  isPartialMatch?: boolean;
  reviewedAt?: number;
  reviewedBy?: Id<"users">;
  createdAt: number;
};
