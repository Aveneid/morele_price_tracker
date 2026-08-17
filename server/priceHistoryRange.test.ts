import { describe, expect, it } from "vitest";
import {
  filterPriceHistoryByRange,
  getPriceHistoryRange,
  getPriceHistoryRangeLabel,
  getPriceHistoryTrendWindowDays,
} from "../client/src/lib/priceHistoryRange";

describe("price history range helpers", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");

  it("returns an empty input for all stored history", () => {
    expect(getPriceHistoryRange("all", "", "", now)).toEqual({});
    expect(getPriceHistoryRangeLabel("all", "", "")).toBe("All stored history");
  });

  it("creates a bounded preset range", () => {
    expect(getPriceHistoryRange("30d", "", "", now)).toEqual({
      startDate: "2026-07-18",
      endDate: "2026-08-17",
    });
    expect(getPriceHistoryTrendWindowDays("30d", "", "")).toBe(30);
  });

  it("preserves custom dates and calculates the custom trend window", () => {
    expect(getPriceHistoryRange("custom", "2026-01-07", "2026-08-17", now)).toEqual({
      startDate: "2026-01-07",
      endDate: "2026-08-17",
    });
    expect(getPriceHistoryTrendWindowDays("custom", "2026-01-07", "2026-08-17")).toBe(223);
    expect(getPriceHistoryRangeLabel("custom", "2026-01-07", "2026-08-17")).toBe("2026-01-07 to 2026-08-17");
  });

  it("labels partial custom ranges clearly", () => {
    expect(getPriceHistoryRangeLabel("custom", "2026-01-07", "")).toBe("From 2026-01-07");
    expect(getPriceHistoryRangeLabel("custom", "", "2026-08-17")).toBe("Until 2026-08-17");
  });

  it("keeps inclusive dates and returns an empty array outside the stored range", () => {
    const entries = [
      { recordedAt: "2026-01-07T13:19:24.000Z", price: 100 },
      { recordedAt: "2026-08-17T18:33:30.000Z", price: 200 },
    ];

    expect(filterPriceHistoryByRange(entries, { startDate: "2026-01-07", endDate: "2026-08-17" })).toHaveLength(2);
    expect(filterPriceHistoryByRange(entries, { startDate: "2025-01-01", endDate: "2025-01-31" })).toEqual([]);
  });
});
