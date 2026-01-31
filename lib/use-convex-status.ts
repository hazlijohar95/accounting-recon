"use client";

import { useConvex } from "convex/react";
import { useMemo } from "react";

/**
 * Hook to check if Convex is configured and available.
 * Returns true if the app is connected to Convex, false if running in demo-only mode.
 */
export function useConvexStatus() {
  const convex = useConvex();

  return useMemo(() => ({
    isAvailable: convex !== null,
    // Can be expanded to track connection state, etc.
  }), [convex]);
}

/**
 * Helper to check if Convex URL is configured at build time.
 * Use this for conditional rendering in components.
 */
export function isConvexConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}
