/**
 * Scheduled Jobs (Cron Functions)
 *
 * These run automatically on a schedule to maintain system health.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up old errors daily at 3 AM UTC
// Removes errors older than 30 days
crons.daily(
  "cleanup-old-errors",
  { hourUTC: 3, minuteUTC: 0 },
  internal.errors.scheduledCleanup
);

// Process pending enrichment jobs every 10 seconds
// Picks up jobs from agentJobs table and runs LLM/external enrichment
crons.interval(
  "process-enrichment-jobs",
  { seconds: 10 },
  internal.agents.processJobs
);

// Clean up stale PDF export jobs every minute
// Marks jobs stuck in "processing" for >10 minutes as failed
// Also cleans up expired download URLs
crons.interval(
  "cleanup-stale-pdf-jobs",
  { minutes: 1 },
  internal.exports.pdf.cleanupStalePDFJobs
);

// Clean up expired file export jobs every 5 minutes
// Deletes stored files from Convex storage after 1 hour, removes stale job records
crons.interval(
  "cleanup-expired-export-jobs",
  { minutes: 5 },
  internal.exports.index.cleanupExpiredExportJobs
);

// Clean up expired reconciliation chat messages every hour
// Messages older than 24 hours are deleted to manage storage
crons.interval(
  "cleanup-expired-chat",
  { hours: 1 },
  internal.reconciliationChat.deleteExpired
);

// Reset stale document extractions every 2 minutes
// Documents stuck in "processing" for >15 minutes are marked as failed
// so users can see the failure and retry, instead of being stuck forever
crons.interval(
  "cleanup-stale-extractions",
  { minutes: 2 },
  internal.documents.cleanupStaleExtractions
);

// Process retryable extraction queue items every 30 seconds
// Items with exponential backoff whose retry time has arrived get requeued
crons.interval(
  "process-queue-retries",
  { seconds: 30 },
  internal.extractionQueue.processRetryableItems
);

// Expire stale agent sessions every 15 minutes
// Sessions in active/analyzing/ready status with no activity for >24h get expired
// Prevents abandoned sessions from accumulating
crons.interval(
  "expire-stale-agent-sessions",
  { minutes: 15 },
  internal.agentSession.expireStaleSessionsGlobal
);

export default crons;
