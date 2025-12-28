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

    // Wait for content to load - try multiple strategies
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

      // Get price from multiple possible locations
      let priceText = null;

      // Strategy 1: Try primary selector first
      const priceElement = document.getElementById("product_price");
      if (priceElement) {
        const text = priceElement.textContent?.trim();
        if (text && text.length > 0) {
          priceText = text;
        }
      }

      // Strategy 2: Look for price in common price containers
      if (!priceText) {
        const selectors = [
          '[class*="price"]',
          '[class*="Price"]',
          '[data-price]',
          '.product-price',
          '.current-price',
          '[class*="cost"]',
          '[class*="Cost"]',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            const text = el.textContent?.trim();
            if (text && /\d+[.,]\d+\s*zł/.test(text)) {
              priceText = text;
            }
          });
          if (priceText) break;
        }
      }

      // Strategy 3: Search for price pattern in all visible text
      if (!priceText) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent?.trim() || "";
          if (/^\d+[.,]\d+\s*zł$/.test(text)) {
            priceText = text;
            break;
          }
        }
      }

      // Strategy 4: Look for any span/div with just price
      if (!priceText) {
        const allElements = document.querySelectorAll("span, div, p");
        allElements.forEach((el) => {
          const text = el.textContent?.trim() || "";
          if (
            /^\d+[.,]\d+\s*zł$/.test(text) &&
            text.length < 20 &&
            el.children.length === 0
          ) {
            priceText = text;
          }
        });
      }

      // Get product code from URL
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
 * Only checks if the domain is morele.net
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
 * Build a morele.net product URL from product code
 */
export function buildMoreleUrl(productCode: string): string {
  return `https://morele.net/search/${productCode}/`;
}
