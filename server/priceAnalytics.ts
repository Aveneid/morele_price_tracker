import type { PriceHistory } from "../drizzle/schema";

export type PriceTrendDirection = "up" | "down" | "stable";

export interface PricePatternSummary {
  sampleCount: number;
  averagePrice: number | null;
  minimum: { price: number; recordedAt: Date } | null;
  maximum: { price: number; recordedAt: Date } | null;
  volatilityPercent: number | null;
  trendDirection: PriceTrendDirection | null;
  trendPercent: number | null;
  trendWindowDays: number;
  latestRecordedAt: Date | null;
}

const toNumber = (value: number | string | bigint): number => Number(value);

function sortHistory(history: PriceHistory[]): PriceHistory[] {
  return history
    .filter((entry) => Number.isFinite(toNumber(entry.price)))
    .slice()
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

export function calculatePricePatterns(
  history: PriceHistory[],
  currentPrice: number | null = null,
  trendWindowDays = 30,
): PricePatternSummary {
  const points = sortHistory(history);
  if (points.length === 0) {
    return { sampleCount: 0, averagePrice: null, minimum: null, maximum: null, volatilityPercent: null, trendDirection: null, trendPercent: null, trendWindowDays, latestRecordedAt: null };
  }

  const prices = points.map((entry) => toNumber(entry.price));
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + (price - averagePrice) ** 2, 0) / prices.length;
  const minimumEntry = points.reduce((a, b) => toNumber(a.price) <= toNumber(b.price) ? a : b);
  const maximumEntry = points.reduce((a, b) => toNumber(a.price) >= toNumber(b.price) ? a : b);
  const latestEntry = points[points.length - 1];
  const cutoff = new Date(latestEntry.recordedAt).getTime() - trendWindowDays * 86400000;
  const recent = points.filter((entry) => new Date(entry.recordedAt).getTime() >= cutoff);
  const startPrice = toNumber((recent[0] ?? points[0]).price);
  const endPrice = currentPrice == null ? toNumber(latestEntry.price) : toNumber(currentPrice);
  const trendPercent = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : null;
  const trendDirection: PriceTrendDirection | null = trendPercent == null ? null : trendPercent > 0.5 ? "up" : trendPercent < -0.5 ? "down" : "stable";

  return {
    sampleCount: points.length,
    averagePrice,
    minimum: { price: toNumber(minimumEntry.price), recordedAt: new Date(minimumEntry.recordedAt) },
    maximum: { price: toNumber(maximumEntry.price), recordedAt: new Date(maximumEntry.recordedAt) },
    volatilityPercent: averagePrice > 0 ? (Math.sqrt(variance) / averagePrice) * 100 : null,
    trendDirection,
    trendPercent,
    trendWindowDays,
    latestRecordedAt: new Date(latestEntry.recordedAt),
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildPriceHistoryCsv(
  product: { name: string; url: string; productCode: string | null },
  history: PriceHistory[],
): string {
  const rows = [
    ["Product", "Product code", "Product URL", "Price (PLN)", "Recorded at (UTC)"],
    ...sortHistory(history).map((entry) => [
      product.name,
      product.productCode ?? "",
      product.url,
      (toNumber(entry.price) / 100).toFixed(2),
      new Date(entry.recordedAt).toISOString(),
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function safeExportFilename(productName: string): string {
  const safeName = productName.replace(/[Łł]/g, "l").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 80);
  return `price-history-${safeName || "product"}.csv`;
}
