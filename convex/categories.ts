import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { validateNonEmpty } from "./lib/validation";
import { requireCompanyAccess, requireCategoryAccess, requireAuth, getOptionalAuth } from "./lib/auth";
import { categoryDocValidator, categoryIdValidator } from "./lib/validators";

// ============ QUERIES ============

// Get a single category by ID
export const get = query({
  args: { id: v.id("categories") },
  returns: v.union(categoryDocValidator, v.null()),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) return null;

    // Global categories are always accessible
    if (category.isGlobal) return category;

    // Company-specific categories require company access
    const user = await getOptionalAuth(ctx);
    if (user && category.companyId) {
      const company = await ctx.db.get(category.companyId);
      if (!company || company.ownerId !== user._id) {
        return null;
      }
    }

    return category;
  },
});

// List all categories for a company (including global)
export const listByCompany = query({
  args: { companyId: v.optional(v.id("companies")) },
  returns: v.array(categoryDocValidator),
  handler: async (ctx, args) => {
    // Get global categories
    const globalCategories = await ctx.db
      .query("categories")
      .withIndex("by_global", (q) => q.eq("isGlobal", true))
      .collect();

    if (!args.companyId) {
      return globalCategories;
    }

    // Verify company access if authenticated
    const user = await getOptionalAuth(ctx);
    if (user) {
      const company = await ctx.db.get(args.companyId);
      if (!company || company.ownerId !== user._id) {
        return globalCategories; // Return only global if no access
      }
    }

    // Get company-specific categories
    const companyCategories = await ctx.db
      .query("categories")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Merge: company-specific overrides global
    const merged = [...globalCategories];
    for (const cc of companyCategories) {
      const existingIndex = merged.findIndex(
        (g) => g.keyword.toLowerCase() === cc.keyword.toLowerCase()
      );
      if (existingIndex >= 0) {
        merged[existingIndex] = cc; // Override with company-specific
      } else {
        merged.push(cc);
      }
    }

    return merged;
  },
});

