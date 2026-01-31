// Main export actions for Reconciled
import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { generateBankReconExport } from "./bankRecon";
import { generateClientQueryExport } from "./clientQuery";
import { generateTransactionListingExport } from "./transactionListing";
import { generateSQLAccountingExport } from "./accounting/sqlAccounting";
import { generateAutoCountExport } from "./accounting/autocount";
import { generateQuickBooksExport } from "./accounting/quickbooks";
import { generateXeroExport } from "./accounting/xero";
import { authKit } from "../auth";

// Re-export PDF actions for convenience
export { generatePDFExport, getPDFJobStatus } from "./pdf";

// Return validators for exports
const verifyAccessReturnValidator = v.object({
  authorized: v.boolean(),
  error: v.union(v.string(), v.null()),
  userId: v.union(v.id("users"), v.null()),
});

const exportResultValidator = v.object({
  success: v.boolean(),
  error: v.optional(v.string()),
  fileUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
});

// Internal query to verify session access for export operations
export const verifySessionAccess = internalQuery({
  args: {
    sessionId: v.id("reconciliationSessions"),
  },
  returns: verifyAccessReturnValidator,
  handler: async (ctx, args) => {
    // Get authenticated user from AuthKit
    const authUser = await authKit.getAuthUser(ctx);
    if (!authUser) {
      return { authorized: false, error: "Unauthorized: Please sign in", userId: null };
    }

    // Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos", (q) => q.eq("workosId", authUser.id))
      .first();

    if (!user) {
      return { authorized: false, error: "User not found", userId: null };
    }

    // Get session
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { authorized: false, error: "Session not found", userId: user._id };
    }

    // Get company and verify ownership
    const company = await ctx.db.get(session.companyId);
    if (!company) {
      return { authorized: false, error: "Company not found", userId: user._id };
    }

    if (company.isDeleted) {
      return { authorized: false, error: "Company has been deleted", userId: user._id };
    }

    if (company.ownerId !== user._id) {
      return { authorized: false, error: "Unauthorized: You don't have access to this session", userId: user._id };
    }

    return { authorized: true, error: null, userId: user._id };
  },
});

// Internal query to fetch all session data needed for exports
export const getExportData = internalQuery({
  args: {
    sessionId: v.id("reconciliationSessions"),
  },
  handler: async (ctx, args) => {
    // Get session
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Get company
    const company = await ctx.db.get(session.companyId);
    if (!company) return null;

    // Get all matches for this session
    const matches = await ctx.db
      .query("matchedPairs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Enrich matches with transaction/document details
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const cashTxn = await ctx.db.get(match.cashTransactionId);

        let accrualDoc = null;
        let accrualTxn = null;

        if (match.accrualDocumentId) {
          accrualDoc = await ctx.db.get(match.accrualDocumentId);
        }
        if (match.accrualTransactionId) {
          accrualTxn = await ctx.db.get(match.accrualTransactionId);
        }

        return {
          ...match,
          cashTransaction: cashTxn,
          accrualDocument: accrualDoc,
          accrualTransaction: accrualTxn,
        };
      })
    );

    // Get all transactions for this session
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get all accrual documents for this session
    const accrualDocuments = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get suspense items for this session
    const suspenseItems = await ctx.db
      .query("suspenseItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return {
      session,
      company,
      matches: enrichedMatches,
      transactions,
      accrualDocuments,
      suspenseItems,
    };
  },
});

