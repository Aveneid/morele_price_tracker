import { describe, expect, it } from "vitest";
import {
  parsePrice,
  extractProductCode,
  isValidMoreleUrl,
  buildMoreleUrl,
} from "./scraper";

describe("Scraper Utilities", () => {
  describe("parsePrice", () => {
    it("should parse price with space separator", () => {
      const result = parsePrice("549 zł");
      expect(result).toBe(54900); // 549.00 in cents
    });

    it("should parse price with comma decimal", () => {
      const result = parsePrice("549,99 zł");
      expect(result).toBe(54999); // 549.99 in cents
    });

    it("should parse price without currency symbol", () => {
      const result = parsePrice("549.99");
      expect(result).toBe(54999);
    });

    it("should handle whitespace", () => {
      const result = parsePrice("  549,99  zł  ");
      expect(result).toBe(54999);
    });

    it("should return null for invalid input", () => {
      expect(parsePrice("")).toBeNull();
      expect(parsePrice("invalid")).toBeNull();
      expect(parsePrice("zł")).toBeNull();
    });

    it("should handle zero price", () => {
      const result = parsePrice("0 zł");
      expect(result).toBe(0);
    });
  });

  describe("extractProductCode", () => {
    it("should extract product code from URL", () => {
      const url =
        "https://morele.net/ASUS-VivoBook-15-OLED-X1505ZA-EJ1158W-i5-12450H-16GB-512GB-SSD-15.6-FHD-OLED-Win11-10751839.html";
      const result = extractProductCode(url);
      expect(result).toBe("10751839");
    });

    it("should return null if no product code found", () => {
      const url = "https://morele.net/laptops/";
      const result = extractProductCode(url);
      expect(result).toBeNull();
    });

    it("should handle URLs with multiple numbers", () => {
      const url = "https://morele.net/product-123-456-789.html";
      const result = extractProductCode(url);
      expect(result).toBe("789");
    });
  });

  describe("isValidMoreleUrl", () => {
    it("should accept valid morele.net product URLs", () => {
      const url =
        "https://morele.net/ASUS-VivoBook-15-OLED-X1505ZA-EJ1158W-i5-12450H-16GB-512GB-SSD-15.6-FHD-OLED-Win11-10751839.html";
      expect(isValidMoreleUrl(url)).toBe(true);
    });

    it("should accept morele.net URLs with different protocols", () => {
      expect(isValidMoreleUrl("http://morele.net/product-123.html")).toBe(true);
      expect(isValidMoreleUrl("https://www.morele.net/product-123.html")).toBe(
        true
      );
    });

    it("should reject non-morele URLs", () => {
      expect(isValidMoreleUrl("https://amazon.com/product-123.html")).toBe(
        false
      );
      expect(isValidMoreleUrl("https://ebay.com/product-123.html")).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(isValidMoreleUrl("not a url")).toBe(false);
      expect(isValidMoreleUrl("")).toBe(false);
    });
  });

  describe("buildMoreleUrl", () => {
    it("should build search URL from product code", () => {
      const url = buildMoreleUrl("10751839");
      expect(url).toBe("https://morele.net/search/10751839/");
    });

    it("should handle product codes with leading zeros", () => {
      const url = buildMoreleUrl("00123456");
      expect(url).toBe("https://morele.net/search/00123456/");
    });
  });
});
