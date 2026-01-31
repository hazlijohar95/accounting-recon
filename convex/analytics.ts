import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireCompanyAccess } from "./lib/auth";

// Return validators for analytics
const monthlyFlowReturnValidator = v.array(
  v.object({
    month: v.string(),
    monthKey: v.string(),
    inflow: v.number(),
    outflow: v.number(),
    net: v.number(),
  })
);

const expenseBreakdownReturnValidator = v.array(
  v.object({
    category: v.string(),
    amount: v.number(),
    percentage: v.number(),
  })
);

const topExpenseReturnValidator = v.array(
  v.object({
    id: v.id("transactions"),
    description: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
  })
);

const reconStatsReturnValidator = v.object({
  matched: v.number(),
  pending: v.number(),
  suspense: v.number(),
  total: v.number(),
  matchRate: v.number(),
});

// ============ ANALYTICS QUERIES ============
// All queries use requireCompanyAccess for proper authentication & authorization

// Get monthly cash flow for past 12 months
export const getMonthlyCashFlow = query({
  args: {
    companyId: v.id("companies"),
    months: v.optional(v.number()), // Default 12
  },
  returns: monthlyFlowReturnValidator,
  handler: async (ctx, args) => {
    // SECURITY: Require authenticated user with access to this company
    await requireCompanyAccess(ctx, args.companyId);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Group by month (YYYY-MM format)
    const monthlyData: Record<string, { inflow: number; outflow: number }> = {};

    for (const tx of transactions) {
      // Only process cash transactions with valid dates
      if (tx.type !== "cash" || !tx.date) continue;

      const monthKey = tx.date.substring(0, 7); // "2025-01"
      if (!monthKey || monthKey.length !== 7) continue;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { inflow: 0, outflow: 0 };
      }

      if (tx.amount > 0) {
        monthlyData[monthKey].inflow += tx.amount;
      } else {
        monthlyData[monthKey].outflow += Math.abs(tx.amount);
      }
    }

    // Sort by month and take last N months
    const sortedMonths = Object.keys(monthlyData).sort();
    const limitedMonths = sortedMonths.slice(-(args.months || 12));

    // Format for chart consumption
    return limitedMonths.map((monthKey) => {
      const [year, month] = monthKey.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      return {
        month: monthLabel, // "Jan 25"
        monthKey, // "2025-01" for sorting
        inflow: monthlyData[monthKey].inflow,
        outflow: monthlyData[monthKey].outflow,
        net: monthlyData[monthKey].inflow - monthlyData[monthKey].outflow,
      };
    });
  },
});

// Get expense breakdown by category
export const getExpenseBreakdown = query({
  args: {
    companyId: v.id("companies"),
    periodStart: v.optional(v.string()), // ISO date
    periodEnd: v.optional(v.string()), // ISO date
    limit: v.optional(v.number()), // Top N categories
  },
  returns: expenseBreakdownReturnValidator,
  handler: async (ctx, args) => {
    // SECURITY: Require authenticated user with access to this company
    await requireCompanyAccess(ctx, args.companyId);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter to outflows (expenses) within period
    const expenses = transactions.filter((tx) => {
      if (tx.amount >= 0) return false; // Only outflows
      if (!tx.date) return false; // Skip invalid dates
      if (args.periodStart && tx.date < args.periodStart) return false;
      if (args.periodEnd && tx.date > args.periodEnd) return false;
      return true;
    });

    // Group by category
    const categoryTotals: Record<string, number> = {};
    let totalExpenses = 0;

    for (const tx of expenses) {
      const category = tx.category || "Uncategorized";
      const amount = Math.abs(tx.amount);

      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      totalExpenses += amount;
    }

    // Sort by amount descending
    const sorted = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Apply limit
    const limited = args.limit ? sorted.slice(0, args.limit) : sorted;

    // If we limited results, group remaining into "Other"
    if (args.limit && sorted.length > args.limit) {
      const otherCategories = sorted.slice(args.limit);
      const otherTotal = otherCategories.reduce((sum, c) => sum + c.amount, 0);
      const otherPercentage = totalExpenses > 0 ? Math.round((otherTotal / totalExpenses) * 100) : 0;

      if (otherTotal > 0) {
        limited.push({
          category: "Other",
          amount: otherTotal,
          percentage: otherPercentage,
        });
      }
    }

    return limited;
  },
});

// Get top expenses (individual transactions)
export const getTopExpenses = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()), // Default 5
  },
  returns: topExpenseReturnValidator,
  handler: async (ctx, args) => {
    // SECURITY: Require authenticated user with access to this company
    await requireCompanyAccess(ctx, args.companyId);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Filter to outflows with valid data and sort by amount
    return transactions
      .filter((tx) => tx.amount < 0 && tx.date && tx.description)
      .sort((a, b) => a.amount - b.amount) // Most negative first
      .slice(0, args.limit || 5)
      .map((tx) => ({
        id: tx._id,
        description: tx.description,
        amount: Math.abs(tx.amount),
        date: tx.date,
        category: tx.category || "Uncategorized",
      }));
  },
});

// Get reconciliation summary stats
export const getReconciliationStats = query({
  args: {
    companyId: v.id("companies"),
  },
  returns: reconStatsReturnValidator,
  handler: async (ctx, args) => {
    // SECURITY: Require authenticated user with access to this company
    await requireCompanyAccess(ctx, args.companyId);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const cashTxns = transactions.filter((t) => t.type === "cash");
    const matched = cashTxns.filter((t) => t.status === "matched").length;
    const pending = cashTxns.filter((t) => t.status === "pending").length;
    const suspense = cashTxns.filter((t) => t.status === "suspense").length;
    const total = cashTxns.length;

    return {
      matched,
      pending,
      suspense,
      total,
      matchRate: total > 0 ? Math.round((matched / total) * 100) : 0,
    };
  },
});

// Return validator for recent activity
const recentActivityReturnValidator = v.array(
  v.object({
    id: v.id("transactions"),
    time: v.string(),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    type: v.string(),
    status: v.string(),
  })
);

// Get recent activity for activity log
export const getRecentActivity = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  returns: recentActivityReturnValidator,
  handler: async (ctx, args) => {
    // SECURITY: Require authenticated user with access to this company
    await requireCompanyAccess(ctx, args.companyId);

    // Get recent transactions as activity
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit || 10);

    return transactions.map((tx) => ({
      id: tx._id,
      time: new Date(tx._creationTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.amount > 0 ? "inflow" : "outflow",
      status: tx.status,
    }));
  },
});
