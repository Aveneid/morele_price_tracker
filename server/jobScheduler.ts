import cron, { type ScheduledTask } from "node-cron";
import {
  getAllJobs,
  getJobById,
  updateJob,
  createJobExecution,
  updateJobExecution,
  getJobExecutions,
  getAllProducts,
  cleanupExpiredAdminSessions,
  deleteJobExecutionsOlderThan,
} from "./db";
import { Job } from "../drizzle/schema";
import { checkAllProductsNow } from "./priceTracker";

/** Each handler returns a short human-readable summary stored in the execution record. */
type JobHandler = (job: Job) => Promise<string>;

const EXECUTION_RETENTION_DAYS = 30;

const jobHandlers: Record<Job["jobType"], JobHandler> = {
  price_check: async () => {
    const { checked, failed } = await checkAllProductsNow();
    return `Checked ${checked} products, ${failed} failed`;
  },
  cleanup: async () => {
    await cleanupExpiredAdminSessions();
    const cutoff = new Date(Date.now() - EXECUTION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await deleteJobExecutionsOlderThan(cutoff);
    return `Removed expired admin sessions and job executions older than ${EXECUTION_RETENTION_DAYS} days`;
  },
  report: async () => {
    const products = await getAllProducts();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const checkedLastDay = products.filter(
      p => p.lastCheckedAt && new Date(p.lastCheckedAt).getTime() >= dayAgo
    ).length;
    const stale = products.length - checkedLastDay;
    return `${products.length} products tracked, ${checkedLastDay} checked in last 24h, ${stale} not checked in last 24h`;
  },
  custom: async job => {
    return `Custom job "${job.name}" has no handler - nothing to do`;
  },
};

const scheduledJobs = new Map<number, ScheduledTask>();
const runningJobs = new Set<number>();

export async function initializeJobScheduler() {
  console.log("[Job Scheduler] Initializing job scheduler...");

  try {
    const jobsList = await getAllJobs();
    let active = 0;

    for (const job of jobsList) {
      if (job.isActive && (await scheduleJob(job))) active++;
    }

    console.log(`[Job Scheduler] ${jobsList.length} jobs found, ${active} scheduled`);
  } catch (error) {
    console.error("[Job Scheduler] Error initializing job scheduler:", error);
  }
}

/** (Re)schedule a job. Returns false when the job could not be scheduled. */
export async function scheduleJob(job: Job): Promise<boolean> {
  try {
    await unscheduleJob(job.id);

    if (!job.isActive) return false;

    if (!cron.validate(job.cronExpression)) {
      console.error(
        `[Job Scheduler] Invalid cron expression for job ${job.id}: ${job.cronExpression}`
      );
      return false;
    }

    const task = cron.schedule(job.cronExpression, () => runScheduledJob(job.id), {
      name: `job-${job.id}`,
      noOverlap: true,
    });
    scheduledJobs.set(job.id, task);

    await updateJob(job.id, { nextExecutionAt: task.getNextRun() });

    console.log(
      `[Job Scheduler] Scheduled job ${job.id} (${job.name}) with cron: ${job.cronExpression}`
    );
    return true;
  } catch (error) {
    console.error(`[Job Scheduler] Error scheduling job ${job.id}:`, error);
    return false;
  }
}

export async function unscheduleJob(jobId: number) {
  const task = scheduledJobs.get(jobId);
  if (task) {
    await task.stop();
    scheduledJobs.delete(jobId);
    console.log(`[Job Scheduler] Unscheduled job ${jobId}`);
  }
}

/** Cron callback: always reloads the job so edits/deletes made after scheduling are respected. */
async function runScheduledJob(jobId: number) {
  try {
    const job = await getJobById(jobId);
    if (!job || !job.isActive) {
      await unscheduleJob(jobId);
      return;
    }
    await executeJob(job);
  } catch (error) {
    console.error(`[Job Scheduler] Unexpected error running job ${jobId}:`, error);
  }
}

export async function executeJob(job: Job) {
  if (runningJobs.has(job.id)) {
    console.warn(`[Job Scheduler] Job ${job.id} is still running, skipping this run`);
    return;
  }
  runningJobs.add(job.id);

  const startTime = Date.now();
  try {
    const execution = await createJobExecution({
      jobId: job.id,
      status: "running",
      startedAt: new Date(),
      logs: `Job execution started at ${new Date().toISOString()}`,
    });

    if (!execution) {
      console.error(`[Job Scheduler] Failed to create execution record for job ${job.id}`);
      return;
    }

    try {
      console.log(`[Job Scheduler] Executing job ${job.id}: ${job.name} (${job.jobType})`);

      const handler = jobHandlers[job.jobType];
      if (!handler) {
        throw new Error(`No handler found for job type: ${job.jobType}`);
      }

      const message = await handler(job);
      const duration = Date.now() - startTime;

      await updateJobExecution(execution.id, {
        status: "success",
        completedAt: new Date(),
        duration,
        result: JSON.stringify({ success: true, message }),
        logs: `${execution.logs}\n${message}\nJob completed successfully in ${duration}ms`,
      });

      console.log(`[Job Scheduler] Job ${job.id} completed in ${duration}ms: ${message}`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error?.message || "Unknown error";

      await updateJobExecution(execution.id, {
        status: "failed",
        completedAt: new Date(),
        duration,
        result: JSON.stringify({ success: false, error: errorMessage }),
        logs: `${execution.logs}\nError: ${errorMessage}\n${error?.stack || ""}`,
      });

      console.error(`[Job Scheduler] Job ${job.id} failed after ${duration}ms:`, error);
    }

    await updateJob(job.id, {
      lastExecutedAt: new Date(),
      nextExecutionAt: scheduledJobs.get(job.id)?.getNextRun() ?? null,
    });
  } catch (error) {
    console.error(`[Job Scheduler] Could not record execution of job ${job.id}:`, error);
  } finally {
    runningJobs.delete(job.id);
  }
}

export function getScheduledJobs(): Array<{ jobId: number; isActive: boolean; nextRun: Date | null }> {
  return Array.from(scheduledJobs.entries()).map(([jobId, task]) => ({
    jobId,
    isActive: true,
    nextRun: task.getNextRun(),
  }));
}

export async function getJobExecutionHistory(jobId: number, limit: number = 50) {
  return getJobExecutions(jobId, limit);
}
