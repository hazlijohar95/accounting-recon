/**
 * Agent LLM Layer — Unit Tests
 *
 * Tests for the pure, testable functions in the LLM layer (Layer 3).
 * These tests do NOT call Bedrock — they test prompt construction,
 * response parsing, and fallback summary generation.
 *
 * Run with: pnpm test convex/lib/__tests__/agentLlm.test.ts
 *
 * @module convex/lib/__tests__/agentLlm.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import {
  buildEntityResolutionPrompt,
  parseEntityResolutionResponse,
  buildSummaryPrompt,
  buildFallbackSummary,
  resolveEntityNames,
  generateAgentSummary,
} from "../agentLlm";
import type { AgentFinding } from "../agentUtils";
import type { AgentStats } from "../agentLlm";

// ============================================================================
// Test Fixtures
// ============================================================================

function createFinding(
  type: AgentFinding["type"],
  severity: AgentFinding["severity"],
  title: string,
): AgentFinding {
  return {
    type,
    severity,
    title,
    description: `Description for ${title}`,
  };
}

function createStats(overrides: Partial<AgentStats> = {}): AgentStats {
  return {
    totalDocuments: 5,
    bankStatements: 2,
    invoices: 2,
    receipts: 1,
    totalTransactions: 120,
    totalAccrualDocs: 15,
    ...overrides,
  };
}

// ============================================================================
// buildEntityResolutionPrompt
// ============================================================================

describe("buildEntityResolutionPrompt", () => {
  it("includes all entity names in the prompt", () => {
    const prompt = buildEntityResolutionPrompt(
      ["ABC Sdn Bhd", "ABC SDN. BHD.", "XYZ Corp"],
      "ABC Sdn Bhd",
    );
    expect(prompt).toContain("ABC Sdn Bhd");
    expect(prompt).toContain("ABC SDN. BHD.");
    expect(prompt).toContain("XYZ Corp");
  });

  it("includes the company name in the prompt", () => {
    const prompt = buildEntityResolutionPrompt(
      ["Name A", "Name B"],
      "My Company Sdn Bhd",
    );
    expect(prompt).toContain("My Company Sdn Bhd");
  });

  it("requests JSON output format", () => {
    const prompt = buildEntityResolutionPrompt(["A", "B"], "Company");
    expect(prompt).toContain("Return ONLY valid JSON");
    expect(prompt).toContain('"groups"');
    expect(prompt).toContain('"matchesCompany"');
  });

  it("sanitizes control characters from input names", () => {
    const prompt = buildEntityResolutionPrompt(
      ["ABC\x00\x01Company", "Normal Name"],
      "Safe Company",
    );
    // Control chars should be stripped
    expect(prompt).not.toContain("\x00");
    expect(prompt).not.toContain("\x01");
    expect(prompt).toContain("ABCCompany");
  });

  it("truncates very long names", () => {
    const longName = "A".repeat(500);
    const prompt = buildEntityResolutionPrompt([longName], "Company");
    // sanitizeForPrompt caps at 200 chars
    expect(prompt).not.toContain("A".repeat(500));
    expect(prompt).toContain("A".repeat(200));
  });

  it("numbers the entity list", () => {
    const prompt = buildEntityResolutionPrompt(
      ["First", "Second", "Third"],
      "Company",
    );
    expect(prompt).toContain('1. "First"');
    expect(prompt).toContain('2. "Second"');
    expect(prompt).toContain('3. "Third"');
  });
});

// ============================================================================
// parseEntityResolutionResponse
// ============================================================================

describe("parseEntityResolutionResponse", () => {
  it("parses well-formed JSON response", () => {
    const response = JSON.stringify({
      groups: [
        { canonical: "ABC Sdn Bhd", variants: ["ABC SDN. BHD.", "ABC"] },
        { canonical: "XYZ Corp", variants: [] },
      ],
      matchesCompany: ["ABC Sdn Bhd", "ABC SDN. BHD.", "ABC"],
    });

    const result = parseEntityResolutionResponse(response);
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(2);
    expect(result!.groups[0].canonical).toBe("ABC Sdn Bhd");
    expect(result!.groups[0].variants).toEqual(["ABC SDN. BHD.", "ABC"]);
    expect(result!.matchesCompany).toContain("ABC Sdn Bhd");
  });

  it("parses JSON wrapped in markdown code fence", () => {
    const response = '```json\n{"groups": [{"canonical": "A", "variants": []}], "matchesCompany": []}\n```';

    const result = parseEntityResolutionResponse(response);
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(1);
    expect(result!.groups[0].canonical).toBe("A");
  });

  it("parses JSON embedded in surrounding text", () => {
    const response = 'Here is the result:\n{"groups": [{"canonical": "Test", "variants": ["T"]}], "matchesCompany": ["Test"]}\nDone.';

    const result = parseEntityResolutionResponse(response);
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(1);
  });

  it("returns null for completely invalid input", () => {
    expect(parseEntityResolutionResponse("not json at all")).toBeNull();
    expect(parseEntityResolutionResponse("")).toBeNull();
    expect(parseEntityResolutionResponse("{}")).toBeNull(); // no groups array
  });

  it("returns null when groups is not an array", () => {
    const response = JSON.stringify({ groups: "not an array", matchesCompany: [] });
    expect(parseEntityResolutionResponse(response)).toBeNull();
  });

  it("filters out non-string variants", () => {
    const response = JSON.stringify({
      groups: [
        { canonical: "ABC", variants: ["DEF", 123, null, "GHI"] },
      ],
      matchesCompany: [],
    });

    const result = parseEntityResolutionResponse(response);
    expect(result).not.toBeNull();
    expect(result!.groups[0].variants).toEqual(["DEF", "GHI"]);
  });

  it("handles missing matchesCompany gracefully", () => {
    const response = JSON.stringify({
      groups: [{ canonical: "ABC", variants: [] }],
    });

    const result = parseEntityResolutionResponse(response);
    expect(result).not.toBeNull();
    expect(result!.matchesCompany).toEqual([]);
  });

  it("filters groups with non-string canonical", () => {
    const response = JSON.stringify({
      groups: [
        { canonical: "Valid", variants: [] },
        { canonical: 123, variants: [] },
        { variants: ["no canonical"] },
      ],
      matchesCompany: [],
    });

    const result = parseEntityResolutionResponse(response);
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(1);
    expect(result!.groups[0].canonical).toBe("Valid");
  });
});

// ============================================================================
// buildSummaryPrompt
// ============================================================================

describe("buildSummaryPrompt", () => {
  it("includes stats in the prompt", () => {
    const stats = createStats({ totalDocuments: 7, totalTransactions: 250 });
    const prompt = buildSummaryPrompt([], stats);
    expect(prompt).toContain("7 documents");
    expect(prompt).toContain("250 bank transactions");
  });

  it("includes period range when available", () => {
    const stats = createStats({ periodRange: "January 2024 to March 2024" });
    const prompt = buildSummaryPrompt([], stats);
    expect(prompt).toContain("January 2024 to March 2024");
  });

  it("categorizes findings by severity", () => {
    const findings = [
      createFinding("extraction_errors", "critical", "1 Failed"),
      createFinding("period_gap", "warning", "Missing Feb"),
      createFinding("period_detected", "info", "Period: Jan-Mar"),
    ];
    const prompt = buildSummaryPrompt(findings, createStats());
    expect(prompt).toContain("Critical issues (1)");
    expect(prompt).toContain("Warnings (1)");
    expect(prompt).toContain("Info (1)");
  });

  it("shows 'No issues found' when there are no findings", () => {
    const prompt = buildSummaryPrompt([], createStats());
    expect(prompt).toContain("No issues found");
  });

  it("requests plain language summary", () => {
    const prompt = buildSummaryPrompt([], createStats());
    expect(prompt).toContain("calm, helpful accounting assistant");
    expect(prompt).toContain("under 150 words");
    expect(prompt).toContain("Return ONLY the summary text");
  });

  it("includes document type breakdown", () => {
    const stats = createStats({ bankStatements: 3, invoices: 4, receipts: 2 });
    const prompt = buildSummaryPrompt([], stats);
    expect(prompt).toContain("3 bank statements");
    expect(prompt).toContain("4 invoices");
    expect(prompt).toContain("2 receipts");
  });
});

// ============================================================================
// buildFallbackSummary
// ============================================================================

describe("buildFallbackSummary", () => {
  it("includes document and transaction counts", () => {
    const summary = buildFallbackSummary([], createStats({ totalDocuments: 3, totalTransactions: 50, totalAccrualDocs: 10 }));
    expect(summary).toContain("3 documents");
    expect(summary).toContain("50 bank transactions");
    expect(summary).toContain("10 invoices");
  });

  it("includes period range when available", () => {
    const summary = buildFallbackSummary([], createStats({ periodRange: "Jan to Mar 2024" }));
    expect(summary).toContain("Jan to Mar 2024");
  });

  it("mentions critical issues when present", () => {
    const findings = [
      createFinding("extraction_errors", "critical", "Failed"),
    ];
    const summary = buildFallbackSummary(findings, createStats());
    expect(summary).toContain("1 issue");
    expect(summary).toContain("attention");
  });

  it("mentions warnings when present but no criticals", () => {
    const findings = [
      createFinding("period_gap", "warning", "Missing"),
      createFinding("duplicate_transactions", "warning", "Dupes"),
    ];
    const summary = buildFallbackSummary(findings, createStats());
    expect(summary).toContain("2 things");
    expect(summary).toContain("reviewing");
    expect(summary).not.toContain("attention");
  });

  it("says ready when no issues", () => {
    const summary = buildFallbackSummary([], createStats());
    expect(summary).toContain("ready to proceed");
  });

  it("handles singular forms correctly", () => {
    const stats = createStats({ totalDocuments: 1, totalTransactions: 1, totalAccrualDocs: 1 });
    const findings = [createFinding("extraction_errors", "critical", "Failed")];
    const summary = buildFallbackSummary(findings, stats);
    expect(summary).toContain("1 document ");
    expect(summary).toContain("1 bank transaction ");
    expect(summary).toContain("1 issue");
    expect(summary).toContain("needs your attention");
  });

  it("handles plural forms correctly", () => {
    const findings = [
      createFinding("extraction_errors", "critical", "Failed 1"),
      createFinding("extraction_errors", "critical", "Failed 2"),
    ];
    const summary = buildFallbackSummary(findings, createStats());
    expect(summary).toContain("2 issues");
    expect(summary).toContain("need your attention");
  });

  it("mentions only critical when both critical and warning present", () => {
    const findings = [
      createFinding("extraction_errors", "critical", "Failed"),
      createFinding("period_gap", "warning", "Missing"),
    ];
    const summary = buildFallbackSummary(findings, createStats());
    expect(summary).toContain("1 issue");
    expect(summary).toContain("attention");
    expect(summary).not.toContain("reviewing");
  });
});

// ============================================================================
// resolveEntityNames (async, with mock bedrockCall)
// ============================================================================

describe("resolveEntityNames", () => {
  it("returns null when fewer than 2 names provided", async () => {
    const mockBedrock = vi.fn();
    const result = await resolveEntityNames(["ABC Sdn Bhd"], "ABC Sdn Bhd", mockBedrock);
    expect(result).toBeNull();
    expect(mockBedrock).not.toHaveBeenCalled();
  });

  it("returns null for empty names array", async () => {
    const mockBedrock = vi.fn();
    const result = await resolveEntityNames([], "Company", mockBedrock);
    expect(result).toBeNull();
    expect(mockBedrock).not.toHaveBeenCalled();
  });

  it("calls bedrockCall and returns parsed result on success", async () => {
    const mockResponse = JSON.stringify({
      groups: [
        { canonical: "ABC Sdn Bhd", variants: ["ABC SDN. BHD."] },
      ],
      matchesCompany: ["ABC Sdn Bhd", "ABC SDN. BHD."],
    });
    const mockBedrock = vi.fn().mockResolvedValue(mockResponse);

    const result = await resolveEntityNames(
      ["ABC Sdn Bhd", "ABC SDN. BHD."],
      "ABC Sdn Bhd",
      mockBedrock,
    );

    expect(mockBedrock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(1);
    expect(result!.groups[0].canonical).toBe("ABC Sdn Bhd");
    expect(result!.matchesCompany).toContain("ABC Sdn Bhd");
  });

  it("returns null when bedrockCall throws an error", async () => {
    const mockBedrock = vi.fn().mockRejectedValue(new Error("API timeout"));

    const result = await resolveEntityNames(
      ["Name A", "Name B"],
      "Company",
      mockBedrock,
    );

    expect(result).toBeNull();
  });

  it("returns null when LLM returns unparseable text", async () => {
    const mockBedrock = vi.fn().mockResolvedValue("Sorry, I can't help with that.");

    const result = await resolveEntityNames(
      ["Name A", "Name B"],
      "Company",
      mockBedrock,
    );

    expect(result).toBeNull();
  });

  it("passes correct prompt to bedrockCall", async () => {
    const mockBedrock = vi.fn().mockResolvedValue('{"groups": [], "matchesCompany": []}');

    await resolveEntityNames(
      ["First Corp", "Second Ltd"],
      "My Company",
      mockBedrock,
    );

    const prompt = mockBedrock.mock.calls[0][0];
    expect(prompt).toContain("First Corp");
    expect(prompt).toContain("Second Ltd");
    expect(prompt).toContain("My Company");
  });
});

// ============================================================================
// generateAgentSummary (async, with mock bedrockCall)
// ============================================================================

describe("generateAgentSummary", () => {
  it("returns trimmed LLM response when valid", async () => {
    const mockBedrock = vi.fn().mockResolvedValue(
      "  Your documents look great. I found 120 transactions across 5 files covering January to March 2024.  ",
    );

    const result = await generateAgentSummary([], createStats(), mockBedrock);

    expect(result).toBe(
      "Your documents look great. I found 120 transactions across 5 files covering January to March 2024.",
    );
  });

  it("falls back when response is too short", async () => {
    const mockBedrock = vi.fn().mockResolvedValue("OK");

    const result = await generateAgentSummary([], createStats(), mockBedrock);

    // Should use fallback summary instead
    expect(result).toContain("5 documents");
    expect(result).toContain("120 bank transactions");
  });

  it("falls back when response is too long", async () => {
    const mockBedrock = vi.fn().mockResolvedValue("A".repeat(2500));

    const result = await generateAgentSummary([], createStats(), mockBedrock);

    // Should use fallback summary
    expect(result).toContain("5 documents");
  });

  it("falls back when bedrockCall throws", async () => {
    const mockBedrock = vi.fn().mockRejectedValue(new Error("Rate limit"));

    const result = await generateAgentSummary([], createStats(), mockBedrock);

    // Should use fallback summary
    expect(result).toContain("5 documents");
    expect(result).toContain("ready to proceed");
  });

  it("falls back when bedrockCall returns empty string", async () => {
    const mockBedrock = vi.fn().mockResolvedValue("");

    const result = await generateAgentSummary([], createStats(), mockBedrock);

    expect(result).toContain("5 documents");
  });

  it("passes findings and stats to the prompt", async () => {
    const findings = [
      createFinding("period_gap", "warning", "Missing February"),
    ];
    const stats = createStats({ periodRange: "Jan to Mar 2024" });
    const mockBedrock = vi.fn().mockResolvedValue(
      "I processed your documents and found a gap in February. Otherwise everything looks good.",
    );

    await generateAgentSummary(findings, stats, mockBedrock);

    const prompt = mockBedrock.mock.calls[0][0];
    expect(prompt).toContain("Missing February");
    expect(prompt).toContain("Jan to Mar 2024");
  });
});
