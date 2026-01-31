import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  validateNonEmpty,
  validateCurrency,
} from "./lib/validation";
import { requireCompanyAccess, getOptionalAuth, verifyQueryResourceAccess, isProductionMode } from "./lib/auth";
import { filterUndefinedValues } from "./lib/validation";
import { AuthErrors } from "./lib/errors";
import { companyDocValidator, companyIdValidator } from "./lib/validators";

// ============ QUERIES ============

// Get a single company by ID
export const get = query({
  args: { id: v.id("companies") },
  returns: v.union(companyDocValidator, v.null()),
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.id);
    if (!company || company.isDeleted) {
      return null;
    }

    // SECURITY: Verify ownership
    const { allowed } = await verifyQueryResourceAccess(ctx, args.id);
    if (!allowed) return null;

    return company;
  },
});

// List all companies for the authenticated user
export const listByOwner = query({
  args: {
    // Keep for backwards compatibility, but will be ignored if user is authenticated
    ownerId: v.optional(v.id("users")),
  },
  returns: v.array(companyDocValidator),
  handler: async (ctx, args) => {
    // Try to get authenticated user
    const user = await getOptionalAuth(ctx);

    // If authenticated, use that user's ID; otherwise fall back to provided ownerId (for demo mode)
    const ownerIdToUse = user?._id ?? args.ownerId;

    if (!ownerIdToUse) {
      return [];
    }

    const companies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerIdToUse))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
    return companies;
  },
});

// Get company by code
export const getByCode = query({
  args: { code: v.string() },
  returns: v.union(companyDocValidator, v.null()),
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .first();

    if (!company) return null;

    // SECURITY: Verify ownership
    const { allowed } = await verifyQueryResourceAccess(ctx, company._id);
    if (!allowed) return null;

    return company;
  },
});

// ============ MUTATIONS ============

// Create a new company
export const create = mutation({
  args: {
    name: v.string(),
    tradingAs: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    industry: v.optional(v.string()),
    industryCategory: v.optional(v.string()),
    fiscalYearEnd: v.optional(v.string()),
    taxRegistered: v.optional(v.boolean()),
    taxNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    primaryBank: v.optional(v.string()),
    primaryAccountNumber: v.optional(v.string()),
    bankAccounts: v.optional(
      v.array(
        v.object({
          bank: v.string(),
          accountNumber: v.string(),
          accountType: v.string(),
          isPrimary: v.boolean(),
        })
      )
    ),
    currency: v.string(),
    // Keep ownerId for backwards compatibility (demo mode), but prefer auth context
    ownerId: v.optional(v.id("users")),
  },
  returns: companyIdValidator,
  handler: async (ctx, args) => {
    // Get owner from auth context, falling back to provided ownerId for demo mode
    const user = await getOptionalAuth(ctx);
    const ownerId = user?._id ?? args.ownerId;

    if (!ownerId) {
      return AuthErrors.unauthorized("Please sign in to create a company");
    }

    // Validate inputs
    validateNonEmpty(args.name, "name");
    validateCurrency(args.currency);

    const now = Date.now();

    // Generate unique company code from name (e.g., "Cafe Jaya Trading" -> "CJT001")
    const words = args.name.trim().split(/\s+/);
    const initials = words
      .map((w) => w.charAt(0).toUpperCase())
      .join("")
      .slice(0, 4); // Max 4 letters

    // ATOMIC: Use counter table to prevent race conditions
    // This ensures unique codes even with concurrent company creations
    const counterKey = `company_code:${initials}`;
    const existingCounter = await ctx.db
      .query("counters")
      .withIndex("by_key", (q) => q.eq("key", counterKey))
      .first();

    let nextNum: number;
    if (existingCounter) {
      // Atomically increment - Convex mutations are transactional
      nextNum = existingCounter.value + 1;
      await ctx.db.patch(existingCounter._id, {
        value: nextNum,
        updatedAt: now,
      });
    } else {
      // First company with these initials - create counter starting at 1
      nextNum = 1;
      await ctx.db.insert("counters", {
        key: counterKey,
        value: nextNum,
        updatedAt: now,
      });
    }

    // Generate code with 3-digit padding (e.g., "CJT001")
    const code = `${initials}${nextNum.toString().padStart(3, "0")}`;

    const companyId = await ctx.db.insert("companies", {
      name: args.name,
      tradingAs: args.tradingAs,
      registrationNumber: args.registrationNumber,
      industry: args.industry,
      industryCategory: args.industryCategory,
      fiscalYearEnd: args.fiscalYearEnd,
      taxRegistered: args.taxRegistered,
      taxNumber: args.taxNumber,
      bankName: args.bankName,
      primaryBank: args.primaryBank,
      primaryAccountNumber: args.primaryAccountNumber,
      bankAccounts: args.bankAccounts,
      currency: args.currency,
      code,
      ownerId, // Server-validated owner
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    return companyId;
  },
});

// Update company details
export const update = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    tradingAs: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    industry: v.optional(v.string()),
    industryCategory: v.optional(v.string()),
    fiscalYearEnd: v.optional(v.string()),
    taxRegistered: v.optional(v.boolean()),
    taxNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    primaryBank: v.optional(v.string()),
    primaryAccountNumber: v.optional(v.string()),
    bankAccounts: v.optional(
      v.array(
        v.object({
          bank: v.string(),
          accountNumber: v.string(),
          accountType: v.string(),
          isPrimary: v.boolean(),
        })
      )
    ),
    currency: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
  },
  returns: companyIdValidator,
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Verify ownership - will throw if not authorized
    await requireCompanyAccess(ctx, id);

    // Validate optional updates
    if (updates.name !== undefined) validateNonEmpty(updates.name, "name");
    if (updates.currency !== undefined) validateCurrency(updates.currency);

    await ctx.db.patch(id, {
      ...filterUndefinedValues(updates),
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Complete onboarding for a company
export const completeOnboarding = mutation({
  args: { id: v.id("companies") },
  returns: companyIdValidator,
  handler: async (ctx, args) => {
    // Verify ownership
    await requireCompanyAccess(ctx, args.id);

    await ctx.db.patch(args.id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Soft delete a company
export const remove = mutation({
  args: { id: v.id("companies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify ownership
    await requireCompanyAccess(ctx, args.id);

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });
  },
});
