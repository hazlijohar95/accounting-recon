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

Analyze the provided transactions and suggest matches based on:
1. Similar amounts (exact or within 10%)
2. Related dates (cash typically 0-30 days after invoice)
3. Matching names/companies (even with typos or abbreviations)
4. Reference numbers that appear in descriptions
5. Business context (e.g., recurring payments, supplier patterns)

For each potential match, provide:
- A confidence score (0-100)
- Clear reasoning for the match

Only suggest matches where you have reasonable confidence (>50%). Do not force matches.

Respond with valid JSON only, in this exact format:
{
  "matches": [
    {
      "cashId": "id_from_cash_items",
      "accrualId": "id_from_accrual_items",
      "confidence": 75,
      "reasoning": "Brief explanation"
    }
  ],
  "unmatchedCashIds": ["ids that couldn't be matched"],
  "unmatchedAccrualIds": ["ids that couldn't be matched"]
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
  } catch {
    console.error("Failed to parse LLM response:", response);
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

    // Check if Bedrock is configured
    if (!process.env.AWS_REGION && !process.env.BEDROCK_MODEL_ID) {
      console.warn("AWS Bedrock not configured - skipping LLM matching");
      return [];
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

// ============ MOCK LLM FOR TESTING ============

/**
 * Mock LLM matching for development/testing
 * Uses simple heuristics instead of actual LLM
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
    const suggestions: LLMMatchSuggestion[] = [];
    const matchedCashIds = new Set<string>();
    const matchedAccrualIds = new Set<string>();

    // Simple heuristic: match items with similar amounts that haven't been matched
    for (const cash of args.cashItems) {
      if (matchedCashIds.has(cash.id)) continue;

      for (const accrual of args.accrualItems) {
        if (matchedAccrualIds.has(accrual.id)) continue;

        // Check amount similarity (within 20%)
        const amountDiff = Math.abs(Math.abs(cash.amount) - Math.abs(accrual.amount));
        const maxAmount = Math.max(Math.abs(cash.amount), Math.abs(accrual.amount));
        const variance = maxAmount > 0 ? (amountDiff / maxAmount) * 100 : 0;

        if (variance > 20) continue;

        // Basic confidence based on amount match
        const confidence = Math.round(60 + (20 - variance));

        suggestions.push({
          cashTransactionId: cash.id,
          accrualDocumentId: accrual.id,
          confidence,
          reasoning: `Mock LLM: Amounts similar (${variance.toFixed(1)}% variance)`,
        });

        matchedCashIds.add(cash.id);
        matchedAccrualIds.add(accrual.id);
        break;
      }
    }

    return suggestions;
  },
});
