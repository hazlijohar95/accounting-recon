/**
 * CSRF Protection Unit Tests
 *
 * Tests for CSRF token generation, cookie setting, and validation:
 * - generateCSRFToken (via setCSRFCookie)
 * - validateCSRF (origin check + double-submit cookie)
 * - getCSRFTokenFromCookies
 *
 * @module __tests__/lib/csrf.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock NextRequest and NextResponse
class MockCookie {
  private cookies = new Map<string, { value: string; options?: Record<string, unknown> }>();

  set(name: string, value: string, options?: Record<string, unknown>) {
    this.cookies.set(name, { value, options });
  }

  get(name: string) {
    const entry = this.cookies.get(name);
    return entry ? { value: entry.value } : undefined;
  }
}

class MockNextRequest {
  headers: Map<string, string>;
  cookies: MockCookie;

  constructor(
    headerEntries: Record<string, string> = {},
    cookieEntries: Record<string, string> = {}
  ) {
    this.headers = new Map(Object.entries(headerEntries));
    this.cookies = new MockCookie();
    for (const [k, v] of Object.entries(cookieEntries)) {
      this.cookies.set(k, v);
    }
  }
}

class MockNextResponse {
  cookies = new MockCookie();
}

// We need to mock the module imports before importing
vi.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// Import after mocking
import { validateCSRF, setCSRFCookie, getCSRFTokenFromCookies } from "@/lib/csrf";

// ============================================================================
// setCSRFCookie
// ============================================================================

describe("setCSRFCookie", () => {
  it("generates a 64-character hex token", () => {
    const response = new MockNextResponse();
    const token = setCSRFCookie(response as any);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sets the cookie on the response", () => {
    const response = new MockNextResponse();
    const token = setCSRFCookie(response as any);
    const cookie = response.cookies.get("__csrf_token");
    expect(cookie).toBeDefined();
    expect(cookie!.value).toBe(token);
  });

  it("generates different tokens on each call", () => {
    const r1 = new MockNextResponse();
    const r2 = new MockNextResponse();
    const t1 = setCSRFCookie(r1 as any);
    const t2 = setCSRFCookie(r2 as any);
    expect(t1).not.toBe(t2);
  });
});

// ============================================================================
// getCSRFTokenFromCookies
// ============================================================================

describe("getCSRFTokenFromCookies", () => {
  it("returns token when cookie exists", () => {
    const request = new MockNextRequest({}, { __csrf_token: "abc123" });
    const token = getCSRFTokenFromCookies(request as any);
    expect(token).toBe("abc123");
  });

  it("returns undefined when cookie does not exist", () => {
    const request = new MockNextRequest({}, {});
    const token = getCSRFTokenFromCookies(request as any);
    expect(token).toBeUndefined();
  });
});

// ============================================================================
// validateCSRF
// ============================================================================

describe("validateCSRF", () => {
  describe("Layer 1: Origin validation", () => {
    it("rejects request with no origin or referer", () => {
      const request = new MockNextRequest({});
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Missing origin");
    });

    it("rejects request with invalid origin", () => {
      const request = new MockNextRequest({ origin: "https://evil.com" });
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid origin");
    });

    it("accepts request with allowed origin (production)", () => {
      const request = new MockNextRequest({ origin: "https://reconciled.dev" });
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(true);
    });

    it("accepts request with www subdomain", () => {
      const request = new MockNextRequest({ origin: "https://www.reconciled.dev" });
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(true);
    });

    it("falls back to referer when origin is absent", () => {
      const request = new MockNextRequest({ referer: "https://reconciled.dev/dashboard" });
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(true);
    });

    it("rejects request with invalid referer", () => {
      const request = new MockNextRequest({ referer: "https://evil.com/phishing" });
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid referer");
    });

    it("rejects request with malformed referer URL", () => {
      const request = new MockNextRequest({ referer: "not-a-valid-url" });
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid referer");
    });
  });

  describe("Layer 2: Double-submit cookie validation", () => {
    it("accepts when cookie and header tokens match", () => {
      const request = new MockNextRequest(
        { origin: "https://reconciled.dev", "x-csrf-token": "token-abc" },
        { __csrf_token: "token-abc" }
      );
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(true);
    });

    it("rejects when cookie and header tokens mismatch", () => {
      const request = new MockNextRequest(
        { origin: "https://reconciled.dev", "x-csrf-token": "wrong-token" },
        { __csrf_token: "correct-token" }
      );
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("CSRF token mismatch");
    });

    it("allows first request when no token exists yet", () => {
      const request = new MockNextRequest(
        { origin: "https://reconciled.dev" }
      );
      // No cookie, no header — origin check alone is sufficient
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(true);
    });

    it("allows when cookie exists but no header (first-time client)", () => {
      const request = new MockNextRequest(
        { origin: "https://reconciled.dev" },
        { __csrf_token: "some-token" }
      );
      // Cookie exists but no x-csrf-token header — still valid (origin check passes)
      const result = validateCSRF(request as any);
      expect(result.valid).toBe(true);
    });
  });
});
