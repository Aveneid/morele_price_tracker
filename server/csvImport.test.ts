import { describe, it, expect } from "vitest";
import {
  parseCsv,
  validateCsvRow,
  validateCsvImport,
  generateSampleCsv,
} from "./csvImport";

describe("CSV Import Utilities", () => {
  describe("parseCsv", () => {
    it("should parse valid CSV with header", () => {
      const csv = `url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product/,10751839,60,10`;

      const rows = parseCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].url).toBe("https://morele.net/product/");
      expect(rows[0].productCode).toBe("10751839");
      expect(rows[0].checkIntervalMinutes).toBe(60);
      expect(rows[0].priceAlertThreshold).toBe(10);
    });

    it("should parse CSV without header", () => {
      const csv = `https://morele.net/product/,10751839,60,10
https://morele.net/another/,10751840,120,15`;

      const rows = parseCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0].url).toBe("https://morele.net/product/");
      expect(rows[1].url).toBe("https://morele.net/another/");
    });

    it("should handle rows with only product code", () => {
      const csv = `url,productCode,checkIntervalMinutes,priceAlertThreshold
,10751839,60,10`;

      const rows = parseCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].url).toBeUndefined();
      expect(rows[0].productCode).toBe("10751839");
    });

    it("should handle rows with only URL", () => {
      const csv = `url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product/,,60,10`;

      const rows = parseCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].url).toBe("https://morele.net/product/");
      expect(rows[0].productCode).toBeUndefined();
    });

    it("should skip empty lines", () => {
      const csv = `url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product/,10751839,60,10

https://morele.net/another/,10751840,120,15`;

      const rows = parseCsv(csv);
      expect(rows).toHaveLength(2);
    });

    it("should use default values for missing numeric fields", () => {
      const csv = `url,productCode
https://morele.net/product/,10751839`;

      const rows = parseCsv(csv);
      expect(rows[0].checkIntervalMinutes).toBe(60);
      expect(rows[0].priceAlertThreshold).toBe(10);
    });

    it("should skip rows without URL or product code", () => {
      const csv = `url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product/,10751839,60,10
,,60,10`;

      const rows = parseCsv(csv);
      expect(rows).toHaveLength(1);
    });
  });

  describe("validateCsvRow", () => {
    it("should validate row with URL", () => {
      const row = {
        url: "https://morele.net/product/",
        checkIntervalMinutes: 60,
        priceAlertThreshold: 10,
      };

      const error = validateCsvRow(row, 0);
      expect(error).toBeNull();
    });

    it("should validate row with product code", () => {
      const row = {
        productCode: "10751839",
        checkIntervalMinutes: 60,
        priceAlertThreshold: 10,
      };

      const error = validateCsvRow(row, 0);
      expect(error).toBeNull();
    });

    it("should reject row without URL or product code", () => {
      const row = {
        checkIntervalMinutes: 60,
        priceAlertThreshold: 10,
      };

      const error = validateCsvRow(row, 0);
      expect(error).toBe("Either URL or product code must be provided");
    });

    it("should reject invalid URL", () => {
      const row = {
        url: "not-a-valid-url",
        checkIntervalMinutes: 60,
        priceAlertThreshold: 10,
      };

      const error = validateCsvRow(row, 0);
      expect(error).toBe("Invalid URL format");
    });

    it("should reject check interval out of range", () => {
      const row = {
        url: "https://morele.net/product/",
        checkIntervalMinutes: 2000,
        priceAlertThreshold: 10,
      };

      const error = validateCsvRow(row, 0);
      expect(error).toBe("Check interval must be between 1 and 1440 minutes");
    });

    it("should reject alert threshold out of range", () => {
      const row = {
        url: "https://morele.net/product/",
        checkIntervalMinutes: 60,
        priceAlertThreshold: 150,
      };

      const error = validateCsvRow(row, 0);
      expect(error).toBe("Alert threshold must be between 0 and 100 percent");
    });
  });

  describe("validateCsvImport", () => {
    it("should validate multiple rows", () => {
      const rows = [
        {
          url: "https://morele.net/product1/",
          checkIntervalMinutes: 60,
          priceAlertThreshold: 10,
        },
        {
          productCode: "10751839",
          checkIntervalMinutes: 120,
          priceAlertThreshold: 15,
        },
      ];

      const errors = validateCsvImport(rows);
      expect(errors).toHaveLength(0);
    });

    it("should collect multiple validation errors", () => {
      const rows = [
        {
          checkIntervalMinutes: 60,
          priceAlertThreshold: 10,
        },
        {
          url: "invalid-url",
          checkIntervalMinutes: 60,
          priceAlertThreshold: 10,
        },
      ];

      const errors = validateCsvImport(rows);
      expect(errors).toHaveLength(2);
      expect(errors[0].row).toBe(1);
      expect(errors[1].row).toBe(2);
    });
  });

  describe("generateSampleCsv", () => {
    it("should generate valid sample CSV", () => {
      const csv = generateSampleCsv();
      expect(csv).toContain("url,productCode");
      expect(csv).toContain("https://morele.net/");
      expect(csv).toContain("10751839");
    });

    it("should generate parseable CSV", () => {
      const csv = generateSampleCsv();
      const rows = parseCsv(csv);
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
