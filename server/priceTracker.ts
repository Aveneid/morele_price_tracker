import cron from "node-cron";
import { getAllProducts, getProductById, recordPrice, updateProduct, getActiveAlertsForProduct } from "./db";
import { scrapeProduct } from "./scraper";
import { notifyOwner } from "./_core/notification";


/**
 * Price tracking scheduler that checks product prices on a configurable schedule
 * with random 10-48 hour offsets from product creation time to prevent service overload
 */

interface ScheduledTask {
  productId: number;
  task: any; // cron.ScheduledTask
  timeout?: NodeJS.Timeout; // For offset-based scheduling
}

const scheduledTasks = new Map<number, ScheduledTask>();

/**
 * Calculate random offset between 10-48 hours from product creation time
 * This ensures products added at different times naturally spread out their checks
 */
function calculateNextCheckTime(createdAt: Date): Date {
  // Random offset between 10 and 48 hours (in milliseconds)
  const minHours = 10;
  const maxHours = 48;
  const minMs = minHours * 60 * 60 * 1000;
  const maxMs = maxHours * 60 * 60 * 1000;
  const randomOffset = Math.random() * (maxMs - minMs) + minMs;
  
  return new Date(createdAt.getTime() + randomOffset);
}

/**
 * Calculate cron expression from minutes interval
 * Returns a cron expression that runs every N minutes
 */
function getCronExpression(intervalMinutes: number): string {
  if (intervalMinutes < 1) intervalMinutes = 1;
  if (intervalMinutes > 59) {
    // For intervals > 59 minutes, use hour-based cron
    const hours = Math.floor(intervalMinutes / 60);
    return `0 */${hours} * * *`; // Every N hours
  }
  return `*/${intervalMinutes} * * * *`; // Every N minutes
}

/**
 * Check price for a single product
 */
async function checkProductPrice(productId: number): Promise<void> {
  try {
    const product = await getProductById(productId);
    if (!product) {
      console.log(`Product ${productId} not found, skipping price check`);
      return;
    }

    // Scrape the product
    const scrapedData = await scrapeProduct(product.url);

    if (!scrapedData || !scrapedData.price) {
      console.log(`Failed to scrape price for product ${productId}`);
      return;
    }

    // Record the new price
    await recordPrice(productId, scrapedData.price);

    // Calculate price change
    const previousPrice = product.currentPrice || scrapedData.price;
    const priceChange = scrapedData.price - previousPrice;
    const priceChangePercent = previousPrice > 0 
      ? Math.round((priceChange / previousPrice) * 10000) // Store as percentage * 100
      : 0;

    // Calculate next check time (random 10-48h from now)
    const nextCheckTime = calculateNextCheckTime(new Date());

    // Update product with new price
    await updateProduct(productId, {
      currentPrice: scrapedData.price,
      previousPrice: previousPrice,
      priceChangePercent,
      lastCheckedAt: new Date(),
      nextCheckTime,
    });

    console.log(
      `[Price Tracker] Updated price for product ${productId}: ${previousPrice} → ${scrapedData.price} (${(priceChangePercent / 100).toFixed(2)}%)`
    );

     // Check user-specific price alerts
    const userAlerts = await getActiveAlertsForProduct(productId);
    
    for (const alert of userAlerts) {
      let shouldNotify = false;
      let alertMessage = "";

      if (alert.alertType === "percent") {
        // Alert threshold is stored as percentage * 100
        const alertThresholdPercent = alert.threshold / 100;
        const dropPercent = Math.abs(priceChangePercent / 100);
        
        if (priceChange < 0 && dropPercent >= alertThresholdPercent) {
          shouldNotify = true;
          alertMessage = `Price dropped by ${dropPercent.toFixed(2)}% (alert threshold: ${alertThresholdPercent.toFixed(2)}%)`;
        }
      } else if (alert.alertType === "price") {
        // Alert threshold is stored in cents
        if (scrapedData.price <= alert.threshold) {
          shouldNotify = true;
          alertMessage = `Price reached ${(scrapedData.price / 100).toFixed(2)} PLN (alert threshold: ${(alert.threshold / 100).toFixed(2)} PLN)`;
        }
      }

      if (shouldNotify) {
        console.log(
          `[User Price Alert] Product ${productId}: ${alertMessage}`
        );
        
        // Push notifications are sent client-side when users have the app open
        // The alert is triggered on the next price check interval
      }
    }

    // Check if price drop exceeds global alert threshold
    if (priceChange < 0) {
      const dropPercent = Math.abs(priceChangePercent / 100);
      if (dropPercent >= product.priceAlertThreshold) {
        console.log(
          `[Global Price Alert] Product ${productId} price dropped ${dropPercent.toFixed(2)}% (threshold: ${product.priceAlertThreshold}%)`
        );
        // Send notification to owner
        await notifyOwner({
          title: `Price Drop Alert: ${product.name}`,
          content: `Product "${product.name}" price dropped by ${dropPercent.toFixed(2)}% from ${(previousPrice / 100).toFixed(2)} PLN to ${(scrapedData.price / 100).toFixed(2)} PLN`,
        });
      }
    }
  } catch (error) {
    console.error(`Error checking price for product ${productId}:`, error);
  }
}

