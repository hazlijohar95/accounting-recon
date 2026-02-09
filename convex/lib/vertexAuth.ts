/**
 * Vertex AI Authentication (Express Mode)
 *
 * Uses Vertex AI Express API key for authentication.
 * No service account JSON, JWT signing, or token exchange needed —
 * just append ?key=API_KEY to the endpoint URL.
 *
 * Required env vars:
 * - GOOGLE_API_KEY: Vertex AI Express API key
 * - GOOGLE_PROJECT_ID: GCP project ID
 * - GOOGLE_LOCATION: Vertex AI region (default: us-central1)
 *
 * @module convex/lib/vertexAuth
 */

/**
 * Get the Vertex AI Express API key from env vars.
 */
export function getVertexApiKey(): string {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY env var is not set");
  }
  return apiKey;
}

/**
 * Get Vertex AI project and location configuration from env vars.
 */
export function getVertexConfig(): { projectId: string; location: string } {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  if (!projectId) {
    throw new Error("GOOGLE_PROJECT_ID env var is not set");
  }

  const location = process.env.GOOGLE_LOCATION || "us-central1";

  return { projectId, location };
}

/**
 * Build the full Vertex AI Gemini endpoint URL for a given model.
 * Includes the API key as a query parameter.
 */
export function getGeminiEndpoint(modelId: string): string {
  const apiKey = getVertexApiKey();
  const { projectId, location } = getVertexConfig();

  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent?key=${apiKey}`;
}
