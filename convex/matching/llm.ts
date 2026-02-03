/**
 * Layer 5: LLM Semantic Matching via AWS Bedrock
 * Uses Claude for intelligent matching of complex/ambiguous cases
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { LLMMatchSuggestion } from "./layers";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";

// ============ TYPES ============

interface LLMMatchingResult {
  matches: Array<{
    cashId: string;
    accrualId: string;
    confidence: number;
    reasoning: string;
  }>;
  unmatchedCashIds: string[];
  unmatchedAccrualIds: string[];
}

// ============ BEDROCK CLIENT ============

/**
 * Call AWS Bedrock with Claude model using AI SDK
 * The AI SDK handles AWS SigV4 authentication automatically
 */
async function callBedrock(prompt: string): Promise<string> {
  const region = process.env.AWS_REGION || "us-east-1";
  const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  // Create Bedrock provider with credentials from environment
  const bedrock = createAmazonBedrock({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // Optional, for temporary credentials
  });

  const { text } = await generateText({
    model: bedrock(modelId),
    prompt,
    temperature: 0.1, // Low temperature for consistent matching
    maxOutputTokens: 4096,
  });

  return text;
}

// ============ PROMPT TEMPLATE ============

const MATCHING_SYSTEM_PROMPT = `You are an expert accounting reconciliation assistant. Your task is to match bank transactions (cash basis) with invoices/receipts (accrual basis).

## Matching Criteria (in order of importance)
1. **Amount**: Exact match is ideal. Within 5% is acceptable (fees, rounding). Within 10% needs strong other evidence.
2. **Reference Numbers**: Invoice numbers (INV-xxx), PO numbers, reference codes in descriptions are strong signals.
3. **Counterparty Names**: Match company names even with typos, abbreviations (e.g., "ABC Sdn Bhd" = "ABC SDN BHD" = "A.B.C.")
4. **Date Proximity**: Cash typically appears 0-30 days after invoice date. Same-day or next-day is strong evidence.
5. **Description Context**: Semantic similarity in descriptions (e.g., "AWS Services Monthly" matches "Amazon Web Services - Jan")

## Tricky Cases to Handle
- **Partial payments**: A $5000 payment might match a $5000 invoice even if there's a $10000 invoice too
- **Aggregated payments**: One $3000 bank payment might be for two $1500 invoices (don't match these)
- **Payment fees**: $970 payment could match $1000 invoice (3% payment processing fee)
- **Different date formats**: "15/01/2025" vs "2025-01-15" vs "Jan 15 2025"
- **Abbreviated names**: "TM" = "Telekom Malaysia", "TNB" = "Tenaga Nasional"

## Confidence Guidelines
- 90-100%: Exact amount + exact reference number + same counterparty
- 80-89%: Exact amount + strong description match + dates within 7 days
- 70-79%: Amount within 5% + partial reference/name match
- 60-69%: Amount within 10% + weak contextual evidence
- 50-59%: Only amount similarity, no other evidence

**Important**: Only suggest matches with confidence ≥50%. For ambiguous cases, err on the side of NOT matching.

## Response Format
Respond with valid JSON only:
{
  "matches": [
    {
      "cashId": "id_from_cash_items",
      "accrualId": "id_from_accrual_items",
      "confidence": 75,
      "reasoning": "Brief explanation of WHY this is a match"
    }
  ],
  "unmatchedCashIds": ["ids that couldn't be confidently matched"],
  "unmatchedAccrualIds": ["ids that couldn't be confidently matched"]
}`;

function buildMatchingPrompt(
  cashItems: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    reference?: string;
  }>,
  accrualItems: Array<{
    id: string;
    date: string;
    docNumber?: string;
    counterparty?: string;
    description?: string;
    amount: number;
  }>
): string {
  return `${MATCHING_SYSTEM_PROMPT}

## BANK TRANSACTIONS (Cash Basis)
${JSON.stringify(cashItems, null, 2)}

## INVOICES/RECEIPTS (Accrual Basis)
${JSON.stringify(accrualItems, null, 2)}

Analyze these items and provide matching suggestions in the specified JSON format.`;
}

// ============ PARSE RESPONSE ============

