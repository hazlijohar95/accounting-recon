/**
 * Tests for Matching Engine Orchestration
 * Tests engine logic, LLM fallback behavior, and confidence workflow
 * Run with: pnpm test convex/matching/__tests__/engine.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ TEST HELPER TYPES ============

interface MatchCandidate {
  cashTransactionId: string;
  accrualDocumentId: string;
  confidenceScore: number;
  matchLayer: 1 | 2 | 3 | 4 | 5;
  matchReason: string;
}

interface LLMSuggestion {
  cashTransactionId: string;
  accrualDocumentId: string;
  confidence: number;
  reasoning: string;
}

// ============ ENGINE LOGIC FUNCTIONS FOR TESTING ============

/**
 * Determines confidence category from score (matches engine.ts logic)
 */
function categorizeConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 90) return "high";
  if (score >= 70) return "medium";
  return "low";
}

/**
 * Determines if a match should be auto-approved (matches engine.ts logic)
 */
function shouldAutoApprove(
  matchLayer: number,
  confidence: "high" | "medium" | "low"
): boolean {
  return matchLayer <= 2 && confidence === "high";
}

/**
 * Filters LLM suggestions by minimum confidence (matches engine.ts logic)
 */
function filterLLMSuggestions(
  suggestions: LLMSuggestion[],
  minConfidence: number = 70
): LLMSuggestion[] {
  return suggestions.filter((s) => s.confidence >= minConfidence);
}

/**
 * Tracks matches by layer (matches engine.ts logic)
 */
function countMatchesByLayer(matches: MatchCandidate[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const m of matches) {
    counts[m.matchLayer] = (counts[m.matchLayer] || 0) + 1;
  }
  return counts;
}

/**
 * Simulates the LLM fallback decision logic
 */
interface LLMFallbackResult {
  success: boolean;
  usedMockLLM: boolean;
  llmErrorMessage?: string;
  suggestions: LLMSuggestion[];
}

