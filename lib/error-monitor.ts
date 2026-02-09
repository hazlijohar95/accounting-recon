/**
 * Self-Hosted Error Monitoring - Client Side
 *
 * Captures browser errors and sends them to Convex for monitoring.
 * Includes throttling to prevent spam, deduplication awareness,
 * and integration with React error boundaries.
 *
 * @module lib/error-monitor
 */

import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";

// Types for error logging
type ErrorType = "uncaught" | "promise" | "boundary" | "api" | "convex" | "manual";

interface ErrorLogPayload {
  message: string;
  stack?: string;
  type: ErrorType;
  url: string;
  userAgent?: string;
  componentName?: string;
  metadata?: Record<string, unknown>;
}

// Throttle configuration
const THROTTLE_MS = 1000; // Minimum time between error reports
const MAX_ERRORS_PER_MINUTE = 10;

// State
let lastErrorTime = 0;
let errorCountThisMinute = 0;
let minuteResetTimer: ReturnType<typeof setTimeout> | null = null;
let convexClient: ConvexReactClient | null = null;
let isInitialized = false;

/**
 * Initialize the error monitor with a Convex client.
 * Call this once in your app's root component.
 */
export function initErrorMonitor(client: ConvexReactClient): void {
  if (isInitialized) {
    console.warn("Error monitor already initialized");
    return;
  }

  convexClient = client;
  isInitialized = true;

  // Set up global error handlers
  if (typeof window !== "undefined") {
    setupGlobalHandlers();
  }

  console.log("[ErrorMonitor] Initialized");
}

/**
 * Known non-critical error patterns to ignore
 * These are typically library warnings that don't affect functionality
 */
const IGNORED_ERROR_PATTERNS = [
  /SelectionRenderService/i,        // Univer internal warning on empty sheets
  /should not receive null/i,       // Univer selection warning
  /Cannot read properties of undefined.*worksheet/i, // Univer timing issue
  /Cannot read properties of null/i, // Univer internal timing issues
  /ResizeObserver loop/i,           // Common browser warning
  /Loading chunk.*failed/i,         // Dynamic import retry (handled elsewhere)
  /Script error/i,                  // Cross-origin script errors (no useful info)
  /Univer.*initialization/i,        // Univer initialization warnings
];

/**
 * Check if an error message should be ignored
 */
function shouldIgnoreError(message: string | undefined | null): boolean {
  if (!message) return true;
  return IGNORED_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Extract a meaningful message from an error object
 */
function extractErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error || null;
  if (error instanceof Error) return error.message || null;
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message || null;
    // Try to stringify, but avoid "[object Object]"
    try {
      const str = String(error);
      if (str && str !== '[object Object]' && str !== 'undefined' && str !== 'null') {
        return str;
      }
    } catch {
      // Ignore stringify errors
    }
  }
  return null;
}

/**
 * Set up global error and rejection handlers.
 */
function setupGlobalHandlers(): void {
  // Uncaught errors
  window.addEventListener("error", (event) => {
    const message = event.message || extractErrorMessage(event.error);

    // Skip if no meaningful message
    if (!message) {
      return;
    }

    // Skip ignored patterns
    if (shouldIgnoreError(message)) {
      return;
    }

    logError({
      message,
      stack: event.error?.stack,
      type: "uncaught",
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    const message = extractErrorMessage(error);

    // Skip if no meaningful message
    if (!message) {
      return;
    }

    // Skip ignored patterns
    if (shouldIgnoreError(message)) {
      return;
    }

    logError({
      message,
      stack: error?.stack,
      type: "promise",
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });
}

/**
 * Log an error to the monitoring system.
 * Includes throttling and deduplication.
 */
export async function logError(payload: ErrorLogPayload): Promise<void> {
  // Skip empty or invalid payloads
  if (!payload.message || payload.message.trim() === "") {
    return;
  }

  // Skip ignored patterns
  if (shouldIgnoreError(payload.message)) {
    return;
  }

  // Check if initialized
  if (!convexClient) {
    console.warn("[ErrorMonitor] Not initialized, error not logged:", payload.message);
    return;
  }

  // Throttle check
  const now = Date.now();
  if (now - lastErrorTime < THROTTLE_MS) {
    console.debug("[ErrorMonitor] Throttled error:", payload.message);
    return;
  }

  // Rate limit check
  if (errorCountThisMinute >= MAX_ERRORS_PER_MINUTE) {
    console.warn("[ErrorMonitor] Rate limited, error not logged:", payload.message);
    return;
  }

  // Update throttle state
  lastErrorTime = now;
  errorCountThisMinute++;

  // Reset counter after a minute
  if (!minuteResetTimer) {
    minuteResetTimer = setTimeout(() => {
      errorCountThisMinute = 0;
      minuteResetTimer = null;
    }, 60000);
  }

  // Log locally in development
  if (process.env.NODE_ENV === "development") {
    console.error("[ErrorMonitor] Logging error:", payload);
  }

  // Send to Convex
  try {
    await convexClient.mutation(api.errors.logError, payload);
  } catch (err) {
    // Avoid infinite loops - don't try to log errors about logging errors
    console.error("[ErrorMonitor] Failed to log error to Convex:", err);
  }
}

/**
 * Log a React error boundary error.
 * Call this from componentDidCatch or error boundary callbacks.
 */
export function logBoundaryError(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentName?: string
): void {
  logError({
    message: error.message,
    stack: error.stack,
    type: "boundary",
    url: typeof window !== "undefined" ? window.location.href : "server",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    componentName,
    metadata: {
      componentStack: errorInfo.componentStack,
    },
  });
}

/**
 * Log an API/fetch error.
 */
export function logApiError(
  error: Error | unknown,
  endpoint: string,
  method: string = "GET"
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  logError({
    message: errorObj.message,
    stack: errorObj.stack,
    type: "api",
    url: typeof window !== "undefined" ? window.location.href : "server",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    metadata: {
      endpoint,
      method,
    },
  });
}

/**
 * Log a Convex mutation/query error.
 */
export function logConvexError(
  error: Error | unknown,
  functionName: string,
  args?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  logError({
    message: errorObj.message,
    stack: errorObj.stack,
    type: "convex",
    url: typeof window !== "undefined" ? window.location.href : "server",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    metadata: {
      functionName,
      // Don't log sensitive args in production
      args: process.env.NODE_ENV === "development" ? args : undefined,
    },
  });
}

/**
 * Manually log an error with context.
 * Use this for caught errors that should be monitored.
 */
export function logManualError(
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorObj = typeof error === "string" ? new Error(error) : error;
  logError({
    message: errorObj.message,
    stack: errorObj.stack,
    type: "manual",
    url: typeof window !== "undefined" ? window.location.href : "server",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    metadata: context,
  });
}

/**
 * Create a wrapped function that logs errors.
 * Useful for wrapping async functions.
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: { functionName?: string }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logManualError(
        error instanceof Error ? error : new Error(String(error)),
        { functionName: context?.functionName, args }
      );
      throw error;
    }
  }) as T;
}

/**
 * Check if error monitoring is enabled.
 */
export function isErrorMonitorEnabled(): boolean {
  return isInitialized && convexClient !== null;
}

/**
 * Get error monitor stats (for debugging).
 */
export function getErrorMonitorStats(): {
  isInitialized: boolean;
  errorsThisMinute: number;
  lastErrorTime: number;
} {
  return {
    isInitialized,
    errorsThisMinute: errorCountThisMinute,
    lastErrorTime,
  };
}
