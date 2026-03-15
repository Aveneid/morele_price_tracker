import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  createProduct,
  getUserProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  recordPrice,
  getProductPriceHistory,
  getOrCreateSettings,
  updateSettings,
} from "./db";
import { getDb } from "./db";

describe("Database Operations", () => {
  const testUserId = 999;
  let testProductId: number | null = null;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for tests");
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProductId) {
      await deleteProduct(testProductId);
    }
  });

  describe("Product Operations", () => {
    it("should create a product", async () => {
      const product = await createProduct(testUserId, {
        name: "Test Product",
        url: "https://morele.net/test-product-12345.html",
        productCode: "12345",
        currentPrice: 99999,
        previousPrice: 99999,
        priceChangePercent: 0,
        lastCheckedAt: new Date(),
      });

      expect(product).toBeDefined();
      expect(product?.name).toBe("Test Product");
      expect(product?.userId).toBe(testUserId);
      expect(product?.currentPrice).toBe(99999);

      if (product?.id) {
        testProductId = product.id;
      }
    });

    it("should get user products", async () => {
      if (!testProductId) {
        console.warn("Skipping test: no product created");
        return;
      }

      const products = await getUserProducts(testUserId);
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products.some((p) => p.id === testProductId)).toBe(true);
    });

    it("should get product by id", async () => {
      if (!testProductId) {
        console.warn("Skipping test: no product created");
        return;
      }

      const product = await getProductById(testProductId);
      expect(product).toBeDefined();
      expect(product?.id).toBe(testProductId);
      expect(product?.name).toBe("Test Product");
    });

    it("should update product", async () => {
      if (!testProductId) {
        console.warn("Skipping test: no product created");
        return;
      }

      const updated = await updateProduct(testProductId, {
        currentPrice: 89999,
        priceChangePercent: -1000, // -10%
      });

      expect(updated).toBeDefined();
      expect(updated?.currentPrice).toBe(89999);
      expect(updated?.priceChangePercent).toBe(-1000);
    });
  });

  describe("Price History Operations", () => {
    it("should record price", async () => {
      if (!testProductId) {
        console.warn("Skipping test: no product created");
        return;
      }

      const history = await recordPrice(testProductId, 79999);
      expect(history).toBeDefined();
      expect(history?.productId).toBe(testProductId);
      expect(history?.price).toBe(79999);
    });

    it("should get price history", async () => {
      if (!testProductId) {
        console.warn("Skipping test: no product created");
        return;
      }

      const history = await getProductPriceHistory(testProductId);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("Settings Operations", () => {
    it("should get or create settings", async () => {
      const settings = await getOrCreateSettings(testUserId);
      expect(settings).toBeDefined();
      expect(settings.userId).toBe(testUserId);
      expect(settings.trackingIntervalMinutes).toBe(60);
      expect(settings.priceDropAlertThreshold).toBe(10);
    });

    it("should update settings", async () => {
      const updated = await updateSettings(testUserId, {
        trackingIntervalMinutes: 30,
        priceDropAlertThreshold: 5,
      });

      expect(updated).toBeDefined();
      expect(updated?.trackingIntervalMinutes).toBe(30);
      expect(updated?.priceDropAlertThreshold).toBe(5);
    });
  });
});