function parseMatchingResponse(response: string): LLMMatchingResult {
  // Try to extract JSON from response
  let jsonStr = response;

  // Handle markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(parsed.matches)) {
      throw new Error("Invalid response: matches must be an array");
    }

    return {
      matches: parsed.matches.map((m: Record<string, unknown>) => ({
        cashId: String(m.cashId || ""),
        accrualId: String(m.accrualId || ""),
        confidence: Math.min(100, Math.max(0, Number(m.confidence) || 0)),
        reasoning: String(m.reasoning || "LLM semantic match"),
      })),
      unmatchedCashIds: Array.isArray(parsed.unmatchedCashIds)
        ? parsed.unmatchedCashIds.map(String)
        : [],
      unmatchedAccrualIds: Array.isArray(parsed.unmatchedAccrualIds)
        ? parsed.unmatchedAccrualIds.map(String)
        : [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown parsing error";
    const responsePreview = response.length > 200 ? response.substring(0, 200) + "..." : response;
    console.error("[LLM Parser] Failed to parse response:", {
      error: errorMessage,
      responsePreview,
      responseLength: response.length,
    });
    return {
      matches: [],
      unmatchedCashIds: [],
      unmatchedAccrualIds: [],
    };
  }
}

// ============ CONVEX ACTION ============

/**
 * Run LLM semantic matching on unmatched items
 * This is an action because it makes external API calls
 */
export const runLLMMatching = action({
  args: {
    cashItems: v.array(
      v.object({
        id: v.string(),
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        reference: v.optional(v.string()),
      })
    ),
    accrualItems: v.array(
      v.object({
        id: v.string(),
        date: v.string(),
        docNumber: v.optional(v.string()),
        counterparty: v.optional(v.string()),
        description: v.optional(v.string()),
        amount: v.number(),
      })
    ),
    maxItems: v.optional(v.number()), // Limit batch size
  },
  handler: async (_ctx, args): Promise<LLMMatchSuggestion[]> => {
    const maxItems = args.maxItems || 50;

    // Limit items to prevent excessive token usage
    const cashItems = args.cashItems.slice(0, maxItems);
    const accrualItems = args.accrualItems.slice(0, maxItems);

    if (cashItems.length === 0 || accrualItems.length === 0) {
      return [];
    }

    // Check if Bedrock is configured - require BOTH AWS_REGION and credentials
    const hasAwsConfig = process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY;

    if (!hasAwsConfig) {
      console.error(
        "[LLM Matching] AWS Bedrock not properly configured. Missing:",
        !process.env.AWS_REGION ? "AWS_REGION" : "",
        !process.env.AWS_ACCESS_KEY_ID ? "AWS_ACCESS_KEY_ID" : "",
        !process.env.AWS_SECRET_ACCESS_KEY ? "AWS_SECRET_ACCESS_KEY" : ""
      );
      throw new Error("AWS Bedrock not configured - missing required environment variables");
    }

    try {
      // Build prompt
      const prompt = buildMatchingPrompt(cashItems, accrualItems);

      // Call Bedrock
      const response = await callBedrock(prompt);

      // Parse response
      const result = parseMatchingResponse(response);

      // Convert to expected format
      return result.matches.map((m) => ({
        cashTransactionId: m.cashId,
        accrualDocumentId: m.accrualId,
        confidence: m.confidence,
        reasoning: m.reasoning,
      }));
    } catch (error) {
      console.error("LLM matching failed:", error);
      return [];
    }
  },
});

// ============ SMART MOCK LLM FOR FALLBACK ============

/**
 * Normalize text for comparison (lowercase, remove special chars, trim)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract potential reference numbers from text
 */
function extractReferences(text: string): string[] {
  const patterns = [
    /inv[-\s]?(\d+)/gi, // INV-123, INV 123
    /invoice[-\s]?#?(\d+)/gi, // Invoice #123
    /po[-\s]?(\d+)/gi, // PO-123
    /ref[-\s]?#?(\d+)/gi, // REF-123
    /\b([a-z]{2,4}[-\s]?\d{4,})\b/gi, // ABC-12345
  ];

  const refs: string[] = [];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      refs.push(match[0].toLowerCase().replace(/[-\s]/g, ""));
    }
  }
  return refs;
}

/**
 * Calculate text similarity using word overlap (Jaccard-like)
 */
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(" ").filter(w => w.length > 2));
  const words2 = new Set(normalizeText(text2).split(" ").filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
}

/**
 * Smart mock LLM matching with semantic heuristics
 * Uses description parsing, reference extraction, and date proximity
 * when real LLM is unavailable
 */
