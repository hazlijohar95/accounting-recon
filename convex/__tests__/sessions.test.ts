/**
 * Tests for Reconciliation Session Logic
 *
 * Validates the core logic behind session management:
 * - Session selection in autoCreateAndLink (draft/processing/review priority)
 * - Count derivation from transactions + accrualDocuments
 * - Matching gate conditions (both-sides-exist + status check)
 * - Session status reset when new items are linked
 * - Stats computation in getWithStats
 *
 * Run with: npx vitest run convex/__tests__/sessions.test.ts
 *
 * @module convex/__tests__/sessions.test
 */

import { describe, it, expect } from "vitest";
import {
  mockId,
  createDraftSession,
  createProcessingSession,
  createReviewSession,
  createCompletedSession,
  createCashTransaction,
  createAccrualTransaction,
  createTestAccrualDocument,
  createTestMatch,
  createTransactionBatch,
  createAccrualDocumentBatch,
  type ReconciliationSessionData,
  type TransactionData,
  type AccrualDocumentData,
  type MatchedPairData,
} from "../../__tests__/utils/factories";

// ============================================================================
// Extracted Logic Helpers
// ============================================================================
// These mirror the logic in convex/sessions.ts so we can test it without
// needing a real Convex database. When the production code changes, these
// should be updated to match.

/**
 * Mirrors autoCreateAndLink session selection logic.
 * Given all sessions for a company, returns the one to reuse (or null to create new).
 */
