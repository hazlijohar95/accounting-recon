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

export default crons;
