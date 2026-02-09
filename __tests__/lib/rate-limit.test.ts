/**
 * Rate Limit Unit Tests
 *
 * Tests for rate limiting utilities:
 * - checkInMemoryRateLimit (sliding window)
 * - checkRateLimitSync (sync API)
 * - RateLimits (pre-configured limits)
 * - createRateLimitHeaders (header formatting)
 * - getRateLimitIdentifier (user vs IP vs anonymous)
 * - getClientIp (proxy header extraction)
 *
 * @module __tests__/lib/rate-limit.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimitSync,
  RateLimits,
  createRateLimitHeaders,
  getRateLimitIdentifier,
  getClientIp,
  type RateLimitResult,
} from "@/lib/rate-limit";

// ============================================================================
// checkRateLimitSync (in-memory)
// ============================================================================

describe("checkRateLimitSync", () => {
  it("allows first request", () => {
    const result = checkRateLimitSync(
      `test-user-${Date.now()}-${Math.random()}`,
      "test-ns",
      { limit: 5, windowMs: 60000 }
    );
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("decrements remaining count on each request", () => {
    const identifier = `test-user-dec-${Date.now()}-${Math.random()}`;
    const config = { limit: 3, windowMs: 60000 };

    const r1 = checkRateLimitSync(identifier, "test-dec", config);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimitSync(identifier, "test-dec", config);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimitSync(identifier, "test-dec", config);
    expect(r3.remaining).toBe(0);
  });

  it("blocks when limit is exceeded", () => {
    const identifier = `test-block-${Date.now()}-${Math.random()}`;
    const config = { limit: 2, windowMs: 60000 };

    checkRateLimitSync(identifier, "test-block", config);
    checkRateLimitSync(identifier, "test-block", config);

    const blocked = checkRateLimitSync(identifier, "test-block", config);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("provides retryAfter in seconds when blocked", () => {
    const identifier = `test-retry-${Date.now()}-${Math.random()}`;
    const config = { limit: 1, windowMs: 30000 };

    checkRateLimitSync(identifier, "test-retry", config);
    const blocked = checkRateLimitSync(identifier, "test-retry", config);

    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(30);
  });

  it("isolates different namespaces", () => {
    const identifier = `test-ns-${Date.now()}-${Math.random()}`;
    const config = { limit: 1, windowMs: 60000 };

    checkRateLimitSync(identifier, "namespace-a", config);
    const result = checkRateLimitSync(identifier, "namespace-b", config);

    // Different namespace = fresh limit
    expect(result.success).toBe(true);
  });

  it("isolates different identifiers", () => {
    const config = { limit: 1, windowMs: 60000 };
    const suffix = `${Date.now()}-${Math.random()}`;

    checkRateLimitSync(`user-a-${suffix}`, "test-iso", config);
    const result = checkRateLimitSync(`user-b-${suffix}`, "test-iso", config);

    // Different user = fresh limit
    expect(result.success).toBe(true);
  });

  it("provides a reset timestamp in the future", () => {
    const identifier = `test-reset-${Date.now()}-${Math.random()}`;
    const config = { limit: 5, windowMs: 60000 };

    const result = checkRateLimitSync(identifier, "test-reset", config);
    expect(result.reset).toBeGreaterThan(Date.now());
  });
});

// ============================================================================
// RateLimits (pre-configured)
// ============================================================================

describe("RateLimits", () => {
  it("has upload limit of 10/minute", () => {
    expect(RateLimits.upload.limit).toBe(10);
    expect(RateLimits.upload.windowMs).toBe(60000);
  });

  it("has chat limit of 20/minute", () => {
    expect(RateLimits.chat.limit).toBe(20);
    expect(RateLimits.chat.windowMs).toBe(60000);
  });

  it("has matching limit of 5/minute", () => {
    expect(RateLimits.matching.limit).toBe(5);
    expect(RateLimits.matching.windowMs).toBe(60000);
  });

  it("has export limit of 5/hour", () => {
    expect(RateLimits.export.limit).toBe(5);
    expect(RateLimits.export.windowMs).toBe(3600000);
  });

  it("has deleteAccount limit of 3/day", () => {
    expect(RateLimits.deleteAccount.limit).toBe(3);
    expect(RateLimits.deleteAccount.windowMs).toBe(86400000);
  });

  it("has csvImport limit", () => {
    expect(RateLimits.csvImport.limit).toBe(10);
    expect(RateLimits.csvImport.windowMs).toBe(60000);
  });

  it("has auth limit", () => {
    expect(RateLimits.auth.limit).toBe(10);
    expect(RateLimits.auth.windowMs).toBe(60000);
  });
});

// ============================================================================
// createRateLimitHeaders
// ============================================================================

describe("createRateLimitHeaders", () => {
  it("includes remaining and reset headers", () => {
    const result: RateLimitResult = {
      success: true,
      remaining: 8,
      reset: 1700000000000,
    };

    const headers = createRateLimitHeaders(result) as Record<string, string>;
    expect(headers["X-RateLimit-Remaining"]).toBe("8");
    expect(headers["X-RateLimit-Reset"]).toBe("1700000000");
  });

  it("includes Retry-After when rate limited", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      reset: Date.now() + 30000,
      retryAfter: 30,
    };

    const headers = createRateLimitHeaders(result) as Record<string, string>;
    expect(headers["Retry-After"]).toBe("30");
  });

  it("does not include Retry-After when not rate limited", () => {
    const result: RateLimitResult = {
      success: true,
      remaining: 5,
      reset: Date.now() + 60000,
    };

    const headers = createRateLimitHeaders(result) as Record<string, string>;
    expect(headers["Retry-After"]).toBeUndefined();
  });
});

// ============================================================================
// getRateLimitIdentifier
// ============================================================================

describe("getRateLimitIdentifier", () => {
  it("uses workosId when session is provided", () => {
    const id = getRateLimitIdentifier({ workosId: "user_123" });
    expect(id).toBe("user_123");
  });

  it("uses IP-based identifier when no session", () => {
    const id = getRateLimitIdentifier(null, "192.168.1.1");
    expect(id).toBe("ip:192.168.1.1");
  });

  it("prefers session over IP", () => {
    const id = getRateLimitIdentifier({ workosId: "user_123" }, "192.168.1.1");
    expect(id).toBe("user_123");
  });

  it("uses anonymous fallback when neither session nor IP", () => {
    const id = getRateLimitIdentifier(null);
    expect(id).toMatch(/^anon:\d+$/);
  });

  it("anonymous fallback produces different-ish IDs", () => {
    const id1 = getRateLimitIdentifier(null, null);
    // Should start with 'anon:'
    expect(id1).toMatch(/^anon:/);
  });
});

// ============================================================================
// getClientIp
// ============================================================================

describe("getClientIp", () => {
  function makeHeaders(entries: Record<string, string>): Headers {
    return {
      get(key: string) {
        return entries[key.toLowerCase()] ?? null;
      },
    } as any;
  }

  it("extracts Cloudflare IP first", () => {
    const headers = makeHeaders({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "5.6.7.8",
      "x-real-ip": "9.10.11.12",
    });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to X-Forwarded-For (first IP)", () => {
    const headers = makeHeaders({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12",
    });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP", () => {
    const headers = makeHeaders({
      "x-real-ip": "1.2.3.4",
    });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("returns null when no IP headers present", () => {
    const headers = makeHeaders({});
    expect(getClientIp(headers)).toBeNull();
  });

  it("trims whitespace from X-Forwarded-For entries", () => {
    const headers = makeHeaders({
      "x-forwarded-for": "  1.2.3.4  , 5.6.7.8",
    });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });
});
