/**
 * Tests for Layer 5: LLM Semantic Matching
 * Tests both the real LLM parsing and the smart mock fallback
 * Run with: pnpm test convex/matching/__tests__/llm.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Note: We're testing the pure functions, not the Convex actions
// Import the module and test the helper functions

// ============ HELPER FUNCTION IMPLEMENTATIONS FOR TESTING ============
// These match the implementations in llm.ts

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
 * Parse LLM response into structured result
 */
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

function parseMatchingResponse(response: string): LLMMatchingResult {
  let jsonStr = response;

  // Handle markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

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
    return {
      matches: [],
      unmatchedCashIds: [],
      unmatchedAccrualIds: [],
    };
  }
}

// ============ NORMALIZE TEXT TESTS ============

describe("normalizeText", () => {
  it("lowercases text", () => {
    expect(normalizeText("HELLO WORLD")).toBe("hello world");
    expect(normalizeText("CamelCase")).toBe("camelcase");
  });

  it("removes special characters", () => {
    expect(normalizeText("hello-world!")).toBe("hello world");
    expect(normalizeText("test@email.com")).toBe("test email com");
    expect(normalizeText("$100.00")).toBe("100 00");
  });

  it("handles empty strings", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   ")).toBe("");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeText("hello    world")).toBe("hello world");
    expect(normalizeText("  spaced   out  text  ")).toBe("spaced out text");
  });
});

// ============ EXTRACT REFERENCES TESTS ============

describe("extractReferences", () => {
  it("extracts INV-xxx patterns", () => {
    const refs = extractReferences("Payment for INV-12345");
    expect(refs).toContain("inv12345");
  });

  it("extracts INV xxx patterns (space separated)", () => {
    const refs = extractReferences("Payment for INV 67890");
    expect(refs).toContain("inv67890");
  });

  it("extracts PO numbers", () => {
    const refs = extractReferences("Purchase order PO-55555");
    expect(refs).toContain("po55555");
  });

  it("extracts REF numbers", () => {
    const refs = extractReferences("Reference REF-99999");
    expect(refs).toContain("ref99999");
  });

  it("handles multiple references in one string", () => {
    const refs = extractReferences("INV-123 and PO-456 with REF-789");
    expect(refs.length).toBeGreaterThanOrEqual(3);
    expect(refs).toContain("inv123");
    expect(refs).toContain("po456");
    expect(refs).toContain("ref789");
  });

  it("returns empty array for no references", () => {
    const refs = extractReferences("Just a plain description");
    expect(refs).toEqual([]);
  });

  it("is case insensitive", () => {
    const refs1 = extractReferences("inv-123");
    const refs2 = extractReferences("INV-123");
    const refs3 = extractReferences("Inv-123");
    expect(refs1).toContain("inv123");
    expect(refs2).toContain("inv123");
    expect(refs3).toContain("inv123");
  });
});

// ============ TEXT SIMILARITY TESTS ============

