"use client";

import { useOptionalAuth } from "@/components/auth-provider";
import { useMemo } from "react";

/**
 * Get the current user's WorkOS ID for auth fallback.
 * Returns undefined if not authenticated.
 */
export function useWorkosUserId(): string | undefined {
  const auth = useOptionalAuth();
  return auth?.user?.workosId;
}

/**
 * Helper to optionally attach workosUserId to request args.
 */
export function withWorkosUserId<T extends Record<string, unknown>>(
  args: T,
  workosUserId?: string
): T & { workosUserId?: string } {
  if (!workosUserId) return args;
  return { ...args, workosUserId };
}

/**
 * Returns a memoized args object containing workosUserId if available.
 */
export function useWorkosUserArgs(): { workosUserId?: string } {
  const workosUserId = useWorkosUserId();
  return useMemo(() => (workosUserId ? { workosUserId } : {}), [workosUserId]);
}
