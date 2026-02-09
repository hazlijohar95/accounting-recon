import { v } from "convex/values";
import { query } from "./_generated/server";
import { verifyQueryCompanyAccess } from "./lib/auth";
import { transactionCounts, transactionSums } from "./lib/aggregates";

// ============ RETURN VALIDATORS ============

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
  totalCashIn: v.number(),
  totalCashOut: v.number(),
});

// ============ SHORT MONTH NAMES (deterministic, no locale dependency) ============

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Format "2025-01" as "Jan 25" -- deterministic, no toLocaleDateString */
function formatMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  const shortYear = yearStr.slice(-2);
  return `${MONTH_NAMES[monthIndex]} ${shortYear}`;
}

// ============ ANALYTICS QUERIES ============
// All queries use verifyQueryCompanyAccess for proper authentication & authorization

/**
 * Monthly cash flow for the past N months.
 *
 * Uses the `by_type` index to fetch only cash transactions (instead of all),
 * then groups by month in memory. For most companies this is a significant
 * reduction vs. a full table scan.
 */
export const getMonthlyCashFlow = query({
  args: {
    companyId: v.id("companies"),
    months: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  returns: monthlyFlowReturnValidator,
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return [];

    // Use by_type index to only fetch cash transactions (not accrual)
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("companyId", args.companyId).eq("type", "cash"))
      .collect();

    const monthlyData: Record<string, { inflow: number; outflow: number }> = {};

    for (const tx of transactions) {
      if (!tx.date) continue;

      const monthKey = tx.date.substring(0, 7);
      if (monthKey.length !== 7) continue;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { inflow: 0, outflow: 0 };
      }

      if (tx.amount > 0) {
        monthlyData[monthKey].inflow += tx.amount;
      } else {
        monthlyData[monthKey].outflow += Math.abs(tx.amount);
      }
    }

    const sortedMonths = Object.keys(monthlyData).sort();
    const limitedMonths = sortedMonths.slice(-(args.months ?? 12));

    return limitedMonths.map((monthKey) => {
      const data = monthlyData[monthKey];
      return {
        month: formatMonthKey(monthKey),
        monthKey,
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.inflow - data.outflow,
      };
    });
  },
});

/**
 * Expense breakdown by category.
 *
 * Uses `by_type` index to only fetch cash transactions, then filters to
 * outflows within the specified period. Groups by category.
 */
export const getExpenseBreakdown = query({
  args: {
    companyId: v.id("companies"),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    limit: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  returns: expenseBreakdownReturnValidator,
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return [];

    // Use by_type index: only cash transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("companyId", args.companyId).eq("type", "cash"))
      .collect();

    const categoryTotals: Record<string, number> = {};
    let totalExpenses = 0;

    for (const tx of transactions) {
      // Only outflows with valid dates
      if (tx.amount >= 0 || !tx.date) continue;
      if (args.periodStart && tx.date < args.periodStart) continue;
      if (args.periodEnd && tx.date > args.periodEnd) continue;

      const category = tx.category || "Uncategorized";
      const amount = Math.abs(tx.amount);

      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      totalExpenses += amount;
    }

    const sorted = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const limit = args.limit;
    const limited = limit ? sorted.slice(0, limit) : sorted;

    // Group remaining categories into "Other"
    if (limit && sorted.length > limit) {
      const otherTotal = sorted
        .slice(limit)
        .reduce((sum, c) => sum + c.amount, 0);

      if (otherTotal > 0) {
        limited.push({
          category: "Other",
          amount: otherTotal,
          percentage: totalExpenses > 0 ? Math.round((otherTotal / totalExpenses) * 100) : 0,
        });
      }
    }

    return limited;
  },
});

/**
 * Top individual expenses (largest outflows).
 *
 * Uses `by_type` index for cash transactions only.
 */
export const getTopExpenses = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  returns: topExpenseReturnValidator,
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return [];

    // Use by_type index: only cash transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("companyId", args.companyId).eq("type", "cash"))
      .collect();

    return transactions
      .filter((tx) => tx.amount < 0 && tx.date && tx.description)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, args.limit ?? 5)
      .map((tx) => ({
        id: tx._id,
        description: tx.description,
        amount: Math.abs(tx.amount),
        date: tx.date,
        category: tx.category || "Uncategorized",
      }));
  },
});

/**
 * Reconciliation summary stats -- all O(log n) via aggregates.
 *
 * Returns match counts AND cash totals in a single query, eliminating
 * the need for the frontend to fetch all transactions just for sums.
 */
export const getReconciliationStats = query({
  args: {
    companyId: v.id("companies"),
    workosUserId: v.optional(v.string()),
  },
  returns: reconStatsReturnValidator,
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) {
      return {
        matched: 0, pending: 0, suspense: 0,
        total: 0, matchRate: 0,
        totalCashIn: 0, totalCashOut: 0,
      };
    }

    // All O(log n) using aggregates
    const [matched, pending, suspense, totalCashIn, totalCashOut] = await Promise.all([
      transactionCounts.count(ctx, {
        bounds: { prefix: [args.companyId, "cash", "matched"] },
      }),
      transactionCounts.count(ctx, {
        bounds: { prefix: [args.companyId, "cash", "pending"] },
      }),
      transactionCounts.count(ctx, {
        bounds: { prefix: [args.companyId, "cash", "suspense"] },
      }),
      transactionSums.sum(ctx, {
        bounds: { prefix: [args.companyId, "cash", "inflow"] },
      }),
      transactionSums.sum(ctx, {
        bounds: { prefix: [args.companyId, "cash", "outflow"] },
      }),
    ]);

    const total = matched + pending + suspense;

    return {
      matched,
      pending,
      suspense,
      total,
      matchRate: total > 0 ? Math.round((matched / total) * 100) : 0,
      totalCashIn,
      totalCashOut,
    };
  },
});

// ============ RECENT ACTIVITY ============

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

/**
 * Format a timestamp as "h:mm AM/PM" deterministically (no locale dependency).
 */
function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours24 = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const paddedMinutes = String(minutes).padStart(2, "0");
  return `${hours12}:${paddedMinutes} ${period}`;
}

/**
 * Recent transaction activity for the activity log.
 * Used by the reports view.
 */
export const getRecentActivity = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
    workosUserId: v.optional(v.string()),
  },
  returns: recentActivityReturnValidator,
  handler: async (ctx, args) => {
    const { allowed } = await verifyQueryCompanyAccess(ctx, args.companyId, args.workosUserId);
    if (!allowed) return [];

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(args.limit ?? 10);

    return transactions.map((tx) => ({
      id: tx._id,
      time: formatTime(tx._creationTime),
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.amount > 0 ? "inflow" : "outflow",
      status: tx.status,
    }));
  },
});
