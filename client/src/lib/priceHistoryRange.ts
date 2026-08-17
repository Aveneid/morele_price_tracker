export type PriceHistoryRangePreset = "all" | "7d" | "30d" | "90d" | "1y" | "custom";

export interface PriceHistoryRangeInput {
  startDate?: string;
  endDate?: string;
}

export interface PriceHistoryEntryWithDate {
  recordedAt: Date | string | number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function filterPriceHistoryByRange<T extends PriceHistoryEntryWithDate>(
  entries: T[],
  range: PriceHistoryRangeInput,
): T[] {
  const startTimestamp = range.startDate
    ? Date.parse(`${range.startDate}T00:00:00.000Z`)
    : Number.NEGATIVE_INFINITY;
  const endTimestamp = range.endDate
    ? Date.parse(`${range.endDate}T00:00:00.000Z`) + DAY_MS
    : Number.POSITIVE_INFINITY;

  return entries.filter((entry) => {
    const timestamp = new Date(entry.recordedAt).getTime();
    return timestamp >= startTimestamp && timestamp < endTimestamp;
  });
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPriceHistoryRange(
  preset: PriceHistoryRangePreset,
  customStartDate: string,
  customEndDate: string,
  now = new Date(),
): PriceHistoryRangeInput {
  if (preset === "custom") {
    return {
      startDate: customStartDate || undefined,
      endDate: customEndDate || undefined,
    };
  }

  const daysByPreset: Record<Exclude<PriceHistoryRangePreset, "all" | "custom">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  const days = preset === "all" ? undefined : daysByPreset[preset];
  if (!days) return {};

  return {
    startDate: toDateInputValue(new Date(now.getTime() - days * DAY_MS)),
    endDate: toDateInputValue(now),
  };
}

export function getPriceHistoryTrendWindowDays(
  preset: PriceHistoryRangePreset,
  customStartDate: string,
  customEndDate: string,
): number {
  if (preset === "all") return 30;
  if (preset === "custom" && customStartDate && customEndDate) {
    const start = Date.parse(`${customStartDate}T00:00:00.000Z`);
    const end = Date.parse(`${customEndDate}T00:00:00.000Z`);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return Math.max(1, Math.ceil((end - start) / DAY_MS) + 1);
    }
    return 30;
  }
  return { "7d": 7, "30d": 30, "90d": 90, "1y": 365, custom: 30, all: 30 }[preset];
}

export function getPriceHistoryRangeLabel(
  preset: PriceHistoryRangePreset,
  customStartDate: string,
  customEndDate: string,
): string {
  if (preset === "all") return "All stored history";
  if (preset === "custom") {
    if (customStartDate && customEndDate) return `${customStartDate} to ${customEndDate}`;
    if (customStartDate) return `From ${customStartDate}`;
    if (customEndDate) return `Until ${customEndDate}`;
    return "Custom range";
  }
  return { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "1y": "Last year" }[preset];
}
