import puppeteer, { Browser, Page } from "puppeteer";

let browser: Browser | null = null;

/**
 * Get or create a Puppeteer browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
  }
  return browser;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Extract product code from URL
 * morele.net URLs have format: /product-name-productCode/ or /product-name-productCode
 */
export function extractProductCode(url: string): string | null {
  const match = url.match(/(\d+)\/?$/);
  return match ? match[1] : null;
}

/**
 * Parse price string from morele.net format (e.g., "549 zł" or "549,99 zł" or "1559 zł max")
 * Returns price in cents to avoid floating point issues
 */
export function parsePrice(priceText: string): number | null {
  if (!priceText) return null;

  // Remove currency symbol, "max" text, "od" text, and extra whitespace
  const cleaned = priceText
    .replace(/\b(max|od|od\s+\d+[.,]\d+\s*zł)\b/gi, "")
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!cleaned) return null;

  // Replace comma with dot for decimal point
  const normalized = cleaned.replace(",", ".");

  const price = parseFloat(normalized);
  // Reject prices that are too small (likely installment rates) or too large
  if (isNaN(price) || price < 10 || price > 10000000) return null;

  // Convert to cents (multiply by 100 and round)
  return Math.round(price * 100);
}

/**
 * Scrape product information from morele.net
 * Returns: { name, price (in cents), url, productCode }
 */
export async function scrapeProduct(url: string): Promise<{
  name: string | null;
  price: number | null;
  productCode: string | null;
} | null> {
  let page: Page | null = null;

  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

    // Set viewport and user agent to avoid detection
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to the product page with timeout
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract product information
    const result = await page.evaluate(() => {
      // Get product name from h1 or title
      let name = null;
      const h1 = document.querySelector("h1");
      if (h1) {
        name = h1.textContent?.trim() || null;
      }
      if (!name) {
        const titleTag = document.querySelector("title");
        if (titleTag) {
          name = titleTag.textContent?.split(" - ")[0]?.trim() || null;
        }
      }

      // Collect all potential prices with their context
      const priceMatches: Array<{ text: string; price: number; element: HTMLElement }> = [];

      // Strategy 1: Look for the main price display (usually contains "max" or is in a prominent location)
      const allElements = document.querySelectorAll("span, div, p, strong, b");
      for (const el of Array.from(allElements)) {
        const text = el.textContent?.trim() || "";
        
        // Look for price patterns
        const priceMatch = text.match(/(\d+[.,]\d+)\s*zł\s*(max)?/);
        if (priceMatch) {
          const priceStr = priceMatch[1];
          const numPrice = parseFloat(priceStr.replace(",", "."));
          
          // Skip very small prices (installment rates, services)
          if (numPrice >= 10) {
            priceMatches.push({
              text: text,
              price: numPrice,
              element: el as HTMLElement
            });
          }
        }
      }

      // Sort by price (descending) to prefer the main product price
      priceMatches.sort((a, b) => b.price - a.price);

      let priceText = null;
      if (priceMatches.length > 0) {
        // Take the highest price that's not marked as "od" (from)
        for (const match of priceMatches) {
          if (!match.text.toLowerCase().includes("od")) {
            priceText = match.text;
            break;
          }
        }
        // If all prices have "od", take the first (highest) one
        if (!priceText && priceMatches.length > 0) {
          priceText = priceMatches[0].text;
        }
      }

      // Get product code from URL
      const url = window.location.href;
      const codeMatch = url.match(/(\d+)\/?$/);
      const productCode = codeMatch ? codeMatch[1] : null;

      return { name, priceText, productCode };
    });

    if (!result.priceText) {
      console.warn(`[Scraper] No price found for ${url}`);
      return null;
    }

    // Parse the price
    const price = parsePrice(result.priceText);
    if (price === null) {
      console.warn(
        `[Scraper] Failed to parse price "${result.priceText}" for ${url}`
      );
      return null;
    }

    // Extract product code from URL as fallback
    const productCode = result.productCode || extractProductCode(url);

    console.log(`[Scraper] Successfully scraped: ${result.name} - ${(price / 100).toFixed(2)} PLN (from: "${result.priceText}")`);

    return {
      name: result.name,
      price,
      productCode,
    };
  } catch (error) {
    console.error(`[Scraper] Error scraping ${url}:`, error);
    return null;
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Validate if URL is a valid morele.net URL
 */
export function isValidMoreleUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes("morele.net");
  } catch {
    return false;
  }
}

/**
 * Build a morele.net URL from product code
 */
export function buildMoreleUrl(productCode: string): string {
  return `https://www.morele.net/search/?q=${productCode}`;
}
