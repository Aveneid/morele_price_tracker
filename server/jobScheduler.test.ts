import { describe, it, expect, vi } from "vitest";
import { scheduleJob, unscheduleJob, getScheduledJobs } from "./jobScheduler";
import { Job } from "../drizzle/schema";

describe("Job Scheduler", () => {
  describe("scheduleJob", () => {
    it("should schedule a job with valid cron expression", () => {
      const job: Job = {
        id: 1,
        name: "Test Job",
        description: "Test job description",
        jobType: "price_check",
        cronExpression: "0 0 * * * *",
        isActive: true,
        lastExecutedAt: null,
        nextExecutionAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      scheduleJob(job);
      const scheduled = getScheduledJobs();

      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].jobId).toBe(1);
      expect(scheduled[0].isActive).toBe(true);

      unscheduleJob(1);
    });

    it("should reject invalid cron expression", () => {
      const job: Job = {
        id: 2,
        name: "Invalid Job",
        description: "Job with invalid cron",
        jobType: "cleanup",
        cronExpression: "invalid cron",
        isActive: true,
        lastExecutedAt: null,
        nextExecutionAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const consoleSpy = vi.spyOn(console, "error");
      scheduleJob(job);

      expect(consoleSpy).toHaveBeenCalled();
      expect(getScheduledJobs()).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it("should replace existing schedule for same job ID", () => {
      const job1: Job = {
        id: 3,
        name: "Job 1",
        description: "First version",
        jobType: "price_check",
        cronExpression: "0 0 * * * *",
        isActive: true,
        lastExecutedAt: null,
        nextExecutionAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const job2: Job = {
        ...job1,
        description: "Second version",
        cronExpression: "0 */6 * * * *",
      };

      scheduleJob(job1);
      expect(getScheduledJobs()).toHaveLength(1);

      scheduleJob(job2);
      expect(getScheduledJobs()).toHaveLength(1);

      unscheduleJob(3);
    });
  });

  describe("unscheduleJob", () => {
    it("should unschedule a job", () => {
      const job: Job = {
        id: 4,
        name: "Job to Unschedule",
        description: "Test",
        jobType: "report",
        cronExpression: "0 0 * * * *",
        isActive: true,
        lastExecutedAt: null,
        nextExecutionAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      scheduleJob(job);
      expect(getScheduledJobs()).toHaveLength(1);

      unscheduleJob(4);
      expect(getScheduledJobs()).toHaveLength(0);
    });

    it("should handle unscheduling non-existent job gracefully", () => {
      expect(() => unscheduleJob(999)).not.toThrow();
      expect(getScheduledJobs()).toHaveLength(0);
    });
  });

  describe("getScheduledJobs", () => {
    it("should return all scheduled jobs", () => {
      const jobs: Job[] = [
        {
          id: 5,
          name: "Job 5",
          description: "Test",
          jobType: "price_check",
          cronExpression: "0 0 * * * *",
          isActive: true,
          lastExecutedAt: null,
          nextExecutionAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 6,
          name: "Job 6",
          description: "Test",
          jobType: "cleanup",
          cronExpression: "0 0 0 * * *",
          isActive: true,
          lastExecutedAt: null,
          nextExecutionAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jobs.forEach((job) => scheduleJob(job));
      const scheduled = getScheduledJobs();

      expect(scheduled).toHaveLength(2);
      expect(scheduled.map((s) => s.jobId)).toEqual([5, 6]);

      jobs.forEach((job) => unscheduleJob(job.id));
    });

    it("should return empty array when no jobs are scheduled", () => {
      const scheduled = getScheduledJobs();
      expect(scheduled).toHaveLength(0);
    });
  });

  describe("Cron Expression Validation", () => {
    it("should accept valid 6-field cron expressions", () => {
      const validExpressions = [
        "0 0 * * * *",
        "0 0 0 * * *",
        "0 0 0 * * 0",
        "0 */6 * * * *",
        "0 0 9-17 * * 1-5",
      ];

      validExpressions.forEach((expr, idx) => {
        const job: Job = {
          id: 100 + idx,
          name: `Job ${idx}`,
          description: "Test",
          jobType: "price_check",
          cronExpression: expr,
          isActive: true,
          lastExecutedAt: null,
          nextExecutionAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        scheduleJob(job);
        expect(getScheduledJobs().some((s) => s.jobId === 100 + idx)).toBe(true);
        unscheduleJob(100 + idx);
      });
    });
  });
});
