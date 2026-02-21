import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializePriceTracking } from "../priceTracker";
import { initializeNotificationServer } from "../notificationServer";
import { initializeJobScheduler } from "../jobScheduler";
import { initializeDebugBroadcaster } from "../debugBroadcaster";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Middleware to handle raw body for tRPC routes
  app.use((req: Request, res: Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api/trpc")) {
      let rawBody = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        rawBody += chunk;
      });
      req.on("end", () => {
        try {
          if (rawBody) {
            (req as any).body = JSON.parse(rawBody);
          }
        } catch (e) {
          (req as any).body = undefined;
        }
        next();
      });
    } else {
      // For non-tRPC routes, use express.json()
      express.json({ limit: "50mb" })(req, res, next);
    }
  });
  
  // Initialize WebSocket notification server
  initializeNotificationServer(server);
  // Initialize debug broadcaster
  initializeDebugBroadcaster(server);
  // Initialize price tracking scheduler
  await initializePriceTracking();
  // Initialize job scheduler
  await initializeJobScheduler();
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: async (opts) => createContext(opts),
    })
  );
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const vite = await setupVite(app, server);
    console.log("[OAuth] Initialized with baseURL:", process.env.OAUTH_SERVER_URL);
  } else {
    serveStatic(app);
  }

  const port = await findAvailablePort();
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  return server;
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
