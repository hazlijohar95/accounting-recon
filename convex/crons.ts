/**
 * Scheduled Jobs (Cron Functions)
 *
 * These run automatically on a schedule to maintain system health.
 * Currently empty - add cron jobs as needed.
 */

import { cronJobs } from "convex/server";

const crons = cronJobs();

// No cron jobs currently configured
// Example:
// crons.interval(
//   "cleanup-job",
//   { hours: 1 },
//   internal.someModule.cleanupFunction
// );

export default crons;
