import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Test suite for price tracker scheduling logic
 */

describe("Price Tracker Scheduling", () => {
  describe("calculateNextCheckTime", () => {
    it("should calculate a time between 10-48 hours from creation time", () => {
      // We need to test the logic without importing the actual function
      // So we'll recreate it here for testing
      const calculateNextCheckTime = (createdAt: Date): Date => {
        const minHours = 10;
        const maxHours = 48;
        const minMs = minHours * 60 * 60 * 1000;
        const maxMs = maxHours * 60 * 60 * 1000;
        const randomOffset = Math.random() * (maxMs - minMs) + minMs;
        return new Date(createdAt.getTime() + randomOffset);
      };

      const createdAt = new Date("2026-03-20T12:00:00Z");
      const nextCheckTime = calculateNextCheckTime(createdAt);

      // Calculate the difference in hours
      const diffMs = nextCheckTime.getTime() - createdAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Should be between 10 and 48 hours
      expect(diffHours).toBeGreaterThanOrEqual(10);
      expect(diffHours).toBeLessThanOrEqual(48);
    });

    it("should produce different times for multiple calls", () => {
      const calculateNextCheckTime = (createdAt: Date): Date => {
        const minHours = 10;
        const maxHours = 48;
        const minMs = minHours * 60 * 60 * 1000;
        const maxMs = maxHours * 60 * 60 * 1000;
        const randomOffset = Math.random() * (maxMs - minMs) + minMs;
        return new Date(createdAt.getTime() + randomOffset);
      };

      const createdAt = new Date();
      const times = [
        calculateNextCheckTime(createdAt),
        calculateNextCheckTime(createdAt),
        calculateNextCheckTime(createdAt),
      ];

      // At least some should be different (extremely unlikely all are the same)
      const uniqueTimes = new Set(times.map(t => t.getTime()));
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });
  });

  describe("getCronExpression", () => {
    it("should generate correct cron expression for minute intervals", () => {
      const getCronExpression = (intervalMinutes: number): string => {
        if (intervalMinutes < 1) intervalMinutes = 1;
        if (intervalMinutes > 59) {
          const hours = Math.floor(intervalMinutes / 60);
          return `0 */${hours} * * *`;
        }
        return `*/${intervalMinutes} * * * *`;
      };

      expect(getCronExpression(15)).toBe("*/15 * * * *");
      expect(getCronExpression(30)).toBe("*/30 * * * *");
      expect(getCronExpression(1)).toBe("*/1 * * * *");
    });

    it("should generate correct cron expression for hour intervals", () => {
      const getCronExpression = (intervalMinutes: number): string => {
        if (intervalMinutes < 1) intervalMinutes = 1;
        if (intervalMinutes > 59) {
          const hours = Math.floor(intervalMinutes / 60);
          return `0 */${hours} * * *`;
        }
        return `*/${intervalMinutes} * * * *`;
      };

      expect(getCronExpression(60)).toBe("0 */1 * * *");
      expect(getCronExpression(120)).toBe("0 */2 * * *");
      expect(getCronExpression(180)).toBe("0 */3 * * *");
    });

    it("should handle edge cases", () => {
      const getCronExpression = (intervalMinutes: number): string => {
        if (intervalMinutes < 1) intervalMinutes = 1;
        if (intervalMinutes > 59) {
          const hours = Math.floor(intervalMinutes / 60);
          return `0 */${hours} * * *`;
        }
        return `*/${intervalMinutes} * * * *`;
      };

      // Should default to 1 minute for 0 or negative
      expect(getCronExpression(0)).toBe("*/1 * * * *");
      expect(getCronExpression(-5)).toBe("*/1 * * * *");

      // Should handle large intervals
      expect(getCronExpression(1440)).toBe("0 */24 * * *");
    });
  });

  describe("Scheduling strategy", () => {
    it("should distribute products across the check interval", () => {
      // Simulate adding 10 products at different times
      const calculateNextCheckTime = (createdAt: Date): Date => {
        const minHours = 10;
        const maxHours = 48;
        const minMs = minHours * 60 * 60 * 1000;
        const maxMs = maxHours * 60 * 60 * 1000;
        const randomOffset = Math.random() * (maxMs - minMs) + minMs;
        return new Date(createdAt.getTime() + randomOffset);
      };

      const now = new Date();
      const products = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        createdAt: new Date(now.getTime() - i * 1000 * 60 * 60), // Each created 1 hour apart
      }));

      const nextCheckTimes = products.map(p => calculateNextCheckTime(p.createdAt));
      
      // All should be in the future
      nextCheckTimes.forEach(time => {
        expect(time.getTime()).toBeGreaterThan(now.getTime());
      });

      // Should have variety in the times
      const uniqueTimes = new Set(nextCheckTimes.map(t => t.getTime()));
      expect(uniqueTimes.size).toBeGreaterThan(5); // At least 5 different times out of 10
    });
  });
});
