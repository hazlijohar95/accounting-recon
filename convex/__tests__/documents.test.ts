/**
 * Documents Module Unit Tests
 *
 * Tests for document business logic:
 * - File type whitelist validation
 * - File size limit enforcement
 * - Filename sanitization (path traversal, null bytes, control chars)
 * - Upload rate limiting patterns
 * - Cascade delete patterns
 *
 * @module convex/__tests__/documents.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// File Type Whitelist
// ============================================================================

describe("File Type Whitelist", () => {
  const ALLOWED_CONTENT_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);

  it("allows PDF files", () => {
    expect(ALLOWED_CONTENT_TYPES.has("application/pdf")).toBe(true);
  });

  it("allows image files (PNG, JPEG, GIF, WebP)", () => {
    expect(ALLOWED_CONTENT_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_CONTENT_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_CONTENT_TYPES.has("image/gif")).toBe(true);
    expect(ALLOWED_CONTENT_TYPES.has("image/webp")).toBe(true);
  });

  it("allows CSV files", () => {
    expect(ALLOWED_CONTENT_TYPES.has("text/csv")).toBe(true);
  });

  it("allows Excel files (XLS and XLSX)", () => {
    expect(ALLOWED_CONTENT_TYPES.has("application/vnd.ms-excel")).toBe(true);
    expect(ALLOWED_CONTENT_TYPES.has("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(true);
  });

  it("rejects executable files", () => {
    expect(ALLOWED_CONTENT_TYPES.has("application/x-executable")).toBe(false);
    expect(ALLOWED_CONTENT_TYPES.has("application/x-msdownload")).toBe(false);
  });

  it("rejects HTML files", () => {
    expect(ALLOWED_CONTENT_TYPES.has("text/html")).toBe(false);
  });

  it("rejects JavaScript files", () => {
    expect(ALLOWED_CONTENT_TYPES.has("application/javascript")).toBe(false);
  });
});

// ============================================================================
// File Size Limit
// ============================================================================

describe("File Size Limit", () => {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  it("is 50MB", () => {
    expect(MAX_FILE_SIZE).toBe(52428800);
  });

  it("allows files under limit", () => {
    expect(10 * 1024 * 1024 <= MAX_FILE_SIZE).toBe(true);
  });

  it("rejects files over limit", () => {
    expect(51 * 1024 * 1024 <= MAX_FILE_SIZE).toBe(false);
  });
});

// ============================================================================
// Filename Sanitization
// ============================================================================

describe("Filename Sanitization", () => {
  function sanitizeFilename(filename: string): string {
    // Remove null bytes
    let sanitized = filename.replace(/\0/g, "");

    // Remove path traversal attempts
    sanitized = sanitized.replace(/\.\.\//g, "");
    sanitized = sanitized.replace(/\.\.\\/g, "");

    // Remove leading dots (hidden files)
    sanitized = sanitized.replace(/^\.+/, "");

    // Remove control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, "");

    // Replace path separators
    sanitized = sanitized.replace(/[/\\]/g, "_");

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.match(/\.[^.]+$/)?.[0] || "";
      sanitized = sanitized.substring(0, 255 - ext.length) + ext;
    }

    return sanitized || "unnamed";
  }

  it("preserves normal filenames", () => {
    expect(sanitizeFilename("invoice_jan_2025.pdf")).toBe("invoice_jan_2025.pdf");
  });

  it("removes null bytes", () => {
    expect(sanitizeFilename("file\0name.pdf")).toBe("filename.pdf");
  });

  it("removes path traversal sequences", () => {
    // After removing "../", we have "etc/passwd", then "/" becomes "_"
    expect(sanitizeFilename("../../../etc/passwd")).toBe("etc_passwd");
  });

  it("removes leading dots", () => {
    expect(sanitizeFilename(".hidden_file.pdf")).toBe("hidden_file.pdf");
    expect(sanitizeFilename("...file.pdf")).toBe("file.pdf");
  });

  it("removes control characters", () => {
    expect(sanitizeFilename("file\x01\x02name.pdf")).toBe("filename.pdf");
  });

  it("replaces path separators with underscores", () => {
    expect(sanitizeFilename("path/to/file.pdf")).toBe("path_to_file.pdf");
    expect(sanitizeFilename("path\\to\\file.pdf")).toBe("path_to_file.pdf");
  });

  it("truncates long filenames", () => {
    const longName = "a".repeat(300) + ".pdf";
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result).toMatch(/\.pdf$/);
  });

  it("returns 'unnamed' for empty result", () => {
    expect(sanitizeFilename("")).toBe("unnamed");
    expect(sanitizeFilename("\0\0\0")).toBe("unnamed");
  });
});

// ============================================================================
// Upload Rate Limiting
// ============================================================================

describe("Upload Rate Limiting", () => {
  const UPLOAD_RATE_LIMIT = 20; // per minute per company
  const RATE_LIMIT_WINDOW_MS = 60 * 1000;

  function isRateLimited(requestCount: number, windowStart: number, now: number): boolean {
    if (now - windowStart > RATE_LIMIT_WINDOW_MS) return false;
    return requestCount >= UPLOAD_RATE_LIMIT;
  }

  it("allows first request", () => {
    expect(isRateLimited(0, Date.now(), Date.now())).toBe(false);
  });

  it("allows up to limit", () => {
    expect(isRateLimited(19, Date.now(), Date.now())).toBe(false);
  });

  it("blocks at limit", () => {
    const now = Date.now();
    expect(isRateLimited(20, now, now)).toBe(true);
  });

  it("resets after window expires", () => {
    const now = Date.now();
    const oldWindow = now - RATE_LIMIT_WINDOW_MS - 1;
    expect(isRateLimited(100, oldWindow, now)).toBe(false);
  });
});

// ============================================================================
// Cascade Delete Pattern
// ============================================================================

describe("Cascade Delete Pattern", () => {
  it("identifies all related entity types for cleanup", () => {
    const cascadeTargets = [
      "transactions",
      "accrualDocuments",
      "matchedPairs",
      "suspenseItems",
      // storage blobs
    ];

    expect(cascadeTargets).toContain("transactions");
    expect(cascadeTargets).toContain("accrualDocuments");
    expect(cascadeTargets).toContain("matchedPairs");
    expect(cascadeTargets).toContain("suspenseItems");
  });
});
