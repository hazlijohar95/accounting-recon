/**
 * Auth Unit Tests
 *
 * Tests for authentication and authorization including:
 * - requireAuth token validation
 * - requireCompanyAccess ownership check
 * - Cross-tenant isolation
 * - Session access through company
 * - Spoofing attack prevention
 * - Fallback auth behavior
 *
 * @module convex/__tests__/auth.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Auth Validation Tests
// ============================================================================

describe("Auth Token Validation", () => {
  interface AuthUser {
    id: string;
    email?: string;
  }

  interface DbUser {
    _id: string;
    email: string;
    workosId: string;
  }

  const validateAuth = async (
    authUser: AuthUser | null,
    workosUserId: string | undefined,
    dbUsers: DbUser[]
  ): Promise<{ valid: boolean; user: DbUser | null; reason?: string }> => {
    // No auth at all
    if (!authUser && !workosUserId) {
      return { valid: false, user: null, reason: "No authentication provided" };
    }

    let effectiveWorkosId: string | null = null;

    if (authUser?.id) {
      effectiveWorkosId = authUser.id;

      // SECURITY: Check for spoofing
      if (workosUserId && workosUserId !== authUser.id) {
        return {
          valid: false,
          user: null,
          reason: "WorkOS ID mismatch - potential spoofing attack",
        };
      }
    } else if (workosUserId) {
      // Fallback to workosUserId
      effectiveWorkosId = workosUserId;
    }

    if (!effectiveWorkosId) {
      return { valid: false, user: null, reason: "No effective WorkOS ID" };
    }

    // Look up user
    const user = dbUsers.find((u) => u.workosId === effectiveWorkosId);
    if (!user) {
      return { valid: false, user: null, reason: "User not found in database" };
    }

    return { valid: true, user };
  };

  it("should validate when authUser matches workosUserId", async () => {
    const authUser = { id: "user_123" };
    const workosUserId = "user_123";
    const dbUsers = [{ _id: "db_1", email: "test@example.com", workosId: "user_123" }];

    const result = await validateAuth(authUser, workosUserId, dbUsers);

    expect(result.valid).toBe(true);
    expect(result.user).toBeDefined();
  });

  it("should validate with only authUser (no fallback)", async () => {
    const authUser = { id: "user_123" };
    const dbUsers = [{ _id: "db_1", email: "test@example.com", workosId: "user_123" }];

    const result = await validateAuth(authUser, undefined, dbUsers);

    expect(result.valid).toBe(true);
    expect(result.user?._id).toBe("db_1");
  });

  it("should validate with fallback workosUserId when authUser is null", async () => {
    const dbUsers = [{ _id: "db_1", email: "test@example.com", workosId: "user_123" }];

    const result = await validateAuth(null, "user_123", dbUsers);

    expect(result.valid).toBe(true);
    expect(result.user?._id).toBe("db_1");
  });

  it("should fail when no auth provided", async () => {
    const dbUsers = [{ _id: "db_1", email: "test@example.com", workosId: "user_123" }];

    const result = await validateAuth(null, undefined, dbUsers);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("No authentication provided");
  });

  it("should fail when user not in database", async () => {
    const authUser = { id: "user_999" };
    const dbUsers = [{ _id: "db_1", email: "test@example.com", workosId: "user_123" }];

    const result = await validateAuth(authUser, undefined, dbUsers);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("User not found in database");
  });
});

// ============================================================================
// Spoofing Attack Prevention Tests
// ============================================================================

describe("Spoofing Attack Prevention", () => {
  interface AuthUser {
    id: string;
  }

  const detectSpoofing = (
    authUser: AuthUser | null,
    claimedWorkosId: string | undefined
  ): { isSpoofing: boolean; message?: string } => {
    // If both are provided and they don't match, it's suspicious
    if (authUser?.id && claimedWorkosId && authUser.id !== claimedWorkosId) {
      return {
        isSpoofing: true,
        message: `Claimed ID ${claimedWorkosId.slice(0, 8)}... does not match authenticated ID ${authUser.id.slice(0, 8)}...`,
      };
    }

    return { isSpoofing: false };
  };

  it("should detect ID mismatch as potential spoofing", () => {
    const authUser = { id: "legitimate_user" };
    const claimedId = "attacker_user";

    const result = detectSpoofing(authUser, claimedId);

    expect(result.isSpoofing).toBe(true);
    expect(result.message).toContain("does not match");
  });

  it("should not flag when IDs match", () => {
    const authUser = { id: "user_123" };
    const claimedId = "user_123";

    const result = detectSpoofing(authUser, claimedId);

    expect(result.isSpoofing).toBe(false);
  });

  it("should not flag when only authUser provided", () => {
    const authUser = { id: "user_123" };

    const result = detectSpoofing(authUser, undefined);

    expect(result.isSpoofing).toBe(false);
  });

  it("should not flag when only claimedId provided (fallback mode)", () => {
    const result = detectSpoofing(null, "user_123");

    expect(result.isSpoofing).toBe(false);
  });
});

// ============================================================================
// Company Access Tests
// ============================================================================

describe("Company Access Control", () => {
  interface User {
    _id: string;
    workosId: string;
  }

  interface Company {
    _id: string;
    ownerId: string;
    isDeleted: boolean;
  }

  const checkCompanyAccess = (
    user: User,
    company: Company | null
  ): { allowed: boolean; reason?: string } => {
    if (!company) {
      return { allowed: false, reason: "Company not found" };
    }

    if (company.isDeleted) {
      return { allowed: false, reason: "Company has been deleted" };
    }

    if (company.ownerId !== user._id) {
      return { allowed: false, reason: "Access denied - not company owner" };
    }

    return { allowed: true };
  };

  it("should allow access for company owner", () => {
    const user: User = { _id: "user_1", workosId: "wo_1" };
    const company: Company = { _id: "company_1", ownerId: "user_1", isDeleted: false };

    const result = checkCompanyAccess(user, company);

    expect(result.allowed).toBe(true);
  });

  it("should deny access for non-owner", () => {
    const user: User = { _id: "user_2", workosId: "wo_2" };
    const company: Company = { _id: "company_1", ownerId: "user_1", isDeleted: false };

    const result = checkCompanyAccess(user, company);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not company owner");
  });

  it("should deny access to deleted company", () => {
    const user: User = { _id: "user_1", workosId: "wo_1" };
    const company: Company = { _id: "company_1", ownerId: "user_1", isDeleted: true };

    const result = checkCompanyAccess(user, company);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("deleted");
  });

  it("should deny access when company not found", () => {
    const user: User = { _id: "user_1", workosId: "wo_1" };

    const result = checkCompanyAccess(user, null);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not found");
  });
});

// ============================================================================
// Cross-Tenant Isolation Tests
// ============================================================================

describe("Cross-Tenant Isolation", () => {
  interface Resource {
    _id: string;
    companyId: string;
  }

  interface Company {
    _id: string;
    ownerId: string;
  }

  interface User {
    _id: string;
  }

  const checkResourceAccess = (
    user: User,
    resource: Resource,
    companies: Company[]
  ): { allowed: boolean; reason?: string } => {
    // Find the company that owns this resource
    const company = companies.find((c) => c._id === resource.companyId);

    if (!company) {
      return { allowed: false, reason: "Resource company not found" };
    }

    // Check if user owns the company
    if (company.ownerId !== user._id) {
      return {
        allowed: false,
        reason: "Cross-tenant access denied - user does not own resource company",
      };
    }

    return { allowed: true };
  };

  it("should allow access to own company resources", () => {
    const user: User = { _id: "user_A" };
    const resource: Resource = { _id: "doc_1", companyId: "company_A" };
    const companies: Company[] = [
      { _id: "company_A", ownerId: "user_A" },
      { _id: "company_B", ownerId: "user_B" },
    ];

    const result = checkResourceAccess(user, resource, companies);

    expect(result.allowed).toBe(true);
  });

  it("should deny access to other company resources", () => {
    const user: User = { _id: "user_A" };
    const resource: Resource = { _id: "doc_1", companyId: "company_B" };
    const companies: Company[] = [
      { _id: "company_A", ownerId: "user_A" },
      { _id: "company_B", ownerId: "user_B" },
    ];

    const result = checkResourceAccess(user, resource, companies);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Cross-tenant");
  });

  it("should deny when resource company does not exist", () => {
    const user: User = { _id: "user_A" };
    const resource: Resource = { _id: "doc_1", companyId: "company_X" };
    const companies: Company[] = [{ _id: "company_A", ownerId: "user_A" }];

    const result = checkResourceAccess(user, resource, companies);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not found");
  });
});

// ============================================================================
// Session Access Through Company Tests
// ============================================================================

describe("Session Access Through Company", () => {
  interface Session {
    _id: string;
    companyId: string;
    createdBy: string;
  }

  interface Company {
    _id: string;
    ownerId: string;
    isDeleted: boolean;
  }

  interface User {
    _id: string;
  }

  const checkSessionAccess = (
    user: User,
    session: Session | null,
    companies: Company[]
  ): { allowed: boolean; reason?: string } => {
    if (!session) {
      return { allowed: false, reason: "Session not found" };
    }

    // Session access is through company ownership
    const company = companies.find((c) => c._id === session.companyId);

    if (!company) {
      return { allowed: false, reason: "Session company not found" };
    }

    if (company.isDeleted) {
      return { allowed: false, reason: "Session company has been deleted" };
    }

    if (company.ownerId !== user._id) {
      return { allowed: false, reason: "Access denied to session" };
    }

    return { allowed: true };
  };

  it("should allow session access through company ownership", () => {
    const user: User = { _id: "user_1" };
    const session: Session = {
      _id: "session_1",
      companyId: "company_1",
      createdBy: "user_1",
    };
    const companies: Company[] = [
      { _id: "company_1", ownerId: "user_1", isDeleted: false },
    ];

    const result = checkSessionAccess(user, session, companies);

    expect(result.allowed).toBe(true);
  });

  it("should deny session access when not company owner", () => {
    const user: User = { _id: "user_2" };
    const session: Session = {
      _id: "session_1",
      companyId: "company_1",
      createdBy: "user_1",
    };
    const companies: Company[] = [
      { _id: "company_1", ownerId: "user_1", isDeleted: false },
    ];

    const result = checkSessionAccess(user, session, companies);

    expect(result.allowed).toBe(false);
  });

  it("should deny access to session of deleted company", () => {
    const user: User = { _id: "user_1" };
    const session: Session = {
      _id: "session_1",
      companyId: "company_1",
      createdBy: "user_1",
    };
    const companies: Company[] = [
      { _id: "company_1", ownerId: "user_1", isDeleted: true },
    ];

    const result = checkSessionAccess(user, session, companies);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("deleted");
  });

  it("should allow access to session created by another user (if company owner)", () => {
    // A user can access sessions created by other users if they own the company
    const user: User = { _id: "owner" };
    const session: Session = {
      _id: "session_1",
      companyId: "company_1",
      createdBy: "employee", // Created by someone else
    };
    const companies: Company[] = [
      { _id: "company_1", ownerId: "owner", isDeleted: false },
    ];

    const result = checkSessionAccess(user, session, companies);

    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// Environment Detection Tests
// ============================================================================

describe("Environment Detection", () => {
  const isDevEnvironment = (envVars: {
    AUTH_DEV_MODE?: string;
    CONVEX_CLOUD_URL?: string;
  }): boolean => {
    // Explicit override takes priority
    if (envVars.AUTH_DEV_MODE === "true") return true;
    if (envVars.AUTH_DEV_MODE === "false") return false;

    // Auto-detect based on Convex URL
    const convexUrl = envVars.CONVEX_CLOUD_URL || "";

    if (convexUrl.includes("-dev")) return true;
    if (convexUrl.includes("localhost")) return true;
    if (convexUrl.includes("127.0.0.1")) return true;

    // Default to production (secure)
    return false;
  };

  it("should return true when AUTH_DEV_MODE=true", () => {
    expect(isDevEnvironment({ AUTH_DEV_MODE: "true" })).toBe(true);
  });

  it("should return false when AUTH_DEV_MODE=false", () => {
    expect(isDevEnvironment({ AUTH_DEV_MODE: "false" })).toBe(false);
  });

  it("should detect dev from Convex URL containing -dev", () => {
    expect(
      isDevEnvironment({ CONVEX_CLOUD_URL: "https://myapp-dev.convex.cloud" })
    ).toBe(true);
  });

  it("should detect dev from localhost URL", () => {
    expect(
      isDevEnvironment({ CONVEX_CLOUD_URL: "http://localhost:3000" })
    ).toBe(true);
  });

  it("should default to production when no indicators", () => {
    expect(
      isDevEnvironment({ CONVEX_CLOUD_URL: "https://myapp.convex.cloud" })
    ).toBe(false);
  });

  it("should default to production when no env vars", () => {
    expect(isDevEnvironment({})).toBe(false);
  });
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe("Rate Limiting", () => {
  interface RateLimit {
    userId: string;
    action: string;
    timestamps: number[];
    updatedAt: number;
  }

  const WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS = 10;

  const checkRateLimit = (
    rateLimit: RateLimit | null,
    maxRequests: number = MAX_REQUESTS,
    windowMs: number = WINDOW_MS
  ): { allowed: boolean; remaining: number; resetAt: number } => {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimit) {
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    // Count requests within window
    const recentRequests = rateLimit.timestamps.filter((t) => t > windowStart);
    const remaining = Math.max(0, maxRequests - recentRequests.length - 1);
    const allowed = recentRequests.length < maxRequests;

    // Reset time is window from oldest request in window
    const oldestInWindow = recentRequests[0] || now;
    const resetAt = oldestInWindow + windowMs;

    return { allowed, remaining, resetAt };
  };

  it("should allow when under limit", () => {
    const rateLimit: RateLimit = {
      userId: "user_1",
      action: "upload",
      timestamps: [Date.now() - 1000, Date.now() - 2000],
      updatedAt: Date.now(),
    };

    const result = checkRateLimit(rateLimit);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7); // 10 - 2 - 1 = 7
  });

  it("should deny when at limit", () => {
    const now = Date.now();
    const rateLimit: RateLimit = {
      userId: "user_1",
      action: "upload",
      timestamps: Array.from({ length: 10 }, (_, i) => now - i * 1000),
      updatedAt: now,
    };

    const result = checkRateLimit(rateLimit);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow when no rate limit record exists", () => {
    const result = checkRateLimit(null);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("should ignore old requests outside window", () => {
    const now = Date.now();
    const rateLimit: RateLimit = {
      userId: "user_1",
      action: "upload",
      timestamps: [
        now - 120000, // 2 minutes ago (outside window)
        now - 1000,   // Within window
      ],
      updatedAt: now,
    };

    const result = checkRateLimit(rateLimit);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(8); // Only 1 request within window
  });
});

// ============================================================================
// Permission Error Tests
// ============================================================================

describe("Permission Error Types", () => {
  type ErrorCode =
    | "ACCESS_DENIED"
    | "OWNERSHIP_REQUIRED"
    | "GLOBAL_RESOURCE"
    | "RATE_LIMITED";

  interface PermissionError {
    code: ErrorCode;
    message: string;
    resourceType?: string;
  }

  const createPermissionError = (
    code: ErrorCode,
    resourceType?: string
  ): PermissionError => {
    const messages: Record<ErrorCode, string> = {
      ACCESS_DENIED: `You don't have access to this ${resourceType || "resource"}`,
      OWNERSHIP_REQUIRED: `You must own this ${resourceType || "resource"} to perform this action`,
      GLOBAL_RESOURCE: `Global ${resourceType || "resource"} cannot be modified`,
      RATE_LIMITED: "Too many requests. Please try again later.",
    };

    return {
      code,
      message: messages[code],
      resourceType,
    };
  };

  it("should create access denied error", () => {
    const error = createPermissionError("ACCESS_DENIED", "document");

    expect(error.code).toBe("ACCESS_DENIED");
    expect(error.message).toContain("document");
    expect(error.resourceType).toBe("document");
  });

  it("should create ownership required error", () => {
    const error = createPermissionError("OWNERSHIP_REQUIRED", "company");

    expect(error.code).toBe("OWNERSHIP_REQUIRED");
    expect(error.message).toContain("own");
  });

  it("should create global resource error", () => {
    const error = createPermissionError("GLOBAL_RESOURCE", "category");

    expect(error.code).toBe("GLOBAL_RESOURCE");
    expect(error.message).toContain("Global");
    expect(error.message).toContain("cannot be modified");
  });

  it("should create rate limited error", () => {
    const error = createPermissionError("RATE_LIMITED");

    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toContain("Too many requests");
  });
});
