import cron from "node-cron";
import { getAllProducts, getProductById, recordPrice, updateProduct } from "./db";
import { scrapeProduct } from "./scraper";
import { notifyOwner } from "./_core/notification";
import { broadcastPriceAlert } from "./notificationServer";

/**
 * Price tracking scheduler that checks product prices on a configurable schedule
 */

interface ScheduledTask {
  productId: number;
  task: any; // cron.ScheduledTask
}

const scheduledTasks = new Map<number, ScheduledTask>();

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

    // Update product with new price
    await updateProduct(productId, {
      currentPrice: scrapedData.price,
      previousPrice: previousPrice,
      priceChangePercent,
      lastCheckedAt: new Date(),
    });

    console.log(
      `[Price Tracker] Updated price for product ${productId}: ${previousPrice} → ${scrapedData.price} (${(priceChangePercent / 100).toFixed(2)}%)`
    );

    // Check if price drop exceeds alert threshold
    if (priceChange < 0) {
      const dropPercent = Math.abs(priceChangePercent / 100);
      if (dropPercent >= product.priceAlertThreshold) {
        console.log(
          `[Price Alert] Product ${productId} price dropped ${dropPercent.toFixed(2)}% (threshold: ${product.priceAlertThreshold}%)`
        );

        // Broadcast to all connected WebSocket clients
        broadcastPriceAlert({
          productId,
          productName: product.name,
          oldPrice: previousPrice,
          newPrice: scrapedData.price,
          dropPercent,
        });

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
 * Schedule price check for a product
 */
export function scheduleProductPriceCheck(product: any): void {
  // Cancel existing task if any
  if (scheduledTasks.has(product.id)) {
    const existing = scheduledTasks.get(product.id);
    if (existing) {
      existing.task.stop();
      scheduledTasks.delete(product.id);
    }
  }

  // Create new cron task
  const cronExpression = getCronExpression(product.checkIntervalMinutes);
  const task = cron.schedule(cronExpression, async () => {
    await checkProductPrice(product.id);
  });

  scheduledTasks.set(product.id, { productId: product.id, task });
  console.log(
    `[Price Tracker] Scheduled price check for product ${product.id} every ${product.checkIntervalMinutes} minutes`
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

    console.log(`[Price Tracker] Initialized price tracking for ${products.length} products`);
  } catch (error) {
    console.error("[Price Tracker] Error initializing price tracking:", error);
  }
}

/**
 * Stop all scheduled tasks
 */
export function stopAllPriceTracking(): void {
  scheduledTasks.forEach(({ productId, task }) => {
    task.stop();
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
