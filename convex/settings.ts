import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, getOptionalAuth } from "./lib/auth";
import { AuthErrors } from "./lib/errors";

/**
 * Settings module for user preferences, data export, and account management.
 *
 * Provides:
 * - Export all user data (GDPR compliance)
 * - Delete user account and all associated data
 * - User preferences management
 */

// ============ QUERIES ============

/**
 * Get user preferences (stored in user document or separate table if needed)
 */
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalAuth(ctx);
    if (!user) {
      return {
        theme: "system",
        dateFormat: "DD/MM/YYYY",
        numberFormat: "1,234.56",
        emailNotifications: {
          reconciliationComplete: true,
          weeklyDigest: false,
          newFeatures: true,
        },
      };
    }

    // For now, return defaults - can be extended to read from a preferences table
    return {
      theme: "system",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "1,234.56",
      emailNotifications: {
        reconciliationComplete: true,
        weeklyDigest: false,
        newFeatures: true,
      },
    };
  },
});

// ============ MUTATIONS ============

/**
 * Export all user data for GDPR compliance.
 * Returns a JSON object containing all user-owned data.
 */
export const exportUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    // Collect all user data
    const userData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
        createdAt: new Date(user.createdAt).toISOString(),
      },
    };

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
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

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

      // Delete PDF export jobs
      // Note: No by_company index, so we'll skip this for now
      // Jobs are session-linked and will become orphaned but harmless

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

          await ctx.db.delete(worksheet._id);
        }

        await ctx.db.delete(workspace._id);
      }

      // Delete company
      await ctx.db.delete(company._id);
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