// Main export action for reports
export const generateExport = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    reportType: v.union(
      v.literal("bank_recon"),
      v.literal("client_query"),
      v.literal("transaction_listing")
    ),
    format: v.union(v.literal("xlsx"), v.literal("csv")),
    options: v.optional(
      v.object({
        includeMatched: v.optional(v.boolean()),
        includePending: v.optional(v.boolean()),
        includeSuspense: v.optional(v.boolean()),
      })
    ),
  },
  returns: exportResultValidator,
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this session
    const authCheck = await ctx.runQuery(internal.exports.index.verifySessionAccess, {
      sessionId: args.sessionId,
    });

    if (!authCheck.authorized) {
      return {
        success: false,
        error: authCheck.error || "Access denied",
      };
    }

    // Fetch all data needed for export
    const data = await ctx.runQuery(internal.exports.index.getExportData, {
      sessionId: args.sessionId,
    });

    if (!data) {
      return {
        success: false,
        error: "Session not found or access denied",
      };
    }

    const options = {
      includeMatched: args.options?.includeMatched ?? true,
      includePending: args.options?.includePending ?? true,
      includeSuspense: args.options?.includeSuspense ?? true,
    };

    let result: { base64: string; fileName: string; mimeType: string };

    switch (args.reportType) {
      case "bank_recon":
        result = generateBankReconExport(data, args.format, options);
        break;
      case "client_query":
        result = generateClientQueryExport(data, args.format, options);
        break;
      case "transaction_listing":
        result = generateTransactionListingExport(data, args.format, options);
        break;
      default:
        return {
          success: false,
          error: `Unknown report type: ${args.reportType}`,
        };
    }

    // Create data URL for download
    const fileUrl = `data:${result.mimeType};base64,${result.base64}`;

    // Audit logging
    console.log(JSON.stringify({
      event: "export_generated",
      level: "info",
      userId: authCheck.userId,
      sessionId: args.sessionId,
      reportType: args.reportType,
      format: args.format,
      timestamp: Date.now(),
    }));

    return {
      success: true,
      fileUrl,
      fileName: result.fileName,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
  },
});

// Accounting software export action
export const generateAccountingExport = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    software: v.union(
      v.literal("sql_accounting"),
      v.literal("autocount"),
      v.literal("quickbooks_iif"),
      v.literal("xero_csv")
    ),
    options: v.optional(
      v.object({
        accountCodes: v.optional(
          v.object({
            bankAccount: v.optional(v.string()),
            receivables: v.optional(v.string()),
            payables: v.optional(v.string()),
            revenue: v.optional(v.string()),
            expenses: v.optional(v.string()),
          })
        ),
        includeJournalEntries: v.optional(v.boolean()),
      })
    ),
  },
  returns: exportResultValidator,
  handler: async (ctx, args) => {
    // SECURITY: Verify user has access to this session
    const authCheck = await ctx.runQuery(internal.exports.index.verifySessionAccess, {
      sessionId: args.sessionId,
    });

    if (!authCheck.authorized) {
      return {
        success: false,
        error: authCheck.error || "Access denied",
      };
    }

    // Fetch all data needed for export
    const data = await ctx.runQuery(internal.exports.index.getExportData, {
      sessionId: args.sessionId,
    });

    if (!data) {
      return {
        success: false,
        error: "Session not found or access denied",
      };
    }

    const options = {
      accountCodes: args.options?.accountCodes ?? {},
      includeJournalEntries: args.options?.includeJournalEntries ?? true,
    };

    let result: { content: string; fileName: string; mimeType: string };

    switch (args.software) {
      case "sql_accounting":
        result = generateSQLAccountingExport(data, options);
        break;
      case "autocount":
        result = generateAutoCountExport(data, options);
        break;
      case "quickbooks_iif":
        result = generateQuickBooksExport(data, options);
        break;
      case "xero_csv":
        result = generateXeroExport(data, options);
        break;
      default:
        return {
          success: false,
          error: `Unknown accounting software: ${args.software}`,
        };
    }

    // Encode as base64 for data URL
    const base64 = Buffer.from(result.content).toString("base64");
    const fileUrl = `data:${result.mimeType};base64,${base64}`;

    // Audit logging
    console.log(JSON.stringify({
      event: "accounting_export_generated",
      level: "info",
      userId: authCheck.userId,
      sessionId: args.sessionId,
      software: args.software,
      timestamp: Date.now(),
    }));

    return {
      success: true,
      fileUrl,
      fileName: result.fileName,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
  },
});
