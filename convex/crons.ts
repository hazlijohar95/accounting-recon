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

export default crons;
