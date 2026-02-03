/**
 * Workspace Authorization Helpers
 *
 * Centralized authorization functions for workspace/worksheet access.
 * Used by: workspaces.ts, worksheetChat.ts, agents.ts
 *
 * @module convex/lib/workspace-auth
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import {
  verifyQueryCompanyAccess,
  requireCompanyAccess,
} from "./auth";
import { ResourceErrors } from "./errors";

/**
 * Verify workspace access for queries (returns allowed flag instead of throwing).
 * Uses standard auth helpers from lib/auth.
 */
export async function verifyQueryWorkspaceAccess(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  workosUserId?: string
): Promise<{
  allowed: boolean;
  user: Doc<"users"> | null;
  workspace: Doc<"workspaces"> | null;
}> {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    return { allowed: false, user: null, workspace: null };
  }

  const { allowed, user } = await verifyQueryCompanyAccess(
    ctx,
    workspace.companyId,
    workosUserId
  );
  return { allowed, user, workspace };
}

/**
 * Verify worksheet access for queries.
 */
export async function verifyQueryWorksheetAccess(
  ctx: QueryCtx,
  worksheetId: Id<"worksheets">,
  workosUserId?: string
): Promise<{
  allowed: boolean;
  user: Doc<"users"> | null;
  worksheet: Doc<"worksheets"> | null;
  workspace: Doc<"workspaces"> | null;
}> {
  const worksheet = await ctx.db.get(worksheetId);
  if (!worksheet) {
    return { allowed: false, user: null, worksheet: null, workspace: null };
  }

  const { allowed, user, workspace } = await verifyQueryWorkspaceAccess(
    ctx,
    worksheet.workspaceId,
    workosUserId
  );
  return { allowed, user, worksheet, workspace };
}

/**
 * Require workspace access for mutations (throws if unauthorized).
 * Uses standard auth helpers from lib/auth.
 *
 * @param ctx - Mutation context
 * @param workspaceId - Workspace ID to verify access for
 * @param workosUserId - Optional fallback WorkOS user ID (for dev mode when JWT verification fails)
 */
export async function requireWorkspaceAccess(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  workspace: Doc<"workspaces">;
  company: Doc<"companies">;
}> {
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    return ResourceErrors.notFound("Workspace", workspaceId);
  }

  const { user, company } = await requireCompanyAccess(
    ctx,
    workspace.companyId,
    workosUserId
  );
  return { user, workspace, company };
}

/**
 * Require worksheet access for mutations.
 *
 * @param ctx - Mutation context
 * @param worksheetId - Worksheet ID to verify access for
 * @param workosUserId - Optional fallback WorkOS user ID (for dev mode when JWT verification fails)
 */
export async function requireWorksheetAccess(
  ctx: MutationCtx,
  worksheetId: Id<"worksheets">,
  workosUserId?: string
): Promise<{
  user: Doc<"users">;
  worksheet: Doc<"worksheets">;
  workspace: Doc<"workspaces">;
  company: Doc<"companies">;
}> {
  const worksheet = await ctx.db.get(worksheetId);
  if (!worksheet) {
    return ResourceErrors.notFound("Worksheet", worksheetId);
  }

  const { user, workspace, company } = await requireWorkspaceAccess(
    ctx,
    worksheet.workspaceId,
    workosUserId
  );
  return { user, worksheet, workspace, company };
}
