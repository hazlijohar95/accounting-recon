/**
 * Agent Engine — Intelligence Orchestrator
 *
 * Main orchestration module that runs all three analysis layers:
 * 1. Rules Layer (agentRules.ts) — Zero tokens
 * 2. Cross-Reference Layer (agentCrossRef.ts) — Zero tokens
 * 3. LLM Layer (agentLlm.ts) — ~2,200 tokens worst case
 *
 * Also provides queries for reading findings from the frontend.
 *
 * @module convex/agentEngine
 */

import { v } from "convex/values";
import { query, internalAction, internalMutation, internalQuery, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { verifyQueryCompanyAccess } from "./lib/auth";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";

// Import pure analysis functions
import { runRulesLayer } from "./lib/agentRules";
import type { AgentFinding, AgentFindingType, DocumentInfo, TransactionInfo, AccrualDocInfo } from "./lib/agentUtils";
import { normalizeCompanyName } from "./lib/agentUtils";
import { runCrossRefLayer } from "./lib/agentCrossRef";
import { resolveEntityNames, generateAgentSummary } from "./lib/agentLlm";
import type { AgentStats } from "./lib/agentLlm";

// ============================================================================
// Severity Sorting Helper (shared by queries)
// ============================================================================

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

function sortBySeverity<T extends { severity: string; createdAt: number }>(items: T[]): T[] {
  return items.sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
    return sevDiff !== 0 ? sevDiff : a.createdAt - b.createdAt;
  });
}

// ============================================================================
// Queries — Real-time subscriptions for the frontend
// ============================================================================

/**
 * Get all findings for an agent session, ordered by severity then creation time.
 * Frontend subscribes to this for real-time finding updates.
 */
export const getFindingsForSession = query({
  args: {
    agentSessionId: v.id("agentSessions"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.agentSessionId);
    if (!session) return [];

    const { allowed } = await verifyQueryCompanyAccess(
      ctx, session.companyId, args.workosUserId,
    );
    if (!allowed) return [];

    const findings = await ctx.db
      .query("agentFindings")
      .withIndex("by_session", (q) => q.eq("agentSessionId", args.agentSessionId))
      .collect();

    return sortBySeverity(findings);
  },
});

/**
 * Get unresolved findings for a reconciliation session.
 * Used on /reconcile to show agent context banners.
 */
export const getFindingsForReconciliation = query({
  args: {
    reconciliationSessionId: v.id("reconciliationSessions"),
    workosUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reconSession = await ctx.db.get(args.reconciliationSessionId);
    if (!reconSession) return [];

    const { allowed } = await verifyQueryCompanyAccess(
      ctx, reconSession.companyId, args.workosUserId,
    );
    if (!allowed) return [];

    // Find the agent session linked to this reconciliation
    const agentSessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_reconciliation_session", (q) =>
        q.eq("reconciliationSessionId", args.reconciliationSessionId),
      )
      .take(1);

    const agentSession = agentSessions[0];
    if (!agentSession) return [];

    // Get unresolved findings (open or acknowledged)
    const findings = await ctx.db
      .query("agentFindings")
      .withIndex("by_session", (q) => q.eq("agentSessionId", agentSession._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "acknowledged"),
        ),
      )
      .collect();

    return sortBySeverity(findings);
  },
});

// ============================================================================
// Internal Queries — Data fetching for the engine
// ============================================================================

/**
 * Batch-fetch all data needed for agent analysis.
 * Uses parallel Promise.all for document lookups and per-document index queries.
 * For 50 documents, this runs ~50 parallel reads instead of ~150 sequential ones.
 */
export const getAnalysisData = internalQuery({
  args: {
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, { documentIds }) => {
    // Parallel fetch: all documents at once
    const docResults = await Promise.all(
      documentIds.map((docId) => ctx.db.get(docId)),
    );
    const documents: Doc<"documents">[] = docResults.filter(
      (d): d is Doc<"documents"> => d !== null,
    );

    // Parallel fetch: transactions per-document via index
    const txnResults = await Promise.all(
      documentIds.map((docId) =>
        ctx.db
          .query("transactions")
          .withIndex("by_source_document", (q) => q.eq("sourceDocumentId", docId))
          .collect(),
      ),
    );
    const transactions: Doc<"transactions">[] = txnResults.flat();

    // Parallel fetch: accrual docs per-document via index
    const accrualResults = await Promise.all(
      documentIds.map((docId) =>
        ctx.db
          .query("accrualDocuments")
          .withIndex("by_source_document", (q) => q.eq("sourceDocumentId", docId))
          .collect(),
      ),
    );
    const accrualDocs: Doc<"accrualDocuments">[] = accrualResults.flat();

    return { documents, transactions, accrualDocs };
  },
});

