import axios from "axios";
import * as cheerio from "cheerio";

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
 * Scrape product information from morele.net using HTTP + DOM parsing
 * Returns: { name, price (in cents), url, productCode, imageUrl, category }
 */
export async function scrapeProduct(url: string, userEmail?: string): Promise<{
  name: string | null;
  price: number | null;
  productCode: string | null;
  imageUrl?: string | null;
  category?: string | null;
} | null> {
  const isDebugUser = userEmail === 'sigarencja@gmail.com';

  try {
    // Fetch the page with proper headers to avoid blocking
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract product name from h1 or title
    let name = null;
    const h1 = $("h1").first().text().trim();
    if (h1) {
      name = h1;
    }
    if (!name) {
      const titleTag = $("title").text().trim();
      if (titleTag) {
        name = titleTag.split(" - ")[0]?.trim() || null;
      }
    }

    // Primary strategy: Get price from #product_price div data-price attribute
    let priceText = null;
    const productPriceDiv = $("#product_price");
    if (productPriceDiv.length > 0) {
      const dataPrice = productPriceDiv.attr("data-price");
      if (dataPrice) {
        // data-price is typically in format like "415.08" or "415,08"
        priceText = dataPrice.replace(".", ",") + " zł";
      }
    }

    // Fallback: Look for price in the product_price div text content
    if (!priceText) {
      const priceContent = productPriceDiv.text().trim();
      if (priceContent) {
        priceText = priceContent;
      }
    }

    // Fallback 2: Collect all potential prices with their context if data-price not found
    if (!priceText) {
      const priceMatches: Array<{ text: string; price: number }> = [];

      // Look for the main price display (usually contains "max" or is in a prominent location)
      $("span, div, p, strong, b").each((_, el) => {
        const text = $(el).text().trim();

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
            });
          }
        }
      });

      // Sort by price (descending) to prefer the main product price
      priceMatches.sort((a, b) => b.price - a.price);

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
    }

    if (!priceText) {
      console.warn(`[Scraper] No price found for ${url}`);

      if (isDebugUser) {
        console.warn("[Scraper Debug] No Price Found:");
        console.warn("URL:", url);
        console.warn("Page Title:", name);
        console.warn("Timestamp:", new Date().toISOString());
      }

      return null;
    }

    // Parse the price
    const price = parsePrice(priceText);
    if (price === null) {
      console.warn(
        `[Scraper] Failed to parse price "${priceText}" for ${url}`
      );

      if (isDebugUser) {
        console.warn("[Scraper Debug] Price Parsing Failed:");
        console.warn("Raw Price Text:", priceText);
        console.warn("URL:", url);
        console.warn("Timestamp:", new Date().toISOString());
      }

      return null;
    }

    // Get product code from URL
    const productCode = extractProductCode(url);

    // Get product image
    let imageUrl = null;
    const imgSelectors = [
      'img[alt*="Zdjęcie produktu"]',
      'img[alt*="produktu"]',
      ".product-image img",
      '[class*="image"] img',
      "picture img",
      'img[src*="morele"]',
    ];

    for (const selector of imgSelectors) {
      const imgEl = $(selector).first();
      if (imgEl.length > 0) {
        const src = imgEl.attr("src");
        if (src && src.length > 0) {
          imageUrl = src;
          break;
        }
      }
    }

    // Get product category from breadcrumb - find main category without filters
    let category = null;
    const breadcrumbs = $(".breadcrumb a");

    for (let i = breadcrumbs.length - 1; i >= 0; i--) {
      const href = breadcrumbs.eq(i).attr("href") || "";
      const text = breadcrumbs.eq(i).text().trim();

      if (href.includes("/kategoria/") && !href.includes(",,")) {
        category = text || null;
        break;
      }
    }

    if (!category && breadcrumbs.length > 0) {
      for (let i = breadcrumbs.length - 1; i >= 0; i--) {
        const href = breadcrumbs.eq(i).attr("href") || "";
        if (href.includes("/kategoria/")) {
          category = breadcrumbs.eq(i).text().trim() || null;
          break;
        }
      }
    }

    const priceInPLN = (price / 100).toFixed(2);
    console.log(
      `[Scraper] Successfully scraped: ${name} - ${priceInPLN} PLN (from: "${priceText}")`
    );

    if (isDebugUser) {
      console.log("[Scraper Debug] Scrape Success:");
      console.log("Product Name:", name);
      console.log("Price (PLN):", priceInPLN);
      console.log("Price (cents):", price);
      console.log("Product Code:", productCode);
      console.log("Image URL:", imageUrl);
      console.log("Category:", category);
      console.log("URL:", url);
      console.log("Timestamp:", new Date().toISOString());
    }

    return {
      name,
      price,
      productCode,
      imageUrl,
      category,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";

    console.error(`[Scraper] Error scraping ${url}:`, error);

    // Detailed logging for debug user
    if (isDebugUser) {
      console.error("[Scraper Debug] Detailed Error Information:");
      console.error("URL:", url);
      console.error("Error Message:", errorMessage);
      console.error("Error Stack:", errorStack);
      console.error("Timestamp:", new Date().toISOString());
    }

    return null;
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
