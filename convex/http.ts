import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authKit } from "./auth";

/**
 * HMAC-SHA256 implementation using Web Crypto API
 * Works in Convex runtime (which supports Web Crypto)
 */
async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const http = httpRouter();

// Register WorkOS AuthKit routes:
// - POST /workos/webhook - receives user events from WorkOS
// - POST /workos/action - receives action requests from WorkOS
authKit.registerRoutes(http);

/**
 * Webhook endpoint for ML service extraction results
 *
 * POST /api/extraction-results
 *
 * Receives extraction results from the ML service and stores them in the database.
 * Validates the webhook signature for security.
 * SECURITY: Validates document ownership to prevent cross-tenant injection.
 */
http.route({
  path: "/api/extraction-results",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // SECURITY: Webhook secret is REQUIRED in production
    const webhookSecret = process.env.CONVEX_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("SECURITY: CONVEX_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook authentication not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the request body
    const body = await request.text();

    // Verify webhook signature (REQUIRED)
    const signature = request.headers.get("X-Webhook-Signature");
    const timestamp = request.headers.get("X-Webhook-Timestamp");

    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // SECURITY: Use constant-time comparison to prevent timing attacks
    const expectedSignature = await hmacSha256(webhookSecret, body);

    // Constant-time comparison
    const encoder = new TextEncoder();
    const sigBytes = encoder.encode(signature);
    const expectedBytes = encoder.encode(expectedSignature);

    if (sigBytes.length !== expectedBytes.length) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Constant-time byte comparison (don't break early)
    let isValid = true;
    for (let i = 0; i < sigBytes.length; i++) {
      if (sigBytes[i] !== expectedBytes[i]) {
        isValid = false;
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: "Webhook timestamp too old" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!payload.document_id || !payload.company_id || !payload.job_id || !payload.status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate ID formats (Convex IDs are alphanumeric)
    const idPattern = /^[a-zA-Z0-9_-]{10,64}$/;
    if (!idPattern.test(payload.document_id) || !idPattern.test(payload.company_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid ID format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate status is one of expected values
    const validStatuses = ["completed", "failed", "processing"];
    if (!validStatuses.includes(payload.status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status value" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      // Transform bank_statement results to transactions array
      let transactions;
      if (payload.bank_statement?.transactions) {
        transactions = payload.bank_statement.transactions.map((tx: {
          date: string;
          description: string;
          reference?: string;
          amount: number;
        }) => ({
          date: tx.date,
          description: tx.description,
          reference: tx.reference,
          amount: tx.amount,
        }));
      }

      // Transform invoice results to accrual document
      let accrualDocument;
      if (payload.invoice) {
        const inv = payload.invoice;
        accrualDocument = {
          docType: inv.doc_type || "sales_invoice",
          docNumber: inv.doc_number,
          docDate: inv.doc_date || new Date().toISOString().split("T")[0],
          dueDate: inv.due_date,
          counterparty: inv.counterparty,
          amount: inv.amount || 0,
          taxAmount: inv.tax_amount,
          description: inv.counterparty ? `Invoice from ${inv.counterparty}` : undefined,
          lineItems: inv.line_items ? JSON.stringify(inv.line_items) : undefined,
        };
      }

      // Call the internal mutation to handle results
      await ctx.runMutation(internal.extraction.handleExtractionResults, {
        documentId: payload.document_id,
        companyId: payload.company_id,
        jobId: payload.job_id,
        status: payload.status,
        errorMessage: payload.error_message,
        extractedText: payload.extracted_text,
        extractionConfidence: payload.extraction_confidence,
        transactionCount: payload.transaction_count,
        bankType: payload.bank_statement?.bank_type,
        periodStart: payload.bank_statement?.period_start,
        periodEnd: payload.bank_statement?.period_end,
        transactions,
        accrualDocument,
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error processing extraction results:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process results" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Webhook endpoint for PDF generation results
 *
 * POST /api/pdf-ready
 *
 * Receives PDF generation completion notification from ML service.
 * Updates the pdfExportJobs record with download URL or error.
 */
http.route({
  path: "/api/pdf-ready",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // SECURITY: Webhook secret is REQUIRED in production
    const webhookSecret = process.env.CONVEX_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("SECURITY: CONVEX_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook authentication not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the request body
    const body = await request.text();

    // Verify webhook signature (REQUIRED)
    const signature = request.headers.get("X-Webhook-Signature");
    const timestamp = request.headers.get("X-Webhook-Timestamp");

    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // SECURITY: Use constant-time comparison to prevent timing attacks
    const expectedSignature = await hmacSha256(webhookSecret, body);

    // Constant-time comparison
    const encoder = new TextEncoder();
    const sigBytes = encoder.encode(signature);
    const expectedBytes = encoder.encode(expectedSignature);

    if (sigBytes.length !== expectedBytes.length) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Constant-time byte comparison (don't break early)
    let isValid = true;
    for (let i = 0; i < sigBytes.length; i++) {
      if (sigBytes[i] !== expectedBytes[i]) {
        isValid = false;
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: "Webhook timestamp too old" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!payload.job_id || !payload.status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: job_id and status" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate status is one of expected values
    const validStatuses = ["completed", "failed", "processing"];
    if (!validStatuses.includes(payload.status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status value" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      // Call the internal mutation to update PDF job status
      await ctx.runMutation(internal.exports.pdf.handlePDFResults, {
        jobId: payload.job_id,
        status: payload.status,
        downloadUrl: payload.download_url,
        fileName: payload.file_name,
        errorMessage: payload.error_message,
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error processing PDF results:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process PDF results" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

/**
 * Webhook endpoint for agent enrichment results
 *
 * POST /api/agent-results
 *
 * Receives enrichment results from the ML service and updates cell values.
 * Validates the webhook signature for security.
 */
http.route({
  path: "/api/agent-results",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // SECURITY: Webhook secret is REQUIRED in production
    const webhookSecret = process.env.CONVEX_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("SECURITY: CONVEX_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook authentication not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the request body
    const body = await request.text();

    // Verify webhook signature (REQUIRED)
    const signature = request.headers.get("X-Webhook-Signature");
    const timestamp = request.headers.get("X-Webhook-Timestamp");

    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // SECURITY: Use constant-time comparison to prevent timing attacks
    const expectedSignature = await hmacSha256(webhookSecret, body);

    // Constant-time comparison
    const encoder = new TextEncoder();
    const sigBytes = encoder.encode(signature);
    const expectedBytes = encoder.encode(expectedSignature);

    if (sigBytes.length !== expectedBytes.length) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Constant-time byte comparison (don't break early)
    let isValid = true;
    for (let i = 0; i < sigBytes.length; i++) {
      if (sigBytes[i] !== expectedBytes[i]) {
        isValid = false;
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: "Webhook timestamp too old" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!payload.job_id || !payload.status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: job_id and status" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate status is one of expected values
    const validStatuses = ["completed", "failed"];
    if (!validStatuses.includes(payload.status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status value" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      // Call the internal mutation to handle results
      await ctx.runMutation(internal.agents.handleJobResult, {
        jobId: payload.job_id,
        status: payload.status,
        result: payload.result,
        error: payload.error,
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error processing agent results:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process results" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