/**
 * Schedule price check for a product with random 10-48h offset from creation time
 */
export function scheduleProductPriceCheck(product: any): void {
  // Cancel existing task if any
  if (scheduledTasks.has(product.id)) {
    const existing = scheduledTasks.get(product.id);
    if (existing) {
      existing.task.stop();
      if (existing.timeout) {
        clearTimeout(existing.timeout);
      }
      scheduledTasks.delete(product.id);
    }
  }

  // Determine next check time
  let nextCheckTime = product.nextCheckTime;
  if (!nextCheckTime) {
    // If not set, calculate random offset from creation time
    nextCheckTime = calculateNextCheckTime(product.createdAt);
  }

  // Calculate delay until next check
  const now = new Date();
  const delayMs = Math.max(0, nextCheckTime.getTime() - now.getTime());
  const delayHours = (delayMs / (1000 * 60 * 60)).toFixed(1);

  // Create new cron task for recurring checks
  const cronExpression = getCronExpression(product.checkIntervalMinutes);
  const task = cron.schedule(cronExpression, async () => {
    await checkProductPrice(product.id);
  });

  // Schedule first check with delay
  const timeout = setTimeout(() => {
    checkProductPrice(product.id).catch(err => 
      console.error(`Error in first check for product ${product.id}:`, err)
    );
  }, delayMs);

  scheduledTasks.set(product.id, { productId: product.id, task, timeout });
  console.log(
    `[Price Tracker] Scheduled price check for product ${product.id} every ${product.checkIntervalMinutes} minutes (next check in ${delayHours}h)`
  );
}

/**
 * Initialize all product price checks on server startup
 */
export async function initializePriceTracking(): Promise<void> {
  try {
    console.log("[Price Tracker] Initializing price tracking for all products...");
    const products = await getAllProducts();

    for (const product of products) {
      scheduleProductPriceCheck(product);
    }

    console.log(`[Price Tracker] Initialized price tracking for ${products.length} products with random 10-48h offsets`);
  } catch (error) {
    console.error("[Price Tracker] Error initializing price tracking:", error);
  }
}

/**
 * Stop all scheduled tasks
 */
export function stopAllPriceTracking(): void {
  scheduledTasks.forEach(({ productId, task, timeout }) => {
    task.stop();
    if (timeout) {
      clearTimeout(timeout);
    }
    console.log(`[Price Tracker] Stopped price check for product ${productId}`);
  });
  scheduledTasks.clear();
}

/**
 * Update schedule for a product
 */
export function updateProductSchedule(product: any): void {
  scheduleProductPriceCheck(product);
}

/**
 * Remove schedule for a product
 */
export function removeProductSchedule(productId: number): void {
  const scheduled = scheduledTasks.get(productId);
  if (scheduled) {
    scheduled.task.stop();
    if (scheduled.timeout) {
      clearTimeout(scheduled.timeout);
    }
    scheduledTasks.delete(productId);
    console.log(`[Price Tracker] Removed price check schedule for product ${productId}`);
  }
}

/**
 * Get all scheduled tasks
 */
export function getScheduledTasks(): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];
  scheduledTasks.forEach((value) => {
    tasks.push(value);
  });
  return tasks;
}
