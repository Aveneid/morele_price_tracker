import { describe, expect, it } from "vitest";
import { isMoreleCategoryUrl, parseCategoryPage } from "./categoryScraper";

const card = (id: string, slug: string, name: string, price: string, img = true) => `
  <article role="listitem" data-tracker-id="${id}">
    <div class="product-card" data-testid="product-card">
      <div class="product-card__media">
        <a href="https://www.morele.net/${slug}-${id}/" class="product-card__media-link">
          ${img ? `<img src="https://images.morele.net/i256/${id}_i256.jpg" alt="${name}" class="product-card__img">` : ""}
        </a>
      </div>
      <h3 class="product-card__name-heading">
        <a href="/${slug}-${id}/" class="product-card__name-link" data-testid="product-link"> ${name} </a>
      </h3>
      <div class="product-card__price">
        ${price ? `<div class="product-card__price-current">${price}</div>` : ""}
        rata od 39,09 zł
      </div>
    </div>
  </article>`;

const PAGE_URL = "https://www.morele.net/kategoria/dyski-ssd-518/,,,,,,,sd,1/1/";

const html = `
<html><body>
  <h1> Dyski SSD M.2 PCI-e </h1>
  <div class="product-list">
    ${card("12848183", "dysk-ssd-lexar-nm790-1tb", "Dysk SSD Lexar NM790 1TB", "899 zł")}
    ${card("9999001", "dysk-ssd-samsung-990-pro-2tb", "Dysk SSD Samsung 990 PRO 2TB", "1 299,99 zł", false)}
    ${card("9999002", "dysk-niedostepny", "Dysk niedostępny", "")}
  </div>
  <div class="pagination dynamic" data-count="20"></div>
</body></html>`;

describe("isMoreleCategoryUrl", () => {
  it("recognises category links with filters", () => {
    expect(
      isMoreleCategoryUrl(
        "https://www.morele.net/kategoria/dyski-ssd-518/,,,,,,,sd,1,,,,15252O!1149,15255O!1151.!13097/1/"
      )
    ).toBe(true);
  });

  it("rejects product links, other sites and garbage", () => {
    expect(isMoreleCategoryUrl("https://www.morele.net/dysk-ssd-lexar-nm790-1tb-12848183/")).toBe(false);
    expect(isMoreleCategoryUrl("https://example.com/kategoria/x/")).toBe(false);
    expect(isMoreleCategoryUrl("12848183")).toBe(false);
  });
});

describe("parseCategoryPage", () => {
  const page = parseCategoryPage(html, PAGE_URL);

  it("reads the category name and page count", () => {
    expect(page.categoryName).toBe("Dyski SSD M.2 PCI-e");
    expect(page.pageCount).toBe(20);
  });

  it("reads every product card", () => {
    expect(page.products).toHaveLength(3);
    expect(page.products[0]).toEqual({
      name: "Dysk SSD Lexar NM790 1TB",
      url: "https://www.morele.net/dysk-ssd-lexar-nm790-1tb-12848183/",
      productCode: "12848183",
      price: 89900,
      imageUrl: "https://images.morele.net/i256/12848183_i256.jpg",
    });
  });

  it("parses prices with thousands separators and handles missing data", () => {
    expect(page.products[1].price).toBe(129999);
    expect(page.products[1].imageUrl).toBeNull();
    expect(page.products[2].price).toBeNull();
  });
});
