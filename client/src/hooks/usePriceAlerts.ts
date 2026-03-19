import { useEffect } from "react";
import { initializeNotifications } from "@/lib/notifications";

/**
 * Hook to initialize push notifications for price alerts
 * This replaces the old WebSocket-based real-time alerts
 * Now users will receive browser push notifications when prices drop
 */
export function usePriceAlerts() {
  useEffect(() => {
    // Initialize push notifications on component mount
    initializeNotifications();
  }, []);
}
