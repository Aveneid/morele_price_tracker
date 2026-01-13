import { useEffect, useCallback } from "react";
import { sendPriceDropAlert } from "@/lib/notifications";

export interface PriceAlert {
  productId: number;
  productName: string;
  oldPrice: number;
  newPrice: number;
  dropPercent: number;
  timestamp: string;
}

export function usePriceAlerts(onAlert?: (alert: PriceAlert) => void) {
  useEffect(() => {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/notifications`;

    console.log("[Price Alerts] Connecting to WebSocket:", wsUrl);

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("[Price Alerts] WebSocket connected");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === "price_alert") {
              const alert: PriceAlert = {
                ...message.data,
                timestamp: message.timestamp,
              };

              console.log("[Price Alerts] Received price alert:", alert);

              // Send browser notification
              sendPriceDropAlert(
                alert.productName,
                alert.oldPrice,
                alert.newPrice,
                alert.dropPercent
              );

              // Call callback if provided
              if (onAlert) {
                onAlert(alert);
              }
            }
          } catch (error) {
            console.error("[Price Alerts] Error parsing message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[Price Alerts] WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("[Price Alerts] WebSocket disconnected, attempting to reconnect in 5 seconds...");
          // Attempt to reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error("[Price Alerts] Error connecting to WebSocket:", error);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [onAlert]);
}
