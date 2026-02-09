/**
 * Extraction Queue Tests
 *
 * Tests for batch document extraction queue including:
 * - Queue creation with priority
 * - Atomic item claiming
 * - Progress tracking
 * - Queue cancellation
 * - Completion time estimation
 * - Cross-company validation
 * - Retry logic
 * - DLQ management
 *
 * @module convex/__tests__/extractionQueue.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Queue Creation Tests
// ============================================================================

describe("Queue Creation", () => {
  interface QueueConfig {
    companyId: string;
    userId: string;
    documentIds: string[];
    batchName?: string;
    priority?: number;
  }

  const createQueue = (config: QueueConfig) => {
    return {
      _id: `queue_${Date.now()}`,
      companyId: config.companyId,
      userId: config.userId,
      batchName: config.batchName,
      status: "pending" as const,
      totalDocuments: config.documentIds.length,
      completedCount: 0,
      failedCount: 0,
      currentPosition: 0,
      priority: config.priority ?? 0,
      isPaused: false,
      createdAt: Date.now(),
    };
  };

  it("should create queue with correct initial state", () => {
    const queue = createQueue({
      companyId: "company_1",
      userId: "user_1",
      documentIds: ["doc_1", "doc_2", "doc_3"],
      batchName: "January Statements",
    });

    expect(queue.status).toBe("pending");
    expect(queue.totalDocuments).toBe(3);
    expect(queue.completedCount).toBe(0);
    expect(queue.failedCount).toBe(0);
    expect(queue.currentPosition).toBe(0);
  });

  it("should set default priority to 0 (normal)", () => {
    const queue = createQueue({
      companyId: "company_1",
      userId: "user_1",
      documentIds: ["doc_1"],
    });

    expect(queue.priority).toBe(0);
  });

  it("should allow high priority (10)", () => {
    const queue = createQueue({
      companyId: "company_1",
      userId: "user_1",
      documentIds: ["doc_1"],
      priority: 10,
    });

    expect(queue.priority).toBe(10);
  });

  it("should initialize isPaused to false", () => {
    const queue = createQueue({
      companyId: "company_1",
      userId: "user_1",
      documentIds: ["doc_1"],
    });

    expect(queue.isPaused).toBe(false);
  });
});

// ============================================================================
// Queue Priority Ordering Tests
// ============================================================================

describe("Queue Priority Ordering", () => {
  interface Queue {
    _id: string;
    priority: number;
    createdAt: number;
    status: "pending" | "processing" | "completed";
  }

  const getNextQueue = (queues: Queue[]): Queue | null => {
    const pending = queues.filter((q) => q.status === "pending");
    if (pending.length === 0) return null;

    // Sort by priority DESC, then createdAt ASC (FIFO within priority)
    pending.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.createdAt - b.createdAt; // Earlier first (FIFO)
    });

    return pending[0];
  };

  it("should select higher priority queue first", () => {
    const queues: Queue[] = [
      { _id: "q1", priority: 0, createdAt: 1000, status: "pending" },
      { _id: "q2", priority: 10, createdAt: 2000, status: "pending" },
    ];

    const next = getNextQueue(queues);
    expect(next?._id).toBe("q2"); // Higher priority
  });

  it("should use FIFO within same priority", () => {
    const queues: Queue[] = [
      { _id: "q1", priority: 0, createdAt: 2000, status: "pending" },
      { _id: "q2", priority: 0, createdAt: 1000, status: "pending" },
      { _id: "q3", priority: 0, createdAt: 3000, status: "pending" },
    ];

    const next = getNextQueue(queues);
    expect(next?._id).toBe("q2"); // Earliest created
  });

  it("should skip non-pending queues", () => {
    const queues: Queue[] = [
      { _id: "q1", priority: 10, createdAt: 1000, status: "processing" },
      { _id: "q2", priority: 0, createdAt: 2000, status: "pending" },
    ];

    const next = getNextQueue(queues);
    expect(next?._id).toBe("q2");
  });

  it("should return null when no pending queues", () => {
    const queues: Queue[] = [
      { _id: "q1", priority: 0, createdAt: 1000, status: "completed" },
      { _id: "q2", priority: 0, createdAt: 2000, status: "processing" },
    ];

    const next = getNextQueue(queues);
    expect(next).toBeNull();
  });
});

// ============================================================================
// Atomic Item Claiming Tests
// ============================================================================

describe("Atomic Item Claiming", () => {
  interface QueueItem {
    _id: string;
    queueId: string;
    documentId: string;
    position: number;
    status: "pending" | "processing" | "completed" | "failed" | "skipped";
    startedAt?: number;
  }

  // Simulates atomic claim operation
  const claimItem = (items: QueueItem[], queueId: string): QueueItem | null => {
    const pendingItem = items.find(
      (item) => item.queueId === queueId && item.status === "pending"
    );

    if (!pendingItem) return null;

    // Atomically update status
    pendingItem.status = "processing";
    pendingItem.startedAt = Date.now();

    return { ...pendingItem };
  };

  it("should claim first pending item", () => {
    const items: QueueItem[] = [
      { _id: "i1", queueId: "q1", documentId: "d1", position: 0, status: "pending" },
      { _id: "i2", queueId: "q1", documentId: "d2", position: 1, status: "pending" },
    ];

    const claimed = claimItem(items, "q1");

    expect(claimed?._id).toBe("i1");
    expect(claimed?.status).toBe("processing");
    expect(claimed?.startedAt).toBeDefined();
  });

  it("should return null when no pending items", () => {
    const items: QueueItem[] = [
      { _id: "i1", queueId: "q1", documentId: "d1", position: 0, status: "completed" },
      { _id: "i2", queueId: "q1", documentId: "d2", position: 1, status: "failed" },
    ];

    const claimed = claimItem(items, "q1");
    expect(claimed).toBeNull();
  });

  it("should not claim items from different queue", () => {
    const items: QueueItem[] = [
      { _id: "i1", queueId: "q2", documentId: "d1", position: 0, status: "pending" },
    ];

    const claimed = claimItem(items, "q1");
    expect(claimed).toBeNull();
  });

  it("should prevent double-claiming (race condition prevention)", () => {
    const items: QueueItem[] = [
      { _id: "i1", queueId: "q1", documentId: "d1", position: 0, status: "pending" },
    ];

    // First claim
    const claim1 = claimItem(items, "q1");
    expect(claim1?._id).toBe("i1");

    // Second claim should find no pending items
    const claim2 = claimItem(items, "q1");
    expect(claim2).toBeNull();
  });
});

// ============================================================================
// Progress Tracking Tests
// ============================================================================

describe("Progress Tracking", () => {
  interface QueueProgress {
    totalDocuments: number;
    completedCount: number;
    failedCount: number;
    currentPosition: number;
    avgProcessingTimeMs?: number;
  }

  const calculateProgress = (progress: QueueProgress): number => {
    if (progress.totalDocuments === 0) return 0;
    const processed = progress.completedCount + progress.failedCount;
    return Math.round((processed / progress.totalDocuments) * 100);
  };

  const estimateRemainingTime = (progress: QueueProgress): number | null => {
    if (!progress.avgProcessingTimeMs) return null;

    const remaining =
      progress.totalDocuments - progress.completedCount - progress.failedCount;
    if (remaining <= 0) return 0;

    return Math.ceil((remaining * progress.avgProcessingTimeMs) / 1000);
  };

  it("should calculate correct progress percentage", () => {
    const progress: QueueProgress = {
      totalDocuments: 10,
      completedCount: 5,
      failedCount: 1,
      currentPosition: 6,
    };

    expect(calculateProgress(progress)).toBe(60);
  });

  it("should return 0% for empty queue", () => {
    const progress: QueueProgress = {
      totalDocuments: 0,
      completedCount: 0,
      failedCount: 0,
      currentPosition: 0,
    };

    expect(calculateProgress(progress)).toBe(0);
  });

  it("should return 100% when all complete", () => {
    const progress: QueueProgress = {
      totalDocuments: 10,
      completedCount: 10,
      failedCount: 0,
      currentPosition: 10,
    };

    expect(calculateProgress(progress)).toBe(100);
  });

  it("should include failed documents in progress", () => {
    const progress: QueueProgress = {
      totalDocuments: 10,
      completedCount: 5,
      failedCount: 5,
      currentPosition: 10,
    };

    expect(calculateProgress(progress)).toBe(100);
  });

  it("should estimate remaining time based on avg processing time", () => {
    const progress: QueueProgress = {
      totalDocuments: 10,
      completedCount: 5,
      failedCount: 0,
      currentPosition: 5,
      avgProcessingTimeMs: 10000, // 10 seconds per doc
    };

    const remaining = estimateRemainingTime(progress);
    expect(remaining).toBe(50); // 5 docs * 10s = 50 seconds
  });

  it("should return null when no avg time available", () => {
    const progress: QueueProgress = {
      totalDocuments: 10,
      completedCount: 5,
      failedCount: 0,
      currentPosition: 5,
    };

    expect(estimateRemainingTime(progress)).toBeNull();
  });
});

// ============================================================================
// Queue Cancellation Tests
// ============================================================================

describe("Queue Cancellation", () => {
  interface Queue {
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    completedAt?: number;
  }

  interface QueueItem {
    status: "pending" | "processing" | "completed" | "failed" | "skipped";
  }

  const canCancel = (queue: Queue): boolean => {
    return queue.status === "pending" || queue.status === "processing";
  };

  const cancelQueue = (
    queue: Queue,
    items: QueueItem[]
  ): { queue: Queue; items: QueueItem[] } => {
    if (!canCancel(queue)) {
      return { queue, items };
    }

    // Update queue status
    const updatedQueue: Queue = {
      ...queue,
      status: "cancelled",
      completedAt: Date.now(),
    };

    // Skip all pending items
    const updatedItems = items.map((item) => ({
      ...item,
      status: item.status === "pending" ? ("skipped" as const) : item.status,
    }));

    return { queue: updatedQueue, items: updatedItems };
  };

  it("should cancel pending queue", () => {
    const queue: Queue = { status: "pending" };
    const items: QueueItem[] = [
      { status: "pending" },
      { status: "pending" },
    ];

    const result = cancelQueue(queue, items);

    expect(result.queue.status).toBe("cancelled");
    expect(result.items.every((i) => i.status === "skipped")).toBe(true);
  });

  it("should cancel processing queue", () => {
    const queue: Queue = { status: "processing" };
    const items: QueueItem[] = [
      { status: "completed" },
      { status: "processing" },
      { status: "pending" },
    ];

    const result = cancelQueue(queue, items);

    expect(result.queue.status).toBe("cancelled");
    expect(result.items[0].status).toBe("completed"); // Already done
    expect(result.items[1].status).toBe("processing"); // In progress
    expect(result.items[2].status).toBe("skipped"); // Was pending
  });

  it("should not cancel completed queue", () => {
    const queue: Queue = { status: "completed", completedAt: 1000 };
    const items: QueueItem[] = [];

    const result = cancelQueue(queue, items);

    expect(result.queue.status).toBe("completed"); // Unchanged
  });

  it("should set completedAt on cancellation", () => {
    const queue: Queue = { status: "pending" };
    const items: QueueItem[] = [];

    const result = cancelQueue(queue, items);

    expect(result.queue.completedAt).toBeDefined();
  });
});

// ============================================================================
// Cross-Company Validation Tests
// ============================================================================

describe("Cross-Company Validation", () => {
  interface Document {
    _id: string;
    companyId: string;
  }

  const validateDocumentsForCompany = (
    documents: Document[],
    companyId: string
  ): { valid: boolean; invalidDocs: string[] } => {
    const invalidDocs: string[] = [];

    for (const doc of documents) {
      if (doc.companyId !== companyId) {
        invalidDocs.push(doc._id);
      }
    }

    return {
      valid: invalidDocs.length === 0,
      invalidDocs,
    };
  };

  it("should pass when all documents belong to company", () => {
    const documents: Document[] = [
      { _id: "d1", companyId: "company_1" },
      { _id: "d2", companyId: "company_1" },
    ];

    const result = validateDocumentsForCompany(documents, "company_1");

    expect(result.valid).toBe(true);
    expect(result.invalidDocs).toHaveLength(0);
  });

  it("should fail when document belongs to different company", () => {
    const documents: Document[] = [
      { _id: "d1", companyId: "company_1" },
      { _id: "d2", companyId: "company_2" }, // Wrong company!
    ];

    const result = validateDocumentsForCompany(documents, "company_1");

    expect(result.valid).toBe(false);
    expect(result.invalidDocs).toContain("d2");
  });

  it("should detect all invalid documents", () => {
    const documents: Document[] = [
      { _id: "d1", companyId: "company_1" },
      { _id: "d2", companyId: "company_2" },
      { _id: "d3", companyId: "company_3" },
    ];

    const result = validateDocumentsForCompany(documents, "company_1");

    expect(result.invalidDocs).toHaveLength(2);
    expect(result.invalidDocs).toContain("d2");
    expect(result.invalidDocs).toContain("d3");
  });
});

// ============================================================================
// Retry Logic Tests
// ============================================================================

describe("Retry Logic", () => {
  interface QueueItem {
    _id: string;
    status: "pending" | "processing" | "completed" | "failed" | "skipped";
    retryCount: number;
    maxRetries: number;
    lastError?: string;
    nextRetryAt?: number;
    isDLQ: boolean;
  }

  const DEFAULT_MAX_RETRIES = 3;
  const BACKOFF_BASE_MS = 5000; // 5 seconds

  const calculateBackoff = (retryCount: number): number => {
    // Exponential backoff: 5s, 10s, 20s, 40s...
    return BACKOFF_BASE_MS * Math.pow(2, retryCount);
  };

  const shouldRetry = (item: QueueItem): boolean => {
    return item.status === "failed" && item.retryCount < item.maxRetries;
  };

  const scheduleRetry = (
    item: QueueItem,
    errorMessage: string
  ): QueueItem => {
    if (!shouldRetry(item)) {
      // Move to DLQ
      return {
        ...item,
        status: "failed",
        isDLQ: true,
        lastError: errorMessage,
      };
    }

    const backoffMs = calculateBackoff(item.retryCount);

    return {
      ...item,
      status: "pending",
      retryCount: item.retryCount + 1,
      lastError: errorMessage,
      nextRetryAt: Date.now() + backoffMs,
      isDLQ: false,
    };
  };

  it("should calculate exponential backoff", () => {
    expect(calculateBackoff(0)).toBe(5000); // 5s
    expect(calculateBackoff(1)).toBe(10000); // 10s
    expect(calculateBackoff(2)).toBe(20000); // 20s
    expect(calculateBackoff(3)).toBe(40000); // 40s
  });

  it("should allow retry when under max retries", () => {
    const item: QueueItem = {
      _id: "i1",
      status: "failed",
      retryCount: 1,
      maxRetries: 3,
      isDLQ: false,
    };

    expect(shouldRetry(item)).toBe(true);
  });

  it("should not retry when at max retries", () => {
    const item: QueueItem = {
      _id: "i1",
      status: "failed",
      retryCount: 3,
      maxRetries: 3,
      isDLQ: false,
    };

    expect(shouldRetry(item)).toBe(false);
  });

  it("should schedule retry with backoff", () => {
    const item: QueueItem = {
      _id: "i1",
      status: "failed",
      retryCount: 0,
      maxRetries: 3,
      isDLQ: false,
    };

    const result = scheduleRetry(item, "Connection timeout");

    expect(result.status).toBe("pending");
    expect(result.retryCount).toBe(1);
    expect(result.lastError).toBe("Connection timeout");
    expect(result.nextRetryAt).toBeDefined();
    expect(result.isDLQ).toBe(false);
  });

  it("should move to DLQ when retries exhausted", () => {
    const item: QueueItem = {
      _id: "i1",
      status: "failed",
      retryCount: 3,
      maxRetries: 3,
      isDLQ: false,
    };

    const result = scheduleRetry(item, "Permanent failure");

    expect(result.status).toBe("failed");
    expect(result.isDLQ).toBe(true);
    expect(result.lastError).toBe("Permanent failure");
  });

  it("should increment retry count on each retry", () => {
    let item: QueueItem = {
      _id: "i1",
      status: "failed",
      retryCount: 0,
      maxRetries: 3,
      isDLQ: false,
    };

    // First retry
    item = scheduleRetry(item, "Error 1");
    item.status = "failed";
    expect(item.retryCount).toBe(1);

    // Second retry
    item = scheduleRetry(item, "Error 2");
    item.status = "failed";
    expect(item.retryCount).toBe(2);

    // Third retry
    item = scheduleRetry(item, "Error 3");
    item.status = "failed";
    expect(item.retryCount).toBe(3);

    // Fourth attempt goes to DLQ
    item = scheduleRetry(item, "Error 4");
    expect(item.isDLQ).toBe(true);
  });
});

// ============================================================================
// DLQ (Dead Letter Queue) Tests
// ============================================================================

describe("Dead Letter Queue", () => {
  interface QueueItem {
    _id: string;
    queueId: string;
    documentId: string;
    status: string;
    isDLQ: boolean;
    lastError?: string;
    retryCount: number;
  }

  const getDLQItems = (
    items: QueueItem[],
    companyQueueIds: string[]
  ): QueueItem[] => {
    return items.filter(
      (item) => item.isDLQ && companyQueueIds.includes(item.queueId)
    );
  };

  const canManualRetry = (item: QueueItem): boolean => {
    return item.isDLQ && item.status === "failed";
  };

  const manualRetry = (item: QueueItem): QueueItem => {
    if (!canManualRetry(item)) return item;

    return {
      ...item,
      status: "pending",
      isDLQ: false,
      retryCount: 0, // Reset retry count for manual retry
    };
  };

  it("should filter DLQ items for company", () => {
    const items: QueueItem[] = [
      { _id: "i1", queueId: "q1", documentId: "d1", status: "failed", isDLQ: true, retryCount: 3 },
      { _id: "i2", queueId: "q1", documentId: "d2", status: "completed", isDLQ: false, retryCount: 0 },
      { _id: "i3", queueId: "q2", documentId: "d3", status: "failed", isDLQ: true, retryCount: 3 },
    ];

    const dlqItems = getDLQItems(items, ["q1"]);

    expect(dlqItems).toHaveLength(1);
    expect(dlqItems[0]._id).toBe("i1");
  });

  it("should allow manual retry of DLQ items", () => {
    const item: QueueItem = {
      _id: "i1",
      queueId: "q1",
      documentId: "d1",
      status: "failed",
      isDLQ: true,
      lastError: "OCR failed",
      retryCount: 3,
    };

    const result = manualRetry(item);

    expect(result.status).toBe("pending");
    expect(result.isDLQ).toBe(false);
    expect(result.retryCount).toBe(0);
  });

  it("should not retry non-DLQ items", () => {
    const item: QueueItem = {
      _id: "i1",
      queueId: "q1",
      documentId: "d1",
      status: "completed",
      isDLQ: false,
      retryCount: 0,
    };

    expect(canManualRetry(item)).toBe(false);
  });
});

// ============================================================================
// Pause/Resume Tests
// ============================================================================

describe("Pause/Resume Functionality", () => {
  interface Queue {
    _id: string;
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    isPaused: boolean;
    pausedAt?: number;
  }

  const pauseQueue = (queue: Queue): Queue => {
    if (queue.status !== "processing") {
      return queue; // Can only pause processing queues
    }

    return {
      ...queue,
      isPaused: true,
      pausedAt: Date.now(),
    };
  };

  const resumeQueue = (queue: Queue): Queue => {
    if (!queue.isPaused) {
      return queue;
    }

    return {
      ...queue,
      isPaused: false,
      pausedAt: undefined,
    };
  };

  const shouldProcessNextItem = (queue: Queue): boolean => {
    return (
      queue.status === "processing" &&
      !queue.isPaused
    );
  };

  it("should pause processing queue", () => {
    const queue: Queue = { _id: "q1", status: "processing", isPaused: false };

    const result = pauseQueue(queue);

    expect(result.isPaused).toBe(true);
    expect(result.pausedAt).toBeDefined();
  });

  it("should not pause completed queue", () => {
    const queue: Queue = { _id: "q1", status: "completed", isPaused: false };

    const result = pauseQueue(queue);

    expect(result.isPaused).toBe(false);
  });

  it("should resume paused queue", () => {
    const queue: Queue = { _id: "q1", status: "processing", isPaused: true, pausedAt: 1000 };

    const result = resumeQueue(queue);

    expect(result.isPaused).toBe(false);
    expect(result.pausedAt).toBeUndefined();
  });

  it("should not process next item when paused", () => {
    const queue: Queue = { _id: "q1", status: "processing", isPaused: true };

    expect(shouldProcessNextItem(queue)).toBe(false);
  });

  it("should process next item when not paused", () => {
    const queue: Queue = { _id: "q1", status: "processing", isPaused: false };

    expect(shouldProcessNextItem(queue)).toBe(true);
  });
});