export const runMockLLMMatching = action({
  args: {
    cashItems: v.array(
      v.object({
        id: v.string(),
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        reference: v.optional(v.string()),
      })
    ),
    accrualItems: v.array(
      v.object({
        id: v.string(),
        date: v.string(),
        docNumber: v.optional(v.string()),
        counterparty: v.optional(v.string()),
        description: v.optional(v.string()),
        amount: v.number(),
      })
    ),
  },
  handler: async (_ctx, args): Promise<LLMMatchSuggestion[]> => {
    console.warn(
      "[Mock LLM] Using fallback matching - AWS Bedrock unavailable. " +
      "Results will use heuristics instead of AI semantic analysis."
    );

    const suggestions: LLMMatchSuggestion[] = [];
    const matchedCashIds = new Set<string>();
    const matchedAccrualIds = new Set<string>();

    // Score each potential match
    interface ScoredMatch {
      cashId: string;
      accrualId: string;
      score: number;
      reasoning: string[];
    }
    const scoredMatches: ScoredMatch[] = [];

    for (const cash of args.cashItems) {
      for (const accrual of args.accrualItems) {
        const reasoning: string[] = [];
        let score = 0;

        // 1. Amount similarity (max 40 points)
        const amountDiff = Math.abs(Math.abs(cash.amount) - Math.abs(accrual.amount));
        const maxAmount = Math.max(Math.abs(cash.amount), Math.abs(accrual.amount));
        const amountVariance = maxAmount > 0 ? amountDiff / maxAmount : 0;

        // Track if we have strong signals for later validation
        let hasStrongSignal = false;

        if (amountVariance === 0) {
          score += 40;
          reasoning.push("Exact amount match");
        } else if (amountVariance <= 0.05) {
          score += 35;
          reasoning.push(`Amount within 5% (${(amountVariance * 100).toFixed(1)}%)`);
        } else if (amountVariance <= 0.10) {
          score += 25;
          reasoning.push(`Amount within 10% (${(amountVariance * 100).toFixed(1)}%)`);
        } else if (amountVariance <= 0.20) {
          score += 15;
          reasoning.push(`Amount within 20% (${(amountVariance * 100).toFixed(1)}%)`);
        } else {
          // Skip if amount is too different
          continue;
        }

        // 2. Reference number matching (max 30 points)
        const cashRefs = extractReferences(cash.description + " " + (cash.reference || ""));
        const accrualText = (accrual.description || "") + " " + (accrual.docNumber || "") + " " + (accrual.counterparty || "");
        const accrualRefs = extractReferences(accrualText);

        const refMatches = cashRefs.filter(r => accrualRefs.includes(r));
        if (refMatches.length > 0) {
          score += 30;
          reasoning.push(`Reference match: ${refMatches.join(", ")}`);
          hasStrongSignal = true; // Reference match is a strong signal
        }

        // 3. Description/counterparty similarity (max 20 points)
        const similarity = textSimilarity(cash.description, accrualText);
        if (similarity >= 0.5) {
          score += 20;
          reasoning.push(`Strong text similarity (${(similarity * 100).toFixed(0)}%)`);
          hasStrongSignal = true; // Strong text similarity is a strong signal
        } else if (similarity >= 0.3) {
          score += 12;
          reasoning.push(`Moderate text similarity (${(similarity * 100).toFixed(0)}%)`);
        } else if (similarity >= 0.15) {
          score += 5;
          reasoning.push(`Weak text similarity (${(similarity * 100).toFixed(0)}%)`);
        }

        // 4. Date proximity (max 10 points)
        const cashDate = new Date(cash.date);
        const accrualDate = new Date(accrual.date);
        const daysDiff = Math.abs((cashDate.getTime() - accrualDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 3) {
          score += 10;
          reasoning.push(`Dates within 3 days`);
        } else if (daysDiff <= 7) {
          score += 7;
          reasoning.push(`Dates within 7 days`);
        } else if (daysDiff <= 14) {
          score += 4;
          reasoning.push(`Dates within 14 days`);
        } else if (daysDiff <= 30) {
          score += 2;
          reasoning.push(`Dates within 30 days`);
        }

        // Require strong signal (reference match or high text similarity) for >10% amount variance
        // This prevents false positives from weak matches with significant amount differences
        if (amountVariance > 0.10 && !hasStrongSignal) {
          continue; // Skip - amount variance too high without strong corroborating evidence
        }

        // Only consider if score is meaningful
        if (score >= 50) {
          scoredMatches.push({
            cashId: cash.id,
            accrualId: accrual.id,
            score,
            reasoning,
          });
        }
      }
    }

    // Sort by score and select best non-conflicting matches
    scoredMatches.sort((a, b) => b.score - a.score);

    for (const match of scoredMatches) {
      if (matchedCashIds.has(match.cashId) || matchedAccrualIds.has(match.accrualId)) {
        continue;
      }

      // Convert score (0-100) to confidence (50-85 for Layer 5)
      // Layer 5 should produce medium confidence (50-85%)
      const confidence = Math.min(85, Math.max(50, match.score));

      suggestions.push({
        cashTransactionId: match.cashId,
        accrualDocumentId: match.accrualId,
        confidence,
        reasoning: `Smart fallback: ${match.reasoning.join("; ")}`,
      });

      matchedCashIds.add(match.cashId);
      matchedAccrualIds.add(match.accrualId);
    }

    console.log(`[Mock LLM] Produced ${suggestions.length} matches using heuristics`);
    return suggestions;
  },
});
