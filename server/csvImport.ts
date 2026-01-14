/**
 * CSV Import Utility
 * Handles parsing and importing products from CSV files
 */

export interface CsvProductRow {
  url?: string;
  productCode?: string;
  checkIntervalMinutes?: number;
  priceAlertThreshold?: number;
}

export interface CsvImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

/**
 * Parse CSV content and extract product rows
 * Expected CSV format: url,productCode,checkIntervalMinutes,priceAlertThreshold
 * Or at minimum: url or productCode (one of them is required)
 */
export function parseCsv(csvContent: string): CsvProductRow[] {
  const lines = csvContent.trim().split("\n");
  const rows: CsvProductRow[] = [];

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes("url") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = line.split(",").map((p) => p.trim());

    if (parts.length < 1) continue;

    const row: CsvProductRow = {
      url: parts[0] || undefined,
      productCode: parts[1] || undefined,
      checkIntervalMinutes: parts[2] ? parseInt(parts[2], 10) : 60,
      priceAlertThreshold: parts[3] ? parseInt(parts[3], 10) : 10,
    };

    // Validate that at least URL or product code is provided
    if (row.url || row.productCode) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Validate CSV product row
 */
export function validateCsvRow(row: CsvProductRow, rowIndex: number): string | null {
  // Check that either URL or product code is provided
  if (!row.url && !row.productCode) {
    return "Either URL or product code must be provided";
  }

  // Validate URL format if provided
  if (row.url) {
    try {
      new URL(row.url);
    } catch {
      return "Invalid URL format";
    }
  }

  // Validate check interval
  if (row.checkIntervalMinutes) {
    if (row.checkIntervalMinutes < 1 || row.checkIntervalMinutes > 1440) {
      return "Check interval must be between 1 and 1440 minutes";
    }
  }

  // Validate alert threshold
  if (row.priceAlertThreshold) {
    if (row.priceAlertThreshold < 0 || row.priceAlertThreshold > 100) {
      return "Alert threshold must be between 0 and 100 percent";
    }
  }

  return null;
}

/**
 * Validate entire CSV import
 */
export function validateCsvImport(
  rows: CsvProductRow[]
): Array<{ row: number; error: string }> {
  const errors: Array<{ row: number; error: string }> = [];

  rows.forEach((row, index) => {
    const error = validateCsvRow(row, index);
    if (error) {
      errors.push({ row: index + 1, error });
    }
  });

  return errors;
}

/**
 * Format CSV row for display
 */
export function formatCsvRow(row: CsvProductRow): string {
  const parts = [
    row.url || "",
    row.productCode || "",
    row.checkIntervalMinutes || "60",
    row.priceAlertThreshold || "10",
  ];
  return parts.join(",");
}

/**
 * Generate sample CSV content
 */
export function generateSampleCsv(): string {
  return `url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product-name/,10751839,60,10
https://morele.net/another-product/,10751840,120,15
,10751841,60,10
https://morele.net/third-product/,,90,5`;
}
