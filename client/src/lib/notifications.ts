/**
 * Browser Notification Service
 * Handles Web Notifications API for price alerts
 */

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  return Notification.permission === "granted";
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn("Notifications not supported in this browser");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("Notifications have been denied by user");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

/**
 * Send a browser notification
 */
export function sendNotification(options: NotificationOptions): Notification | null {
  if (!areNotificationsEnabled()) {
    console.warn("Notifications are not enabled");
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/favicon.ico",
      badge: options.badge,
      tag: options.tag || "price-alert",
      requireInteraction: options.requireInteraction ?? true,
    });

    // Auto-close notification after 10 seconds if not requireInteraction
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    return null;
  }
}

/**
 * Send price drop alert notification
 */
export function sendPriceDropAlert(productName: string, oldPrice: number, newPrice: number, dropPercent: number): Notification | null {
  const priceChange = oldPrice - newPrice;
  const formattedOldPrice = (oldPrice / 100).toFixed(2);
  const formattedNewPrice = (newPrice / 100).toFixed(2);

  return sendNotification({
    title: "🔔 Price Drop Alert!",
    body: `${productName}\n${formattedOldPrice} PLN → ${formattedNewPrice} PLN (-${dropPercent.toFixed(2)}%)`,
    tag: `price-alert-${productName}`,
    requireInteraction: true,
  });
}

/**
 * Initialize notification service on app load
 */
export async function initializeNotifications(): Promise<void> {
  if (!isNotificationSupported()) {
    console.log("Notifications not supported in this browser");
    return;
  }

  // Only request permission if not already decided
  if (Notification.permission === "default") {
    const granted = await requestNotificationPermission();
    if (granted) {
      console.log("Notifications enabled");
    }
  }
}
