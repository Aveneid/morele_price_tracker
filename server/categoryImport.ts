import { createProduct, getAllProducts, recordPrice } from "./db";
import { scrapeCategoryPage } from "./categoryScraper";

const DEFAULT_CHECK_INTERVAL_MINUTES = 60;

export type CategoryImportResult = {
  categoryName: string | null;
  found: number;
  added: number;
  alreadyTracked: number;
  /** Products shown without a price (e.g. unavailable) - not added. */
  skippedNoPrice: number;
  failed: number;
  pageCount: number | null;
};

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Add every product listed on a morele.net category page (with the filters, sorting and
 * page number from the URL) to tracking. Data comes straight from the listing, so only
 * one request is made to morele.net regardless of how many products are on the page.
 */
export async function importCategoryPage(url: string): Promise<CategoryImportResult> {
  const page = await scrapeCategoryPage(url);

  if (page.products.length === 0) {
    throw new Error(
      "No products found on this category page. Check the link, or morele.net may have changed its page layout."
    );
  }

  const existing = await getAllProducts();
  const knownCodes = new Set(existing.map(p => p.productCode).filter(Boolean) as string[]);
  const knownUrls = new Set(existing.map(p => normalizeUrl(p.url)));

  const result: CategoryImportResult = {
    categoryName: page.categoryName,
    found: page.products.length,
    added: 0,
    alreadyTracked: 0,
    skippedNoPrice: 0,
    failed: 0,
    pageCount: page.pageCount,
  };

  const toAdd = page.products.filter(item => {
    if (
      (item.productCode && knownCodes.has(item.productCode)) ||
      knownUrls.has(normalizeUrl(item.url))
    ) {
      result.alreadyTracked++;
      return false;
    }
    if (!item.price) {
      result.skippedNoPrice++;
      return false;
    }
    return true;
  });

  const now = Date.now();
  const intervalMs = DEFAULT_CHECK_INTERVAL_MINUTES * 60_000;

  for (let i = 0; i < toAdd.length; i++) {
    const item = toAdd[i];
    try {
      // Spread the first scheduled checks evenly over one interval, so a big import
      // does not cause a burst of requests to morele.net an hour from now.
      const nextCheckTime = new Date(now + intervalMs + Math.floor((i / toAdd.length) * intervalMs));

      const product = await createProduct({
        name: item.name,
        url: item.url,
        productCode: item.productCode || "",
        category: page.categoryName,
        imageUrl: item.imageUrl,
        currentPrice: item.price,
        previousPrice: item.price,
        priceChangePercent: 0,
        checkIntervalMinutes: DEFAULT_CHECK_INTERVAL_MINUTES,
        priceAlertThreshold: 10,
        lastCheckedAt: new Date(now),
        nextCheckTime,
      });

      if (!product) {
        result.failed++;
        continue;
      }
      if (item.price) await recordPrice(product.id, item.price);

      if (item.productCode) knownCodes.add(item.productCode);
      knownUrls.add(normalizeUrl(item.url));
      result.added++;
    } catch (error) {
      console.error(`[Category Import] Failed to add ${item.url}:`, error);
      result.failed++;
    }
  }

  console.log(
    `[Category Import] ${url}: found ${result.found}, added ${result.added}, already tracked ${result.alreadyTracked}, no price ${result.skippedNoPrice}, failed ${result.failed}`
  );
  return result;
}

export function describeImport(result: CategoryImportResult): string {
  const parts = [`Added ${result.added} of ${result.found} products`];
  if (result.categoryName) parts[0] += ` from "${result.categoryName}"`;
  if (result.alreadyTracked) parts.push(`${result.alreadyTracked} already tracked`);
  if (result.skippedNoPrice) parts.push(`${result.skippedNoPrice} without price skipped`);
  if (result.failed) parts.push(`${result.failed} failed`);
  return parts.join(", ");
}
