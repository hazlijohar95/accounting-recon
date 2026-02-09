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
  DEFAULT_PARTIAL_CONFIG,
  MatchingConfig,
  PartialMatchingConfig,
  CashTransaction,
  AccrualDocument,
  findPartialMatchCombination,
  generatePartialMatchGroupId,
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
      v.literal(5),
      v.literal(7)  // Skip 6 (manual), 7 is partial
    ),
    matchReason: v.string(),
  },
  returns: matchIdValidator,
  handler: async (ctx, args) => {
    // RACE CONDITION FIX: Verify both sides are still unmatched before creating
    const cashTxn = await ctx.db.get(args.cashTransactionId);
    if (!cashTxn || cashTxn.status !== "pending") {
      throw new Error(`Cash transaction ${args.cashTransactionId} already matched or not found`);
    }
    const accrualDoc = await ctx.db.get(args.accrualDocumentId);
    if (!accrualDoc || accrualDoc.status === "matched") {
      throw new Error(`Accrual document ${args.accrualDocumentId} already matched or not found`);
    }

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
 * Create partial matched pair records (one cash transaction to multiple accrual documents)
 */
export const createPartialMatches = internalMutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
    cashTransactionId: v.id("transactions"),
    accrualDocumentIds: v.array(v.id("accrualDocuments")),
    matchedAmounts: v.array(v.number()), // Amount per document
    totalMatchedAmount: v.number(),
    confidenceScore: v.number(),
    matchReason: v.string(),
  },
  returns: v.array(v.id("matchedPairs")),
  handler: async (ctx, args) => {
    // RACE CONDITION FIX: Re-read the cash transaction and accrual docs to validate
    // they haven't been matched by a concurrent request since we last checked
    const cashTxn = await ctx.db.get(args.cashTransactionId);
    if (!cashTxn || cashTxn.status !== "pending") {
      // Cash transaction already matched by another request — skip silently
      return [];
    }

    // Generate unique group ID for this partial match
    const partialMatchGroupId = `pm_${args.cashTransactionId.slice(-8)}_${Date.now()}`;

    // Determine confidence category
    const confidence =
      args.confidenceScore >= 90
        ? "high"
        : args.confidenceScore >= 70
          ? "medium"
          : "low";

    const matchIds: Id<"matchedPairs">[] = [];

    // Create one matchedPair record per accrual document
    for (let i = 0; i < args.accrualDocumentIds.length; i++) {
      const accrualDocId = args.accrualDocumentIds[i];
      const matchedAmount = args.matchedAmounts[i];

      // RACE CONDITION FIX: Re-read accrual doc to check current state
      const accrualDoc = await ctx.db.get(accrualDocId);
      if (!accrualDoc || accrualDoc.status === "matched") {
        // Skip this accrual doc if already fully matched by concurrent request
        continue;
      }

      const matchId = await ctx.db.insert("matchedPairs", {
        sessionId: args.sessionId,
        cashTransactionId: args.cashTransactionId,
        accrualDocumentId: accrualDocId,
        confidence,
        confidenceScore: args.confidenceScore,
        matchLayer: 7, // Partial match layer
        matchReason: args.matchReason,
        status: "pending", // Always pending for partial matches - needs user review
        isPartialMatch: true,
        matchedAmount,
        partialMatchGroupId,
        createdAt: Date.now(),
      });

      matchIds.push(matchId);

      // Update accrual document with partial match info using freshly-read values
      const currentMatchedTotal = accrualDoc.matchedTotal || 0;
      const currentMatchCount = accrualDoc.matchCount || 0;
      const newMatchedTotal = currentMatchedTotal + matchedAmount;
      const newMatchCount = currentMatchCount + 1;
      // Use integer cents comparison to avoid floating-point drift
      const isFullyMatched = Math.abs(
        Math.round(newMatchedTotal * 100) - Math.round(Math.abs(accrualDoc.amount) * 100)
      ) < 1;

      await ctx.db.patch(accrualDocId, {
        status: isFullyMatched ? "matched" : "partial",
        matchId: accrualDoc.matchId || matchId, // Keep first match as primary
        matchedTotal: newMatchedTotal,
        matchCount: newMatchCount,
      });
    }

    // Only update cash transaction if we actually created matches
    if (matchIds.length > 0) {
      await ctx.db.patch(args.cashTransactionId, {
        status: "matched",
        matchId: matchIds[0], // Link to first match record
      });
    }

    return matchIds;
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

/**
 * Reset suspense items for a re-run: delete suspense items and reset source statuses to "pending"
 */
export const resetSuspenseForRerun = internalMutation({
  args: {
    sessionId: v.id("reconciliationSessions"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const suspenseItems = await ctx.db
      .query("suspenseItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    let resetCount = 0;
    for (const item of suspenseItems) {
      // Reset the source transaction/document status back to "pending"
      if (item.sourceType === "cash") {
        const txn = await ctx.db.get(item.sourceId as Id<"transactions">);
        if (txn && txn.status === "suspense") {
          await ctx.db.patch(item.sourceId as Id<"transactions">, { status: "pending" });
        }
      } else if (item.sourceType === "accrual") {
        const doc = await ctx.db.get(item.sourceId as Id<"accrualDocuments">);
        if (doc && doc.status === "suspense") {
          await ctx.db.patch(item.sourceId as Id<"accrualDocuments">, { status: "pending" });
        }
      }

      // Delete the suspense item
      await ctx.db.delete(item._id);
      resetCount++;
    }

    return resetCount;
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
  usedMockLLM?: boolean; // True if LLM fallback to smart heuristics was used
  llmError?: string; // Error message if Bedrock failed
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

      // Reset any existing suspense items so re-runs work on fresh data
      const resetCount = await ctx.runMutation(
        internal.matching.engine.resetSuspenseForRerun,
        { sessionId: args.sessionId }
      );
      if (resetCount > 0) {
        console.log(`[Matching] Reset ${resetCount} suspense items for re-run`);
      }

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
        // Still create suspense items for whichever side has items
        let suspenseCount = 0;
        for (const txn of cashTxns) {
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
        for (const doc of accrualDocs) {
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

        await ctx.runMutation(internal.matching.engine.updateSessionStats, {
          sessionId: args.sessionId,
          status: "review",
          progress: 100,
          suspenseCount,
        });

        return {
          success: true,
          totalMatches: 0,
          matchesByLayer: {},
          suspenseItems: suspenseCount,
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
      let llmErrorMessage: string | undefined;
      if (useLLM && unmatchedCash.length > 0 && unmatchedAccrual.length > 0) {
        try {
          const llmInput = formatForLLM(unmatchedCash, unmatchedAccrual);

          // Try real LLM first, fall back to smart mock with logging
          let llmSuggestions;
          try {
            console.log(`[Layer 5] Attempting AWS Bedrock with ${llmInput.cashItems.length} cash, ${llmInput.accrualItems.length} accrual items`);
            llmSuggestions = await ctx.runAction(
              api.matching.llm.runLLMMatching,
              {
                cashItems: llmInput.cashItems,
                accrualItems: llmInput.accrualItems,
                maxItems: 50,
              }
            );
            console.log(`[Layer 5] AWS Bedrock SUCCESS: ${llmSuggestions.length} suggestions`);
          } catch (llmError) {
            // Log the error clearly and fall back to smart mock LLM
            const errorMsg = llmError instanceof Error ? llmError.message : String(llmError);
            console.error(`[Layer 5] AWS Bedrock FAILED: ${errorMsg}`);
            console.log("[Layer 5] Falling back to smart heuristic matching...");

            usedMockLLM = true;
            llmErrorMessage = errorMsg;

            llmSuggestions = await ctx.runAction(
              api.matching.llm.runMockLLMMatching,
              {
                cashItems: llmInput.cashItems,
                accrualItems: llmInput.accrualItems,
              }
            );
            console.log(`[Layer 5] Smart fallback: ${llmSuggestions.length} suggestions`);
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

      // Progress: 75%
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        progress: 75,
      });

      // Track LLM matched IDs for filtering in subsequent layers
      const llmMatchedCashIds = new Set(llmMatches.map((m) => m.cashTransactionId));
      const llmMatchedAccrualIds = new Set(llmMatches.map((m) => m.accrualDocumentId));

      // ============ LAYER 7: PARTIAL MATCHING ============
      // Try to match unmatched cash transactions to combinations of accrual documents
      const partialConfig: PartialMatchingConfig = {
        ...DEFAULT_PARTIAL_CONFIG,
        // Allow override from config if provided
      };

      let partialMatches: MatchCandidate[] = [];

      // Get remaining unmatched after LLM layer
      const afterLLMUnmatchedCash = unmatchedCash.filter(
        (t) => !llmMatchedCashIds.has(t._id)
      );
      const afterLLMUnmatchedAccrual = unmatchedAccrual.filter(
        (d) => !llmMatchedAccrualIds.has(d._id)
      );

      if (partialConfig.enabled && afterLLMUnmatchedCash.length > 0 && afterLLMUnmatchedAccrual.length > 1) {
        console.log(`[Layer 7] Attempting partial matching with ${afterLLMUnmatchedCash.length} cash, ${afterLLMUnmatchedAccrual.length} accrual items`);

        // Track which items get matched in partial matching
        const partialMatchedCashIds = new Set<Id<"transactions">>();
        const partialMatchedAccrualIds = new Set<Id<"accrualDocuments">>();

        // Sort high-value unmatched cash transactions (partial matching works best for larger amounts)
        const highValueCash = afterLLMUnmatchedCash
          .filter((t) => Math.abs(t.amount) >= partialConfig.minCashAmount)
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

        for (const cashTxn of highValueCash) {
          // Skip if already matched in a previous partial match
          if (partialMatchedCashIds.has(cashTxn._id)) continue;

          // Get available accrual docs (not yet matched in partial)
          const availableAccrual = afterLLMUnmatchedAccrual.filter(
            (d) => !partialMatchedAccrualIds.has(d._id)
          );

          if (availableAccrual.length < 2) break; // Need at least 2 docs for partial match

          // Find best combination
          const combination = findPartialMatchCombination(
            cashTxn,
            availableAccrual,
            partialConfig
          );

          if (combination && combination.confidence >= partialConfig.minConfidence) {
            console.log(`[Layer 7] Found partial match for ${cashTxn._id}: ${combination.documents.length} docs, confidence=${combination.confidence}%`);

            // Create partial match records
            const matchedAmounts = combination.documents.map((d) => Math.abs(d.amount));
            const accrualIds = combination.documents.map((d) => d._id);

            await ctx.runMutation(internal.matching.engine.createPartialMatches, {
              sessionId: args.sessionId,
              cashTransactionId: cashTxn._id,
              accrualDocumentIds: accrualIds,
              matchedAmounts,
              totalMatchedAmount: combination.totalAmount,
              confidenceScore: combination.confidence,
              matchReason: combination.matchReason,
            });

            // Track as matched
            partialMatchedCashIds.add(cashTxn._id);
            for (const doc of combination.documents) {
              partialMatchedAccrualIds.add(doc._id);
              partialMatches.push({
                cashTransactionId: cashTxn._id,
                accrualDocumentId: doc._id,
                confidenceScore: combination.confidence,
                matchLayer: 7,
                matchReason: combination.matchReason,
              });
            }
          }
        }

        matchesByLayer[7] = partialMatches.length;
        console.log(`[Layer 7] Partial matching complete: ${partialMatches.length} matches created`);
      }

      // Progress: 85%
      await ctx.runMutation(internal.matching.engine.updateSessionStats, {
        sessionId: args.sessionId,
        progress: 85,
      });

      // Create suspense items for remaining unmatched
      // Exclude items matched in LLM layer and partial match layer
      const partialMatchedCashIdsSet = new Set(partialMatches.map((m) => m.cashTransactionId));
      const partialMatchedAccrualIdsSet = new Set(partialMatches.map((m) => m.accrualDocumentId));

      const finalUnmatchedCash = unmatchedCash.filter(
        (t) => !llmMatchedCashIds.has(t._id) && !partialMatchedCashIdsSet.has(t._id)
      );
      const finalUnmatchedAccrual = unmatchedAccrual.filter(
        (d) => !llmMatchedAccrualIds.has(d._id) && !partialMatchedAccrualIdsSet.has(d._id)
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
      const totalMatches = matches.length + llmMatches.length + partialMatches.length;
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
        llmError: llmErrorMessage,
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