// Search categories by keyword
export const searchByKeyword = query({
  args: {
    keyword: v.string(),
    companyId: v.optional(v.id("companies")),
  },
  returns: v.array(categoryDocValidator),
  handler: async (ctx, args) => {
    const searchLower = args.keyword.toLowerCase();

    // Get all applicable categories
    const globalCategories = await ctx.db
      .query("categories")
      .withIndex("by_global", (q) => q.eq("isGlobal", true))
      .collect();

    let companyCategories: typeof globalCategories = [];
    if (args.companyId) {
      // Verify company access if authenticated
      const user = await getOptionalAuth(ctx);
      if (!user) {
        companyCategories = await ctx.db
          .query("categories")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .collect();
      } else {
        const company = await ctx.db.get(args.companyId);
        if (company && company.ownerId === user._id) {
          companyCategories = await ctx.db
            .query("categories")
            .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
            .collect();
        }
      }
    }

    // Search in both
    const matches = [...companyCategories, ...globalCategories].filter((c) =>
      c.keyword.toLowerCase().includes(searchLower)
    );

    // Dedupe by keyword (company-specific first)
    const seen = new Set<string>();
    return matches.filter((c) => {
      const key = c.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
});

// Get unique main categories
export const getMainCategories = query({
  args: { companyId: v.optional(v.id("companies")) },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("categories").collect();

    // Verify company access if authenticated
    const user = await getOptionalAuth(ctx);

    const mainCategories = new Set<string>();
    for (const c of categories) {
      // Include if global
      if (c.isGlobal) {
        mainCategories.add(c.mainCategory);
        continue;
      }

      // Include company-specific only if user owns company
      if (c.companyId === args.companyId) {
        if (!user) {
          mainCategories.add(c.mainCategory);
        } else if (args.companyId) {
          const company = await ctx.db.get(args.companyId);
          if (company && company.ownerId === user._id) {
            mainCategories.add(c.mainCategory);
          }
        }
      }
    }

    return Array.from(mainCategories).sort();
  },
});

// ============ MUTATIONS ============

// Create a new category
export const create = mutation({
  args: {
    companyId: v.optional(v.id("companies")),
    keyword: v.string(),
    mainCategory: v.string(),
    subCategory: v.string(),
    accountCode: v.optional(v.string()),
  },
  returns: categoryIdValidator,
  handler: async (ctx, args) => {
    // Validate inputs
    validateNonEmpty(args.keyword, "keyword");
    validateNonEmpty(args.mainCategory, "mainCategory");
    validateNonEmpty(args.subCategory, "subCategory");

    // Verify company access if company-specific
    if (args.companyId) {
      await requireCompanyAccess(ctx, args.companyId);
    } else {
      // Global categories require authentication (admin only in practice)
      await requireAuth(ctx);
    }

    const categoryId = await ctx.db.insert("categories", {
      ...args,
      isGlobal: !args.companyId,
      createdAt: Date.now(),
    });
    return categoryId;
  },
});

// Update a category
export const update = mutation({
  args: {
    id: v.id("categories"),
    keyword: v.optional(v.string()),
    mainCategory: v.optional(v.string()),
    subCategory: v.optional(v.string()),
    accountCode: v.optional(v.string()),
  },
  returns: categoryIdValidator,
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Verify category ownership (throws for global categories)
    await requireCategoryAccess(ctx, id);

    // Validate non-empty if provided
    if (updates.keyword !== undefined) validateNonEmpty(updates.keyword, "keyword");
    if (updates.mainCategory !== undefined) validateNonEmpty(updates.mainCategory, "mainCategory");
    if (updates.subCategory !== undefined) validateNonEmpty(updates.subCategory, "subCategory");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
    return id;
  },
});

// Delete a category
export const remove = mutation({
  args: { id: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify category ownership (throws for global categories)
    await requireCategoryAccess(ctx, args.id);

    await ctx.db.delete(args.id);
    return null;
  },
});

// ============ SEED DATA ============
// Malaysian keywords pre-seeded for common categorization

// Internal mutation to seed global categories (run once)
export const seedGlobalCategories = internalMutation({
  args: {},
  returns: v.object({ message: v.string(), count: v.number() }),
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_global", (q) => q.eq("isGlobal", true))
      .first();

    if (existing) {
      return { message: "Categories already seeded", count: 0 };
    }

    const malaysianCategories = [
      // Utilities
      { keyword: "TNB", mainCategory: "Utilities", subCategory: "Electricity" },
      { keyword: "TENAGA", mainCategory: "Utilities", subCategory: "Electricity" },
      { keyword: "SYABAS", mainCategory: "Utilities", subCategory: "Water" },
      { keyword: "INDAH WATER", mainCategory: "Utilities", subCategory: "Sewerage" },
      { keyword: "IWK", mainCategory: "Utilities", subCategory: "Sewerage" },
      { keyword: "TELEKOM", mainCategory: "Utilities", subCategory: "Telecommunications" },
      { keyword: "TM", mainCategory: "Utilities", subCategory: "Telecommunications" },
      { keyword: "MAXIS", mainCategory: "Utilities", subCategory: "Telecommunications" },
      { keyword: "DIGI", mainCategory: "Utilities", subCategory: "Telecommunications" },
      { keyword: "CELCOM", mainCategory: "Utilities", subCategory: "Telecommunications" },
      { keyword: "UNIFI", mainCategory: "Utilities", subCategory: "Internet" },
      { keyword: "TIME FIBRE", mainCategory: "Utilities", subCategory: "Internet" },

      // Government / Tax
      { keyword: "LHDN", mainCategory: "Tax", subCategory: "Income Tax" },
      { keyword: "LEMBAGA HASIL", mainCategory: "Tax", subCategory: "Income Tax" },
      { keyword: "SST", mainCategory: "Tax", subCategory: "Sales Tax" },
      { keyword: "KASTAM", mainCategory: "Tax", subCategory: "Customs" },
      { keyword: "JPJMY", mainCategory: "Government", subCategory: "Road Tax" },
      { keyword: "JPJ", mainCategory: "Government", subCategory: "Road Tax" },
      { keyword: "PUSPAKOM", mainCategory: "Government", subCategory: "Vehicle Inspection" },
      { keyword: "MDEC", mainCategory: "Government", subCategory: "Tech Grants" },
      { keyword: "SSM", mainCategory: "Government", subCategory: "Company Registration" },

      // Payroll / Statutory
      { keyword: "EPF", mainCategory: "Payroll", subCategory: "EPF Contribution" },
      { keyword: "KWSP", mainCategory: "Payroll", subCategory: "EPF Contribution" },
      { keyword: "SOCSO", mainCategory: "Payroll", subCategory: "SOCSO Contribution" },
      { keyword: "PERKESO", mainCategory: "Payroll", subCategory: "SOCSO Contribution" },
      { keyword: "EIS", mainCategory: "Payroll", subCategory: "EIS Contribution" },
      { keyword: "HRDF", mainCategory: "Payroll", subCategory: "Training Levy" },
      { keyword: "SALARY", mainCategory: "Payroll", subCategory: "Wages" },
      { keyword: "GAJI", mainCategory: "Payroll", subCategory: "Wages" },
      { keyword: "PAYROLL", mainCategory: "Payroll", subCategory: "Wages" },

      // Banks (common Malaysian banks)
      { keyword: "MAYBANK", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "CIMB", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "PUBLIC BANK", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "RHB", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "HONG LEONG", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "AMBANK", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "BANK ISLAM", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "BSN", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "AFFIN", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "ALLIANCE", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "UOB", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "OCBC", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "HSBC", mainCategory: "Banking", subCategory: "Bank Charges" },
      { keyword: "STANDARD CHARTERED", mainCategory: "Banking", subCategory: "Bank Charges" },

      // Payment Gateways / E-wallets
      { keyword: "GRABPAY", mainCategory: "Payment Gateway", subCategory: "E-Wallet" },
      { keyword: "TOUCH N GO", mainCategory: "Payment Gateway", subCategory: "E-Wallet" },
      { keyword: "TNG", mainCategory: "Payment Gateway", subCategory: "E-Wallet" },
      { keyword: "BOOST", mainCategory: "Payment Gateway", subCategory: "E-Wallet" },
      { keyword: "SHOPEE PAY", mainCategory: "Payment Gateway", subCategory: "E-Wallet" },
      { keyword: "IPAY88", mainCategory: "Payment Gateway", subCategory: "Merchant" },
      { keyword: "REVENUE MONSTER", mainCategory: "Payment Gateway", subCategory: "Merchant" },
      { keyword: "SENANGPAY", mainCategory: "Payment Gateway", subCategory: "Merchant" },
      { keyword: "BILLPLZ", mainCategory: "Payment Gateway", subCategory: "Merchant" },
      { keyword: "STRIPE", mainCategory: "Payment Gateway", subCategory: "Merchant" },
      { keyword: "PAYPAL", mainCategory: "Payment Gateway", subCategory: "International" },
      { keyword: "WISE", mainCategory: "Payment Gateway", subCategory: "International" },

      // E-commerce Platforms
      { keyword: "LAZADA", mainCategory: "E-Commerce", subCategory: "Marketplace" },
      { keyword: "SHOPEE", mainCategory: "E-Commerce", subCategory: "Marketplace" },
      { keyword: "ZALORA", mainCategory: "E-Commerce", subCategory: "Marketplace" },

      // Software / SaaS
      { keyword: "AWS", mainCategory: "Software", subCategory: "Cloud Services" },
      { keyword: "AMAZON WEB", mainCategory: "Software", subCategory: "Cloud Services" },
      { keyword: "GOOGLE CLOUD", mainCategory: "Software", subCategory: "Cloud Services" },
      { keyword: "MICROSOFT", mainCategory: "Software", subCategory: "Licenses" },
      { keyword: "ADOBE", mainCategory: "Software", subCategory: "Licenses" },
      { keyword: "ZOOM", mainCategory: "Software", subCategory: "Communication" },
      { keyword: "SLACK", mainCategory: "Software", subCategory: "Communication" },

      // Office / Rent
      { keyword: "RENTAL", mainCategory: "Premises", subCategory: "Rent" },
      { keyword: "SEWA", mainCategory: "Premises", subCategory: "Rent" },
      { keyword: "MAINTENANCE", mainCategory: "Premises", subCategory: "Maintenance" },
      { keyword: "PARKING", mainCategory: "Premises", subCategory: "Parking" },

      // Insurance
      { keyword: "INSURANCE", mainCategory: "Insurance", subCategory: "General" },
      { keyword: "TAKAFUL", mainCategory: "Insurance", subCategory: "Islamic" },
      { keyword: "AIA", mainCategory: "Insurance", subCategory: "Life" },
      { keyword: "PRUDENTIAL", mainCategory: "Insurance", subCategory: "Life" },
      { keyword: "GREAT EASTERN", mainCategory: "Insurance", subCategory: "Life" },
      { keyword: "ALLIANZ", mainCategory: "Insurance", subCategory: "General" },
    ];

    const now = Date.now();
    let count = 0;

    for (const cat of malaysianCategories) {
      await ctx.db.insert("categories", {
        keyword: cat.keyword,
        mainCategory: cat.mainCategory,
        subCategory: cat.subCategory,
        isGlobal: true,
        createdAt: now,
      });
      count++;
    }

    return { message: "Categories seeded successfully", count };
  },
});