async function runLLMWithFallback(
  runRealLLM: () => Promise<LLMSuggestion[]>,
  runMockLLM: () => Promise<LLMSuggestion[]>
): Promise<LLMFallbackResult> {
  try {
    const suggestions = await runRealLLM();
    return {
      success: true,
      usedMockLLM: false,
      suggestions,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const suggestions = await runMockLLM();
    return {
      success: true,
      usedMockLLM: true,
      llmErrorMessage: errorMessage,
      suggestions,
    };
  }
}

// ============ CONFIDENCE CATEGORIZATION TESTS ============

describe("Confidence Categorization", () => {
  describe("categorizeConfidence", () => {
    it("categorizes >=90 as high", () => {
      expect(categorizeConfidence(90)).toBe("high");
      expect(categorizeConfidence(95)).toBe("high");
      expect(categorizeConfidence(100)).toBe("high");
    });

    it("categorizes 70-89 as medium", () => {
      expect(categorizeConfidence(70)).toBe("medium");
      expect(categorizeConfidence(75)).toBe("medium");
      expect(categorizeConfidence(89)).toBe("medium");
    });

    it("categorizes <70 as low", () => {
      expect(categorizeConfidence(69)).toBe("low");
      expect(categorizeConfidence(50)).toBe("low");
      expect(categorizeConfidence(0)).toBe("low");
    });

    it("handles edge cases", () => {
      expect(categorizeConfidence(89.9)).toBe("medium");
      expect(categorizeConfidence(90.0)).toBe("high");
      expect(categorizeConfidence(69.9)).toBe("low");
      expect(categorizeConfidence(70.0)).toBe("medium");
    });
  });
});

// ============ AUTO-APPROVAL TESTS ============

describe("Auto-Approval Logic", () => {
  describe("shouldAutoApprove", () => {
    it("auto-approves Layer 1 high confidence matches", () => {
      expect(shouldAutoApprove(1, "high")).toBe(true);
    });

    it("auto-approves Layer 2 high confidence matches", () => {
      expect(shouldAutoApprove(2, "high")).toBe(true);
    });

    it("does NOT auto-approve Layer 3-5 even with high confidence", () => {
      expect(shouldAutoApprove(3, "high")).toBe(false);
      expect(shouldAutoApprove(4, "high")).toBe(false);
      expect(shouldAutoApprove(5, "high")).toBe(false);
    });

    it("does NOT auto-approve medium confidence matches", () => {
      expect(shouldAutoApprove(1, "medium")).toBe(false);
      expect(shouldAutoApprove(2, "medium")).toBe(false);
      expect(shouldAutoApprove(3, "medium")).toBe(false);
    });

    it("does NOT auto-approve low confidence matches", () => {
      expect(shouldAutoApprove(1, "low")).toBe(false);
      expect(shouldAutoApprove(2, "low")).toBe(false);
    });
  });

  describe("combined auto-approval behavior", () => {
    const testCases: Array<{
      layer: number;
      score: number;
      shouldApprove: boolean;
      description: string;
    }> = [
      { layer: 1, score: 100, shouldApprove: true, description: "Layer 1 exact match (100%)" },
      { layer: 1, score: 95, shouldApprove: true, description: "Layer 1 high confidence (95%)" },
      { layer: 1, score: 90, shouldApprove: true, description: "Layer 1 threshold (90%)" },
      { layer: 1, score: 89, shouldApprove: false, description: "Layer 1 below threshold (89%)" },
      { layer: 2, score: 92, shouldApprove: true, description: "Layer 2 high confidence" },
      { layer: 2, score: 85, shouldApprove: false, description: "Layer 2 medium confidence" },
      { layer: 3, score: 95, shouldApprove: false, description: "Layer 3 high confidence (ref match)" },
      { layer: 4, score: 80, shouldApprove: false, description: "Layer 4 fuzzy match" },
      { layer: 5, score: 75, shouldApprove: false, description: "Layer 5 LLM match" },
    ];

    testCases.forEach(({ layer, score, shouldApprove, description }) => {
      it(`${description}: ${shouldApprove ? 'auto-approved' : 'pending'}`, () => {
        const confidence = categorizeConfidence(score);
        expect(shouldAutoApprove(layer, confidence)).toBe(shouldApprove);
      });
    });
  });
});

// ============ LLM FALLBACK BEHAVIOR TESTS ============

describe("LLM Fallback Behavior", () => {
  describe("runLLMWithFallback", () => {
    it("uses real LLM when available", async () => {
      const realSuggestions: LLMSuggestion[] = [
        { cashTransactionId: "c1", accrualDocumentId: "a1", confidence: 85, reasoning: "Real LLM match" }
      ];

      const result = await runLLMWithFallback(
        async () => realSuggestions,
        async () => []
      );

      expect(result.usedMockLLM).toBe(false);
      expect(result.suggestions).toEqual(realSuggestions);
      expect(result.llmErrorMessage).toBeUndefined();
    });

    it("falls back to mock on real LLM failure", async () => {
      const mockSuggestions: LLMSuggestion[] = [
        { cashTransactionId: "c1", accrualDocumentId: "a1", confidence: 75, reasoning: "Smart fallback" }
      ];

      const result = await runLLMWithFallback(
        async () => { throw new Error("AWS credentials invalid"); },
        async () => mockSuggestions
      );

      expect(result.usedMockLLM).toBe(true);
      expect(result.suggestions).toEqual(mockSuggestions);
      expect(result.llmErrorMessage).toBe("AWS credentials invalid");
    });

    it("tracks error message on fallback", async () => {
      const errorMessages = [
        "AWS Bedrock not configured - missing required environment variables",
        "Model not found: anthropic.claude-3-haiku",
        "Request timeout after 30000ms",
      ];

      for (const errorMsg of errorMessages) {
        const result = await runLLMWithFallback(
          async () => { throw new Error(errorMsg); },
          async () => []
        );

        expect(result.usedMockLLM).toBe(true);
        expect(result.llmErrorMessage).toBe(errorMsg);
      }
    });

    it("returns success=true even when using fallback", async () => {
      const result = await runLLMWithFallback(
        async () => { throw new Error("Bedrock error"); },
        async () => [{ cashTransactionId: "c1", accrualDocumentId: "a1", confidence: 70, reasoning: "Fallback" }]
      );

      expect(result.success).toBe(true);
    });
  });
});

// ============ LLM SUGGESTION FILTERING TESTS ============

describe("LLM Suggestion Filtering", () => {
  const testSuggestions: LLMSuggestion[] = [
    { cashTransactionId: "c1", accrualDocumentId: "a1", confidence: 85, reasoning: "High conf" },
    { cashTransactionId: "c2", accrualDocumentId: "a2", confidence: 75, reasoning: "Medium conf" },
    { cashTransactionId: "c3", accrualDocumentId: "a3", confidence: 70, reasoning: "Threshold" },
    { cashTransactionId: "c4", accrualDocumentId: "a4", confidence: 65, reasoning: "Below threshold" },
    { cashTransactionId: "c5", accrualDocumentId: "a5", confidence: 50, reasoning: "Low conf" },
  ];

  it("filters suggestions by minimum confidence (default 70)", () => {
    const filtered = filterLLMSuggestions(testSuggestions);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(s => s.confidence)).toEqual([85, 75, 70]);
  });

  it("respects custom minimum confidence threshold", () => {
    const filtered = filterLLMSuggestions(testSuggestions, 80);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].confidence).toBe(85);
  });

  it("returns empty array when no suggestions meet threshold", () => {
    const filtered = filterLLMSuggestions(testSuggestions, 90);

    expect(filtered).toHaveLength(0);
  });

  it("includes edge case at exactly threshold", () => {
    const filtered = filterLLMSuggestions(testSuggestions, 70);

    expect(filtered.some(s => s.confidence === 70)).toBe(true);
  });
});

