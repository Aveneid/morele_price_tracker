import * as cheerio from "cheerio";
import { extractProductCode, parsePrice } from "./scraper";

/**
 * Scraping of morele.net category (listing) pages, e.g.
 * https://www.morele.net/kategoria/dyski-ssd-518/,,,,,,,sd,1,,,,15252O!1149/1/
 *
 * Filters, sorting and the page number are all part of the URL, so whatever the
 * user sees in the browser is exactly what gets imported.
 */

export type CategoryListingProduct = {
  name: string;
  url: string;
  productCode: string | null;
  /** Price in cents, null when the listing shows no price (e.g. unavailable). */
  price: number | null;
  imageUrl: string | null;
};

export type CategoryListingPage = {
  categoryName: string | null;
  products: CategoryListingProduct[];
  /** Total number of result pages for this filter set, when the page shows it. */
  pageCount: number | null;
};

export function isMoreleCategoryUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.hostname.endsWith("morele.net") && url.pathname.startsWith("/kategoria/");
  } catch {
    return false;
  }
}

/** Parse the HTML of a category page. Exported separately so it can be unit tested. */
export function parseCategoryPage(html: string, pageUrl: string): CategoryListingPage {
  const $ = cheerio.load(html);

  const categoryName = $("h1").first().text().replace(/\s+/g, " ").trim() || null;

  let cards = $(".product-list > article");
  if (cards.length === 0) cards = $('[data-testid="product-card"]');

  const products: CategoryListingProduct[] = [];
  const seen = new Set<string>();

  cards.each((_, el) => {
    const card = $(el);
    const link = card.find("a.product-card__name-link, a[data-testid='product-link']").first();
    const href = link.attr("href") || card.find("a.product-card__media-link").first().attr("href");
    if (!href) return;

    let url: string;
    try {
      url = new URL(href, pageUrl).toString();
    } catch {
      return;
    }
    if (seen.has(url)) return;
    seen.add(url);

    const name =
      link.text().replace(/\s+/g, " ").trim() ||
      card.find("img.product-card__img").attr("alt")?.trim() ||
      "";
    if (!name) return;

    const productCode =
      card.attr("data-tracker-id") ||
      card.find("[data-product-id]").first().attr("data-product-id") ||
      extractProductCode(url);

    const priceText = card.find(".product-card__price-current").first().text().trim();
    const price = priceText ? parsePrice(priceText) : null;

    const img = card.find("img.product-card__img, .product-card__media img").first();
    const imageUrl = img.attr("src") || img.attr("data-src") || null;

    products.push({ name, url, productCode: productCode || null, price, imageUrl });
  });

  const pageCountAttr = $(".pagination").first().attr("data-count");
  const pageCount = pageCountAttr ? Number.parseInt(pageCountAttr, 10) || null : null;

  return { categoryName, products, pageCount };
}

export async function scrapeCategoryPage(url: string): Promise<CategoryListingPage> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.5",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return parseCategoryPage(await response.text(), response.url || url);
  } finally {
    clearTimeout(timeoutId);
  }
}
