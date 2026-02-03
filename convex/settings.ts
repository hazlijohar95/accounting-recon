import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getOptionalAuth } from "./lib/auth";

/**
 * Settings module for user preferences, data export, and account management.
 *
 * Provides:
 * - User preferences persistence (date/number format, notifications)
 * - Export all user data (GDPR compliance)
 * - Delete user account and all associated data
 * - Rate limiting for destructive operations
 */

// ============ RATE LIMIT HELPERS ============

const RATE_LIMITS = {
  deleteAccount: { maxAttempts: 1, windowMs: 60 * 60 * 1000 }, // 1 per hour
  exportUserData: { maxAttempts: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 per day
};

async function checkRateLimit(
  ctx: { db: any },
  userId: any,
  action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const limit = RATE_LIMITS[action];
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  // Get existing rate limit record
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action", (q: any) => q.eq("userId", userId).eq("action", action))
    .first();

  if (!existing) {
    // No record - allowed
    return { allowed: true };
  }

  // Filter timestamps within the window
  const recentTimestamps = existing.timestamps.filter((ts: number) => ts > windowStart);

  if (recentTimestamps.length >= limit.maxAttempts) {
    // Rate limited - calculate retry time
    const oldestInWindow = Math.min(...recentTimestamps);
    const retryAfter = oldestInWindow + limit.windowMs - now;
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

async function recordRateLimitAttempt(
  ctx: { db: any },
  userId: any,
  action: string
): Promise<void> {
  const now = Date.now();
  const limit = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
  const windowStart = now - limit.windowMs;

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action", (q: any) => q.eq("userId", userId).eq("action", action))
    .first();

  if (existing) {
    // Update existing - keep only timestamps within window + new one
    const recentTimestamps = existing.timestamps.filter((ts: number) => ts > windowStart);
    await ctx.db.patch(existing._id, {
      timestamps: [...recentTimestamps, now],
      updatedAt: now,
    });
  } else {
    // Create new record
    await ctx.db.insert("rateLimits", {
      userId,
      action,
      timestamps: [now],
      updatedAt: now,
    });
  }
}

// ============ QUERIES ============

/**
 * Get user preferences from database.
 * Returns defaults if no preferences saved yet.
 */
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalAuth(ctx);

    // Default preferences
    const defaults = {
      theme: "system",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "1,234.56",
      emailNotifications: {
        reconciliationComplete: true,
        weeklyDigest: false,
        newFeatures: true,
      },
    };

    if (!user) {
      return defaults;
    }

    // Fetch from database
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!prefs) {
      return defaults;
    }

    // Merge with defaults (in case new preferences are added later)
    return {
      theme: "system", // Theme is managed by next-themes in localStorage
      dateFormat: prefs.dateFormat ?? defaults.dateFormat,
      numberFormat: prefs.numberFormat ?? defaults.numberFormat,
      emailNotifications: {
        reconciliationComplete: prefs.emailReconciliation ?? defaults.emailNotifications.reconciliationComplete,
        weeklyDigest: prefs.emailWeeklyDigest ?? defaults.emailNotifications.weeklyDigest,
        newFeatures: prefs.emailProductUpdates ?? defaults.emailNotifications.newFeatures,
      },
    };
  },
});

// ============ MUTATIONS ============

/**
 * Update user preferences.
 * Uses upsert logic - creates if not exists, updates if exists.
 */
