/**
 * Tests for useReconcileData hook
 * Tests demo mode, real mode, and data transformation logic
 * Run with: pnpm test __tests__/hooks/useReconcileData.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReconcileData } from "@/lib/use-reconcile-data";
import { useAppStore } from "@/lib/store";
import type { MatchPair, Transaction, SuspenseItem, ReconciliationSession } from "@/lib/store";

// Mock Convex hooks
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the API object
vi.mock("@/convex/_generated/api", () => ({
  api: {
    matches: {
      listBySession: "matches:listBySession",
    },
    suspenseItems: {
      listBySession: "suspenseItems:listBySession",
    },
    sessions: {
      get: "sessions:get",
    },
  },
}));

// Helper to create test data
function createTestMatch(overrides: Partial<MatchPair> = {}): MatchPair {
  return {
    id: `m-${Math.random().toString(36).substr(2, 9)}`,
    cashTransaction: {
      id: "c1",
      date: "2025-01-15",
      description: "Test cash",
      amount: 100,
      type: "cash",
      status: "matched",
    },
    accrualTransaction: {
      id: "a1",
      date: "2025-01-14",
      description: "Test accrual",
      amount: 100,
      type: "accrual",
      status: "matched",
    },
    confidence: "high",
    matchLayer: 1,
    approved: false,
    ...overrides,
  };
}

function createTestSuspenseItem(overrides: Partial<SuspenseItem> = {}): SuspenseItem {
  return {
    id: `si-${Math.random().toString(36).substr(2, 9)}`,
    sourceType: "cash",
    sourceId: "c999",
    amount: 500,
    transactionDate: "2025-01-20",
    description: "Unknown transfer",
    reason: "no_match",
    suggestedAction: "Review manually",
    status: "open",
    ...overrides,
  };
}

function createTestSession(overrides: Partial<ReconciliationSession> = {}): ReconciliationSession {
  return {
    id: "s1",
    name: "Test Session",
    createdAt: "2025-01-01",
    status: "review",
    progress: 50,
    totalCash: 10,
    totalAccrual: 8,
    matchedCount: 5,
    suspenseCount: 2,
    ...overrides,
  };
}

describe("useReconcileData", () => {
  // Reset store and mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset Zustand store to demo mode with clean data
    useAppStore.setState({
      isDemo: true,
      matches: [],
      suspenseItems: [],
      activeSession: null,
      realMatches: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("demo mode", () => {
    it("returns store data when isDemo=true", () => {
      const testMatches = [
        createTestMatch({ id: "m1", approved: false }),
        createTestMatch({ id: "m2", approved: true }),
      ];
      const testSuspense = [createTestSuspenseItem({ id: "si1" })];
      const testSession = createTestSession({ id: "demo-session" });

      useAppStore.setState({
        isDemo: true,
        matches: testMatches,
        suspenseItems: testSuspense,
        activeSession: testSession,
      });

      const { result } = renderHook(() => useReconcileData());

      expect(result.current.isDemo).toBe(true);
      expect(result.current.matches).toHaveLength(2);
      expect(result.current.isLoading).toBe(false);
    });

    it("separates pending and approved matches", () => {
      const testMatches = [
        createTestMatch({ id: "m1", approved: false }),
        createTestMatch({ id: "m2", approved: false }),
        createTestMatch({ id: "m3", approved: true }),
      ];

      useAppStore.setState({
        isDemo: true,
        matches: testMatches,
        suspenseItems: [],
        activeSession: createTestSession(),
      });

      const { result } = renderHook(() => useReconcileData());

      expect(result.current.pendingMatches).toHaveLength(2);
      expect(result.current.approvedMatches).toHaveLength(1);
      expect(result.current.counts.pending).toBe(2);
      expect(result.current.counts.approved).toBe(1);
    });

    it("includes suspense transactions", () => {
      const testSuspense = [
        createTestSuspenseItem({ id: "si1", amount: 100 }),
        createTestSuspenseItem({ id: "si2", amount: 200 }),
      ];

      useAppStore.setState({
        isDemo: true,
        matches: [],
        suspenseItems: testSuspense,
        activeSession: createTestSession(),
      });

      const { result } = renderHook(() => useReconcileData());

      expect(result.current.suspenseTransactions).toHaveLength(2);
      expect(result.current.counts.suspense).toBe(2);
      expect(result.current.suspenseTransactions[0].status).toBe("suspense");
    });

    it("returns session info from store", () => {
      const testSession = createTestSession({
        id: "my-demo-session",
        name: "January 2025 Recon"
      });

      useAppStore.setState({
        isDemo: true,
        matches: [],
        suspenseItems: [],
        activeSession: testSession,
      });

      const { result } = renderHook(() => useReconcileData());

      expect(result.current.sessionName).toBe("January 2025 Recon");
    });

    it("does not call Convex queries in demo mode", () => {
      useAppStore.setState({
        isDemo: true,
        matches: [],
        suspenseItems: [],
        activeSession: createTestSession(),
      });

      mockUseQuery.mockReturnValue(undefined);

      renderHook(() => useReconcileData("session-123" as any));

      // useQuery should be called with "skip" in demo mode
      expect(mockUseQuery).toHaveBeenCalledWith("matches:listBySession", "skip");
    });
  });

  describe("real mode", () => {
    beforeEach(() => {
      useAppStore.setState({
        isDemo: false,
        matches: [],
        suspenseItems: [],
        activeSession: null,
      });
    });

    it("uses Convex queries when isDemo=false", () => {
      mockUseQuery.mockImplementation((queryName, args) => {
        if (args === "skip") return undefined;
        if (queryName === "matches:listBySession") return [];
        if (queryName === "suspenseItems:listBySession") return [];
        if (queryName === "sessions:get") return { name: "Real Session" };
        return undefined;
      });

      const { result } = renderHook(() => useReconcileData("session-abc" as any));

      expect(result.current.isDemo).toBe(false);
    });

    it("shows loading state while fetching", () => {
      mockUseQuery.mockImplementation((queryName, args) => {
        if (args === "skip") return undefined;
        // Return undefined to simulate loading
        return undefined;
      });

      const { result } = renderHook(() => useReconcileData("session-abc" as any));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.matches).toHaveLength(0);
    });

    it("returns empty arrays when queries return no data", () => {
      mockUseQuery.mockImplementation((queryName, args) => {
        if (args === "skip") return undefined;
        if (queryName === "matches:listBySession") return [];
        if (queryName === "suspenseItems:listBySession") return [];
        if (queryName === "sessions:get") return { name: "Empty Session" };
        return undefined;
      });

      const { result } = renderHook(() => useReconcileData("session-abc" as any));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.matches).toHaveLength(0);
      expect(result.current.suspenseTransactions).toHaveLength(0);
    });

    it("skips queries when no sessionId provided", () => {
      mockUseQuery.mockReturnValue(undefined);

      renderHook(() => useReconcileData(undefined));

      // All queries should be skipped
      expect(mockUseQuery).toHaveBeenCalledWith("matches:listBySession", "skip");
      expect(mockUseQuery).toHaveBeenCalledWith("suspenseItems:listBySession", "skip");
    });
  });

  describe("data transformation", () => {
    it("converts suspense items to transaction format", () => {
      const testSuspense = [
        createTestSuspenseItem({
          id: "si1",
          transactionDate: "2025-01-15",
          description: "Unknown payment",
          amount: 1000,
          sourceType: "cash",
        }),
      ];

      useAppStore.setState({
        isDemo: true,
        matches: [],
        suspenseItems: testSuspense,
        activeSession: createTestSession(),
      });

      const { result } = renderHook(() => useReconcileData());

      const suspenseTx = result.current.suspenseTransactions[0];
      expect(suspenseTx.id).toBe("si1");
      expect(suspenseTx.date).toBe("2025-01-15");
      expect(suspenseTx.description).toBe("Unknown payment");
      expect(suspenseTx.amount).toBe(1000);
      expect(suspenseTx.type).toBe("cash");
      expect(suspenseTx.status).toBe("suspense");
    });

    it("preserves confidenceScore and matchReason", () => {
      const testMatches = [
        createTestMatch({
          id: "m1",
          confidenceScore: 85,
          matchReason: "AI semantic match based on counterparty name",
          matchLayer: 5,
        }),
      ];

      useAppStore.setState({
        isDemo: true,
        matches: testMatches,
        suspenseItems: [],
        activeSession: createTestSession(),
      });

      const { result } = renderHook(() => useReconcileData());

      const match = result.current.matches[0];
      expect(match.confidenceScore).toBe(85);
      expect(match.matchReason).toBe("AI semantic match based on counterparty name");
      expect(match.matchLayer).toBe(5);
    });

    it("correctly categorizes matches by approval status", () => {
      const testMatches = [
        createTestMatch({ id: "m1", approved: false, confidence: "high" }),
        createTestMatch({ id: "m2", approved: false, confidence: "medium" }),
        createTestMatch({ id: "m3", approved: true, confidence: "high" }),
        createTestMatch({ id: "m4", approved: true, confidence: "low" }),
      ];

      useAppStore.setState({
        isDemo: true,
        matches: testMatches,
        suspenseItems: [],
        activeSession: createTestSession(),
      });

      const { result } = renderHook(() => useReconcileData());

      expect(result.current.pendingMatches).toHaveLength(2);
      expect(result.current.approvedMatches).toHaveLength(2);
      expect(result.current.pendingMatches.every(m => !m.approved)).toBe(true);
      expect(result.current.approvedMatches.every(m => m.approved)).toBe(true);
    });
  });

  describe("counts calculation", () => {
    it("accurately counts all categories", () => {
      const testMatches = [
        createTestMatch({ id: "m1", approved: false }),
        createTestMatch({ id: "m2", approved: false }),
        createTestMatch({ id: "m3", approved: false }),
        createTestMatch({ id: "m4", approved: true }),
        createTestMatch({ id: "m5", approved: true }),
      ];
      const testSuspense = [
        createTestSuspenseItem({ id: "si1" }),
        createTestSuspenseItem({ id: "si2" }),
        createTestSuspenseItem({ id: "si3" }),
      ];

      useAppStore.setState({
        isDemo: true,
        matches: testMatches,
        suspenseItems: testSuspense,
        activeSession: createTestSession(),
      });

      const { result } = renderHook(() => useReconcileData());

      expect(result.current.counts).toEqual({
        pending: 3,
        approved: 2,
        rejected: 0,
        suspense: 3,
      });
    });

    it("returns zero counts when no data", () => {
      useAppStore.setState({
        isDemo: true,
        matches: [],
        suspenseItems: [],
        activeSession: createTestSession(),
      });

      const { result } = renderHook(() => useReconcileData());

      expect(result.current.counts).toEqual({
        pending: 0,
        approved: 0,
        rejected: 0,
        suspense: 0,
      });
    });
  });

  describe("reactivity", () => {
    it("updates when store matches change", () => {
      useAppStore.setState({
        isDemo: true,
        matches: [],
        suspenseItems: [],
        activeSession: createTestSession(),
      });

      const { result, rerender } = renderHook(() => useReconcileData());

      expect(result.current.matches).toHaveLength(0);

      // Add matches to store
      act(() => {
        useAppStore.setState({
          matches: [createTestMatch({ id: "m1" })],
        });
      });

      rerender();

      expect(result.current.matches).toHaveLength(1);
    });

    it("reacts to mode toggle", () => {
      useAppStore.setState({
        isDemo: true,
        matches: [createTestMatch({ id: "demo-match" })],
        suspenseItems: [],
        activeSession: createTestSession(),
      });

      mockUseQuery.mockReturnValue([]);

      const { result, rerender } = renderHook(() => useReconcileData());

      expect(result.current.isDemo).toBe(true);
      expect(result.current.matches).toHaveLength(1);

      // Toggle to real mode
      act(() => {
        useAppStore.setState({
          isDemo: false,
          matches: [], // Real mode starts empty
        });
      });

      rerender();

      expect(result.current.isDemo).toBe(false);
    });
  });
});
