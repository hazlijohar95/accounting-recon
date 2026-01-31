"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

// Create a singleton client instance
let convexClient: ConvexReactClient | null = null;

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

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const client = useMemo(() => getConvexClient(), []);

  // If no Convex URL is configured, render children without provider
  // This allows the app to work in demo mode without Convex
  if (!client) {
    return <>{children}</>;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