export const updateUserPreferences = mutation({
  args: {
    dateFormat: v.optional(v.string()),
    numberFormat: v.optional(v.string()),
    emailReconciliation: v.optional(v.boolean()),
    emailWeeklyDigest: v.optional(v.boolean()),
    emailProductUpdates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Validate date format if provided
    if (args.dateFormat && !["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(args.dateFormat)) {
      throw new Error("Invalid date format. Must be DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD");
    }

    // Validate number format if provided
    if (args.numberFormat && !["1,234.56", "1.234,56", "1 234.56"].includes(args.numberFormat)) {
      throw new Error("Invalid number format. Must be 1,234.56, 1.234,56, or 1 234.56");
    }

    const now = Date.now();

    // Check if preferences exist
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...(args.dateFormat !== undefined && { dateFormat: args.dateFormat }),
        ...(args.numberFormat !== undefined && { numberFormat: args.numberFormat }),
        ...(args.emailReconciliation !== undefined && { emailReconciliation: args.emailReconciliation }),
        ...(args.emailWeeklyDigest !== undefined && { emailWeeklyDigest: args.emailWeeklyDigest }),
        ...(args.emailProductUpdates !== undefined && { emailProductUpdates: args.emailProductUpdates }),
        updatedAt: now,
      });
    } else {
      // Create new
      await ctx.db.insert("userPreferences", {
        userId: user._id,
        dateFormat: args.dateFormat,
        numberFormat: args.numberFormat,
        emailReconciliation: args.emailReconciliation,
        emailWeeklyDigest: args.emailWeeklyDigest,
        emailProductUpdates: args.emailProductUpdates,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Export all user data for GDPR compliance.
 * Returns a JSON object containing all user-owned data.
 * Rate limited to 5 exports per day.
 */
export const exportUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // Check rate limit
    const rateCheck = await checkRateLimit(ctx, user._id, "exportUserData");
    if (!rateCheck.allowed) {
      const retryMinutes = Math.ceil((rateCheck.retryAfter || 0) / (60 * 1000));
      throw new Error(`Rate limited. Please try again in ${retryMinutes} minutes.`);
    }

    // Record this attempt
    await recordRateLimitAttempt(ctx, user._id, "exportUserData");

    // Collect all user data
    const userData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
        createdAt: new Date(user.createdAt).toISOString(),
      },
    };

    // Get user preferences
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (preferences) {
      userData.preferences = {
        dateFormat: preferences.dateFormat,
        numberFormat: preferences.numberFormat,
        emailReconciliation: preferences.emailReconciliation,
        emailWeeklyDigest: preferences.emailWeeklyDigest,
        emailProductUpdates: preferences.emailProductUpdates,
      };
    }

    // Get all companies owned by user
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    userData.companies = companies.map((c) => ({
      name: c.name,
      code: c.code,
      currency: c.currency,
      industryCategory: c.industryCategory,
      fiscalYearEnd: c.fiscalYearEnd,
      createdAt: new Date(c.createdAt).toISOString(),
    }));

    // Get all transactions for each company
    const allTransactions = [];
    const allDocuments = [];
    const allAccrualDocs = [];
    const allSessions = [];
    const allMatches = [];

    for (const company of companies) {
      // Transactions
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      allTransactions.push(
        ...transactions.map((t) => ({
          companyName: company.name,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          status: t.status,
          category: t.category,
        }))
      );

      // Documents
      const documents = await ctx.db
        .query("documents")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      allDocuments.push(
        ...documents.map((d) => ({
          companyName: company.name,
          fileName: d.fileName,
          fileType: d.fileType,
          documentType: d.documentType,
          uploadedAt: new Date(d.uploadedAt).toISOString(),
        }))
      );

      // Accrual Documents
      const accrualDocs = await ctx.db
        .query("accrualDocuments")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      allAccrualDocs.push(
        ...accrualDocs.map((a) => ({
          companyName: company.name,
          docType: a.docType,
          docNumber: a.docNumber,
          docDate: a.docDate,
          amount: a.amount,
          counterparty: a.counterparty,
          status: a.status,
        }))
      );

      // Reconciliation Sessions
      const sessions = await ctx.db
        .query("reconciliationSessions")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      allSessions.push(
        ...sessions.map((s) => ({
          companyName: company.name,
          name: s.name,
          status: s.status,
          periodStart: s.periodStart,
          periodEnd: s.periodEnd,
          matchedCount: s.matchedCount,
          suspenseCount: s.suspenseCount,
          createdAt: new Date(s.createdAt).toISOString(),
        }))
      );

      // Get matches for sessions
      for (const session of sessions) {
        const matches = await ctx.db
          .query("matchedPairs")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        allMatches.push(
          ...matches.map((m) => ({
            sessionName: session.name,
            confidence: m.confidence,
            confidenceScore: m.confidenceScore,
            matchLayer: m.matchLayer,
            status: m.status,
            createdAt: new Date(m.createdAt).toISOString(),
          }))
        );
      }
    }

    userData.transactions = allTransactions;
    userData.documents = allDocuments;
    userData.accrualDocuments = allAccrualDocs;
    userData.reconciliationSessions = allSessions;
    userData.matches = allMatches;

    return userData;
  },
});

