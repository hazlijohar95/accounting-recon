import { ConvexHttpClient } from "convex/browser";
import { getAccessToken } from "./auth-server";

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return url;
}

/**
 * Create a per-request Convex client with user auth when available.
 * ConvexHttpClient is stateful, so never share it across requests.
 */
export async function getAuthedConvexClient(): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(getConvexUrl());
  const token = await getAccessToken();

  if (token) {
    client.setAuth(token);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Missing access token for Convex client");
  }

  return client;
}