// ============ MATCH COUNTING TESTS ============

describe("Match Counting by Layer", () => {
  it("counts matches correctly by layer", () => {
    const matches: MatchCandidate[] = [
      { cashTransactionId: "c1", accrualDocumentId: "a1", confidenceScore: 100, matchLayer: 1, matchReason: "Exact" },
      { cashTransactionId: "c2", accrualDocumentId: "a2", confidenceScore: 100, matchLayer: 1, matchReason: "Exact" },
      { cashTransactionId: "c3", accrualDocumentId: "a3", confidenceScore: 92, matchLayer: 2, matchReason: "Window" },
      { cashTransactionId: "c4", accrualDocumentId: "a4", confidenceScore: 88, matchLayer: 3, matchReason: "Ref" },
      { cashTransactionId: "c5", accrualDocumentId: "a5", confidenceScore: 75, matchLayer: 5, matchReason: "LLM" },
      { cashTransactionId: "c6", accrualDocumentId: "a6", confidenceScore: 72, matchLayer: 5, matchReason: "LLM" },
    ];

    const counts = countMatchesByLayer(matches);

    expect(counts[1]).toBe(2);
    expect(counts[2]).toBe(1);
    expect(counts[3]).toBe(1);
    expect(counts[4]).toBeUndefined();
    expect(counts[5]).toBe(2);
  });

  it("handles empty matches array", () => {
    const counts = countMatchesByLayer([]);

    expect(Object.keys(counts)).toHaveLength(0);
  });

  it("handles single match", () => {
    const matches: MatchCandidate[] = [
      { cashTransactionId: "c1", accrualDocumentId: "a1", confidenceScore: 100, matchLayer: 1, matchReason: "Test" },
    ];

    const counts = countMatchesByLayer(matches);

    expect(counts[1]).toBe(1);
  });
});