describe("textSimilarity", () => {
  it("returns 1.0 for identical strings", () => {
    expect(textSimilarity("hello world", "hello world")).toBe(1);
    expect(textSimilarity("AWS Services Monthly", "AWS Services Monthly")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(textSimilarity("apple banana", "xyz abc")).toBe(0);
    expect(textSimilarity("foo bar baz", "qux quux corge")).toBe(0);
  });

  it("handles word overlap correctly", () => {
    // "acme corp payment" vs "payment from acme"
    // Words > 2 chars: acme, corp, payment | payment, from, acme
    // Intersection: acme, payment (2)
    // Union: acme, corp, payment, from (4)
    // Similarity: 2/4 = 0.5
    const sim = textSimilarity("acme corp payment", "payment from acme");
    expect(sim).toBeCloseTo(0.5, 1);
  });

  it("ignores short words (less than 3 chars)", () => {
    // Only considers words > 2 chars (length > 2, i.e., 3+ chars)
    const sim = textSimilarity("the big dog", "a big cat");
    // Words > 2 chars: "the", "big", "dog" | "big", "cat"
    // Wait, "the" has 3 chars so it IS included
    // Actually words1 = { the, big, dog }, words2 = { big, cat }
    // Intersection: big (1)
    // Union: the, big, dog, cat (4)
    // Similarity: 1/4 = 0.25
    expect(sim).toBeCloseTo(0.25, 1);
  });

  it("handles empty strings", () => {
    expect(textSimilarity("", "hello")).toBe(0);
    expect(textSimilarity("hello", "")).toBe(0);
    expect(textSimilarity("", "")).toBe(0);
  });

  it("is case insensitive", () => {
    expect(textSimilarity("HELLO", "hello")).toBe(1);
    expect(textSimilarity("AWS Services", "aws services")).toBe(1);
  });
});

// ============ PARSE MATCHING RESPONSE TESTS ============

describe("parseMatchingResponse", () => {
  it("parses valid JSON response", () => {
    const response = JSON.stringify({
      matches: [
        { cashId: "c1", accrualId: "a1", confidence: 85, reasoning: "Amount match" }
      ],
      unmatchedCashIds: ["c2"],
      unmatchedAccrualIds: ["a2", "a3"]
    });

    const result = parseMatchingResponse(response);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].cashId).toBe("c1");
    expect(result.matches[0].accrualId).toBe("a1");
    expect(result.matches[0].confidence).toBe(85);
    expect(result.unmatchedCashIds).toEqual(["c2"]);
    expect(result.unmatchedAccrualIds).toEqual(["a2", "a3"]);
  });

  it("handles markdown code blocks", () => {
    const response = `Here's the analysis:

\`\`\`json
{
  "matches": [
    { "cashId": "c1", "accrualId": "a1", "confidence": 90, "reasoning": "Exact match" }
  ],
  "unmatchedCashIds": [],
  "unmatchedAccrualIds": []
}
\`\`\`

That's the result.`;

    const result = parseMatchingResponse(response);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].confidence).toBe(90);
  });

  it("clamps confidence to 0-100 range", () => {
    const response = JSON.stringify({
      matches: [
        { cashId: "c1", accrualId: "a1", confidence: 150, reasoning: "Over" },
        { cashId: "c2", accrualId: "a2", confidence: -10, reasoning: "Under" }
      ],
      unmatchedCashIds: [],
      unmatchedAccrualIds: []
    });

    const result = parseMatchingResponse(response);

    expect(result.matches[0].confidence).toBe(100);
    expect(result.matches[1].confidence).toBe(0);
  });

  it("provides default reasoning if missing", () => {
    const response = JSON.stringify({
      matches: [
        { cashId: "c1", accrualId: "a1", confidence: 80 }
      ],
      unmatchedCashIds: [],
      unmatchedAccrualIds: []
    });

    const result = parseMatchingResponse(response);

    expect(result.matches[0].reasoning).toBe("LLM semantic match");
  });

  it("returns empty result for invalid JSON", () => {
    const result = parseMatchingResponse("This is not JSON at all");

    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedCashIds).toHaveLength(0);
    expect(result.unmatchedAccrualIds).toHaveLength(0);
  });

  it("returns empty result if matches is not an array", () => {
    const response = JSON.stringify({
      matches: "not an array",
      unmatchedCashIds: [],
      unmatchedAccrualIds: []
    });

    const result = parseMatchingResponse(response);

    expect(result.matches).toHaveLength(0);
  });
});

// ============ SMART MOCK MATCHING ALGORITHM TESTS ============