/**
 * Get company info for cross-reference analysis.
 */
export const getCompanyInfo = internalQuery({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    const company = await ctx.db.get(companyId);
    if (!company) return null;
    return {
      name: company.name,
      tradingAs: company.tradingAs ?? undefined,
      registrationNumber: company.registrationNumber ?? undefined,
    };
  },
});

// ============================================================================
// Internal Mutations — Storing results
// ============================================================================

/**
 * Bulk-insert findings into the agentFindings table.
 */
export const storeFindings = internalMutation({
  args: {
    agentSessionId: v.id("agentSessions"),
    companyId: v.id("companies"),
    findings: v.array(v.object({
      type: v.string(),
      severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
      title: v.string(),
      description: v.string(),
      details: v.optional(v.string()),
      relatedDocumentIds: v.optional(v.array(v.id("documents"))),
      relatedTransactionIds: v.optional(v.array(v.id("transactions"))),
    })),
  },
  returns: v.null(),
  handler: async (ctx, { agentSessionId, companyId, findings }) => {
    const now = Date.now();

    for (const finding of findings) {
      await ctx.db.insert("agentFindings", {
        agentSessionId,
        companyId,
        type: finding.type as AgentFindingType,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        details: finding.details,
        status: "open",
        relatedDocumentIds: finding.relatedDocumentIds,
        relatedTransactionIds: finding.relatedTransactionIds,
        createdAt: now,
      });
    }

    return null;
  },
});

/**
 * Update a finding's status (acknowledge, resolve, dismiss).
 */
