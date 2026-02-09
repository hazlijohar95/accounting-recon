/**
 * Agent LLM Layer — Layer 3
 *
 * LLM-powered functions for complex reasoning that rules can't handle.
 * Called sparingly — only when rules detect ambiguity or for the final summary.
 *
 * Functions:
 * - buildEntityResolutionPrompt — Pure, testable prompt builder
 * - parseEntityResolutionResponse — Pure, testable response parser
 * - resolveEntityNames — Calls Bedrock to group company name variants
 * - buildSummaryPrompt — Pure, testable prompt builder
 * - generateAgentSummary — Calls Bedrock to produce plain-language summary
 *
 * Token Budget:
 * - resolveEntityNames: ~700 tokens (only if ambiguous names found)
 * - generateAgentSummary: ~1,500 tokens (once per batch, always)
 * - Total worst case: ~2,200 tokens per upload batch
 *
 * @module convex/lib/agentLlm
 */

import type { AgentFinding } from "./agentUtils";

// ============================================================================
// Types
// ============================================================================

export interface EntityGroup {
  /** The canonical (most complete) version of the name. */
  canonical: string;
  /** All variant spellings/formats found in documents. */
  variants: string[];
}

export interface AgentStats {
  totalDocuments: number;
  bankStatements: number;
  invoices: number;
  receipts: number;
  totalTransactions: number;
  totalAccrualDocs: number;
  periodRange?: string;
}

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Sanitize a string before embedding it in an LLM prompt.
 * Strips control characters, unusual chars, and caps length to prevent prompt injection.
 */
