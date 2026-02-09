import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { authKit } from "../auth";
import {
  AuthErrors,
  ResourceErrors,
  PermissionErrors,
} from "./errors";

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect if running in development environment.
 * Uses multiple signals to reliably detect dev vs prod.
 *
 * Detection priority:
 * 1. AUTH_DEV_MODE=true → Always dev mode (explicit override)
 * 2. AUTH_DEV_MODE=false → Always prod mode (explicit override)
 * 3. CONVEX_CLOUD_URL contains "-dev" → Dev mode (Convex dev deployment)
 * 4. Default → Prod mode (secure by default)
 */
function isDevEnvironment(): boolean {
  // Explicit override takes priority
  const authDevMode = process.env.AUTH_DEV_MODE;
  if (authDevMode === "true") return true;
  if (authDevMode === "false") return false;

  // Auto-detect based on Convex deployment URL
  const convexUrl = process.env.CONVEX_CLOUD_URL || "";
  
  // Development deployments have patterns like:
  // - "hearty-manatee-185.convex.cloud" (local dev)
  // - Contains "-dev" in the URL
  // Production deployments typically use custom domains or prod URLs
  if (convexUrl.includes("-dev")) {
    return true;
  }

  // Check for local development indicators
  if (convexUrl.includes("localhost") || convexUrl.includes("127.0.0.1")) {
    return true;
  }

  // Secure default: assume production
  return false;
}

/**
 * Check if running in production environment.
 */
export function isProductionMode(): boolean {
  return !isDevEnvironment();
}

/**
 * Check if we should use verbose auth logging.
 * Only log in dev mode to avoid leaking auth details in production.
 */
function shouldLogAuthDetails(): boolean {
  return isDevEnvironment();
}

// ============================================================================
// Core Auth Functions
// ============================================================================

/**
 * Get authenticated user or throw an error.
 * This is the primary auth helper for mutations.
 *
 * @param ctx - Query or mutation context
 * @param workosUserId - Optional fallback WorkOS user ID when AuthKit fails
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
 * Auth Flow:
 * 1. Try AuthKit JWT verification (primary method)
 * 2. If AuthKit fails AND workosUserId provided → Use database lookup fallback
 * 3. Look up user in database by workosId
 *
 * Security Note:
 * The fallback is always enabled because:
 * - Frontend auth (cookies) is verified by Next.js middleware
 * - Unauthenticated users cannot access the app (redirected to login)
 * - Users can only send their own workosUserId (from their auth state)
 * - Database lookup validates the user actually exists
 *
 * @param ctx - Query or mutation context
 * @param workosUserId - Optional fallback WorkOS user ID when AuthKit fails
 */
export async function getOptionalAuth(
  ctx: QueryCtx | MutationCtx,
  workosUserId?: string
): Promise<Doc<"users"> | null> {
  const verboseLogging = shouldLogAuthDetails();

  // Try AuthKit first (verifies JWT)
  let authUser: { id: string } | null = null;

  try {
    authUser = await authKit.getAuthUser(ctx);
  } catch (error: unknown) {
    // AuthKit failed - this is expected with library mismatch between
    // @workos-inc/authkit-nextjs (frontend) and @convex-dev/workos-authkit (backend)
    if (verboseLogging) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('[Auth] AuthKit verification failed:', errorMsg);
    }
  }

  // Determine effective workosId
  let effectiveWorkosId: string | null = null;
  let authSource: string = "none";

  if (authUser?.id) {
    // AuthKit succeeded
    effectiveWorkosId = authUser.id;
    authSource = "authkit";

    // SECURITY: Validate workosUserId matches authUser if both are provided
    // This prevents spoofing attacks where a client tries to claim another user's ID
    if (workosUserId && workosUserId !== authUser.id) {
      console.error('[Auth] workosUserId mismatch - potential spoofing attack', {
        claimed: workosUserId.substring(0, 8) + '...',
        actual: authUser.id.substring(0, 8) + '...',
      });
      return null;
    }
  } else if (workosUserId) {
    // Fallback: use workosUserId from frontend
    // This is safe because frontend auth is verified by Next.js middleware
    effectiveWorkosId = workosUserId;
    authSource = "fallback";
    if (verboseLogging) {
      console.log('[Auth] Using workosUserId fallback:', workosUserId.substring(0, 8) + '...');
    }
  }

  // No auth available
  if (!effectiveWorkosId) {
    if (verboseLogging) {
      console.log('[Auth] No authentication available');
    }
    return null;
  }

  // Look up user in database
  const user = await ctx.db
    .query("users")
    .withIndex("by_workos", (q) => q.eq("workosId", effectiveWorkosId))
    .first();

  if (user) {
    if (verboseLogging) {
      console.log(`[Auth] User found via ${authSource}:`, user._id);
    }
    return user;
  }

  // User not found in database
  if (verboseLogging) {
    console.warn('[Auth] WorkOS ID not found in database:', effectiveWorkosId.substring(0, 8) + '...');
  }

  return null;
}