function selectActiveSession(
  sessions: ReconciliationSessionData[]
): ReconciliationSessionData | null {
  const candidates = sessions
    .filter((s) => s.status !== "completed")
    .sort((a, b) => {
      const priority: Record<string, number> = { draft: 0, processing: 1, review: 2 };
      return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
    });

  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Mirrors getSessionCounts logic.
 * Counts cash and accrual items linked to a session.
 */
function computeSessionCounts(
  transactions: TransactionData[],
  accrualDocs: AccrualDocumentData[]
): { cashCount: number; accrualCount: number } {
  return {
    cashCount: transactions.filter((t) => t.type === "cash").length,
    accrualCount:
      transactions.filter((t) => t.type === "accrual").length + accrualDocs.length,
  };
}

/**
 * Mirrors getWithStats stats computation.
 */
function computeStats(
  matches: MatchedPairData[],
  transactions: TransactionData[],
  accrualDocs: AccrualDocumentData[]
) {
  const cashTxns = transactions.filter((t) => t.type === "cash");
  const accrualTxns = transactions.filter((t) => t.type === "accrual");

  return {
    totalMatches: matches.length,
    pendingMatches: matches.filter((m) => m.status === "pending").length,
    approvedMatches: matches.filter((m) => m.status === "approved").length,
    rejectedMatches: matches.filter((m) => m.status === "rejected").length,
    cashTransactions: cashTxns.length,
    accrualTransactions: accrualTxns.length + accrualDocs.length,
    unmatchedCash: cashTxns.filter((t) => t.status !== "matched").length,
    unmatchedAccrual:
      accrualTxns.filter((t) => t.status !== "matched").length +
      accrualDocs.filter((d) => d.status !== "matched").length,
    suspenseCash: cashTxns.filter((t) => t.status === "suspense").length,
    suspenseAccrual:
      accrualTxns.filter((t) => t.status === "suspense").length +
      accrualDocs.filter((d) => d.status === "suspense").length,
    accrualDocuments: accrualDocs.length,
  };
}

/**
 * Mirrors the matching gate logic in geminiExtraction/nativePdfExtraction.
 * Returns true if matching should run.
 */
function shouldRunMatching(counts: {
  cashCount: number;
  accrualCount: number;
  status: string;
}): boolean {
  return counts.cashCount > 0 && counts.accrualCount > 0 && counts.status === "draft";
}

/**
 * Mirrors the session status reset logic in autoCreateAndLink.
 * Returns the new status if it should be reset, or null if no change.
 */
function shouldResetSessionStatus(
  existingSession: ReconciliationSessionData | null,
  newLinkedCount: number
): "draft" | null {
  if (
    existingSession &&
    newLinkedCount > 0 &&
    existingSession.status !== "draft"
  ) {
    return "draft";
  }
  return null;
}

/**
 * Derives count totals the same way autoCreateAndLink does.
 * Counts all items linked to a session (not incremental).
 */
function deriveLinkedCounts(
  linkedTransactions: TransactionData[],
  linkedAccrualDocs: AccrualDocumentData[]
): { totalCash: number; totalAccrual: number } {
  return {
    totalCash: linkedTransactions.filter((t) => t.type === "cash").length,
    totalAccrual:
      linkedTransactions.filter((t) => t.type === "accrual").length +
      linkedAccrualDocs.length,
  };
}

// ============================================================================
// Tests: Session Selection (autoCreateAndLink)
// ============================================================================

describe("autoCreateAndLink: Session Selection", () => {
  it("should prefer a draft session over processing or review", () => {
    const sessions = [
      createReviewSession({ _id: mockId("reconciliationSessions", "review_1") }),
      createDraftSession({ _id: mockId("reconciliationSessions", "draft_1") }),
      createProcessingSession({ _id: mockId("reconciliationSessions", "proc_1") }),
    ];

    const selected = selectActiveSession(sessions);
    expect(selected?.status).toBe("draft");
    expect(selected?._id).toBe(mockId("reconciliationSessions", "draft_1"));
  });

  it("should prefer processing over review when no draft exists", () => {
    const sessions = [
      createReviewSession({ _id: mockId("reconciliationSessions", "review_1") }),
      createProcessingSession({ _id: mockId("reconciliationSessions", "proc_1") }),
    ];

    const selected = selectActiveSession(sessions);
    expect(selected?.status).toBe("processing");
  });

  it("should select review session when no draft or processing exists", () => {
    const sessions = [
      createReviewSession({ _id: mockId("reconciliationSessions", "review_1") }),
    ];

    const selected = selectActiveSession(sessions);
    expect(selected?.status).toBe("review");
  });

  it("should never select a completed session", () => {
    const sessions = [
      createCompletedSession({ _id: mockId("reconciliationSessions", "done_1") }),
    ];

    const selected = selectActiveSession(sessions);
    expect(selected).toBeNull();
  });

  it("should return null when no sessions exist", () => {
    const selected = selectActiveSession([]);
    expect(selected).toBeNull();
  });

  it("should ignore completed sessions even alongside active ones", () => {
    const sessions = [
      createCompletedSession({ _id: mockId("reconciliationSessions", "done_1") }),
      createDraftSession({ _id: mockId("reconciliationSessions", "draft_1") }),
      createCompletedSession({ _id: mockId("reconciliationSessions", "done_2") }),
    ];

    const selected = selectActiveSession(sessions);
    expect(selected?.status).toBe("draft");
  });
});

// ============================================================================
// Tests: Count Derivation
// ============================================================================

describe("autoCreateAndLink: Count Derivation", () => {
  const sessionId = mockId("reconciliationSessions", "session_1");

  it("should count cash transactions from transactions table", () => {
    const txns = createTransactionBatch(5, { type: "cash", sessionId });
    const counts = deriveLinkedCounts(txns, []);

    expect(counts.totalCash).toBe(5);
    expect(counts.totalAccrual).toBe(0);
  });

  it("should count accrual from both transactions and accrualDocuments", () => {
    const accrualTxns = [
      createAccrualTransaction({ sessionId }),
      createAccrualTransaction({ sessionId }),
    ];
    const accrualDocs = createAccrualDocumentBatch(3, { sessionId });

    const counts = deriveLinkedCounts(accrualTxns, accrualDocs);

    expect(counts.totalCash).toBe(0);
    expect(counts.totalAccrual).toBe(5); // 2 txns + 3 docs
  });

  it("should handle mixed cash and accrual correctly", () => {
    const txns = [
      createCashTransaction({ sessionId }),
      createCashTransaction({ sessionId }),
      createAccrualTransaction({ sessionId }),
    ];
    const docs = createAccrualDocumentBatch(2, { sessionId });

    const counts = deriveLinkedCounts(txns, docs);

    expect(counts.totalCash).toBe(2);
    expect(counts.totalAccrual).toBe(3); // 1 accrual txn + 2 accrual docs
  });

  it("should return zero counts when no items are linked", () => {
    const counts = deriveLinkedCounts([], []);

    expect(counts.totalCash).toBe(0);
    expect(counts.totalAccrual).toBe(0);
  });
});

// ============================================================================
// Tests: getSessionCounts
// ============================================================================

describe("getSessionCounts: Live Counts", () => {
  it("should count cash transactions only from type=cash", () => {
    const txns = [
      createCashTransaction(),
      createCashTransaction(),
      createAccrualTransaction(),
    ];

    const counts = computeSessionCounts(txns, []);

    expect(counts.cashCount).toBe(2);
    expect(counts.accrualCount).toBe(1);
  });

  it("should include accrualDocuments in accrualCount", () => {
    const txns = [createCashTransaction()];
    const docs = [
      createTestAccrualDocument(),
      createTestAccrualDocument(),
    ];

    const counts = computeSessionCounts(txns, docs);

    expect(counts.cashCount).toBe(1);
    expect(counts.accrualCount).toBe(2);
  });

  it("should combine accrual transactions AND accrual documents", () => {
    const txns = [
      createCashTransaction(),
      createAccrualTransaction(),
    ];
    const docs = [createTestAccrualDocument()];

    const counts = computeSessionCounts(txns, docs);

    expect(counts.cashCount).toBe(1);
    expect(counts.accrualCount).toBe(2); // 1 accrual txn + 1 accrual doc
  });

  it("should return zeroes for empty session", () => {
    const counts = computeSessionCounts([], []);

    expect(counts.cashCount).toBe(0);
    expect(counts.accrualCount).toBe(0);
  });
});

// ============================================================================
// Tests: getWithStats
// ============================================================================

describe("getWithStats: Stats Computation", () => {
  it("should include accrualDocuments in accrualTransactions count", () => {
    const txns = [
      createCashTransaction({ status: "pending" }),
      createAccrualTransaction({ status: "matched" }),
    ];
    const docs = [
      createTestAccrualDocument({ status: "pending" }),
      createTestAccrualDocument({ status: "matched" }),
    ];

    const stats = computeStats([], txns, docs);

    expect(stats.cashTransactions).toBe(1);
    expect(stats.accrualTransactions).toBe(3); // 1 txn + 2 docs
    expect(stats.accrualDocuments).toBe(2);
  });

  it("should count unmatched accrual from both tables", () => {
    const txns = [
      createAccrualTransaction({ status: "pending" }),
      createAccrualTransaction({ status: "matched" }),
    ];
    const docs = [
      createTestAccrualDocument({ status: "pending" }),
      createTestAccrualDocument({ status: "matched" }),
      createTestAccrualDocument({ status: "suspense" }),
    ];

    const stats = computeStats([], txns, docs);

    // unmatched = pending (1 txn + 1 doc) + suspense (1 doc) = 3
    expect(stats.unmatchedAccrual).toBe(3);
  });

  it("should count suspense accrual from both tables", () => {
    const txns = [
      createAccrualTransaction({ status: "suspense" }),
    ];
    const docs = [
      createTestAccrualDocument({ status: "suspense" }),
      createTestAccrualDocument({ status: "pending" }),
    ];

    const stats = computeStats([], txns, docs);

    expect(stats.suspenseAccrual).toBe(2); // 1 txn + 1 doc
  });

  it("should count matches by status correctly", () => {
    const sessionId = mockId("reconciliationSessions", "s1");
    const matches = [
      createTestMatch({ sessionId, status: "pending" }),
      createTestMatch({ sessionId, status: "pending" }),
      createTestMatch({ sessionId, status: "approved" }),
      createTestMatch({ sessionId, status: "rejected" }),
    ];

    const stats = computeStats(matches, [], []);

    expect(stats.totalMatches).toBe(4);
    expect(stats.pendingMatches).toBe(2);
    expect(stats.approvedMatches).toBe(1);
    expect(stats.rejectedMatches).toBe(1);
  });

  it("should handle empty data gracefully", () => {
    const stats = computeStats([], [], []);

    expect(stats.totalMatches).toBe(0);
    expect(stats.cashTransactions).toBe(0);
    expect(stats.accrualTransactions).toBe(0);
    expect(stats.unmatchedCash).toBe(0);
    expect(stats.unmatchedAccrual).toBe(0);
    expect(stats.accrualDocuments).toBe(0);
  });
});

// ============================================================================
// Tests: Matching Gate (shouldRunMatching)
// ============================================================================

describe("Matching Gate: Both-Sides + Status Check", () => {
  it("should trigger matching when both sides exist and session is draft", () => {
    expect(shouldRunMatching({ cashCount: 10, accrualCount: 5, status: "draft" }))
      .toBe(true);
  });

  it("should NOT trigger when only cash exists", () => {
    expect(shouldRunMatching({ cashCount: 10, accrualCount: 0, status: "draft" }))
      .toBe(false);
  });

  it("should NOT trigger when only accrual exists", () => {
    expect(shouldRunMatching({ cashCount: 0, accrualCount: 5, status: "draft" }))
      .toBe(false);
  });

  it("should NOT trigger when both sides are empty", () => {
    expect(shouldRunMatching({ cashCount: 0, accrualCount: 0, status: "draft" }))
      .toBe(false);
  });

  it("should NOT trigger when session is already processing", () => {
    expect(shouldRunMatching({ cashCount: 10, accrualCount: 5, status: "processing" }))
      .toBe(false);
  });

  it("should NOT trigger when session is in review", () => {
    expect(shouldRunMatching({ cashCount: 10, accrualCount: 5, status: "review" }))
      .toBe(false);
  });

  it("should NOT trigger when session is completed", () => {
    expect(shouldRunMatching({ cashCount: 10, accrualCount: 5, status: "completed" }))
      .toBe(false);
  });

  it("should trigger with minimum counts (1 each)", () => {
    expect(shouldRunMatching({ cashCount: 1, accrualCount: 1, status: "draft" }))
      .toBe(true);
  });
});

// ============================================================================
// Tests: Session Status Reset
// ============================================================================

describe("autoCreateAndLink: Status Reset on New Data", () => {
  it("should reset review session to draft when new items are linked", () => {
    const session = createReviewSession();
    const result = shouldResetSessionStatus(session, 3);

    expect(result).toBe("draft");
  });

  it("should reset processing session to draft when new items are linked", () => {
    const session = createProcessingSession();
    const result = shouldResetSessionStatus(session, 1);

    expect(result).toBe("draft");
  });

  it("should NOT reset draft session (already draft)", () => {
    const session = createDraftSession();
    const result = shouldResetSessionStatus(session, 5);

    expect(result).toBeNull();
  });

  it("should NOT reset when no new items were linked", () => {
    const session = createReviewSession();
    const result = shouldResetSessionStatus(session, 0);

    expect(result).toBeNull();
  });

  it("should NOT reset when there is no existing session (new session created)", () => {
    const result = shouldResetSessionStatus(null, 5);

    expect(result).toBeNull();
  });
});

// ============================================================================
// Tests: End-to-End Scenarios
// ============================================================================

describe("E2E Scenario: Invoice First, Bank Statement Second", () => {
  it("should produce correct state after each upload", () => {
    // Step 1: Invoice uploaded — session created, 1 accrual doc linked
    const sessions1: ReconciliationSessionData[] = [];
    const selected1 = selectActiveSession(sessions1);
    expect(selected1).toBeNull(); // No existing session — create new

    const accrualDocs1 = [createTestAccrualDocument()];
    const counts1 = computeSessionCounts([], accrualDocs1);
    expect(counts1).toEqual({ cashCount: 0, accrualCount: 1 });
    expect(shouldRunMatching({ ...counts1, status: "draft" })).toBe(false);

    // Step 2: Bank statement uploaded — session reused, cash txns linked
    const draftSession = createDraftSession();
    const sessions2 = [draftSession];
    const selected2 = selectActiveSession(sessions2);
    expect(selected2?.status).toBe("draft");

    const cashTxns = createTransactionBatch(10, { type: "cash" });
    const counts2 = computeSessionCounts(cashTxns, accrualDocs1);
    expect(counts2).toEqual({ cashCount: 10, accrualCount: 1 });
    expect(shouldRunMatching({ ...counts2, status: "draft" })).toBe(true);
  });
});

describe("E2E Scenario: Matching Already Ran, New Upload Arrives", () => {
  it("should reset session to draft and allow re-matching", () => {
    // Session was in review after first matching run
    const reviewSession = createReviewSession({
      totalCashTransactions: 10,
      totalAccrualTransactions: 3,
    });
    const sessions = [reviewSession];

    // New upload arrives — autoCreateAndLink finds review session
    const selected = selectActiveSession(sessions);
    expect(selected?.status).toBe("review");
    expect(selected).not.toBeNull();

    // New items are linked
    const newLinked = 5;
    const resetStatus = shouldResetSessionStatus(selected, newLinked);
    expect(resetStatus).toBe("draft");

    // After reset, matching gate should trigger
    const counts = { cashCount: 10, accrualCount: 8, status: "draft" };
    expect(shouldRunMatching(counts)).toBe(true);
  });
});

describe("E2E Scenario: Concurrent Extractions (Race Condition Prevention)", () => {
  it("should NOT allow both extractions to trigger matching", () => {
    // Extraction A completes, triggers matching, sets status to processing
    const countsA = { cashCount: 10, accrualCount: 5, status: "draft" };
    expect(shouldRunMatching(countsA)).toBe(true);
    // Extraction A sets session to "processing"

    // Extraction B completes moments later, sees status = processing
    const countsB = { cashCount: 10, accrualCount: 8, status: "processing" };
    expect(shouldRunMatching(countsB)).toBe(false);
  });

  it("should NOT trigger matching on session already in review", () => {
    // Previous matching already completed
    const counts = { cashCount: 10, accrualCount: 5, status: "review" };
    expect(shouldRunMatching(counts)).toBe(false);
  });
});

describe("E2E Scenario: Multiple Companies Isolation", () => {
  it("should not mix sessions across companies", () => {
    const companyA = mockId("companies", "company_a");
    const companyB = mockId("companies", "company_b");

    const sessions = [
      createDraftSession({ companyId: companyA, _id: mockId("reconciliationSessions", "s_a") }),
      createReviewSession({ companyId: companyB, _id: mockId("reconciliationSessions", "s_b") }),
    ];

    // autoCreateAndLink filters by companyId before calling selectActiveSession
    const companyASessions = sessions.filter((s) => s.companyId === companyA);
    const selectedA = selectActiveSession(companyASessions);
    expect(selectedA?.companyId).toBe(companyA);
    expect(selectedA?.status).toBe("draft");

    const companyBSessions = sessions.filter((s) => s.companyId === companyB);
    const selectedB = selectActiveSession(companyBSessions);
    expect(selectedB?.companyId).toBe(companyB);
    expect(selectedB?.status).toBe("review");
  });
});

// ============================================================================
// Tests: Empty State Determination (Reconcile View)
// ============================================================================

type EmptyState =
  | "loading"
  | "cash-only"
  | "accrual-only"
  | "both-ready-draft"
  | "both-ready-review"
  | "empty-session"
  | "no-session";

/**
 * Mirrors the empty state determination logic in reconcile-view.tsx.
 */
function determineEmptyState(params: {
  sessionId: string | undefined;
  isSessionLoading: boolean;
  cashCount: number;
  accrualCount: number;
  sessionStatus: string | undefined;
}): EmptyState {
  const { sessionId, isSessionLoading, cashCount, accrualCount, sessionStatus } = params;

  if (isSessionLoading) return "loading";

  if (sessionId && cashCount > 0 && accrualCount === 0) return "cash-only";
  if (sessionId && cashCount === 0 && accrualCount > 0) return "accrual-only";

  if (sessionId && cashCount > 0 && accrualCount > 0) {
    return sessionStatus === "review" ? "both-ready-review" : "both-ready-draft";
  }

  if (sessionId && cashCount === 0 && accrualCount === 0) return "empty-session";

  return "no-session";
}

describe("Reconcile View: Empty State Determination", () => {
  it("should show loading while session queries are resolving", () => {
    expect(determineEmptyState({
      sessionId: "s1",
      isSessionLoading: true,
      cashCount: 0,
      accrualCount: 0,
      sessionStatus: undefined,
    })).toBe("loading");
  });

  it("should show cash-only when bank statement uploaded but no invoices", () => {
    expect(determineEmptyState({
      sessionId: "s1",
      isSessionLoading: false,
      cashCount: 15,
      accrualCount: 0,
      sessionStatus: "draft",
    })).toBe("cash-only");
  });

  it("should show accrual-only when invoices uploaded but no bank statement", () => {
    expect(determineEmptyState({
      sessionId: "s1",
      isSessionLoading: false,
      cashCount: 0,
      accrualCount: 3,
      sessionStatus: "draft",
    })).toBe("accrual-only");
  });

  it("should show both-ready-draft when matching hasn't run yet", () => {
    expect(determineEmptyState({
      sessionId: "s1",
      isSessionLoading: false,
      cashCount: 10,
      accrualCount: 5,
      sessionStatus: "draft",
    })).toBe("both-ready-draft");
  });

  it("should show both-ready-review when matching found no results", () => {
    expect(determineEmptyState({
      sessionId: "s1",
      isSessionLoading: false,
      cashCount: 10,
      accrualCount: 5,
      sessionStatus: "review",
    })).toBe("both-ready-review");
  });

  it("should show empty-session when session exists but no data linked", () => {
    expect(determineEmptyState({
      sessionId: "s1",
      isSessionLoading: false,
      cashCount: 0,
      accrualCount: 0,
      sessionStatus: "draft",
    })).toBe("empty-session");
  });

  it("should show no-session when no session ID exists", () => {
    expect(determineEmptyState({
      sessionId: undefined,
      isSessionLoading: false,
      cashCount: 0,
      accrualCount: 0,
      sessionStatus: undefined,
    })).toBe("no-session");
  });

  it("should prioritize loading over any empty state", () => {
    // Even with valid counts, loading takes precedence
    expect(determineEmptyState({
      sessionId: "s1",
      isSessionLoading: true,
      cashCount: 10,
      accrualCount: 5,
      sessionStatus: "draft",
    })).toBe("loading");
  });
});
