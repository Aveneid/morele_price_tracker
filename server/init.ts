import { restartAllScheduledJobs } from "./scheduler";

/**
 * Initialize server-side services
 * Call this once when the server starts
 */
export async function initializeServer(): Promise<void> {
  console.log("[Server] Initializing services...");

  try {
    // Initialize scheduled jobs
    await restartAllScheduledJobs();
    console.log("[Server] Scheduled jobs initialized");
  } catch (error) {
    console.error("[Server] Failed to initialize services:", error);
  }
}