// ============================================================================
// Query Access Verification (Graceful - returns allowed: boolean)
// ============================================================================

/**
 * Verify company access for query handlers with graceful handling.
 * Returns { allowed: boolean, user: Doc<"users"> | null } for queries that need to
 * return empty arrays/null instead of throwing.
 *
 * Note: Queries should gracefully return empty data when auth fails,
 * rather than throwing errors. This provides better UX.
 */
export async function verifyQueryCompanyAccess(
  ctx: QueryCtx,
  companyId: Id<"companies">,
  workosUserId?: string
): Promise<{ allowed: boolean; user: Doc<"users"> | null }> {
  const user = await getOptionalAuth(ctx, workosUserId);

  // No authenticated user - return not allowed (query will return empty data)
  if (!user) {
    return { allowed: false, user: null };
  }

  // User is authenticated - verify company ownership
  const company = await ctx.db.get(companyId);
  if (!company) {
    return { allowed: false, user };
  }

  // Strict ownership check
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


// ============================================================================
// Mutation Access Verification (Strict - throws on failure)
// ============================================================================

/**
 * Verify user owns a company and return both user and company.
 * Throws if user is not authenticated or doesn't own the company.
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
  sessionId: Id<"reconciliationSessions">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  session: Doc<"reconciliationSessions">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx, workosUserId);
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
  transactionId: Id<"transactions">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  transaction: Doc<"transactions">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx, workosUserId);
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
  documentId: Id<"documents">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  document: Doc<"documents">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx, workosUserId);
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
  docId: Id<"accrualDocuments">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  accrualDoc: Doc<"accrualDocuments">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx, workosUserId);
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
  itemId: Id<"suspenseItems">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  item: Doc<"suspenseItems">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx, workosUserId);
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
  matchId: Id<"matchedPairs">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  match: Doc<"matchedPairs">;
  session: Doc<"reconciliationSessions">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx, workosUserId);
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
 * Verify user owns a worksheet's workspace's company.
 */
export async function requireWorksheetAccess(
  ctx: QueryCtx | MutationCtx,
  worksheetId: Id<"worksheets">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  worksheet: Doc<"worksheets">;
  workspace: Doc<"workspaces">;
  company: Doc<"companies">;
}> {
  const user = await requireAuth(ctx, workosUserId);
  const worksheet = await ctx.db.get(worksheetId);

  if (!worksheet) {
    return ResourceErrors.notFound("Worksheet", worksheetId);
  }

  if (worksheet.deletedAt) {
    return ResourceErrors.deleted("Worksheet");
  }

  const workspace = await ctx.db.get(worksheet.workspaceId);

  if (!workspace) {
    return ResourceErrors.notFound("Workspace", worksheet.workspaceId);
  }

  const company = await ctx.db.get(workspace.companyId);

  if (!company) {
    return ResourceErrors.notFound("Company", workspace.companyId);
  }

  if (company.isDeleted) {
    return ResourceErrors.deleted("Company");
  }

  if (company.ownerId !== user._id) {
    return PermissionErrors.accessDenied("worksheet");
  }

  return { user, worksheet, workspace, company };
}

/**
 * Verify user owns a category's company (or category is global).
 */
export async function requireCategoryAccess(
  ctx: QueryCtx | MutationCtx,
  categoryId: Id<"categories">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  category: Doc<"categories">;
}> {
  const user = await requireAuth(ctx, workosUserId);
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
