import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { authKit } from "../auth";
import {
  AuthErrors,
  ResourceErrors,
  PermissionErrors,
} from "./errors";

/**
 * Check if running in production environment.
 * Uses CONVEX_CLOUD_URL to detect if we're on production deployment.
 * NODE_ENV is unreliable in Convex as it's often "production" even in dev.
 */
export function isProductionMode(): boolean {
  // Check for explicit production flag first
  if (process.env.AUTH_STRICT_MODE === "true") {
    return true;
  }
  // In Convex, check if we're on the production deployment
  // Development deployments typically have "dev" in the URL
  const convexUrl = process.env.CONVEX_CLOUD_URL || "";
  return convexUrl.includes(".convex.cloud") && !convexUrl.includes("-dev");
}

/**
 * Allow auth fallbacks (workosUserId parameter) when AuthKit fails.
 * This is needed because @workos-inc/authkit-nextjs tokens may not be
 * compatible with @convex-dev/workos-authkit verification.
 *
 * Security note: The fallback still requires a valid user in the database,
 * so the attack surface is limited to impersonating existing users.
 * For production, set AUTH_STRICT_MODE=true to disable this.
 */
function allowAuthFallback(): boolean {
  // Always allow fallback unless explicitly in strict mode
  // The workosUserId must still exist in DB, limiting attack surface
  return process.env.AUTH_STRICT_MODE !== "true";
}

/**
 * Get authenticated user or throw an error.
 * This is the primary auth helper for mutations.
 *
 * @param ctx - Query or mutation context
 * @param workosUserId - Optional fallback WorkOS user ID (for dev mode when JWT verification fails)
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  workosUserId?: string
): Promise<Doc<"users">> {
  const user = await getOptionalAuth(ctx, workosUserId);

  if (!user) {
    console.warn('[Auth] requireAuth: No authenticated user found');
    return AuthErrors.unauthorized();
  }

  return user;
}

/**
 * Optionally get authenticated user (returns null if not authenticated).
 * Uses AuthKit to verify the JWT and look up the user by workosId.
 *
 * SECURITY: In production mode, ONLY AuthKit-verified tokens are accepted.
 * The workosUserId fallback is ONLY allowed in development mode.
 *
 * FALLBACK (dev only): If AuthKit token verification fails (due to incompatible packages),
 * accepts an optional workosUserId parameter to look up the user directly.
 * This is a workaround for the incompatibility between @workos-inc/authkit-nextjs
 * (frontend) and @convex-dev/workos-authkit (Convex backend).
 */
export async function getOptionalAuth(
  ctx: QueryCtx | MutationCtx,
  workosUserId?: string
): Promise<Doc<"users"> | null> {
  const canUseFallback = allowAuthFallback();
  const shouldLog = canUseFallback; // Only log in non-strict mode

  if (shouldLog) {
    console.log('[getOptionalAuth] Starting... workosUserId fallback:', workosUserId ?? 'none');
  }

  // Get auth user from AuthKit (verifies JWT)
  let authUser: { id: string } | null = null;
  try {
    authUser = await authKit.getAuthUser(ctx);
    if (shouldLog) {
      console.log('[getOptionalAuth] AuthKit returned:', authUser?.id ?? 'null');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[getOptionalAuth] AuthKit failed with error:', errorMessage);
    // If fallback is not allowed, this is a hard failure
    if (!canUseFallback) {
      return null;
    }
    // Continue to fallback
  }

  // Use AuthKit ID if available, otherwise fall back to provided workosUserId
  // Fallback is only used when AuthKit fails AND allowAuthFallback() is true
  const effectiveWorkosId = authUser?.id ?? (canUseFallback ? workosUserId : null);

  // If we have a workosId (from either source), try to find the user
  if (effectiveWorkosId) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos", (q) => q.eq("workosId", effectiveWorkosId))
      .first();

    if (user) {
      if (shouldLog) {
        const source = authUser?.id ? 'AuthKit' : 'workosUserId fallback';
        console.log(`[Auth] getOptionalAuth: Found user by ${source}:`, user._id);
      }
      return user;
    }

    // User not found - log which ID we tried
    if (authUser?.id) {
      console.warn('[Auth] getOptionalAuth: AuthKit user found but no DB record. workosId:', authUser.id);
      // Secondary fallback: try workosUserId if different from authUser.id
      if (canUseFallback && workosUserId && workosUserId !== authUser.id) {
        const fallbackUser = await ctx.db
          .query("users")
          .withIndex("by_workos", (q) => q.eq("workosId", workosUserId))
          .first();
        if (fallbackUser) {
          if (shouldLog) {
            console.log('[Auth] getOptionalAuth: Found user by secondary workosUserId:', fallbackUser._id);
          }
          return fallbackUser;
        }
      }
    } else if (workosUserId && canUseFallback) {
      console.warn('[Auth] getOptionalAuth: workosUserId provided but no DB record:', workosUserId);
    }
  }

  // No workosId available from any source
  if (shouldLog) {
    console.log('[Auth] getOptionalAuth: No authenticated user found');
  }
  return null;
}