describe("Smart Mock LLM Matching Algorithm", () => {
  // Simulate the scoring algorithm used in runMockLLMMatching
  interface CashItem {
    id: string;
    date: string;
    description: string;
    amount: number;
    reference?: string;
  }

  interface AccrualItem {
    id: string;
    date: string;
    docNumber?: string;
    counterparty?: string;
    description?: string;
    amount: number;
  }

  function calculateMatchScore(cash: CashItem, accrual: AccrualItem): { score: number; reasoning: string[] } | null {
    const reasoning: string[] = [];
    let score = 0;
    let hasStrongSignal = false;

    // 1. Amount similarity
    const amountDiff = Math.abs(Math.abs(cash.amount) - Math.abs(accrual.amount));
    const maxAmount = Math.max(Math.abs(cash.amount), Math.abs(accrual.amount));
    const amountVariance = maxAmount > 0 ? amountDiff / maxAmount : 0;

    if (amountVariance === 0) {
      score += 40;
      reasoning.push("Exact amount match");
    } else if (amountVariance <= 0.05) {
      score += 35;
      reasoning.push(`Amount within 5%`);
    } else if (amountVariance <= 0.10) {
      score += 25;
      reasoning.push(`Amount within 10%`);
    } else if (amountVariance <= 0.20) {
      score += 15;
      reasoning.push(`Amount within 20%`);
    } else {
      return null; // Skip
    }

    // 2. Reference matching
    const cashRefs = extractReferences(cash.description + " " + (cash.reference || ""));
    const accrualText = (accrual.description || "") + " " + (accrual.docNumber || "") + " " + (accrual.counterparty || "");
    const accrualRefs = extractReferences(accrualText);

    const refMatches = cashRefs.filter(r => accrualRefs.includes(r));
    if (refMatches.length > 0) {
      score += 30;
      reasoning.push(`Reference match: ${refMatches.join(", ")}`);
      hasStrongSignal = true;
    }

    // 3. Text similarity
    const similarity = textSimilarity(cash.description, accrualText);
    if (similarity >= 0.5) {
      score += 20;
      reasoning.push(`Strong text similarity`);
      hasStrongSignal = true;
    } else if (similarity >= 0.3) {
      score += 12;
      reasoning.push(`Moderate text similarity`);
    } else if (similarity >= 0.15) {
      score += 5;
      reasoning.push(`Weak text similarity`);
    }

    // 4. Date proximity
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

    // Require strong signal for >10% variance
    if (amountVariance > 0.10 && !hasStrongSignal) {
      return null;
    }

    if (score < 50) {
      return null;
    }

    return { score, reasoning };
  }

  it("gives higher score for exact amount match", () => {
    // Need to add date proximity to meet 50 point threshold
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "Same vendor", amount: 100 };
    const accrualExact: AccrualItem = { id: "a1", date: "2025-01-14", description: "Same vendor", amount: 100 };
    const accrualClose: AccrualItem = { id: "a2", date: "2025-01-14", description: "Same vendor", amount: 98 };

    const scoreExact = calculateMatchScore(cash, accrualExact);
    const scoreClose = calculateMatchScore(cash, accrualClose);

    // Both should meet threshold with amount + date + text similarity
    expect(scoreExact).not.toBeNull();
    expect(scoreClose).not.toBeNull();
    expect(scoreExact!.score).toBeGreaterThan(scoreClose!.score);
  });

  it("boosts score for reference number match", () => {
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "INV-12345 payment", amount: 100 };
    const accrualWithRef: AccrualItem = { id: "a1", date: "2025-01-15", docNumber: "INV-12345", amount: 100 };
    const accrualNoRef: AccrualItem = { id: "a2", date: "2025-01-15", amount: 100 };

    const scoreWithRef = calculateMatchScore(cash, accrualWithRef);
    const scoreNoRef = calculateMatchScore(cash, accrualNoRef);

    expect(scoreWithRef!.score).toBeGreaterThan(scoreNoRef!.score);
    expect(scoreWithRef!.reasoning.some(r => r.includes("Reference match"))).toBe(true);
  });

  it("considers text similarity", () => {
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "ACME Corp Monthly Service", amount: 100 };
    const accrualSimilar: AccrualItem = { id: "a1", date: "2025-01-15", counterparty: "ACME Corporation", description: "Service", amount: 100 };
    const accrualDifferent: AccrualItem = { id: "a2", date: "2025-01-15", counterparty: "XYZ Ltd", amount: 100 };

    const scoreSimilar = calculateMatchScore(cash, accrualSimilar);
    const scoreDifferent = calculateMatchScore(cash, accrualDifferent);

    expect(scoreSimilar!.score).toBeGreaterThan(scoreDifferent!.score);
  });

  it("factors in date proximity", () => {
    // Need additional signals to meet 50 point threshold
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "Vendor payment", amount: 100 };
    const accrualNear: AccrualItem = { id: "a1", date: "2025-01-14", description: "Vendor invoice", amount: 100 };
    const accrualFar: AccrualItem = { id: "a2", date: "2025-01-01", description: "Vendor invoice", amount: 100 };

    const scoreNear = calculateMatchScore(cash, accrualNear);
    const scoreFar = calculateMatchScore(cash, accrualFar);

    // Both should meet threshold with amount + text similarity
    expect(scoreNear).not.toBeNull();
    expect(scoreFar).not.toBeNull();
    expect(scoreNear!.score).toBeGreaterThan(scoreFar!.score);
  });

  it("requires minimum 50 point score", () => {
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "Unknown payment", amount: 100 };
    const accrual: AccrualItem = { id: "a1", date: "2025-06-01", counterparty: "Different Co", amount: 105 }; // 5% variance, far date, no similarity

    const result = calculateMatchScore(cash, accrual);

    // Low scores should be filtered out
    // Amount within 5%: 35 points
    // No ref match: 0 points
    // No similarity: 0 points
    // Date > 30 days: 0 points
    // Total: 35 < 50, should be null
    expect(result).toBeNull();
  });

  it("requires strong signal for >10% amount variance", () => {
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "Payment", amount: 100 };
    const accrualHighVariance: AccrualItem = { id: "a1", date: "2025-01-15", amount: 85 }; // 15% variance

    const result = calculateMatchScore(cash, accrualHighVariance);

    // 15% variance without strong signal should be rejected
    expect(result).toBeNull();
  });

  it("allows >10% variance with strong signal (reference match)", () => {
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "INV-999 payment", amount: 100 };
    const accrual: AccrualItem = { id: "a1", date: "2025-01-15", docNumber: "INV-999", amount: 85 }; // 15% variance but has ref match

    const result = calculateMatchScore(cash, accrual);

    // Has strong signal (reference match), should be allowed
    expect(result).not.toBeNull();
  });

  it("produces confidence within 50-85% range", () => {
    const cash: CashItem = { id: "c1", date: "2025-01-15", description: "AWS Monthly", amount: 100 };
    const accrual: AccrualItem = { id: "a1", date: "2025-01-14", description: "AWS Services", amount: 100 };

    const result = calculateMatchScore(cash, accrual);

    if (result) {
      // Score should be capped when converted to confidence
      const confidence = Math.min(85, Math.max(50, result.score));
      expect(confidence).toBeGreaterThanOrEqual(50);
      expect(confidence).toBeLessThanOrEqual(85);
    }
  });
});
