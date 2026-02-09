/**
 * Tests for mode-aware safe hooks in lib/convex-hooks.ts
 * Tests demo mode, real mode, data transformation, and loading states
 * Run with: pnpm test __tests__/hooks/safe-hooks.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ============ MOCKS ============

// Mock store BEFORE imports
const mockUseIsDemo = vi.fn();
const mockUseSelectedCompanyId = vi.fn();
const mockUseStoreAccrualDocuments = vi.fn();
const mockUseStoreSuspenseItems = vi.fn();
const mockUseStoreCashTransactions = vi.fn();
const mockUseStoreMatches = vi.fn();
const mockUseStoreSessions = vi.fn();
const mockUseStoreActiveSession = vi.fn();

vi.mock("@/lib/store", () => ({
  useIsDemo: () => mockUseIsDemo(),
  useSelectedCompanyId: () => mockUseSelectedCompanyId(),
  useAccrualDocuments: () => mockUseStoreAccrualDocuments(),
  useSuspenseItems: () => mockUseStoreSuspenseItems(),
  useCashTransactions: () => mockUseStoreCashTransactions(),
  useMatches: () => mockUseStoreMatches(),
  useSessions: () => mockUseStoreSessions(),
  useActiveSession: () => mockUseStoreActiveSession(),
}));

// Mock Convex hooks
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  useCallback: (fn: unknown) => fn,
}));

// Mock the API object
vi.mock("@/convex/_generated/api", () => ({
  api: {
    accrualDocuments: {
      listByCompany: "accrualDocuments:listByCompany",
    },
    suspenseItems: {
      listByCompany: "suspenseItems:listByCompany",
    },
    transactions: {
      listByCompany: "transactions:listByCompany",
    },
    sessions: {
      listByCompany: "sessions:listByCompany",
    },
  },
}));

// Import AFTER mocks
import {
  useAccrualDocumentsSafe,
  useSuspenseItemsSafe,
  useCashTransactionsSafe,
  useMatchesSafe,
  useSessionsSafe,
  useActiveSessionSafe,
  useAccrualDocumentsCombined,
  useSuspenseItemsCombined,
  useCashTransactionsCombined,
  useSessionsCombined,
} from "@/lib/convex-hooks";

// ============ TEST DATA HELPERS ============

function createDemoAccrualDoc(overrides = {}) {
  return {
    id: "doc-demo-1",
    docType: "invoice" as const,
    docNumber: "INV-001",
    docDate: "2025-01-15",
    dueDate: "2025-02-15",
    counterparty: "Acme Corp",
    amount: 1000,
    taxAmount: 60,
    description: "Consulting services",
    status: "pending" as const,
    matchId: undefined,
    ...overrides,
  };
}

function createConvexAccrualDoc(overrides = {}) {
  return {
    _id: "conv-doc-1" as any,
    _creationTime: Date.now(),
    companyId: "company-1" as any,
    docType: "invoice" as const,
    docNumber: "INV-002",
    docDate: "2025-01-20",
    dueDate: "2025-02-20",
    counterparty: "BigCo",
    amount: 2500,
    taxAmount: 150,
    description: "Product delivery",
    status: "pending" as const,
    matchId: undefined,
    ...overrides,
  };
}

function createDemoSuspenseItem(overrides = {}) {
  return {
    id: "si-demo-1",
    sourceType: "cash" as const,
    sourceId: "tx-1",
    amount: 500,
    transactionDate: "2025-01-18",
    description: "Unknown transfer",
    reason: "no_match" as const,
    suggestedAction: "Review manually",
    status: "open" as const,
    resolutionNotes: undefined,
    ...overrides,
  };
}

function createConvexSuspenseItem(overrides = {}) {
  return {
    _id: "conv-si-1" as any,
    _creationTime: Date.now(),
    companyId: "company-1" as any,
    sessionId: "session-1" as any,
    sourceType: "cash" as const,
    sourceId: "tx-conv-1",
    amount: 750,
    transactionDate: "2025-01-22",
    description: "Wire transfer",
    reason: "low_confidence" as const,
    suggestedAction: "Verify counterparty",
    status: "queried" as const,
    resolutionNotes: undefined,
    ...overrides,
  };
}

function createDemoTransaction(overrides = {}) {
  return {
    id: "tx-demo-1",
    date: "2025-01-15",
    description: "Payment received",
    amount: 1500,
    type: "cash" as const,
    status: "pending" as const,
    matchId: undefined,
    category: "revenue",
    ...overrides,
  };
}

function createConvexTransaction(overrides = {}) {
  return {
    _id: "conv-tx-1" as any,
    _creationTime: Date.now(),
    companyId: "company-1" as any,
    sessionId: undefined,
    date: "2025-01-20",
    description: "Wire transfer in",
    amount: 3000,
    type: "cash" as const,
    status: "pending" as const,
    matchId: undefined,
    category: "inflow",
    ...overrides,
  };
}

function createDemoSession(overrides = {}) {
  return {
    id: "session-demo-1",
    name: "January 2025 Recon",
    createdAt: "2025-01-01",
    status: "review" as const,
    progress: 75,
    totalCash: 10,
    totalAccrual: 8,
    matchedCount: 6,
    suspenseCount: 2,
    ...overrides,
  };
}

function createConvexSession(overrides = {}) {
  return {
    _id: "conv-session-1" as any,
    _creationTime: Date.now(),
    companyId: "company-1" as any,
    name: "Real Mode Session",
    status: "processing" as const,
    progress: 50,
    matchedCount: 3,
    suspenseCount: 1,
    ...overrides,
  };
}

// ============ TEST SETUP ============

describe("Safe Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default to demo mode
    mockUseIsDemo.mockReturnValue(true);
    mockUseSelectedCompanyId.mockReturnValue(null);

    // Default empty store data
    mockUseStoreAccrualDocuments.mockReturnValue([]);
    mockUseStoreSuspenseItems.mockReturnValue([]);
    mockUseStoreCashTransactions.mockReturnValue([]);
    mockUseStoreMatches.mockReturnValue([]);
    mockUseStoreSessions.mockReturnValue([]);
    mockUseStoreActiveSession.mockReturnValue(null);

    // Default Convex query behavior (skip)
    mockUseQuery.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============ useAccrualDocumentsSafe TESTS ============

  describe("useAccrualDocumentsSafe", () => {
    describe("demo mode", () => {
      it("returns demo data from store", () => {
        const demoData = [createDemoAccrualDoc()];
        mockUseStoreAccrualDocuments.mockReturnValue(demoData);

        const { result } = renderHook(() => useAccrualDocumentsSafe());

        expect(result.current).toHaveLength(1);
        expect(result.current[0].id).toBe("doc-demo-1");
      });

      it("does not query Convex", () => {
        mockUseStoreAccrualDocuments.mockReturnValue([createDemoAccrualDoc()]);

        renderHook(() => useAccrualDocumentsSafe());

        // Convex query should be called with undefined (skip)
        expect(mockUseQuery).toHaveBeenCalledWith(
          "accrualDocuments:listByCompany",
          "skip"
        );
      });

      it("returns empty array when store is empty", () => {
        mockUseStoreAccrualDocuments.mockReturnValue([]);

        const { result } = renderHook(() => useAccrualDocumentsSafe());

        expect(result.current).toEqual([]);
      });
    });

    describe("real mode", () => {
      beforeEach(() => {
        mockUseIsDemo.mockReturnValue(false);
        mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      });

      it("queries Convex with companyId", () => {
        mockUseQuery.mockReturnValue([createConvexAccrualDoc()]);

        renderHook(() => useAccrualDocumentsSafe());

        expect(mockUseQuery).toHaveBeenCalledWith(
          "accrualDocuments:listByCompany",
          { companyId: "company-1", status: undefined }
        );
      });

      it("returns empty array while loading", () => {
        mockUseQuery.mockReturnValue(undefined);

        const { result } = renderHook(() => useAccrualDocumentsSafe());

        expect(result.current).toEqual([]);
      });

      it("transforms Convex data to store format", () => {
        const convexDoc = createConvexAccrualDoc();
        mockUseQuery.mockReturnValue([convexDoc]);

        const { result } = renderHook(() => useAccrualDocumentsSafe());

        expect(result.current[0]).toEqual({
          id: convexDoc._id,
          docType: convexDoc.docType,
          docNumber: convexDoc.docNumber,
          docDate: convexDoc.docDate,
          dueDate: convexDoc.dueDate,
          counterparty: convexDoc.counterparty,
          amount: convexDoc.amount,
          taxAmount: convexDoc.taxAmount,
          description: convexDoc.description,
          status: convexDoc.status,
          matchId: convexDoc.matchId,
        });
      });

      it("handles null companyId gracefully", () => {
        mockUseSelectedCompanyId.mockReturnValue(null);

        renderHook(() => useAccrualDocumentsSafe());

        expect(mockUseQuery).toHaveBeenCalledWith(
          "accrualDocuments:listByCompany",
          "skip"
        );
      });
    });

    describe("data transformation", () => {
      it("maps _id to id", () => {
        mockUseIsDemo.mockReturnValue(false);
        mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
        mockUseQuery.mockReturnValue([
          createConvexAccrualDoc({ _id: "custom-id" }),
        ]);

        const { result } = renderHook(() => useAccrualDocumentsSafe());

        expect(result.current[0].id).toBe("custom-id");
      });

      it("preserves all required fields", () => {
        mockUseIsDemo.mockReturnValue(false);
        mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
        const convexDoc = createConvexAccrualDoc();
        mockUseQuery.mockReturnValue([convexDoc]);

        const { result } = renderHook(() => useAccrualDocumentsSafe());

        const doc = result.current[0];
        expect(doc.docType).toBe(convexDoc.docType);
        expect(doc.docNumber).toBe(convexDoc.docNumber);
        expect(doc.docDate).toBe(convexDoc.docDate);
        expect(doc.dueDate).toBe(convexDoc.dueDate);
        expect(doc.counterparty).toBe(convexDoc.counterparty);
        expect(doc.amount).toBe(convexDoc.amount);
        expect(doc.taxAmount).toBe(convexDoc.taxAmount);
        expect(doc.description).toBe(convexDoc.description);
        expect(doc.status).toBe(convexDoc.status);
      });

      it("handles optional fields correctly", () => {
        mockUseIsDemo.mockReturnValue(false);
        mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
        const convexDoc = createConvexAccrualDoc({
          matchId: undefined,
          description: undefined,
        });
        mockUseQuery.mockReturnValue([convexDoc]);

        const { result } = renderHook(() => useAccrualDocumentsSafe());

        expect(result.current[0].matchId).toBeUndefined();
        expect(result.current[0].description).toBeUndefined();
      });
    });
  });

  // ============ useSuspenseItemsSafe TESTS ============

  describe("useSuspenseItemsSafe", () => {
    describe("demo mode", () => {
      it("returns demo data from store", () => {
        const demoData = [createDemoSuspenseItem()];
        mockUseStoreSuspenseItems.mockReturnValue(demoData);

        const { result } = renderHook(() => useSuspenseItemsSafe());

        expect(result.current).toHaveLength(1);
        expect(result.current[0].id).toBe("si-demo-1");
      });

      it("does not query Convex", () => {
        mockUseStoreSuspenseItems.mockReturnValue([]);

        renderHook(() => useSuspenseItemsSafe());

        expect(mockUseQuery).toHaveBeenCalledWith(
          "suspenseItems:listByCompany",
          "skip"
        );
      });
    });

    describe("real mode", () => {
      beforeEach(() => {
        mockUseIsDemo.mockReturnValue(false);
        mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      });

      it("queries Convex with companyId", () => {
        mockUseQuery.mockReturnValue([]);

        renderHook(() => useSuspenseItemsSafe());

        expect(mockUseQuery).toHaveBeenCalledWith(
          "suspenseItems:listByCompany",
          { companyId: "company-1", status: undefined }
        );
      });

      it("transforms Convex data to store format", () => {
        const convexItem = createConvexSuspenseItem();
        mockUseQuery.mockReturnValue([convexItem]);

        const { result } = renderHook(() => useSuspenseItemsSafe());

        expect(result.current[0]).toEqual({
          id: convexItem._id,
          sourceType: convexItem.sourceType,
          sourceId: convexItem.sourceId,
          amount: convexItem.amount,
          transactionDate: convexItem.transactionDate,
          description: convexItem.description,
          reason: convexItem.reason,
          suggestedAction: convexItem.suggestedAction,
          status: convexItem.status,
          resolutionNotes: convexItem.resolutionNotes,
        });
      });
    });
  });

  // ============ useCashTransactionsSafe TESTS ============

  describe("useCashTransactionsSafe", () => {
    describe("demo mode", () => {
      it("returns demo data from store", () => {
        const demoData = [createDemoTransaction()];
        mockUseStoreCashTransactions.mockReturnValue(demoData);

        const { result } = renderHook(() => useCashTransactionsSafe());

        expect(result.current).toHaveLength(1);
        expect(result.current[0].id).toBe("tx-demo-1");
      });
    });

    describe("real mode", () => {
      beforeEach(() => {
        mockUseIsDemo.mockReturnValue(false);
        mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      });

      it("queries Convex with type filter", () => {
        mockUseQuery.mockReturnValue([]);

        renderHook(() => useCashTransactionsSafe());

        expect(mockUseQuery).toHaveBeenCalledWith(
          "transactions:listByCompany",
          expect.objectContaining({ type: "cash" })
        );
      });

      it("transforms Convex data to store format", () => {
        const convexTx = createConvexTransaction();
        mockUseQuery.mockReturnValue([convexTx]);

        const { result } = renderHook(() => useCashTransactionsSafe());

        expect(result.current[0]).toEqual({
          id: convexTx._id,
          date: convexTx.date,
          description: convexTx.description,
          amount: convexTx.amount,
          type: convexTx.type,
          status: convexTx.status,
          matchId: convexTx.matchId,
          category: convexTx.category,
        });
      });
    });
  });

  // ============ useMatchesSafe TESTS ============

  describe("useMatchesSafe", () => {
    describe("demo mode", () => {
      it("returns demo data from store", () => {
        const demoMatches = [
          {
            id: "match-1",
            cashTransaction: createDemoTransaction(),
            accrualTransaction: createDemoTransaction({ type: "accrual" }),
            confidence: "high" as const,
            matchLayer: 1,
            approved: false,
          },
        ];
        mockUseStoreMatches.mockReturnValue(demoMatches);

        const { result } = renderHook(() => useMatchesSafe());

        expect(result.current).toHaveLength(1);
        expect(result.current[0].id).toBe("match-1");
      });
    });

    describe("real mode", () => {
      it("returns empty array (matches are session-based)", () => {
        mockUseIsDemo.mockReturnValue(false);

        const { result } = renderHook(() => useMatchesSafe());

        expect(result.current).toEqual([]);
      });
    });
  });

  // ============ useSessionsSafe TESTS ============

  describe("useSessionsSafe", () => {
    describe("demo mode", () => {
      it("returns demo data from store", () => {
        const demoData = [createDemoSession()];
        mockUseStoreSessions.mockReturnValue(demoData);

        const { result } = renderHook(() => useSessionsSafe());

        expect(result.current).toHaveLength(1);
        expect(result.current[0].id).toBe("session-demo-1");
      });
    });

    describe("real mode", () => {
      beforeEach(() => {
        mockUseIsDemo.mockReturnValue(false);
        mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      });

      it("queries Convex with companyId", () => {
        mockUseQuery.mockReturnValue([]);

        renderHook(() => useSessionsSafe());

        expect(mockUseQuery).toHaveBeenCalledWith(
          "sessions:listByCompany",
          { companyId: "company-1", status: undefined }
        );
      });

      it("transforms Convex data to store format", () => {
        const convexSession = createConvexSession();
        mockUseQuery.mockReturnValue([convexSession]);

        const { result } = renderHook(() => useSessionsSafe());

        expect(result.current[0].id).toBe(convexSession._id);
        expect(result.current[0].name).toBe(convexSession.name);
        expect(result.current[0].status).toBe(convexSession.status);
        expect(result.current[0].progress).toBe(convexSession.progress);
        expect(result.current[0].matchedCount).toBe(convexSession.matchedCount);
        expect(result.current[0].suspenseCount).toBe(convexSession.suspenseCount);
      });

      it("formats createdAt from _creationTime", () => {
        const convexSession = createConvexSession({
          _creationTime: new Date("2025-01-15T12:00:00Z").getTime(),
        });
        mockUseQuery.mockReturnValue([convexSession]);

        const { result } = renderHook(() => useSessionsSafe());

        expect(result.current[0].createdAt).toBe("2025-01-15");
      });
    });
  });

  // ============ useActiveSessionSafe TESTS ============

  describe("useActiveSessionSafe", () => {
    describe("demo mode", () => {
      it("returns active session from store", () => {
        const activeSession = createDemoSession({ id: "active-1" });
        mockUseStoreActiveSession.mockReturnValue(activeSession);

        const { result } = renderHook(() => useActiveSessionSafe());

        expect(result.current?.id).toBe("active-1");
      });

      it("returns null when no active session", () => {
        mockUseStoreActiveSession.mockReturnValue(null);

        const { result } = renderHook(() => useActiveSessionSafe());

        expect(result.current).toBeNull();
      });
    });

    describe("real mode", () => {
      it("returns null (active session tracked via URL)", () => {
        mockUseIsDemo.mockReturnValue(false);

        const { result } = renderHook(() => useActiveSessionSafe());

        expect(result.current).toBeNull();
      });
    });
  });
});

// ============ WITH-STATE HOOK TESTS ============

describe("Combined Hooks (with loading state)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsDemo.mockReturnValue(true);
    mockUseSelectedCompanyId.mockReturnValue(null);
    mockUseStoreAccrualDocuments.mockReturnValue([]);
    mockUseStoreSuspenseItems.mockReturnValue([]);
    mockUseStoreCashTransactions.mockReturnValue([]);
    mockUseStoreSessions.mockReturnValue([]);
    mockUseQuery.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useAccrualDocumentsCombined", () => {
    it("returns isLoading=false in demo mode", () => {
      mockUseStoreAccrualDocuments.mockReturnValue([createDemoAccrualDoc()]);

      const { result } = renderHook(() => useAccrualDocumentsCombined());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(1);
    });

    it("returns isLoading=true while loading in real mode", () => {
      mockUseIsDemo.mockReturnValue(false);
      mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useAccrualDocumentsCombined());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toEqual([]);
    });

    it("returns isLoading=false when data loaded in real mode", () => {
      mockUseIsDemo.mockReturnValue(false);
      mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      mockUseQuery.mockReturnValue([createConvexAccrualDoc()]);

      const { result } = renderHook(() => useAccrualDocumentsCombined());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useSuspenseItemsCombined", () => {
    it("returns isLoading=false in demo mode", () => {
      mockUseStoreSuspenseItems.mockReturnValue([createDemoSuspenseItem()]);

      const { result } = renderHook(() => useSuspenseItemsCombined());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(1);
    });

    it("returns isLoading=true while loading in real mode", () => {
      mockUseIsDemo.mockReturnValue(false);
      mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useSuspenseItemsCombined());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useCashTransactionsCombined", () => {
    it("returns isLoading=false in demo mode", () => {
      mockUseStoreCashTransactions.mockReturnValue([createDemoTransaction()]);

      const { result } = renderHook(() => useCashTransactionsCombined());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(1);
    });

    it("returns isLoading=true while loading in real mode", () => {
      mockUseIsDemo.mockReturnValue(false);
      mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useCashTransactionsCombined());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useSessionsCombined", () => {
    it("returns isLoading=false in demo mode", () => {
      mockUseStoreSessions.mockReturnValue([createDemoSession()]);

      const { result } = renderHook(() => useSessionsCombined());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toHaveLength(1);
    });

    it("returns isLoading=true while loading in real mode", () => {
      mockUseIsDemo.mockReturnValue(false);
      mockUseSelectedCompanyId.mockReturnValue("company-1" as any);
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useSessionsCombined());

      expect(result.current.isLoading).toBe(true);
    });
  });
});
