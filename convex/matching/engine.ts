/**
 * Matching Engine - Core Orchestration
 * Coordinates all 5 matching layers and updates session state
 */

import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import {
  runNonLLMLayers,
  formatForLLM,
  MatchCandidate,
  DEFAULT_CONFIG,
  MatchingConfig,
  CashTransaction,
  AccrualDocument,
} from "./layers";
import { ValidationErrors } from "../lib/errors";
import { transactionDocValidator, accrualDocValidator, sessionDocValidator, companyDocValidator, matchIdValidator, suspenseItemIdValidator } from "../lib/validators";

// ============ INTERNAL QUERIES ============

/**
 * Get unmatched cash transactions for a session
 */
export const getUnmatchedCashTransactions = internalQuery({
  args: { sessionId: v.id("reconciliationSessions") },
  returns: v.array(transactionDocValidator),
  handler: async (ctx, args): Promise<CashTransaction[]> => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "cash"),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    return transactions as CashTransaction[];
  },
});

/**
 * Get unmatched accrual documents for a session
 */
export const getUnmatchedAccrualDocuments = internalQuery({
  args: { sessionId: v.id("reconciliationSessions") },
  returns: v.array(accrualDocValidator),
  handler: async (ctx, args): Promise<AccrualDocument[]> => {
    const docs = await ctx.db
      .query("accrualDocuments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return docs as AccrualDocument[];
  },
});

/**
 * Get session with company info
 */
export const getSessionWithCompany = internalQuery({
  args: { sessionId: v.id("reconciliationSessions") },
  returns: v.union(
    v.object({
      session: sessionDocValidator,
      company: v.union(companyDocValidator, v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const company = await ctx.db.get(session.companyId);
    return { session, company };
  },
});

// ============ INTERNAL MUTATIONS ============

/**
 * Create a matched pair record
 */
export const createMatchedPair = internalMutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    cashTransactionId: v.id("transactions"),
    accrualDocumentId: v.id("accrualDocuments"),
    confidenceScore: v.number(),
    matchLayer: v.union(
      v.literal(1),
      v.literal(2),
      v.literal(3),
      v.literal(4),
      v.literal(5)
    ),
    matchReason: v.string(),
  },
  returns: matchIdValidator,
  handler: async (ctx, args) => {
    // Determine confidence category
    const confidence =
      args.confidenceScore >= 90
        ? "high"
        : args.confidenceScore >= 70
          ? "medium"
          : "low";

    // Auto-approve high confidence matches from Layers 1-2
    const autoApprove = args.matchLayer <= 2 && confidence === "high";

    // Create the match
    const matchId = await ctx.db.insert("matchedPairs", {
      sessionId: args.sessionId,
      cashTransactionId: args.cashTransactionId,
      accrualDocumentId: args.accrualDocumentId,
      confidence,
      confidenceScore: args.confidenceScore,
      matchLayer: args.matchLayer,
      matchReason: args.matchReason,
      status: autoApprove ? "approved" : "pending",
      reviewedAt: autoApprove ? Date.now() : undefined,
      createdAt: Date.now(),
    });

    // Update cash transaction
    await ctx.db.patch(args.cashTransactionId, {
      status: "matched",
      matchId,
    });

    // Update accrual document
    await ctx.db.patch(args.accrualDocumentId, {
      status: "matched",
      matchId,
    });

    return matchId;
  },
});

/**
 * Create a suspense item for unmatched transactions
 */
export const createSuspenseItem = internalMutation({
  args: {
    companyId: v.id("companies"),
    sessionId: v.id("reconciliationSessions"),
    sourceType: v.union(v.literal("cash"), v.literal("accrual")),
    // Accept typed IDs directly instead of string
    transactionId: v.optional(v.id("transactions")),
    accrualDocId: v.optional(v.id("accrualDocuments")),
    amount: v.number(),
    transactionDate: v.string(),
    description: v.string(),
  },
  returns: suspenseItemIdValidator,
  handler: async (ctx, args) => {
    // Validate that exactly one source ID is provided
    if (args.sourceType === "cash" && !args.transactionId) {
      return ValidationErrors.missingField("transactionId for cash source type");
    }
    if (args.sourceType === "accrual" && !args.accrualDocId) {
      return ValidationErrors.missingField("accrualDocId for accrual source type");
    }

    const sourceId = args.sourceType === "cash" 
      ? args.transactionId! 
      : args.accrualDocId!;

    // Create suspense item
    const itemId = await ctx.db.insert("suspenseItems", {
      companyId: args.companyId,
      sessionId: args.sessionId,
      sourceType: args.sourceType,
      sourceId: sourceId,
      amount: args.amount,
      transactionDate: args.transactionDate,
      description: args.description,
      reason: "no_match",
      suggestedAction:
        args.sourceType === "cash"
          ? "Review bank transaction for missing invoice"
          : "Check if payment has been received",
      status: "open",
      createdAt: Date.now(),
    });

    // Update source record to suspense status (type-safe)
    if (args.sourceType === "cash" && args.transactionId) {
      await ctx.db.patch(args.transactionId, {
        status: "suspense",
      });
    } else if (args.sourceType === "accrual" && args.accrualDocId) {
      await ctx.db.patch(args.accrualDocId, {
        status: "suspense",
      });
    }

    return itemId;
  },
});

/**
 * Update session progress and stats
 */
export const updateSessionStats = internalMutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("processing"),
        v.literal("review"),
        v.literal("completed")
      )
    ),
    progress: v.optional(v.number()),
    matchedCount: v.optional(v.number()),
    suspenseCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { sessionId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(sessionId, filteredUpdates);
    return null;
  },
});