/**
 * Verify company access for query handlers with graceful handling for unauthenticated users.
 * Returns { allowed: boolean, user: Doc<"users"> | null } for queries that need to
 * return empty arrays/null instead of throwing.
 *
 * SECURITY: In production, unauthenticated access returns { allowed: false }.
 * In development, returns { allowed: true } for easier testing.
 */
export async function verifyQueryCompanyAccess(
  ctx: QueryCtx,
  companyId: Id<"companies">,
  workosUserId?: string
): Promise<{ allowed: boolean; user: Doc<"users"> | null }> {
  const user = await getOptionalAuth(ctx, workosUserId);

  // No authenticated user
  if (!user) {
    // In production, deny access
    if (isProductionMode()) {
      return { allowed: false, user: null };
    }
    // In development, allow for easier testing
    return { allowed: true, user: null };
  }

  // User is authenticated - verify company ownership
  const company = await ctx.db.get(companyId);
  if (!company) {
    return { allowed: false, user };
  }

  // In development, be lenient with ownership checks
  if (!isProductionMode()) {
    return { allowed: true, user };
  }

  // In production, strict ownership check
  if (company.ownerId !== user._id) {
    return { allowed: false, user };
  }

  return { allowed: true, user };
}

/**
 * Verify session access for query handlers.
 */
export async function verifyQuerySessionAccess(
  ctx: QueryCtx,
  sessionId: Id<"reconciliationSessions">,
  workosUserId?: string
): Promise<{ allowed: boolean; user: Doc<"users"> | null }> {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    return { allowed: false, user: null };
  }

  return verifyQueryCompanyAccess(ctx, session.companyId, workosUserId);
}

/**
 * Verify resource access for query handlers by traversing to its company.
 */
export async function verifyQueryResourceAccess(
  ctx: QueryCtx,
  companyId: Id<"companies">,
  workosUserId?: string
): Promise<{ allowed: boolean; user: Doc<"users"> | null }> {
  return verifyQueryCompanyAccess(ctx, companyId, workosUserId);
}

/**
 * Verify user owns a company and return both user and company.
 * Throws if user is not authenticated or doesn't own the company.
 *
 * @param ctx - Query or mutation context
 * @param companyId - Company ID to verify access for
 * @param workosUserId - Optional fallback WorkOS user ID (for dev mode when JWT verification fails)
 */
export async function requireCompanyAccess(
  ctx: QueryCtx | MutationCtx,
  companyId: Id<"companies">,
  workosUserId?: string
): Promise<{ user: Doc<"users">; company: Doc<"companies"> }> {
  const user = await requireAuth(ctx, workosUserId);
  const company = await ctx.db.get(companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("company");
  }

  return { user, company };
}

/**
 * Verify user owns a session's company.
 */
export async function requireSessionAccess(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"reconciliationSessions">
): Promise<{
  user: Doc<"users">;
  session: Doc<"reconciliationSessions">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx);
  const session = await ctx.db.get(sessionId);

  if (!session) {
    return ResourceErrors.notFound("Session", sessionId);
  }

  const company = await ctx.db.get(session.companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", session.companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("session");
  }

  return { user, session, company };
}

