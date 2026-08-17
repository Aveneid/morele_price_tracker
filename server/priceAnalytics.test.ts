import { describe, expect, it } from "vitest";
import type { PriceHistory } from "../drizzle/schema";
import {
  buildPriceHistoryCsv,
  calculatePricePatterns,
  safeExportFilename,
} from "./priceAnalytics";

const history: PriceHistory[] = [
  { id: 1, productId: 7, price: 10000, recordedAt: new Date("2026-08-15T10:00:00.000Z") },
  { id: 2, productId: 7, price: 8500, recordedAt: new Date("2026-08-16T10:00:00.000Z") },
  { id: 3, productId: 7, price: 9000, recordedAt: new Date("2026-08-17T10:00:00.000Z") },
];

describe("price analytics", () => {
  it("calculates average, minimum, maximum, volatility, and trend from stored history", () => {
    const result = calculatePricePatterns(history, 8000);

    expect(result.sampleCount).toBe(3);
    expect(result.averagePrice).toBeCloseTo(9166.6667, 3);
    expect(result.minimum?.price).toBe(8500);
    expect(result.maximum?.price).toBe(10000);
    expect(result.volatilityPercent).toBeGreaterThan(0);
    expect(result.trendDirection).toBe("down");
    expect(result.trendPercent).toBeCloseTo(-20, 5);
  });

  it("handles empty history without producing misleading values", () => {
    const result = calculatePricePatterns([]);

    expect(result.sampleCount).toBe(0);
    expect(result.averagePrice).toBeNull();
    expect(result.minimum).toBeNull();
    expect(result.maximum).toBeNull();
    expect(result.volatilityPercent).toBeNull();
    expect(result.trendDirection).toBeNull();
  });

  it("exports history in chronological CSV order with PLN prices", () => {
    const csv = buildPriceHistoryCsv(
      { name: "Example, product", productCode: "ABC-1", url: "https://morele.net/item" },
      [history[2], history[0]],
    );

    expect(csv.split("\n")).toEqual([
      "Product,Product code,Product URL,Price (PLN),Recorded at (UTC)",
      '"Example, product",ABC-1,https://morele.net/item,100.00,2026-08-15T10:00:00.000Z',
      '"Example, product",ABC-1,https://morele.net/item,90.00,2026-08-17T10:00:00.000Z',
    ]);
  });

  it("creates a filesystem-safe export filename", () => {
    expect(safeExportFilename("Ładowarka / USB 65W!"))
      .toBe("price-history-ladowarka-usb-65w.csv");
  });
});
