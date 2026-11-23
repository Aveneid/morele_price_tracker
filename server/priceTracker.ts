import cron, { type ScheduledTask } from "node-cron";
import {
  getAllProducts,
  getProductById,
  getProductsDueForCheck,
  recordPrice,
  updateProduct,
  getActiveAlertsForProduct,
} from "./db";
import { scrapeProduct } from "./scraper";
import { notifyOwner } from "./_core/notification";
import type { Product } from "../drizzle/schema";

/**
 * Price tracking scheduler.
 *
 * Every product stores its own `nextCheckTime` in the database. A single cron task
 * ticks once a minute, picks up the products that are due and checks them one by one.
 * Because the schedule lives in the database:
 *  - newly added / imported products are picked up automatically (no restart needed)
 *  - restarts do not lose or reset the schedule
 *  - a failing product is retried later instead of breaking the whole scheduler
 */

const TICK_CRON = "* * * * *";
/** Max products checked per tick, so one tick never runs for too long. */
const MAX_CHECKS_PER_TICK = 20;
/** Pause between two scrapes so we do not hammer morele.net. */
const DELAY_BETWEEN_CHECKS_MS = 3000;
/** Retry delay after a failed scrape (capped by the product's own interval). */
const RETRY_AFTER_FAILURE_MINUTES = 30;

let tickTask: ScheduledTask | null = null;
let tickRunning = false;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function intervalMinutes(product: Pick<Product, "checkIntervalMinutes">): number {
  return Math.max(1, product.checkIntervalMinutes || 60);
}

/**
 * Next check = now + interval + small random jitter (up to 10% of the interval,
 * max 15 min) so products added at the same moment drift apart over time.
 */
export function calculateNextCheckTime(
  checkIntervalMinutes: number,
  from: Date = new Date()
): Date {
  const intervalMs = Math.max(1, checkIntervalMinutes) * 60_000;
  const jitterMs = Math.random() * Math.min(intervalMs * 0.1, 15 * 60_000);
  return new Date(from.getTime() + intervalMs + jitterMs);
}

export type PriceCheckResult =
  | { success: true; previousPrice: number | null; newPrice: number }
  | { success: false; error: string };

/**
 * Scrape a product, store the price in history, update the product and fire alerts.
 * Always moves `nextCheckTime` forward, also on failure.
 */
export async function checkProductPrice(productId: number): Promise<PriceCheckResult> {
  const product = await getProductById(productId);
  if (!product) {
    return { success: false, error: `Product ${productId} not found` };
  }

  const now = new Date();
  try {
    const scrapedData = await scrapeProduct(product.url);

    if (!scrapedData || !scrapedData.price) {
      const retryMinutes = Math.min(intervalMinutes(product), RETRY_AFTER_FAILURE_MINUTES);
      await updateProduct(productId, {
        nextCheckTime: calculateNextCheckTime(retryMinutes, now),
      });
      console.warn(
        `[Price Tracker] Could not scrape price for product ${productId}, retrying in ~${retryMinutes} min`
      );
      return { success: false, error: "Could not scrape current price" };
    }

    const newPrice = scrapedData.price;
    await recordPrice(productId, newPrice);

    const previousPrice = product.currentPrice || newPrice;
    const priceChange = newPrice - previousPrice;
    const priceChangePercent =
      previousPrice > 0 ? Math.round((priceChange / previousPrice) * 10000) : 0; // percent * 100

    await updateProduct(productId, {
      currentPrice: newPrice,
      previousPrice,
      priceChangePercent,
      lastCheckedAt: now,
      nextCheckTime: calculateNextCheckTime(intervalMinutes(product), now),
    });

    console.log(
      `[Price Tracker] Product ${productId}: ${previousPrice} → ${newPrice} (${(priceChangePercent / 100).toFixed(2)}%)`
    );

    await processAlerts(product, newPrice, previousPrice, priceChange, priceChangePercent);

    return { success: true, previousPrice: product.currentPrice, newPrice };
  } catch (error: any) {
    console.error(`[Price Tracker] Error checking price for product ${productId}:`, error);
    try {
      const retryMinutes = Math.min(intervalMinutes(product), RETRY_AFTER_FAILURE_MINUTES);
      await updateProduct(productId, {
        nextCheckTime: calculateNextCheckTime(retryMinutes, now),
      });
    } catch {
      // ignore - DB problem, the product stays due and will be retried next tick
    }
    return { success: false, error: error?.message || "Unknown error" };
  }
}

