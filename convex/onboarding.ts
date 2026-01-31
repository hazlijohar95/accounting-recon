import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Onboarding Progress Mutations
 *
 * Persists onboarding state so users can resume if browser closes mid-flow.
 */

// Get existing onboarding progress for a user
export const getProgress = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Save or update onboarding progress
export const saveProgress = mutation({
  args: {
    userId: v.string(),
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
    const existing = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
        userId: args.userId,
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
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
