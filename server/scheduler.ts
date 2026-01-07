import * as cron from "node-cron";
import { getUserProducts, getSettings, updateProduct, recordPrice, getUserById } from "./db";
import { scrapeProduct } from "./scraper";
import { notifyOwner } from "./_core/notification";

interface ScheduledJob {
  userId: number;
  task: ReturnType<typeof cron.schedule>;
}

const scheduledJobs: Map<number, ScheduledJob> = new Map();

/**
 * Start price tracking for a specific user
 */
export async function startUserTracking(userId: number): Promise<void> {
  // Stop existing job if any
  stopUserTracking(userId);

  // Get user settings
  const settings = await getSettings(userId);
  if (!settings) {
    console.warn(`[Scheduler] No settings found for user ${userId}`);
    return;
  }

  const intervalMinutes = settings.trackingIntervalMinutes;
  const cronExpression = `*/${intervalMinutes} * * * *`; // Every N minutes

  console.log(
    `[Scheduler] Starting price tracking for user ${userId} every ${intervalMinutes} minutes`
  );

  const task = cron.schedule(cronExpression, async () => {
    await trackUserPrices(userId);
  });

  scheduledJobs.set(userId, { userId, task });
}

/**
 * Stop price tracking for a specific user
 */
export function stopUserTracking(userId: number): void {
  const job = scheduledJobs.get(userId);
  if (job) {
    job.task.stop();
    scheduledJobs.delete(userId);
    console.log(`[Scheduler] Stopped price tracking for user ${userId}`);
  }
}

/**
 * Track prices for all products of a user
 */
async function trackUserPrices(userId: number): Promise<void> {
  try {
    console.log(`[Scheduler] Tracking prices for user ${userId}`);

    const products = await getUserProducts(userId);
    const settings = await getSettings(userId);
    const user = await getUserById(userId);

    if (!settings) {
      console.warn(`[Scheduler] Settings not found for user ${userId}`);
      return;
    }

    const alertThreshold = settings.priceDropAlertThreshold;

    for (const product of products) {
      try {
        // Scrape current price
        const scraped = await scrapeProduct(product.url, user?.email || undefined);
        if (!scraped || scraped.price === null) {
          console.warn(
            `[Scheduler] Failed to scrape price for product ${product.id}`
          );
          continue;
        }

        const newPrice = scraped.price;
        const oldPrice = product.currentPrice || newPrice;

        // Calculate price change percentage
        let priceChangePercent = 0;
        if (oldPrice > 0) {
          priceChangePercent = Math.round(
            ((newPrice - oldPrice) / oldPrice) * 10000
          ); // Store as percentage * 100
        }

        // Update product
        await updateProduct(product.id, {
          previousPrice: oldPrice,
          currentPrice: newPrice,
          priceChangePercent,
          lastCheckedAt: new Date(),
        });

        // Record price in history
        await recordPrice(product.id, newPrice);

        // Check if price drop exceeds threshold
        const priceDropPercentage = Math.abs(priceChangePercent) / 100;
        if (
          priceChangePercent < 0 &&
          priceDropPercentage >= alertThreshold
        ) {
          console.log(
            `[Scheduler] Price drop detected for ${product.name}: ${priceDropPercentage}%`
          );

          // Send notification to owner
          await notifyOwner({
            title: `🔔 Price Drop Alert: ${product.name}`,
            content: `The price of "${product.name}" has dropped by ${priceDropPercentage.toFixed(1)}%!\n\nOld price: ${(oldPrice / 100).toFixed(2)} zł\nNew price: ${(newPrice / 100).toFixed(2)} zł\n\nView details: ${product.url}`,
          });
        }
      } catch (error) {
        console.error(
          `[Scheduler] Error tracking price for product ${product.id}:`,
          error
        );
      }
    }

    console.log(`[Scheduler] Completed price tracking for user ${userId}`);
  } catch (error) {
    console.error(`[Scheduler] Error tracking prices for user ${userId}:`, error);
  }
}

/**
 * Restart all scheduled jobs (call this on server startup)
 */
export async function restartAllScheduledJobs(): Promise<void> {
  console.log("[Scheduler] Restarting all scheduled jobs...");

  // Stop all existing jobs
  const userIds: number[] = [];
  scheduledJobs.forEach((job, userId) => {
    userIds.push(userId);
  });
  userIds.forEach((userId) => {
    stopUserTracking(userId);
  });

  // Note: In a production system, you'd query all users from the database
  // and start tracking for each one. For now, this is a placeholder.
  // The tracking will be started when users access the app or via an admin endpoint.

  console.log("[Scheduler] All scheduled jobs restarted");
}

/**
 * Get all active scheduled jobs (for debugging)
 */
export function getActiveJobs(): Array<{ userId: number }> {
  const jobs: Array<{ userId: number }> = [];
  scheduledJobs.forEach((job) => {
    jobs.push({
      userId: job.userId,
    });
  });
  return jobs;
}
