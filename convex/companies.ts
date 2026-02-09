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
import { authKit } from "./auth";

// ============ QUERIES ============

// Get a single company by ID
export const get = query({
  args: {
    id: v.id("companies"),
    // WorkOS user ID for auth fallback
    workosUserId: v.optional(v.string()),
  },
  returns: v.union(companyDocValidator, v.null()),
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.id);
    if (!company || company.isDeleted) {
      return null;
    }

    // SECURITY: Verify ownership (with workosUserId fallback)
    const { allowed } = await verifyQueryResourceAccess(ctx, args.id, args.workosUserId);
    if (!allowed) return null;

    return company;
  },
});

// List all companies for the authenticated user
export const listByOwner = query({
  args: {
    // Keep for backwards compatibility, but will be ignored if user is authenticated
    ownerId: v.optional(v.id("users")),
    // WorkOS user ID for auth fallback (when Convex AuthKit can't verify frontend tokens)
    workosUserId: v.optional(v.string()),
  },
  returns: v.array(companyDocValidator),
  handler: async (ctx, args) => {
    const shouldLog = !isProductionMode();

    if (shouldLog) {
      console.log('[listByOwner] Called with args:', {
        ownerId: args.ownerId ?? 'undefined',
        workosUserId: args.workosUserId ?? 'undefined',
      });
    }

    // Try to get authenticated user (with workosUserId fallback)
    let user = await getOptionalAuth(ctx, args.workosUserId);

    if (shouldLog) {
      console.log('[listByOwner] getOptionalAuth returned:', user?._id ?? 'null');
    }

    // ENHANCED: If getOptionalAuth failed but we have workosUserId, try direct lookup
    // This handles cases where AuthKit token verification fails but the user exists in DB
    if (!user && args.workosUserId) {
      const directLookup = await ctx.db
        .query("users")
        .withIndex("by_workos", (q) => q.eq("workosId", args.workosUserId))
        .first();

      if (directLookup) {
        user = directLookup;
        if (shouldLog) {
          console.log('[listByOwner] Found user via direct workosId lookup:', user._id);
        }
      } else if (shouldLog) {
        console.log('[listByOwner] Direct workosId lookup failed - no user found for:', args.workosUserId);
      }
    }

    // If authenticated, use that user's ID; otherwise fall back to provided ownerId (dev/demo only)
    const ownerIdToUse = user?._id ?? (!isProductionMode() ? args.ownerId : undefined);

    if (shouldLog) {
      console.log('[listByOwner] ownerIdToUse:', ownerIdToUse ?? 'null');
    }

    if (!ownerIdToUse) {
      if (shouldLog) {
        console.log('[listByOwner] No owner ID, returning empty');
        // Debug: List all users to check if any exist
        const allUsers = await ctx.db.query("users").take(5);
        console.log('[listByOwner] Debug - sample users in DB:', allUsers.map(u => ({ id: u._id, workosId: u.workosId, email: u.email })));
      }
      return [];
    }

    const companies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerIdToUse))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    if (shouldLog) {
      console.log('[listByOwner] Found companies:', companies.length);
      if (companies.length === 0) {
        // Debug: Check if any companies exist for this owner
        const allCompanies = await ctx.db.query("companies").take(5);
        console.log('[listByOwner] Debug - sample companies in DB:', allCompanies.map(c => ({ id: c._id, ownerId: c.ownerId, name: c.name })));
      }
    }
    return companies;
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
    // For just-in-time user creation when webhook hasn't arrived yet
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
    // WorkOS user ID for creating user record when Convex Auth isn't configured
    workosUserId: v.optional(v.string()),
  },
  returns: v.object({
    companyId: companyIdValidator,
    ownerId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    console.log('[Company Create] Starting with args:', {
      name: args.name,
      userEmail: args.userEmail,
      workosUserId: args.workosUserId,
      ownerId: args.ownerId,
    });

    // Step 1: Try to get authenticated user from AuthKit (the token)
    let authUser: { id: string } | null = null;
    try {
      authUser = await authKit.getAuthUser(ctx);
      console.log('[Company Create] AuthKit user:', authUser?.id ?? 'null');
    } catch (e) {
      console.warn('[Company Create] AuthKit not configured or failed:', e);
    }

    // Step 2: Find user in our database by WorkOS ID from token
    let user = null;
    if (authUser?.id) {
      user = await ctx.db
        .query("users")
        .withIndex("by_workos", (q) => q.eq("workosId", authUser!.id))
        .first();
      console.log('[Company Create] User found by workosId from token:', user?._id ?? 'null');
    }

    // Step 3: JIT user creation - always create if not found and we have identity info
    if (!user) {
      // Determine the WorkOS ID to use (prefer token, fall back to args)
      const effectiveWorkosId = authUser?.id ?? args.workosUserId;
      const effectiveEmail = args.userEmail;

      console.log('[Company Create] No user found, attempting JIT creation:', {
        effectiveWorkosId,
        effectiveEmail,
      });

      if (effectiveWorkosId && effectiveEmail) {
        // Check if user exists by WorkOS ID (in case token lookup failed but user exists)
        const existingByWorkos = await ctx.db
          .query("users")
          .withIndex("by_workos", (q) => q.eq("workosId", effectiveWorkosId))
          .first();

        if (existingByWorkos) {
          user = existingByWorkos;
          console.log('[Company Create] Found existing user by workosId:', user._id);
        } else {
          // Check if user exists by email
          const existingByEmail = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", effectiveEmail))
            .first();

          if (existingByEmail) {
            // Link existing user to WorkOS ID
            await ctx.db.patch(existingByEmail._id, { workosId: effectiveWorkosId });
            user = await ctx.db.get(existingByEmail._id);
            console.log('[Company Create] Linked workosId to existing user:', user?._id);
          } else {
            // Create new user record
            const newUserId = await ctx.db.insert("users", {
              email: effectiveEmail,
              name: args.userName,
              workosId: effectiveWorkosId,
              createdAt: Date.now(),
            });
            user = await ctx.db.get(newUserId);
            console.log('[Company Create] Created new user:', newUserId);
          }
        }
      } else if (effectiveEmail) {
        // No WorkOS ID available - check by email only (for demo/dev mode)
        const existingByEmail = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", effectiveEmail))
          .first();
        if (existingByEmail) {
          user = existingByEmail;
          console.log('[Company Create] Found user by email (no workosId):', user._id);
        }
      }
    }

    // CRITICAL: Verify user was found or created with a valid Convex _id
    if (!user?._id) {
      console.error('[Company Create] CRITICAL: User creation failed - no valid user._id');
      console.error('[Company Create] Debug info:', {
        hasUser: !!user,
        userId: user?._id ?? 'undefined',
        workosUserId: args.workosUserId,
        userEmail: args.userEmail,
      });
      return AuthErrors.unauthorized("User creation failed. Please try again.");
    }

    // Use the Convex user._id as ownerId (NEVER use client-provided ownerId)
    const ownerId = user._id;

    console.log('[Company Create] Final ownerId (Convex ID):', ownerId ?? 'null');
    console.log('[Company Create] Verification - ownerId type check:', typeof ownerId, 'starts with:', String(ownerId).substring(0, 10));

    if (!ownerId) {
      console.error('[Company Create] AUTH FAILED - no user found or created');
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

    console.log('[Company Create] Success, returning companyId:', companyId, 'ownerId:', ownerId);
    return { companyId, ownerId };
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
    workosUserId: v.optional(v.string()),
  },
  returns: companyIdValidator,
  handler: async (ctx, args) => {
    const { id, workosUserId, ...updates } = args;

    // Verify ownership - will throw if not authorized
    await requireCompanyAccess(ctx, id, workosUserId);

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
  args: {
    id: v.id("companies"),
    workosUserId: v.optional(v.string()),
  },
  returns: companyIdValidator,
  handler: async (ctx, args) => {
    // Verify ownership
    await requireCompanyAccess(ctx, args.id, args.workosUserId);

    await ctx.db.patch(args.id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

// Soft delete a company
export const remove = mutation({
  args: {
    id: v.id("companies"),
    workosUserId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify ownership
    await requireCompanyAccess(ctx, args.id, args.workosUserId);

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });
  },
});
