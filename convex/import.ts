/**
 * CSV Import Functions
 *
 * Allows users to import pre-formatted data directly, bypassing OCR extraction.
 * Useful for users who already have their data in spreadsheets.
 */

import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authKit } from "./auth";
import { AuthErrors, ResourceErrors, ValidationErrors, BusinessErrors } from "./lib/errors";

// ============ VALIDATORS ============

const cashRecordValidator = v.object({
  date: v.string(),
  description: v.string(),
  amount: v.number(),
  reference: v.optional(v.string()),
  category: v.optional(v.string()),
});

const accrualRecordValidator = v.object({
  date: v.string(),
  description: v.string(),
  amount: v.number(),
  docNumber: v.optional(v.string()),
  counterparty: v.optional(v.string()),
  docType: v.optional(v.string()),
  dueDate: v.optional(v.string()),
  taxAmount: v.optional(v.number()),
});

// ============ INTERNAL QUERIES ============

export const getSession = internalQuery({
  args: { sessionId: v.id("reconciliationSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getCompany = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.companyId);
  },
});

// ============ MUTATIONS ============

/**
 * Import cash transactions (bank statement data)
 *
 * Accepts an array of transaction records and creates them in the database.
 * Updates session stats after import.
 */
export const importCashTransactions = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    records: v.array(cashRecordValidator),
  },
  returns: v.object({
    success: v.boolean(),
    imported: v.number(),
    errors: v.array(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const isProduction = process.env.NODE_ENV === "production";

    // SECURITY: Verify user is authenticated
    let authUser: { id: string } | null = null;
    try {
      authUser = await authKit.getAuthUser(ctx);
    } catch {
      if (isProduction) {
        return AuthErrors.serviceUnavailable();
      }
      console.warn("AuthKit not configured, skipping auth check (dev mode only)");
    }

    if (!authUser && isProduction) {
      return AuthErrors.unauthorized("Authentication required for import");
    }

    // Get session
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return ResourceErrors.notFound("Session", args.sessionId);
    }

    // SECURITY: Verify user owns the company
    if (authUser) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workos", (q) => q.eq("workosId", authUser!.id))
        .first();

      if (!user) {
        return AuthErrors.userNotFound();
      }

      const company = await ctx.db.get(session.companyId);
      if (!company || company.ownerId !== user._id) {
        return AuthErrors.unauthorized("You don't have access to this session");
      }
    }

    // Validate and import records
    const errors: string[] = [];
    let imported = 0;
    const now = Date.now();

    for (let i = 0; i < args.records.length; i++) {
      const record = args.records[i];

      // Basic validation
      if (!record.date || !record.description || record.amount === undefined) {
        errors.push(`Row ${i + 1}: Missing required fields (date, description, amount)`);
        continue;
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        errors.push(`Row ${i + 1}: Invalid date format. Use YYYY-MM-DD`);
        continue;
      }

      try {
        await ctx.db.insert("transactions", {
          companyId: session.companyId,
          sessionId: args.sessionId,
          date: record.date,
          description: record.description,
          amount: record.amount,
          reference: record.reference,
          category: record.category,
          type: "cash",
          status: "pending",
          createdAt: now,
        });
        imported++;
      } catch (error) {
        errors.push(`Row ${i + 1}: Database error - ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Update session stats
    if (imported > 0) {
      await ctx.db.patch(args.sessionId, {
        totalCashTransactions: (session.totalCashTransactions || 0) + imported,
      });

      // Audit log
      console.log(JSON.stringify({
        event: "csv_import",
        level: "info",
        type: "cash",
        sessionId: args.sessionId,
        imported,
        errors: errors.length,
        timestamp: now,
      }));
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  },
});

/**
 * Import accrual documents (invoices, receipts)
 *
 * Accepts an array of accrual records and creates them in the database.
 * Updates session stats after import.
 */
export const importAccrualDocuments = mutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    records: v.array(accrualRecordValidator),
  },
  returns: v.object({
    success: v.boolean(),
    imported: v.number(),
    errors: v.array(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const isProduction = process.env.NODE_ENV === "production";

    // SECURITY: Verify user is authenticated
    let authUser: { id: string } | null = null;
    try {
      authUser = await authKit.getAuthUser(ctx);
    } catch {
      if (isProduction) {
        return AuthErrors.serviceUnavailable();
      }
      console.warn("AuthKit not configured, skipping auth check (dev mode only)");
    }

    if (!authUser && isProduction) {
      return AuthErrors.unauthorized("Authentication required for import");
    }

    // Get session
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return ResourceErrors.notFound("Session", args.sessionId);
    }

    // SECURITY: Verify user owns the company
    if (authUser) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workos", (q) => q.eq("workosId", authUser!.id))
        .first();

      if (!user) {
        return AuthErrors.userNotFound();
      }

      const company = await ctx.db.get(session.companyId);
      if (!company || company.ownerId !== user._id) {
        return AuthErrors.unauthorized("You don't have access to this session");
      }
    }

    // Valid document types
    const validDocTypes = ["sales_invoice", "purchase_invoice", "pos_report", "settlement", "receipt"] as const;

    // Validate and import records
    const errors: string[] = [];
    let imported = 0;
    const now = Date.now();

    for (let i = 0; i < args.records.length; i++) {
      const record = args.records[i];

      // Basic validation
      if (!record.date || !record.description || record.amount === undefined) {
        errors.push(`Row ${i + 1}: Missing required fields (date, description, amount)`);
        continue;
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        errors.push(`Row ${i + 1}: Invalid date format. Use YYYY-MM-DD`);
        continue;
      }

      // Default and validate docType
      let docType: (typeof validDocTypes)[number] = "sales_invoice";
      if (record.docType) {
        const normalizedType = record.docType.toLowerCase().replace(/\s+/g, "_");
        if (validDocTypes.includes(normalizedType as typeof validDocTypes[number])) {
          docType = normalizedType as typeof validDocTypes[number];
        } else {
          errors.push(`Row ${i + 1}: Invalid document type "${record.docType}". Using "sales_invoice".`);
        }
      }

      try {
        await ctx.db.insert("accrualDocuments", {
          companyId: session.companyId,
          sessionId: args.sessionId,
          docType,
          docNumber: record.docNumber,
          docDate: record.date,
          dueDate: record.dueDate,
          counterparty: record.counterparty,
          amount: record.amount,
          taxAmount: record.taxAmount,
          description: record.description,
          status: "pending",
          createdAt: now,
        });
        imported++;
      } catch (error) {
        errors.push(`Row ${i + 1}: Database error - ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Update session stats
    if (imported > 0) {
      await ctx.db.patch(args.sessionId, {
        totalAccrualTransactions: (session.totalAccrualTransactions || 0) + imported,
      });

      // Audit log
      console.log(JSON.stringify({
        event: "csv_import",
        level: "info",
        type: "accrual",
        sessionId: args.sessionId,
        imported,
        errors: errors.length,
        timestamp: now,
      }));
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  },
});
