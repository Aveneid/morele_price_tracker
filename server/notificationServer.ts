import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

/**
 * WebSocket notification server for real-time price alerts
 */

interface NotificationClient {
  ws: WebSocket;
  isAlive: boolean;
}

const clients = new Set<NotificationClient>();

export function initializeNotificationServer(httpServer: HTTPServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/api/notifications" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[Notifications] New WebSocket client connected");

    const client: NotificationClient = {
      ws,
      isAlive: true,
    };

    clients.add(client);

    // Handle pong messages for heartbeat
    ws.on("pong", () => {
      client.isAlive = true;
    });

    // Handle client disconnect
    ws.on("close", () => {
      console.log("[Notifications] WebSocket client disconnected");
      clients.delete(client);
    });

    // Handle errors
    ws.on("error", (error: any) => {
      console.error("[Notifications] WebSocket error:", error);
      clients.delete(client);
    });

    // Send initial connection message
    ws.send(JSON.stringify({ type: "connected", message: "Connected to notification server" }));
  });

  // Heartbeat interval to detect dead connections
  const heartbeatInterval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000); // Every 30 seconds

  // Cleanup on server close
  httpServer.on("close", () => {
    clearInterval(heartbeatInterval);
    wss.close();
  });
}

/**
 * Broadcast price alert to all connected clients
 */
export function broadcastPriceAlert(data: {
  productId: number;
  productName: string;
  oldPrice: number;
  newPrice: number;
  dropPercent: number;
}): void {
  const message = JSON.stringify({
    type: "price_alert",
    data,
    timestamp: new Date().toISOString(),
  });

  let activeClients = 0;
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
      activeClients++;
    }
  });

  console.log(`[Notifications] Sent price alert to ${activeClients} clients`);
}

/**
 * Get number of connected clients
 */
export function getConnectedClientsCount(): number {
  return clients.size;
}