async function processAlerts(
  product: Product,
  newPrice: number,
  previousPrice: number,
  priceChange: number,
  priceChangePercent: number
) {
  const userAlerts = await getActiveAlertsForProduct(product.id);

  for (const alert of userAlerts) {
    if (alert.alertType === "percent") {
      // Threshold stored as percentage * 100
      const alertThresholdPercent = alert.threshold / 100;
      const dropPercent = Math.abs(priceChangePercent / 100);
      if (priceChange < 0 && dropPercent >= alertThresholdPercent) {
        console.log(
          `[User Price Alert] Product ${product.id}: price dropped by ${dropPercent.toFixed(2)}% (threshold ${alertThresholdPercent.toFixed(2)}%)`
        );
      }
    } else if (alert.alertType === "price") {
      // Threshold stored in cents
      if (newPrice <= alert.threshold) {
        console.log(
          `[User Price Alert] Product ${product.id}: price reached ${(newPrice / 100).toFixed(2)} PLN (threshold ${(alert.threshold / 100).toFixed(2)} PLN)`
        );
      }
    }
    // Push notifications are shown client-side when users have the app open.
  }

  if (priceChange < 0) {
    const dropPercent = Math.abs(priceChangePercent / 100);
    if (dropPercent >= product.priceAlertThreshold) {
      console.log(
        `[Global Price Alert] Product ${product.id} price dropped ${dropPercent.toFixed(2)}% (threshold ${product.priceAlertThreshold}%)`
      );
      try {
        await notifyOwner({
          title: `Price Drop Alert: ${product.name}`,
          content: `Product "${product.name}" price dropped by ${dropPercent.toFixed(2)}% from ${(previousPrice / 100).toFixed(2)} PLN to ${(newPrice / 100).toFixed(2)} PLN`,
        });
      } catch (error: any) {
        // Owner notifications are optional (need the forge API); never break the check.
        console.warn(`[Global Price Alert] Could not notify owner: ${error?.message || error}`);
      }
    }
  }
}

/**
 * Check every product that is due. Safe to call concurrently - overlapping calls are skipped.
 */
export async function runDuePriceChecks(): Promise<{ checked: number; failed: number }> {
  if (tickRunning) return { checked: 0, failed: 0 };
  tickRunning = true;

  let checked = 0;
  let failed = 0;
  try {
    const due = await getProductsDueForCheck(new Date(), MAX_CHECKS_PER_TICK);
    for (let index = 0; index < due.length; index++) {
      const product = due[index];
      if (index > 0) await sleep(DELAY_BETWEEN_CHECKS_MS);
      const result = await checkProductPrice(product.id);
      checked++;
      if (!result.success) failed++;
    }
    if (due.length > 0) {
      console.log(`[Price Tracker] Tick finished: ${checked} checked, ${failed} failed`);
    }
  } catch (error) {
    console.error("[Price Tracker] Error while running due price checks:", error);
  } finally {
    tickRunning = false;
  }
  return { checked, failed };
}

/**
 * Check all products right now, regardless of their schedule (used by the price_check job).
 */
export async function checkAllProductsNow(): Promise<{ checked: number; failed: number }> {
  const all = await getAllProducts();
  let failed = 0;
  for (let index = 0; index < all.length; index++) {
    const product = all[index];
    if (index > 0) await sleep(DELAY_BETWEEN_CHECKS_MS);
    const result = await checkProductPrice(product.id);
    if (!result.success) failed++;
  }
  return { checked: all.length, failed };
}

/**
 * Repair schedules left by older versions: products without a nextCheckTime, or with one
 * far in the future (the old 10-48h random offset), get one based on their interval.
 */
async function normalizeSchedules(): Promise<void> {
  const now = Date.now();
  const all = await getAllProducts();
  let fixed = 0;

  for (const product of all) {
    const interval = intervalMinutes(product);
    const maxAllowed = now + interval * 60_000 * 1.2 + 60_000;
    const next = product.nextCheckTime ? new Date(product.nextCheckTime).getTime() : null;

    if (next === null || next > maxAllowed) {
      // Never checked -> due right away; otherwise one interval after the last check.
      const nextCheckTime = product.lastCheckedAt
        ? new Date(new Date(product.lastCheckedAt).getTime() + interval * 60_000)
        : new Date(now);
      await updateProduct(product.id, { nextCheckTime });
      fixed++;
    }
  }

  console.log(
    `[Price Tracker] ${all.length} products tracked` +
      (fixed > 0 ? `, repaired schedule of ${fixed}` : "")
  );
}

/**
 * Start the price tracking scheduler. Call once, after the database is initialized.
 */
export async function initializePriceTracking(): Promise<void> {
  console.log("[Price Tracker] Initializing price tracking...");
  try {
    await normalizeSchedules();
  } catch (error) {
    console.error("[Price Tracker] Could not normalize product schedules:", error);
  }

  if (tickTask) {
    await tickTask.stop();
  }
  tickTask = cron.schedule(TICK_CRON, () => runDuePriceChecks(), {
    name: "price-tracker-tick",
    noOverlap: true,
  });

  // Do not wait a full minute for products that are already overdue.
  setTimeout(() => void runDuePriceChecks(), 5_000);

  console.log("[Price Tracker] Scheduler started (checking due products every minute)");
}

export async function stopAllPriceTracking(): Promise<void> {
  if (tickTask) {
    await tickTask.stop();
    tickTask = null;
  }
}
