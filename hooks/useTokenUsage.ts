"use client";

/**
 * Token Usage Hook
 *
 * Subscribes to aggregated token usage statistics for a company's
 * agent sessions. Used by the Token Usage Dashboard in Settings.
 *
 * Returns real-time stats including total tokens, per-session breakdown,
 * and estimated cost (Claude Sonnet 4 pricing).
 *
 * @module hooks/useTokenUsage
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useWorkosUserId } from "@/lib/convex-hooks/shared";

// ============================================================================
// Types
// ============================================================================

export interface SessionTokenData {
  sessionId: Id<"agentSessions">;
  status: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  documentCount: number;
  createdAt: number;
}

export interface TokenUsageStats {
  totalSessions: number;
  sessionsWithTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  avgTokensPerSession: number;
  estimatedCostUsd: number;
  sessionBreakdown: SessionTokenData[];
}

export interface UseTokenUsageOptions {
  companyId: Id<"companies"> | null;
  enabled?: boolean;
  limit?: number;
}

export interface UseTokenUsageReturn {
  stats: TokenUsageStats | null;
  isLoading: boolean;

  // Derived convenience values
  hasData: boolean;
  promptRatio: number; // 0-1 ratio of prompt tokens to total
  completionRatio: number; // 0-1 ratio of completion tokens to total

  // Daily aggregation for charts (grouped by calendar day)
  dailyUsage: Array<{
    date: string; // ISO date string (YYYY-MM-DD)
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    sessionCount: number;
  }>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTokenUsage({
  companyId,
  enabled = true,
  limit,
}: UseTokenUsageOptions): UseTokenUsageReturn {
  const workosUserId = useWorkosUserId();

  const rawStats = useQuery(
    api.agentSession.getTokenUsageStats,
    companyId && enabled
      ? { companyId, workosUserId, ...(limit !== undefined ? { limit } : {}) }
      : "skip",
  );

  const isLoading = rawStats === undefined && companyId !== null && enabled;

  const stats = useMemo<TokenUsageStats | null>(() => {
    if (!rawStats) return null;
    return rawStats as TokenUsageStats;
  }, [rawStats]);

  const hasData = stats !== null && stats.sessionsWithTokens > 0;

  const { promptRatio, completionRatio } = useMemo(() => {
    if (!hasData || !stats) return { promptRatio: 0, completionRatio: 0 };
    return {
      promptRatio: stats.totalPromptTokens / stats.totalTokens,
      completionRatio: stats.totalCompletionTokens / stats.totalTokens,
    };
  }, [hasData, stats]);

  // Group session breakdown by calendar day for chart display
  const dailyUsage = useMemo(() => {
    if (!stats?.sessionBreakdown || stats.sessionBreakdown.length === 0) return [];

    const dayMap = new Map<
      string,
      { promptTokens: number; completionTokens: number; totalTokens: number; sessionCount: number }
    >();

    for (const session of stats.sessionBreakdown) {
      const date = new Date(session.createdAt).toISOString().split("T")[0];
      const existing = dayMap.get(date) ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        sessionCount: 0,
      };

      existing.promptTokens += session.promptTokens;
      existing.completionTokens += session.completionTokens;
      existing.totalTokens += session.totalTokens;
      existing.sessionCount += 1;
      dayMap.set(date, existing);
    }

    // Sort by date ascending for chart display
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  }, [stats]);

  return {
    stats,
    isLoading,
    hasData,
    promptRatio,
    completionRatio,
    dailyUsage,
  };
}
