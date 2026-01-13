import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { broadcastPriceAlert, getConnectedClientsCount } from "./notificationServer";

describe("Notification Server", () => {
  describe("broadcastPriceAlert", () => {
    it("should broadcast price alert with correct data structure", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const alertData = {
        productId: 1,
        productName: "Test Product",
        oldPrice: 10000,
        newPrice: 8000,
        dropPercent: 20,
      };

      broadcastPriceAlert(alertData);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Sent price alert"));
      consoleSpy.mockRestore();
    });

    it("should handle multiple price alerts", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const alerts = [
        {
          productId: 1,
          productName: "Product 1",
          oldPrice: 10000,
          newPrice: 8000,
          dropPercent: 20,
        },
        {
          productId: 2,
          productName: "Product 2",
          oldPrice: 5000,
          newPrice: 4500,
          dropPercent: 10,
        },
      ];

      alerts.forEach((alert) => broadcastPriceAlert(alert));

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });

  describe("getConnectedClientsCount", () => {
    it("should return number of connected clients", () => {
      const count = getConnectedClientsCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
