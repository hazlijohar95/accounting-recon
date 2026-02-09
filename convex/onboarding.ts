import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getOptionalAuth, isProductionMode } from "./lib/auth";

/**
 * Onboarding Progress Mutations
 *
 * Persists onboarding state so users can resume if browser closes mid-flow.
 */

// Get existing onboarding progress for a user
export const getProgress = query({
  args: {},
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx);
    if (!user) {
      return null;
    }
    return await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

// Save or update onboarding progress
export const saveProgress = mutation({
  args: {
    currentStep: v.number(),
    data: v.object({
      companyName: v.optional(v.string()),
      industryCategory: v.optional(v.string()),
      taxRegistered: v.optional(v.string()),
      taxNumber: v.optional(v.string()),
      primaryBank: v.optional(v.string()),
      fiscalYearEnd: v.optional(v.string()),
    }),
    isCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const existing = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing progress
      await ctx.db.patch(existing._id, {
        currentStep: args.currentStep,
        data: args.data,
        isCompleted: args.isCompleted ?? false,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new progress record
      return await ctx.db.insert("onboardingProgress", {
        userId: user._id,
        currentStep: args.currentStep,
        data: args.data,
        isCompleted: args.isCompleted ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Mark onboarding as completed
export const markCompleted = mutation({
  args: {},
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const existing = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isCompleted: true,
        updatedAt: Date.now(),
      });
    }
  },
});

// Delete onboarding progress (cleanup after successful onboarding)
export const deleteProgress = mutation({
  args: {},
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const existing = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Dev-only cleanup for legacy onboarding progress rows with string userId
export const cleanupLegacyProgress = mutation({
  args: {},
  handler: async (ctx) => {
    if (isProductionMode()) {
      throw new Error("cleanupLegacyProgress is not allowed in production");
    }

    const allRows = await ctx.db.query("onboardingProgress").collect();
    let deleted = 0;

    for (const row of allRows) {
      if (typeof row.userId === "string") {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }

    return { deleted };
  },
});
