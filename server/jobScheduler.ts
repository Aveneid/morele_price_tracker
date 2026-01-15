import cron from "node-cron";
import {
  getAllJobs,
  getJobById,
  updateJob,
  createJobExecution,
  updateJobExecution,
  getJobExecutions,
} from "./db";
import { Job } from "../drizzle/schema";

type JobHandler = (job: Job) => Promise<void>;

const jobHandlers: Record<string, JobHandler> = {
  price_check: async (job: Job) => {
    console.log(`[Job Scheduler] Executing price_check job: ${job.name}`);
  },
  cleanup: async (job: Job) => {
    console.log(`[Job Scheduler] Executing cleanup job: ${job.name}`);
  },
  report: async (job: Job) => {
    console.log(`[Job Scheduler] Executing report job: ${job.name}`);
  },
  custom: async (job: Job) => {
    console.log(`[Job Scheduler] Executing custom job: ${job.name}`);
  },
};

interface ScheduledJob {
  task: any;
  jobId: number;
}

const scheduledJobs = new Map<number, ScheduledJob>();

export async function initializeJobScheduler() {
  console.log("[Job Scheduler] Initializing job scheduler...");

  try {
    const jobsList = await getAllJobs();

    for (const job of jobsList) {
      if (job.isActive) {
        scheduleJob(job);
      }
    }

    console.log(`[Job Scheduler] Initialized ${jobsList.length} jobs`);
  } catch (error) {
    console.error("[Job Scheduler] Error initializing job scheduler:", error);
  }
}

export function scheduleJob(job: Job) {
  try {
    if (!cron.validate(job.cronExpression)) {
      console.error(
        `[Job Scheduler] Invalid cron expression for job ${job.id}: ${job.cronExpression}`
      );
      return;
    }

    if (scheduledJobs.has(job.id)) {
      const existing = scheduledJobs.get(job.id);
      if (existing) {
        existing.task.stop();
        scheduledJobs.delete(job.id);
      }
    }

    const task = cron.schedule(job.cronExpression, async () => {
      await executeJob(job);
    });

    scheduledJobs.set(job.id, { task, jobId: job.id });

    console.log(
      `[Job Scheduler] Scheduled job ${job.id} (${job.name}) with cron: ${job.cronExpression}`
    );
  } catch (error) {
    console.error(`[Job Scheduler] Error scheduling job ${job.id}:`, error);
  }
}

export function unscheduleJob(jobId: number) {
  const scheduled = scheduledJobs.get(jobId);
  if (scheduled) {
    scheduled.task.stop();
    scheduledJobs.delete(jobId);
    console.log(`[Job Scheduler] Unscheduled job ${jobId}`);
  }
}

export async function executeJob(job: Job) {
  const startTime = Date.now();
  let execution = await createJobExecution({
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
    console.log(`[Job Scheduler] Executing job ${job.id}: ${job.name}`);

    const handler = jobHandlers[job.jobType];
    if (!handler) {
      throw new Error(`No handler found for job type: ${job.jobType}`);
    }

    await handler(job);

    const duration = Date.now() - startTime;
    if (!execution) throw new Error("Execution record not found");
    execution = await updateJobExecution(execution.id, {
      status: "success",
      completedAt: new Date(),
      duration,
      result: JSON.stringify({ success: true, message: "Job completed successfully" }),
      logs: `${execution.logs}\nJob completed successfully in ${duration}ms`,
    });

    await updateJob(job.id, {
      lastExecutedAt: new Date(),
    });

    console.log(
      `[Job Scheduler] Job ${job.id} completed successfully in ${duration}ms`
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || "Unknown error";

    if (!execution) throw new Error("Execution record not found");
    execution = await updateJobExecution(execution.id, {
      status: "failed",
      completedAt: new Date(),
      duration,
      result: JSON.stringify({ success: false, error: errorMessage }),
      logs: `${execution.logs}\nError: ${errorMessage}\n${error.stack || ""}`,
    });

    console.error(
      `[Job Scheduler] Job ${job.id} failed after ${duration}ms:`,
      error
    );
  }
}

export function getScheduledJobs(): Array<{ jobId: number; isActive: boolean }> {
  return Array.from(scheduledJobs.values()).map((scheduled) => ({
    jobId: scheduled.jobId,
    isActive: true,
  }));
}

export async function getJobExecutionHistory(
  jobId: number,
  limit: number = 50
) {
  return getJobExecutions(jobId, limit);
}
