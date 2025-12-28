import puppeteer, { Browser, Page } from "puppeteer";

let browser: Browser | null = null;

/**
 * Get or create a Puppeteer browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
 * morele.net URLs typically have format: /product-name-productCode.html
 */
export function extractProductCode(url: string): string | null {
  const match = url.match(/(\d+)\.html/);
  return match ? match[1] : null;
}

/**
 * Parse price string from morele.net format (e.g., "549 zł" or "549,99 zł")
 * Returns price in cents to avoid floating point issues
 */
export function parsePrice(priceText: string): number | null {
  if (!priceText) return null;

  // Remove currency symbol and whitespace
  const cleaned = priceText.replace(/[^\d,.-]/g, "").trim();

  // Replace comma with dot for decimal point
  const normalized = cleaned.replace(",", ".");

  const price = parseFloat(normalized);
  if (isNaN(price)) return null;

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

    // Wait for the price element to be present
    await page.waitForSelector("#product_price", { timeout: 10000 });

    // Extract product information
    const result = await page.evaluate(() => {
      // Get product name
      const nameElement = document.querySelector("h1");
      const name = nameElement?.textContent?.trim() || null;

      // Get price from the specific div
      const priceElement = document.getElementById("product_price");
      const priceText = priceElement?.textContent?.trim() || null;

      // Get product code from URL or meta tag
      const url = window.location.href;
      const codeMatch = url.match(/(\d+)\.html/);
      const productCode = codeMatch ? codeMatch[1] : null;

      return { name, priceText, productCode };
    });

    if (!result.priceText) {
      console.warn(`[Scraper] No price found for ${url}`);
      return null;
    }

    const price = parsePrice(result.priceText);

    return {
      name: result.name,
      price,
      productCode: result.productCode,
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
 * Validate if a URL is a valid morele.net product URL
 */
export function isValidMoreleUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes("morele.net") &&
      (urlObj.pathname.endsWith(".html") || urlObj.pathname.includes("/"))
    );
  } catch {
    return false;
  }
}

/**
 * Build a morele.net product URL from product code
 */
export function buildMoreleUrl(productCode: string): string {
  return `https://morele.net/search/${productCode}/`;
}