function sanitizeForPrompt(s: string): string {
  return s
    .replace(/[\x00-\x1f\x7f]/g, "") // strip control chars
    .replace(/[^\w\s.,&'()\-\/]/g, "") // keep only safe chars
    .substring(0, 200) // cap length
    .trim();
}

// ============================================================================
// Entity Resolution — Prompt Building (Pure, Testable)
// ============================================================================

/**
 * Build a prompt to resolve ambiguous company names.
 *
 * Given a list of unique entity names found in documents and the
 * known company name, asks the LLM to group name variants.
 */
export function buildEntityResolutionPrompt(
  uniqueNames: string[],
  companyName: string,
): string {
  // Sanitize inputs to prevent prompt injection from user-controlled document data
  const sanitizedNames = uniqueNames.map(sanitizeForPrompt);
  const sanitizedCompany = sanitizeForPrompt(companyName);

  const nameList = sanitizedNames.map((n, i) => `${i + 1}. "${n}"`).join("\n");

  return `You are helping verify company names found in accounting documents.

The user's company is: "${sanitizedCompany}"

These entity names were found across uploaded documents:
${nameList}

Group the names that likely refer to the SAME entity (company name variants, abbreviations, different formats of the same name). Consider that Malaysian companies often appear as "ABC Sdn Bhd", "ABC SDN. BHD.", "ABC SENDIRIAN BERHAD", etc.

Return ONLY valid JSON:
{
  "groups": [
    {
      "canonical": "Most complete/formal version of the name",
      "variants": ["variant1", "variant2"]
    }
  ],
  "matchesCompany": ["names that match or refer to the user's company"]
}

Rules:
- Each input name must appear in exactly one group
- If a name is unique (no variants), put it in its own group with empty variants
- The canonical name should be the most complete, formal version
- matchesCompany should list names that are variants of "${companyName}"
- Return ONLY JSON, no explanation`;
}

/**
 * Parse the entity resolution response from the LLM.
 * Handles malformed JSON gracefully.
 */
export function parseEntityResolutionResponse(
  text: string,
): { groups: EntityGroup[]; matchesCompany: string[] } | null {
  try {
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!objMatch) return null;

    const data = JSON.parse(objMatch[0]);

    if (!Array.isArray(data.groups)) return null;

    const groups: EntityGroup[] = data.groups
      .filter((g: Record<string, unknown>) => typeof g.canonical === "string")
      .map((g: Record<string, unknown>) => ({
        canonical: g.canonical as string,
        variants: Array.isArray(g.variants)
          ? (g.variants as string[]).filter((v) => typeof v === "string")
          : [],
      }));

    const matchesCompany: string[] = Array.isArray(data.matchesCompany)
      ? (data.matchesCompany as string[]).filter((v) => typeof v === "string")
      : [];

    return { groups, matchesCompany };
  } catch {
    return null;
  }
}

// ============================================================================
// Summary — Prompt Building (Pure, Testable)
// ============================================================================

/**
 * Build a prompt for the agent summary.
 *
 * Takes all findings and aggregate stats, produces a natural language
 * summary in the "calm explainer" tone.
 */
export function buildSummaryPrompt(
  findings: AgentFinding[],
  stats: AgentStats,
): string {
  // Categorize findings by severity
  const critical = findings.filter((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

  const findingSummary = [
    critical.length > 0 ? `Critical issues (${critical.length}): ${critical.map((f) => f.title).join("; ")}` : null,
    warnings.length > 0 ? `Warnings (${warnings.length}): ${warnings.map((f) => f.title).join("; ")}` : null,
    info.length > 0 ? `Info (${info.length}): ${info.map((f) => f.title).join("; ")}` : null,
  ].filter(Boolean).join("\n");

  return `You are a calm, helpful accounting assistant. Write a 2-3 short paragraph summary of the upload analysis results.

STATS:
- ${stats.totalDocuments} documents uploaded (${stats.bankStatements} bank statements, ${stats.invoices} invoices, ${stats.receipts} receipts)
- ${stats.totalTransactions} bank transactions extracted
- ${stats.totalAccrualDocs} invoices/receipts extracted
${stats.periodRange ? `- Period: ${stats.periodRange}` : ""}

FINDINGS:
${findingSummary || "No issues found."}

TONE GUIDELINES:
- Write like you're talking to a 16-year-old — simple, clear, no jargon
- Start with what went well (positive framing)
- Mention issues naturally, not alarmingly
- Keep it to 2-3 short paragraphs, under 150 words total
- Don't use bullet points — write flowing paragraphs
- Don't repeat exact finding titles — summarize the themes

Return ONLY the summary text, no JSON, no markdown formatting.`;
}

// ============================================================================
// LLM Callers — These call Bedrock and are meant to be invoked from
// Convex actions where the Bedrock SDK is available.
// ============================================================================

/**
 * Resolve ambiguous entity names using Bedrock Claude Haiku.
 *
 * Only called when the rules layer detects multiple company names
 * that might be variants of each other.
 *
 * @param uniqueNames - Unique entity names found across documents
 * @param companyName - The user's selected company name
 * @param bedrockCall - Injected function to call Bedrock (for testability)
 * @returns Entity groups, or null if LLM call fails
 */
export async function resolveEntityNames(
  uniqueNames: string[],
  companyName: string,
  bedrockCall: (prompt: string) => Promise<string>,
): Promise<{ groups: EntityGroup[]; matchesCompany: string[] } | null> {
  if (uniqueNames.length < 2) return null;

  const prompt = buildEntityResolutionPrompt(uniqueNames, companyName);

  try {
    const responseText = await bedrockCall(prompt);
    return parseEntityResolutionResponse(responseText);
  } catch (error) {
    console.error("[AgentLLM] Entity resolution failed:", error);
    return null;
  }
}

/**
 * Generate a natural language summary of the analysis.
 *
 * Called once per batch after all findings are computed.
 *
 * @param findings - All findings from rules + cross-ref layers
 * @param stats - Aggregate statistics
 * @param bedrockCall - Injected function to call Bedrock (for testability)
 * @returns Summary text, or a fallback string if LLM call fails
 */
export async function generateAgentSummary(
  findings: AgentFinding[],
  stats: AgentStats,
  bedrockCall: (prompt: string) => Promise<string>,
): Promise<string> {
  const prompt = buildSummaryPrompt(findings, stats);

  try {
    const summary = await bedrockCall(prompt);
    // Basic validation — should be reasonable length prose
    if (summary && summary.length > 20 && summary.length < 2000) {
      return summary.trim();
    }
  } catch (error) {
    console.error("[AgentLLM] Summary generation failed:", error);
  }

  // Fallback: generate a basic summary from stats
  return buildFallbackSummary(findings, stats);
}

/**
 * Build a fallback summary when the LLM call fails.
 * Uses the stats and findings to produce a basic summary.
 */
export function buildFallbackSummary(
  findings: AgentFinding[],
  stats: AgentStats,
): string {
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  let summary = `I processed ${stats.totalDocuments} document${stats.totalDocuments !== 1 ? "s" : ""} and extracted ${stats.totalTransactions} bank transaction${stats.totalTransactions !== 1 ? "s" : ""} and ${stats.totalAccrualDocs} invoice${stats.totalAccrualDocs !== 1 ? "s" : ""}/receipt${stats.totalAccrualDocs !== 1 ? "s" : ""}.`;

  if (stats.periodRange) {
    summary += ` The data covers ${stats.periodRange}.`;
  }

  if (criticalCount > 0) {
    summary += ` There ${criticalCount === 1 ? "is" : "are"} ${criticalCount} issue${criticalCount !== 1 ? "s" : ""} that need${criticalCount === 1 ? "s" : ""} your attention before proceeding.`;
  } else if (warningCount > 0) {
    summary += ` I found ${warningCount} thing${warningCount !== 1 ? "s" : ""} worth reviewing, but nothing blocking.`;
  } else {
    summary += ` Everything looks good — ready to proceed to reconciliation.`;
  }

  return summary;
}