// ============ MAIN MATCHING ACTION ============

export interface MatchingResult {
  success: boolean;
  totalMatches: number;
  matchesByLayer: Record<number, number>;
  suspenseItems: number;
  unmatchedCash: number;
  unmatchedAccrual: number;
  usedMockLLM?: boolean; // True if LLM fallback to mock was used
  error?: string;
}

/**
 * Run the full 5-layer matching engine
 */
export const runMatchingEngine = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
    useLLM: v.optional(v.boolean()),
    config: v.optional(
      v.object({
        exactDateWindow: v.optional(v.number()),
        windowDateWindow: v.optional(v.number()),
        fuzzyDateWindow: v.optional(v.number()),
        amountTolerance: v.optional(v.number()),
        amountVariancePercent: v.optional(v.number()),
        minFuzzySimilarity: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args): Promise<MatchingResult> => {
    const useLLM = args.useLLM ?? false;
    const config: MatchingConfig = {
      ...DEFAULT_CONFIG,
      ...(args.config || {}),
    };

    try {
      // Get session info
      const sessionData = await ctx.runQuery(
        internal.matching.engine.getSessionWithCompany,
        { sessionId: args.sessionId }
      );

      if (!sessionData || !sessionData.session || !sessionData.company) {
        return {
          success: false,
          totalMatches: 0,
          matchesByLayer: {},
          suspenseItems: 0,
          unmatchedCash: 0,
          unmatchedAccrual: 0,
          error: "Session or company not found",
        };
      }

      const { session, company } = sessionData;

      // Update session to processing
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        status: "processing",
        progress: 5,
      });

      // Load unmatched items
      const cashTxns = await ctx.runQuery(
        internal.matching.engine.getUnmatchedCashTransactions,
        { sessionId: args.sessionId }
      );

      const accrualDocs = await ctx.runQuery(
        internal.matching.engine.getUnmatchedAccrualDocuments,
        { sessionId: args.sessionId }
      );

      if (cashTxns.length === 0 || accrualDocs.length === 0) {
        await ctx.runMutation(internal.matching.engine.updateSessionStats, {
          sessionId: args.sessionId,
          status: "review",
          progress: 100,
        });

        return {
          success: true,
          totalMatches: 0,
          matchesByLayer: {},
          suspenseItems: 0,
          unmatchedCash: cashTxns.length,
          unmatchedAccrual: accrualDocs.length,
        };
      }

      // Progress: 10%
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        progress: 10,
      });

      // Run Layers 1-4
      const { matches, unmatchedCash, unmatchedAccrual } = runNonLLMLayers(
        cashTxns,
        accrualDocs,
        config
      );

      // Progress: 60%
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        progress: 60,
      });

      // Track matches by layer
      const matchesByLayer: Record<number, number> = {};
      for (const m of matches) {
        matchesByLayer[m.matchLayer] = (matchesByLayer[m.matchLayer] || 0) + 1;
      }

      // Create matched pairs in database
      for (const match of matches) {
        await ctx.runMutation(internal.matching.engine.createMatchedPair, {
          sessionId: args.sessionId,
          cashTransactionId: match.cashTransactionId,
          accrualDocumentId: match.accrualDocumentId,
          confidenceScore: match.confidenceScore,
          matchLayer: match.matchLayer,
          matchReason: match.matchReason,
        });
      }

      // Progress: 70%
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        progress: 70,
      });

      // Layer 5: LLM Matching (optional)
      let llmMatches: MatchCandidate[] = [];
      let usedMockLLM = false;
      if (useLLM && unmatchedCash.length > 0 && unmatchedAccrual.length > 0) {
        try {
          const llmInput = formatForLLM(unmatchedCash, unmatchedAccrual);

          // Try real LLM first, fall back to mock with logging
          let llmSuggestions;
          try {
            llmSuggestions = await ctx.runAction(
              api.matching.llm.runLLMMatching,
              {
                cashItems: llmInput.cashItems,
                accrualItems: llmInput.accrualItems,
                maxItems: 50,
              }
            );
            console.log(`Layer 5 LLM: Real Bedrock returned ${llmSuggestions.length} suggestions`);
          } catch (llmError) {
            // Log the error and fall back to mock LLM
            console.warn("Layer 5 LLM: Bedrock failed, falling back to mock matching:", llmError);
            usedMockLLM = true;
            llmSuggestions = await ctx.runAction(
              api.matching.llm.runMockLLMMatching,
              {
                cashItems: llmInput.cashItems,
                accrualItems: llmInput.accrualItems,
              }
            );
            console.log(`Layer 5 LLM: Mock returned ${llmSuggestions.length} suggestions`);
          }

          // Create matches from LLM suggestions
          // DESIGN SPEC: ≥90% auto-match, 70-89% suggest, <70% suspense
          const LLM_MIN_CONFIDENCE = 70;
          for (const suggestion of llmSuggestions) {
            if (suggestion.confidence >= LLM_MIN_CONFIDENCE) {
              // Only use confident matches (≥70% per design spec)
              await ctx.runMutation(internal.matching.engine.createMatchedPair, {
                sessionId: args.sessionId,
                cashTransactionId: suggestion.cashTransactionId as Id<"transactions">,
                accrualDocumentId: suggestion.accrualDocumentId as Id<"accrualDocuments">,
                confidenceScore: suggestion.confidence,
                matchLayer: 5,
                matchReason: suggestion.reasoning,
              });

              llmMatches.push({
                cashTransactionId: suggestion.cashTransactionId as Id<"transactions">,
                accrualDocumentId: suggestion.accrualDocumentId as Id<"accrualDocuments">,
                confidenceScore: suggestion.confidence,
                matchLayer: 5,
                matchReason: suggestion.reasoning,
              });
            }
          }

          matchesByLayer[5] = llmMatches.length;
        } catch (error) {
          console.error("LLM matching failed:", error);
        }
      }

      // Progress: 85%
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        progress: 85,
      });

      // Create suspense items for remaining unmatched
      const llmMatchedCashIds = new Set(llmMatches.map((m) => m.cashTransactionId));
      const llmMatchedAccrualIds = new Set(llmMatches.map((m) => m.accrualDocumentId));

      const finalUnmatchedCash = unmatchedCash.filter(
        (t) => !llmMatchedCashIds.has(t._id)
      );
      const finalUnmatchedAccrual = unmatchedAccrual.filter(
        (d) => !llmMatchedAccrualIds.has(d._id)
      );

      let suspenseCount = 0;

      // Create suspense items for unmatched cash transactions
      for (const txn of finalUnmatchedCash) {
        await ctx.runMutation(internal.matching.engine.createSuspenseItem, {
          companyId: company._id,
          sessionId: args.sessionId,
          sourceType: "cash",
          transactionId: txn._id,
          amount: txn.amount,
          transactionDate: txn.date,
          description: txn.description,
        });
        suspenseCount++;
      }

      // Create suspense items for unmatched accrual documents
      for (const doc of finalUnmatchedAccrual) {
        await ctx.runMutation(internal.matching.engine.createSuspenseItem, {
          companyId: company._id,
          sessionId: args.sessionId,
          sourceType: "accrual",
          accrualDocId: doc._id,
          amount: doc.amount,
          transactionDate: doc.docDate,
          description: doc.description || doc.counterparty || `Doc #${doc.docNumber}`,
        });
        suspenseCount++;
      }

      // Update final session stats
      const totalMatches = matches.length + llmMatches.length;
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        status: "review",
        progress: 100,
        matchedCount: totalMatches,
        suspenseCount,
      });

      return {
        success: true,
        totalMatches,
        matchesByLayer,
        suspenseItems: suspenseCount,
        unmatchedCash: finalUnmatchedCash.length,
        unmatchedAccrual: finalUnmatchedAccrual.length,
        usedMockLLM,
      };
    } catch (error) {
      console.error("Matching engine error:", error);

      // Update session to indicate failure
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        status: "review",
        progress: 100,
      });

      return {
        success: false,
        totalMatches: 0,
        matchesByLayer: {},
        suspenseItems: 0,
        unmatchedCash: 0,
        unmatchedAccrual: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Quick preview of what matching would find without persisting
 */
export const previewMatching = action({
  args: {
    sessionId: v.id("reconciliationSessions"),
  },
  handler: async (ctx, args) => {
    // Load items
    const cashTxns = await ctx.runQuery(
      internal.matching.engine.getUnmatchedCashTransactions,
      { sessionId: args.sessionId }
    );

    const accrualDocs = await ctx.runQuery(
      internal.matching.engine.getUnmatchedAccrualDocuments,
      { sessionId: args.sessionId }
    );

    // Run matching without persisting
    const { matches, unmatchedCash, unmatchedAccrual } = runNonLLMLayers(
      cashTxns,
      accrualDocs
    );

    // Summary by layer
    const byLayer: Record<number, number> = {};
    const byConfidence: Record<string, number> = { high: 0, medium: 0, low: 0 };

    for (const m of matches) {
      byLayer[m.matchLayer] = (byLayer[m.matchLayer] || 0) + 1;
      if (m.confidenceScore >= 90) byConfidence.high++;
      else if (m.confidenceScore >= 70) byConfidence.medium++;
      else byConfidence.low++;
    }

    return {
      totalCash: cashTxns.length,
      totalAccrual: accrualDocs.length,
      potentialMatches: matches.length,
      matchesByLayer: byLayer,
      matchesByConfidence: byConfidence,
      unmatchedCash: unmatchedCash.length,
      unmatchedAccrual: unmatchedAccrual.length,
    };
  },
});