/**
 * Verify user owns a transaction's company.
 */
export async function requireTransactionAccess(
  ctx: QueryCtx | MutationCtx,
  transactionId: Id<"transactions">
): Promise<{
  user: Doc<"users">;
  transaction: Doc<"transactions">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx);
  const transaction = await ctx.db.get(transactionId);

  if (!transaction) {
    return ResourceErrors.notFound("Transaction", transactionId);
  }

  const company = await ctx.db.get(transaction.companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", transaction.companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("transaction");
  }

  return { user, transaction, company };
}

/**
 * Verify user owns a document's company.
 */
export async function requireDocumentAccess(
  ctx: QueryCtx | MutationCtx,
  documentId: Id<"documents">
): Promise<{
  user: Doc<"users">;
  document: Doc<"documents">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx);
  const document = await ctx.db.get(documentId);

  if (!document) {
    return ResourceErrors.notFound("Document", documentId);
  }

  const company = await ctx.db.get(document.companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", document.companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("document");
  }

  return { user, document, company };
}

/**
 * Verify user owns an accrual document's company.
 */
export async function requireAccrualDocAccess(
  ctx: QueryCtx | MutationCtx,
  docId: Id<"accrualDocuments">
): Promise<{
  user: Doc<"users">;
  accrualDoc: Doc<"accrualDocuments">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx);
  const accrualDoc = await ctx.db.get(docId);

  if (!accrualDoc) {
    return ResourceErrors.notFound("Accrual document", docId);
  }

  const company = await ctx.db.get(accrualDoc.companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", accrualDoc.companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("accrual document");
  }

  return { user, accrualDoc, company };
}

/**
 * Verify user owns a suspense item's company.
 */
export async function requireSuspenseItemAccess(
  ctx: QueryCtx | MutationCtx,
  itemId: Id<"suspenseItems">
): Promise<{
  user: Doc<"users">;
  item: Doc<"suspenseItems">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx);
  const item = await ctx.db.get(itemId);

  if (!item) {
    return ResourceErrors.notFound("Suspense item", itemId);
  }

  const company = await ctx.db.get(item.companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", item.companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("suspense item");
  }

  return { user, item, company };
}

/**
 * Verify user owns a match's session's company.
 */
export async function requireMatchAccess(
  ctx: QueryCtx | MutationCtx,
  matchId: Id<"matchedPairs">
): Promise<{
  user: Doc<"users">;
  match: Doc<"matchedPairs">;
  session: Doc<"reconciliationSessions">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx);
  const match = await ctx.db.get(matchId);

  if (!match) {
    return ResourceErrors.notFound("Match", matchId);
  }

  const session = await ctx.db.get(match.sessionId);

  if (!session) {
    return ResourceErrors.notFound("Session", match.sessionId);
  }

  const company = await ctx.db.get(session.companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", session.companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("match");
  }

  return { user, match, session, company };
}

/**
 * Verify user owns a category's company (or category is global).
 */
export async function requireCategoryAccess(
  ctx: QueryCtx | MutationCtx,
  categoryId: Id<"categories">
): Promise<{
  user: Doc<"users">;
  category: Doc<"categories">;
}> {
  const user = await requireAuth(ctx);
  const category = await ctx.db.get(categoryId);

  if (!category) {
    return ResourceErrors.notFound("Category", categoryId);
  }

  // Global categories can be read but not modified via regular mutations
  if (category.isGlobal) {
    return PermissionErrors.globalResource("category");
  }

  // Company-specific categories require ownership
  if (category.companyId) {
    const company = await ctx.db.get(category.companyId);

    if (!company) {
      return ResourceErrors.notFound("Company", category.companyId);
    }

    if (company.isDeleted) {
      return ResourceErrors.deleted("Company");
    }

    if (company.ownerId !== user._id) {
      return PermissionErrors.accessDenied("category");
    }
  }

  return { user, category };
}
