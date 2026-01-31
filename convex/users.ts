import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, getOptionalAuth } from "./lib/auth";
import { AuthErrors, ResourceErrors } from "./lib/errors";
import { userDocValidator, userIdValidator } from "./lib/validators";

// ============ QUERIES ============

// Get user by ID
export const get = query({
  args: { id: v.id("users") },
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    return user;
  },
});

// Get user by WorkOS ID (for auth)
export const getByWorkosId = query({
  args: { workosId: v.string() },
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos", (q) => q.eq("workosId", args.workosId))
      .first();
    return user;
  },
});

// Get current authenticated user
export const getCurrentUser = query({
  args: {},
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx) => {
    return await getOptionalAuth(ctx);
  },
});

// ============ MUTATIONS ============

// Create a new user (called after WorkOS auth or for demo mode)
// Note: In production, users are created via WorkOS webhooks in auth.ts
export const create = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    workosId: v.optional(v.string()),
  },
  returns: userIdValidator,
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // Update existing user with new info
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
        workosId: args.workosId ?? existing.workosId,
      });
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      ...args,
      createdAt: Date.now(),
    });
    return userId;
  },
});

// Update user profile - users can only update their own profile
export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: userIdValidator,
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Get authenticated user
    const authUser = await getOptionalAuth(ctx);

    // Verify user is updating their own profile
    if (authUser && authUser._id !== id) {
      return AuthErrors.unauthorized("You can only update your own profile");
    }

    // If no authenticated user, allow update for demo mode
    // but verify the user exists
    const targetUser = await ctx.db.get(id);
    if (!targetUser) {
      return ResourceErrors.notFound("User", id);
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
    return id;
  },
});