/**
 * Delete user account and all associated data.
 * This is a destructive operation that cannot be undone.
 * Rate limited to 1 attempt per hour for security.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // Check rate limit
    const rateCheck = await checkRateLimit(ctx, user._id, "deleteAccount");
    if (!rateCheck.allowed) {
      const retryMinutes = Math.ceil((rateCheck.retryAfter || 0) / (60 * 1000));
      throw new Error(`Rate limited. Please try again in ${retryMinutes} minutes.`);
    }

    // Record this attempt
    await recordRateLimitAttempt(ctx, user._id, "deleteAccount");

    // Get all companies owned by user
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Delete all data for each company
    for (const company of companies) {
      // Delete transactions
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      for (const t of transactions) {
        await ctx.db.delete(t._id);
      }

      // Delete documents
      const documents = await ctx.db
        .query("documents")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      for (const d of documents) {
        await ctx.db.delete(d._id);
      }

      // Delete accrual documents
      const accrualDocs = await ctx.db
        .query("accrualDocuments")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      for (const a of accrualDocs) {
        await ctx.db.delete(a._id);
      }

      // Delete reconciliation sessions and related data
      const sessions = await ctx.db
        .query("reconciliationSessions")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const session of sessions) {
        // Delete matched pairs
        const matches = await ctx.db
          .query("matchedPairs")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const m of matches) {
          await ctx.db.delete(m._id);
        }

        // Delete suspense items
        const suspenseItems = await ctx.db
          .query("suspenseItems")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const s of suspenseItems) {
          await ctx.db.delete(s._id);
        }

        // Delete session
        await ctx.db.delete(session._id);
      }

      // Delete categories
      const categories = await ctx.db
        .query("categories")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      for (const c of categories) {
        await ctx.db.delete(c._id);
      }

      // Delete company credits
      const credits = await ctx.db
        .query("companyCredits")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      for (const c of credits) {
        await ctx.db.delete(c._id);
      }

      // Delete credit transactions
      const creditTx = await ctx.db
        .query("creditTransactions")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();
      for (const c of creditTx) {
        await ctx.db.delete(c._id);
      }

      // Delete workspaces and related data
      const workspaces = await ctx.db
        .query("workspaces")
        .withIndex("by_company", (q) => q.eq("companyId", company._id))
        .collect();

      for (const workspace of workspaces) {
        const worksheets = await ctx.db
          .query("worksheets")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();

        for (const worksheet of worksheets) {
          // Delete columns
          const columns = await ctx.db
            .query("worksheetColumns")
            .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheet._id))
            .collect();
          for (const col of columns) {
            await ctx.db.delete(col._id);
          }

          // Delete rows
          const rows = await ctx.db
            .query("worksheetRows")
            .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheet._id))
            .collect();
          for (const row of rows) {
            await ctx.db.delete(row._id);
          }

          // Delete agent jobs
          const jobs = await ctx.db
            .query("agentJobs")
            .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheet._id))
            .collect();
          for (const job of jobs) {
            await ctx.db.delete(job._id);
          }

          // Delete worksheet messages
          const messages = await ctx.db
            .query("worksheetMessages")
            .withIndex("by_worksheet", (q) => q.eq("worksheetId", worksheet._id))
            .collect();
          for (const msg of messages) {
            await ctx.db.delete(msg._id);
          }

          await ctx.db.delete(worksheet._id);
        }

        await ctx.db.delete(workspace._id);
      }

      // Delete company
      await ctx.db.delete(company._id);
    }

    // Delete user preferences
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (preferences) {
      await ctx.db.delete(preferences._id);
    }

    // Delete rate limit records
    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const rl of rateLimits) {
      await ctx.db.delete(rl._id);
    }

    // Delete onboarding progress
    const onboardingProgress = await ctx.db
      .query("onboardingProgress")
      .withIndex("by_user", (q) => q.eq("userId", user._id.toString()))
      .collect();
    for (const p of onboardingProgress) {
      await ctx.db.delete(p._id);
    }

    // Finally, delete the user
    await ctx.db.delete(user._id);

    return { success: true };
  },
});