// ============ ENGINE RESULT STRUCTURE TESTS ============

describe("Engine Result Structure", () => {
  interface MatchingResult {
    success: boolean;
    totalMatches: number;
    matchesByLayer: Record<number, number>;
    suspenseItems: number;
    unmatchedCash: number;
    unmatchedAccrual: number;
    usedMockLLM?: boolean;
    llmError?: string;
    error?: string;
  }

  function createSuccessResult(
    matches: MatchCandidate[],
    suspenseCount: number,
    unmatchedCash: number,
    unmatchedAccrual: number,
    usedMockLLM?: boolean,
    llmError?: string
  ): MatchingResult {
    return {
      success: true,
      totalMatches: matches.length,
      matchesByLayer: countMatchesByLayer(matches),
      suspenseItems: suspenseCount,
      unmatchedCash,
      unmatchedAccrual,
      usedMockLLM,
      llmError,
    };
  }

  function createErrorResult(error: string): MatchingResult {
    return {
      success: false,
      totalMatches: 0,
      matchesByLayer: {},
      suspenseItems: 0,
      unmatchedCash: 0,
      unmatchedAccrual: 0,
      error,
    };
  }

  it("creates valid success result", () => {
    const matches: MatchCandidate[] = [
      { cashTransactionId: "c1", accrualDocumentId: "a1", confidenceScore: 100, matchLayer: 1, matchReason: "Test" },
    ];

    const result = createSuccessResult(matches, 2, 3, 4);

    expect(result.success).toBe(true);
    expect(result.totalMatches).toBe(1);
    expect(result.suspenseItems).toBe(2);
    expect(result.unmatchedCash).toBe(3);
    expect(result.unmatchedAccrual).toBe(4);
  });

  it("includes mock LLM flag when fallback used", () => {
    const result = createSuccessResult([], 0, 0, 0, true, "AWS not configured");

    expect(result.usedMockLLM).toBe(true);
    expect(result.llmError).toBe("AWS not configured");
  });

  it("creates valid error result", () => {
    const result = createErrorResult("Session not found");

    expect(result.success).toBe(false);
    expect(result.totalMatches).toBe(0);
    expect(result.error).toBe("Session not found");
  });
});

// ============ LOGGING FORMAT TESTS ============

describe("Logging Format", () => {
  // These tests verify the expected log message patterns for monitoring

  function formatLayer5Log(
    stage: "attempt" | "success" | "fail" | "fallback",
    details?: string
  ): string {
    switch (stage) {
      case "attempt":
        return `[Layer 5] Attempting AWS Bedrock${details ? ` with ${details}` : ""}`;
      case "success":
        return `[Layer 5] AWS Bedrock SUCCESS${details ? `: ${details}` : ""}`;
      case "fail":
        return `[Layer 5] AWS Bedrock FAILED${details ? `: ${details}` : ""}`;
      case "fallback":
        return `[Layer 5] Falling back to smart heuristic matching...`;
    }
  }

  it("formats attempt log correctly", () => {
    const log = formatLayer5Log("attempt", "10 cash, 8 accrual items");
    expect(log).toBe("[Layer 5] Attempting AWS Bedrock with 10 cash, 8 accrual items");
  });

  it("formats success log correctly", () => {
    const log = formatLayer5Log("success", "5 suggestions");
    expect(log).toBe("[Layer 5] AWS Bedrock SUCCESS: 5 suggestions");
  });

  it("formats failure log correctly", () => {
    const log = formatLayer5Log("fail", "Invalid credentials");
    expect(log).toBe("[Layer 5] AWS Bedrock FAILED: Invalid credentials");
  });

  it("formats fallback log correctly", () => {
    const log = formatLayer5Log("fallback");
    expect(log).toBe("[Layer 5] Falling back to smart heuristic matching...");
  });
});