export const updateFindingStatus = internalMutation({
  args: {
    findingId: v.id("agentFindings"),
    status: v.union(
      v.literal("open"),
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    userResponse: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { findingId, status, userResponse }) => {
    const finding = await ctx.db.get(findingId);
    if (!finding) throw new Error(`Finding ${findingId} not found`);

    const update: Record<string, unknown> = { status };
    if (userResponse !== undefined) update.userResponse = userResponse;
    if (status === "resolved" || status === "dismissed") update.resolvedAt = Date.now();

    await ctx.db.patch(findingId, update);
    return null;
  },
});

/**
 * Atomically check-and-set session to "analyzing" status.
 * Returns true if the transition succeeded, false if session is not in a startable state.
 * This prevents duplicate concurrent analyses.
 *
 * Accepts "active" (initial analysis) or "active" from reset (re-analysis after adding files).
 */
export const tryStartAnalysis = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  returns: v.boolean(),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return false;

    // Only start if session is in "active" state (not already analyzing/ready/etc.)
    if (session.status !== "active") return false;

    await ctx.db.patch(sessionId, {
      status: "analyzing",
      currentStep: "analyze",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Clear all findings for a session before re-analysis.
 * Called when the user adds more files and the engine re-runs.
 */
export const clearFindings = internalMutation({
  args: {
    agentSessionId: v.id("agentSessions"),
  },
  returns: v.null(),
  handler: async (ctx, { agentSessionId }) => {
    const findings = await ctx.db
      .query("agentFindings")
      .withIndex("by_session", (q) => q.eq("agentSessionId", agentSessionId))
      .collect();

    for (const finding of findings) {
      await ctx.db.delete(finding._id);
    }

    return null;
  },
});

// ============================================================================
// Shared Analysis Pipeline
// ============================================================================

/**
 * Core analysis pipeline shared between action handlers.
 * Runs all 3 layers, stores findings, and completes the session.
 *
 * @returns Finding counts on success
 * @throws on failure (caller handles error recovery)
 */
async function executeAnalysisPipeline(
  ctx: ActionCtx,
  agentSessionId: Id<"agentSessions">,
  session: { companyId: Id<"companies">; documentIds: Id<"documents">[] },
): Promise<{ findingCount: number; criticalCount: number; warningCount: number; tokenUsage: TokenTracker }> {
  // Step 1: Fetch all data
  const data = await ctx.runQuery(internal.agentEngine.getAnalysisData, {
    documentIds: session.documentIds,
  });

  const companyInfo = await ctx.runQuery(internal.agentEngine.getCompanyInfo, {
    companyId: session.companyId,
  });

  if (!companyInfo) {
    throw new Error("Company not found");
  }

  // Step 2: Map Convex docs to lightweight types for the pure functions
  const documentInfos: DocumentInfo[] = data.documents.map((doc: Doc<"documents">) => ({
    _id: doc._id as string,
    fileName: doc.fileName,
    documentType: doc.documentType,
    extractionStatus: doc.extractionStatus,
    extractionConfidence: doc.extractionConfidence ?? undefined,
    extractedTransactionCount: doc.extractedTransactionCount ?? undefined,
    extractedCompanyName: doc.extractedCompanyName ?? doc.accountHolderName ?? undefined,
    accountHolderName: doc.accountHolderName ?? undefined,
    accountNumber: doc.accountNumber ?? undefined,
    periodStart: doc.periodStart ?? undefined,
    periodEnd: doc.periodEnd ?? undefined,
    extractedCounterparties: doc.extractedCounterparties ?? undefined,
    extractedCurrency: doc.extractedCurrency ?? undefined,
    errorMessage: doc.errorMessage ?? undefined,
  }));

  const transactionInfos: TransactionInfo[] = data.transactions.map((tx: Doc<"transactions">) => ({
    _id: tx._id as string,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    reference: tx.reference ?? undefined,
    sourceDocumentId: tx.sourceDocumentId ? (tx.sourceDocumentId as string) : undefined,
  }));

  const accrualDocInfos: AccrualDocInfo[] = data.accrualDocs.map((ad: Doc<"accrualDocuments">) => ({
    _id: ad._id as string,
    docType: ad.docType,
    docDate: ad.docDate,
    docNumber: ad.docNumber ?? undefined,
    counterparty: ad.counterparty ?? undefined,
    amount: ad.amount,
    description: ad.description ?? undefined,
    sourceDocumentId: ad.sourceDocumentId ? (ad.sourceDocumentId as string) : undefined,
  }));

  // Step 3: Run Rules Layer (zero tokens)
  const rulesFindings = runRulesLayer(documentInfos, transactionInfos, accrualDocInfos);

  // Step 4: Run Cross-Reference Layer (zero tokens)
  const crossRefFindings = runCrossRefLayer(
    companyInfo.name,
    companyInfo.tradingAs,
    documentInfos,
    transactionInfos,
    accrualDocInfos,
  );

  // Combine all findings
  let allFindings: AgentFinding[] = [...rulesFindings, ...crossRefFindings];

  // Create Bedrock caller once for both LLM steps (entity resolution + summary)
  const { call: bedrockCall, tracker: tokenTracker } = createBedrockCaller();

  // Step 5: Check if entity resolution is needed + build company lanes
  const multiCompanyFinding = allFindings.find((f) => f.type === "multi_company_detected");
  if (multiCompanyFinding && multiCompanyFinding.details) {
    const detailsObj = multiCompanyFinding.details as Record<string, unknown>;
    const companyNames = detailsObj.companyNames;
    const detectedGroups = detailsObj.groups as Array<{
      companyName: string;
      normalizedName: string;
      documentCount: number;
      documentIds: string[];
    }> | undefined;

    if (Array.isArray(companyNames) && companyNames.length >= 2 && companyNames.length <= 10) {
      const entityResult = await resolveEntityNames(
        companyNames as string[],
        companyInfo.name,
        bedrockCall,
      );

      if (entityResult) {
        if (entityResult.groups.length === 1 || entityResult.matchesCompany.length === companyNames.length) {
          // All names are variants of the same company — replace warning with verification
          allFindings = allFindings.filter((f) => f.type !== "multi_company_detected");
          allFindings.push({
            type: "company_verified",
            severity: "info",
            title: `Company Verified: ${companyInfo.name}`,
            description: `All documents reference ${companyInfo.name} (some use slightly different name formats, but they all refer to the same company).`,
            details: {
              resolvedGroups: entityResult.groups,
              matchesCompany: entityResult.matchesCompany,
            },
          });
        } else if (detectedGroups && detectedGroups.length >= 2) {
          // Genuinely different companies detected — build company lanes
          // The primary company (matching the selected company) is auto-selected
          const lanes = detectedGroups.map((group) => {
            const isSelectedCompany = entityResult.matchesCompany.some(
              (name) => normalizeCompanyName(name) === group.normalizedName,
            );
            return {
              detectedCompanyName: group.companyName,
              companyId: isSelectedCompany ? session.companyId : undefined,
              documentIds: group.documentIds.map((id) => id as Id<"documents">),
              isSelected: isSelectedCompany,
            };
          });

          // Persist lanes on the session (fire-and-forget, non-blocking)
          try {
            await ctx.runMutation(internal.agentSession.setCompanyLanes, {
              sessionId: agentSessionId,
              companyLanes: lanes,
            });
          } catch (laneError) {
            console.warn("[AgentEngine] Failed to set company lanes:", laneError);
            // Non-fatal — the multi_company_detected finding still surfaces the info
          }
        }
      }
    }
  }

  // Step 5b: Compute stats for summary generation (single-pass)
  let bankStatements = 0;
  let invoices = 0;
  let receipts = 0;
  for (const d of documentInfos) {
    if (d.documentType === "bank_statement") bankStatements++;
    else if (["invoice", "purchase_invoice", "sales_invoice"].includes(d.documentType)) invoices++;
    else if (d.documentType === "receipt") receipts++;
  }

  const stats: AgentStats = {
    totalDocuments: documentInfos.length,
    bankStatements,
    invoices,
    receipts,
    totalTransactions: transactionInfos.length,
    totalAccrualDocs: accrualDocInfos.length,
  };

  const periodFinding = allFindings.find((f) => f.type === "period_detected");
  if (periodFinding && periodFinding.details) {
    const details = periodFinding.details as Record<string, unknown>;
    const months = details.coveredMonths;
    if (Array.isArray(months) && months.length > 0) {
      stats.periodRange = `${months[0]} to ${months[months.length - 1]}`;
    } else {
      // Fallback: extract from title if details not structured
      stats.periodRange = periodFinding.title.replace("Period: ", "");
    }
  }

  // Step 6: Generate summary (reuses same Bedrock caller)
  const summary = await generateAgentSummary(allFindings, stats, bedrockCall);

  // Step 7: Store findings in database
  const findingsForStorage = allFindings.map((f) => ({
    type: f.type,
    severity: f.severity,
    title: f.title,
    description: f.description,
    details: f.details ? JSON.stringify(f.details) : undefined,
    relatedDocumentIds: f.relatedDocumentIds
      ? f.relatedDocumentIds.map((id) => id as Id<"documents">)
      : undefined,
    relatedTransactionIds: f.relatedTransactionIds
      ? f.relatedTransactionIds.map((id) => id as Id<"transactions">)
      : undefined,
  }));

  await ctx.runMutation(internal.agentEngine.storeFindings, {
    agentSessionId,
    companyId: session.companyId,
    findings: findingsForStorage,
  });

  // Step 8: Complete analysis (with token usage tracking)
  await ctx.runMutation(internal.agentSession.completeAnalysis, {
    sessionId: agentSessionId,
    summary,
    tokenUsage: tokenTracker.totalTokens > 0 ? {
      promptTokens: tokenTracker.promptTokens,
      completionTokens: tokenTracker.completionTokens,
      totalTokens: tokenTracker.totalTokens,
    } : undefined,
  });

  // Log token usage for monitoring
  if (tokenTracker.totalTokens > 0) {
    console.log(
      `[AgentEngine] Token usage: ${tokenTracker.promptTokens} prompt + ` +
      `${tokenTracker.completionTokens} completion = ${tokenTracker.totalTokens} total`,
    );
  }

  return {
    findingCount: allFindings.length,
    criticalCount: allFindings.filter((f) => f.severity === "critical").length,
    warningCount: allFindings.filter((f) => f.severity === "warning").length,
    tokenUsage: tokenTracker,
  };
}

/**
 * Handle analysis failure — stores an error finding so the user knows what happened,
 * then marks the session as "ready" so the user can still proceed.
 */
async function handleAnalysisError(
  ctx: ActionCtx,
  agentSessionId: Id<"agentSessions">,
  companyId: Id<"companies">,
  error: unknown,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.error("[AgentEngine] Analysis failed:", errorMessage);

  try {
    // Store an error finding so the user knows what happened
    await ctx.runMutation(internal.agentEngine.storeFindings, {
      agentSessionId,
      companyId,
      findings: [{
        type: "extraction_errors",
        severity: "warning",
        title: "Analysis Incomplete",
        description: "The intelligent analysis could not fully complete. Your documents are still ready — you can proceed to reconciliation.",
        details: JSON.stringify({ error: errorMessage }),
      }],
    });

    // Complete with a partial summary
    await ctx.runMutation(internal.agentSession.completeAnalysis, {
      sessionId: agentSessionId,
      summary: "Analysis encountered an issue but your documents have been processed and are ready for reconciliation.",
    });
  } catch (recoveryError) {
    // If even storing the error fails, just reset status
    console.error("[AgentEngine] Error recovery failed:", recoveryError);
    await ctx.runMutation(internal.agentSession.updateStatus, {
      sessionId: agentSessionId,
      status: "ready",
    });
    await ctx.runMutation(internal.agentSession.updateStepInternal, {
      sessionId: agentSessionId,
      step: "validate",
    });
  }
}

// ============================================================================
// Internal Action — Run Agent Analysis (only entry point)
// ============================================================================

/**
 * Run the full agent analysis pipeline.
 * Called via ctx.scheduler.runAfter from uploadAnalysis.runAnalysis.
 *
 * Uses atomic check-and-set to prevent duplicate concurrent analyses.
 * On failure, stores an error finding and marks session ready.
 * Supports re-analysis: clears old findings before running the pipeline.
 */
export const runAgentAnalysisInternal = internalAction({
  args: {
    agentSessionId: v.id("agentSessions"),
  },
  handler: async (ctx, { agentSessionId }) => {
    // Step 0: Get session
    const session = await ctx.runQuery(internal.agentSession.getInternal, {
      sessionId: agentSessionId,
    });
    if (!session) {
      console.warn("[AgentEngine] Agent session not found:", agentSessionId);
      return;
    }

    // Atomic check-and-set: only proceed if session is "active"
    const started = await ctx.runMutation(internal.agentEngine.tryStartAnalysis, {
      sessionId: agentSessionId,
    });
    if (!started) {
      console.warn("[AgentEngine] Session not in startable state, skipping:", session.status);
      return;
    }

    try {
      // Clear old findings before re-analysis (safe for first run too — no-op if empty)
      await ctx.runMutation(internal.agentEngine.clearFindings, {
        agentSessionId,
      });

      const result = await executeAnalysisPipeline(ctx, agentSessionId, session);

      console.log(
        `[AgentEngine] Analysis complete: ${result.findingCount} findings ` +
        `(${result.criticalCount} critical, ${result.warningCount} warning), ` +
        `tokens: ${result.tokenUsage.totalTokens}`,
      );
    } catch (error) {
      await handleAnalysisError(ctx, agentSessionId, session.companyId, error);
    }
  },
});

// ============================================================================
// Bedrock Caller Factory (with Token Tracking)
// ============================================================================

/**
 * Token usage accumulator for a single analysis run.
 */
interface TokenTracker {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Create a Bedrock caller function for LLM layer use, with token tracking.
 *
 * Returns a function that takes a prompt string and returns the LLM response text.
 * Uses Claude Haiku for fast, cheap inference.
 * Also returns a tracker object that accumulates token usage across calls.
 */
function createBedrockCaller(): {
  call: (prompt: string) => Promise<string>;
  tracker: TokenTracker;
} {
  const region = process.env.AWS_REGION || "us-east-1";
  const modelId = process.env.AGENT_MODEL_ID
    || process.env.ANALYSIS_MODEL_ID
    || process.env.EXTRACTION_MODEL_ID
    || "anthropic.claude-3-5-haiku-20241022-v1:0";

  const bedrock = createAmazonBedrock({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

  const tracker: TokenTracker = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  const call = async (prompt: string): Promise<string> => {
    const result = await generateText({
      model: bedrock(modelId),
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      maxOutputTokens: 1024,
    });

    // Accumulate token usage from the Vercel AI SDK response.
    // The SDK uses inputTokens/outputTokens naming, but we store as
    // promptTokens/completionTokens (OpenAI convention) for consistency
    // with the rest of the codebase and common monitoring tools.
    if (result.usage) {
      const input = result.usage.inputTokens ?? 0;
      const output = result.usage.outputTokens ?? 0;
      tracker.promptTokens += input;
      tracker.completionTokens += output;
      tracker.totalTokens += input + output;
    }

    return result.text;
  };

  return { call, tracker };
}
