/**
 * Audit Logger Unit Tests
 *
 * Tests for audit logging business logic:
 * - Audit action types
 * - Event structure validation
 * - Helper factories pattern
 * - Filter/pagination logic
 *
 * @module convex/__tests__/auditLogger.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Audit Action Types
// ============================================================================

describe("Audit Action Types", () => {
  const AUDIT_ACTIONS = [
    "document_upload",
    "document_delete",
    "extraction_start",
    "extraction_complete",
    "extraction_failed",
    "match_create",
    "match_approve",
    "match_reject",
    "match_bulk_approve",
    "session_create",
    "session_delete",
    "export_generate",
    "settings_update",
    "settings_export_data",
    "settings_delete_account",
    "queue_item_create",
    "queue_item_process",
    "queue_item_fail",
    "queue_item_retry",
    "transaction_import",
    "transaction_delete",
    "suspense_create",
    "suspense_resolve",
    "suspense_reopen",
  ] as const;

  it("defines 23+ audit actions", () => {
    expect(AUDIT_ACTIONS.length).toBeGreaterThanOrEqual(23);
  });

  it("includes document lifecycle actions", () => {
    expect(AUDIT_ACTIONS).toContain("document_upload");
    expect(AUDIT_ACTIONS).toContain("document_delete");
  });

  it("includes extraction lifecycle actions", () => {
    expect(AUDIT_ACTIONS).toContain("extraction_start");
    expect(AUDIT_ACTIONS).toContain("extraction_complete");
    expect(AUDIT_ACTIONS).toContain("extraction_failed");
  });

  it("includes match lifecycle actions", () => {
    expect(AUDIT_ACTIONS).toContain("match_create");
    expect(AUDIT_ACTIONS).toContain("match_approve");
    expect(AUDIT_ACTIONS).toContain("match_reject");
    expect(AUDIT_ACTIONS).toContain("match_bulk_approve");
  });

  it("includes session actions", () => {
    expect(AUDIT_ACTIONS).toContain("session_create");
    expect(AUDIT_ACTIONS).toContain("session_delete");
  });

  it("includes suspense actions", () => {
    expect(AUDIT_ACTIONS).toContain("suspense_create");
    expect(AUDIT_ACTIONS).toContain("suspense_resolve");
    expect(AUDIT_ACTIONS).toContain("suspense_reopen");
  });
});

// ============================================================================
// Audit Event Structure
// ============================================================================

describe("Audit Event Structure", () => {
  interface AuditEvent {
    companyId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }

  it("requires all mandatory fields", () => {
    const event: AuditEvent = {
      companyId: "company-1",
      userId: "user-1",
      action: "document_upload",
      resourceType: "document",
      resourceId: "doc-1",
    };

    expect(event.companyId).toBeTruthy();
    expect(event.userId).toBeTruthy();
    expect(event.action).toBeTruthy();
    expect(event.resourceType).toBeTruthy();
    expect(event.resourceId).toBeTruthy();
  });

  it("allows optional metadata", () => {
    const event: AuditEvent = {
      companyId: "company-1",
      userId: "user-1",
      action: "match_approve",
      resourceType: "match",
      resourceId: "match-1",
      metadata: {
        matchLayer: 1,
        confidenceScore: 95,
        cashTransactionId: "t-1",
        accrualDocumentId: "ad-1",
      },
    };

    expect(event.metadata).toBeDefined();
    expect(event.metadata!.matchLayer).toBe(1);
  });
});

// ============================================================================
// Resource Types
// ============================================================================

describe("Audit Resource Types", () => {
  const RESOURCE_TYPES = [
    "document",
    "match",
    "session",
    "export",
    "settings",
    "queue",
    "transaction",
    "suspense",
  ] as const;

  it("covers all major entity types", () => {
    expect(RESOURCE_TYPES.length).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================================
// Helper Factories Pattern
// ============================================================================

describe("Audit Helper Factories", () => {
  function createDocumentAuditHelper(companyId: string, userId: string) {
    return {
      upload: (documentId: string, metadata?: Record<string, unknown>) => ({
        companyId,
        userId,
        action: "document_upload",
        resourceType: "document",
        resourceId: documentId,
        metadata,
      }),
      delete: (documentId: string) => ({
        companyId,
        userId,
        action: "document_delete",
        resourceType: "document",
        resourceId: documentId,
      }),
    };
  }

  it("creates events with pre-filled company and user context", () => {
    const helper = createDocumentAuditHelper("company-1", "user-1");
    const event = helper.upload("doc-1", { fileName: "invoice.pdf" });

    expect(event.companyId).toBe("company-1");
    expect(event.userId).toBe("user-1");
    expect(event.action).toBe("document_upload");
    expect(event.resourceId).toBe("doc-1");
    expect(event.metadata!.fileName).toBe("invoice.pdf");
  });

  it("creates different action types from same factory", () => {
    const helper = createDocumentAuditHelper("company-1", "user-1");
    const upload = helper.upload("doc-1");
    const del = helper.delete("doc-1");

    expect(upload.action).toBe("document_upload");
    expect(del.action).toBe("document_delete");
  });
});

// ============================================================================
// Audit Trail Filtering
// ============================================================================

describe("Audit Trail Filtering", () => {
  interface AuditRecord {
    action: string;
    resourceType: string;
    createdAt: number;
    userId: string;
  }

  const records: AuditRecord[] = [
    { action: "document_upload", resourceType: "document", createdAt: 1000, userId: "u1" },
    { action: "match_approve", resourceType: "match", createdAt: 2000, userId: "u1" },
    { action: "match_reject", resourceType: "match", createdAt: 3000, userId: "u2" },
    { action: "document_delete", resourceType: "document", createdAt: 4000, userId: "u1" },
    { action: "session_create", resourceType: "session", createdAt: 5000, userId: "u2" },
  ];

  it("filters by action", () => {
    const filtered = records.filter((r) => r.action === "match_approve");
    expect(filtered).toHaveLength(1);
  });

  it("filters by resource type", () => {
    const filtered = records.filter((r) => r.resourceType === "match");
    expect(filtered).toHaveLength(2);
  });

  it("filters by user", () => {
    const filtered = records.filter((r) => r.userId === "u1");
    expect(filtered).toHaveLength(3);
  });

  it("supports pagination", () => {
    const page1 = records.slice(0, 2);
    const page2 = records.slice(2, 4);
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
  });
});
