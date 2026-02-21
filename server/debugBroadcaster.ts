import { WebSocketServer, WebSocket } from "ws";
import type { Server as HTTPServer } from "http";

/**
 * Debug log broadcaster - sends server-side debug logs to connected browser clients
 */

interface DebugClient {
  ws: WebSocket;
  isAlive: boolean;
}

const debugClients = new Set<DebugClient>();
let debugMode = process.env.DEBUG_MODE === 'true';

export function initializeDebugBroadcaster(httpServer: HTTPServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/api/debug-logs" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[Debug Broadcaster] New debug client connected");

    const client: DebugClient = {
      ws,
      isAlive: true,
    };

    debugClients.add(client);

    // Handle pong messages for heartbeat
    ws.on("pong", () => {
      client.isAlive = true;
    });

    // Handle incoming messages (e.g., debug mode toggle)
    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);
        if (message.type === "set_debug_mode") {
          debugMode = message.enabled;
          process.env.DEBUG_MODE = message.enabled ? 'true' : 'false';
          console.log(`[Debug Broadcaster] Debug mode set to: ${debugMode}`);
          broadcastDebugLog("DEBUG_MODE_CHANGED", `Debug mode is now ${debugMode ? 'ENABLED' : 'DISABLED'}`);
        }
      } catch (error) {
        console.error("[Debug Broadcaster] Error parsing message:", error);
      }
    });

    // Handle client disconnect
    ws.on("close", () => {
      console.log("[Debug Broadcaster] Debug client disconnected");
      debugClients.delete(client);
    });

    // Handle errors
    ws.on("error", (error: any) => {
      console.error("[Debug Broadcaster] WebSocket error:", error);
      debugClients.delete(client);
    });

    // Send initial connection message
    ws.send(JSON.stringify({ 
      type: "connected", 
      message: "Connected to debug log server",
      debugMode 
    }));
  });

  // Heartbeat interval to detect dead connections
  const heartbeatInterval = setInterval(() => {
    debugClients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        debugClients.delete(client);
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
 * Broadcast debug log to all connected clients
 */
export function broadcastDebugLog(label: string, ...args: any[]): void {
  if (!debugMode || debugClients.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: "debug_log",
    label,
    args,
    timestamp: new Date().toISOString(),
  });

  debugClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (error) {
        console.error("[Debug Broadcaster] Error sending message:", error);
      }
    }
  });
}

/**
 * Broadcast SQL query to all connected clients
 */
export function broadcastSqlQuery(query: string, params: unknown[]): void {
  if (!debugMode || debugClients.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: "sql_query",
    query,
    params,
    timestamp: new Date().toISOString(),
  });

  debugClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (error) {
        console.error("[Debug Broadcaster] Error sending SQL query:", error);
      }
    }
  });
}

/**
 * Get number of connected debug clients
 */
export function getDebugClientsCount(): number {
  return debugClients.size;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugModeEnabled(): boolean {
  return process.env.DEBUG_MODE === 'true';
}
