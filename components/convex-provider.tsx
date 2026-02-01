"use client";

import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { ReactNode, useMemo, useEffect, useCallback } from "react";
import { initErrorMonitor } from "@/lib/error-monitor";
import { useAuth } from "./auth-provider";

// Create a singleton client instance
let convexClient: ConvexReactClient | null = null;
let errorMonitorInitialized = false;

function getConvexClient(): ConvexReactClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!url) {
    // Return null if no URL configured (demo mode only)
    return null;
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(url);
  }

  return convexClient;
}

/**
 * Get the Convex client instance (for use outside React components)
 */
export function getConvexClientInstance(): ConvexReactClient | null {
  return convexClient;
}

interface ConvexClientProviderProps {
  children: ReactNode;
}

// Custom hook for Convex auth that uses AuthKit tokens via our AuthProvider
// Simplified to avoid race conditions - single source of truth from AuthProvider
function useAuthFromAuthKit() {
  const { isLoading, isAuthenticated, getAccessToken } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      console.log('[Convex Auth] Fetching access token, forceRefresh:', forceRefreshToken);
      try {
        const token = await getAccessToken();
        if (token) {
          console.log('[Convex Auth] Access token fetched successfully');
          return token;
        }
        console.log('[Convex Auth] No access token available');
        return null;
      } catch (error) {
        console.error("[Convex Auth] Failed to fetch access token:", error);
        return null;
      }
    },
    [getAccessToken]
  );

  return { isLoading, isAuthenticated, fetchAccessToken };
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const client = useMemo(() => getConvexClient(), []);

  // Initialize error monitor once the client is available
  useEffect(() => {
    if (client && !errorMonitorInitialized) {
      initErrorMonitor(client);
      errorMonitorInitialized = true;
    }
  }, [client]);

  // If no Convex URL is configured, render children without provider
  // This allows the app to work in demo mode without Convex
  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithAuth client={client} useAuth={useAuthFromAuthKit}>
      {children}
    </ConvexProviderWithAuth>
  );
}
