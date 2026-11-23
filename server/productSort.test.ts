import { describe, expect, it } from "vitest";
import { getPriceChangePercent, sortProducts } from "../client/src/lib/productSort";

// Lives in server/ because vitest only collects server tests; the code under test is client-side.
const p = (name: string, currentPrice: number | null, previousPrice: number | null, createdAt: string) => ({
  name,
  currentPrice,
  previousPrice,
  createdAt: new Date(createdAt),
});

const products = [
  p("Bravo", 90000, 100000, "2026-01-02"), // -10%
  p("alfa", 110000, 100000, "2026-01-03"), // +10%
  p("Charlie", 50000, 50000, "2026-01-01"), // 0%
  p("Delta", null, null, "2026-01-04"), // no price
  p("Echo", 200000, 250000, "2026-01-05"), // -20%
];

const names = (list: typeof products) => list.map(x => x.name);

describe("getPriceChangePercent", () => {
  it("returns percent change or null when unknown", () => {
    expect(getPriceChangePercent(products[0])).toBeCloseTo(-10);
    expect(getPriceChangePercent(products[3])).toBeNull();
  });
});

describe("sortProducts", () => {
  it("sorts by biggest drop first, unknown last", () => {
    expect(names(sortProducts(products, { key: "change", dir: "asc" }))).toEqual([
      "Echo", "Bravo", "Charlie", "alfa", "Delta",
    ]);
  });

  it("sorts by biggest rise first, unknown still last", () => {
    expect(names(sortProducts(products, { key: "change", dir: "desc" }))).toEqual([
      "alfa", "Charlie", "Bravo", "Echo", "Delta",
    ]);
  });

  it("sorts by current price both ways", () => {
    expect(names(sortProducts(products, { key: "price", dir: "asc" }))).toEqual([
      "Charlie", "Bravo", "alfa", "Echo", "Delta",
    ]);
    expect(names(sortProducts(products, { key: "price", dir: "desc" }))).toEqual([
      "Echo", "alfa", "Bravo", "Charlie", "Delta",
    ]);
  });

  it("sorts by name case-insensitively and by newest", () => {
    expect(names(sortProducts(products, { key: "name", dir: "asc" }))).toEqual([
      "alfa", "Bravo", "Charlie", "Delta", "Echo",
    ]);
    expect(names(sortProducts(products, { key: "added", dir: "desc" }))[0]).toBe("Echo");
  });

  it("does not mutate the input", () => {
    const copy = [...products];
    sortProducts(products, { key: "price", dir: "asc" });
    expect(products).toEqual(copy);
  });
});
