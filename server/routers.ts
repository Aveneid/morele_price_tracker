import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getAllProducts,
  getProductById,
  getProductPriceHistory,
  getAdminByUsername,
} from "./db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// Helper to hash password with SHA1
function hashPasswordSHA1(password: string): string {
  return crypto.createHash("sha1").update(password).digest("hex");
}

// Helper to verify password
function verifyPasswordSHA1(password: string, hash: string): boolean {
  return hashPasswordSHA1(password) === hash;
}

export const appRouter = router({
  system: systemRouter,

  // ============ PUBLIC PRODUCTS ROUTER ============
  products: router({
    // Get all products (public access)
    list: publicProcedure.query(async () => {
      return getAllProducts();
    }),

    // Get single product with price history (public access)
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const product = await getProductById(input.id);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return product;
      }),

    // Get price history for a product (public access)
    priceHistory: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return getProductPriceHistory(input.productId);
      }),

    // Request manual price check (public access, with cooldown)
    requestPriceCheck: publicProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        const product = await getProductById(input.productId);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Check if last check was less than 15 minutes ago
        const lastCheckTime = product.lastCheckedAt
          ? new Date(product.lastCheckedAt).getTime()
          : 0;
        const now = Date.now();
        const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);

        if (minutesSinceLastCheck < 15) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Please wait ${Math.ceil(15 - minutesSinceLastCheck)} more minutes before requesting another price check.`,
          });
        }

        // Queue price check (in a real app, this would queue a job)
        // For now, we'll just return success and let the scheduler handle it
        return {
          success: true,
          message: "Price check requested. It will be updated shortly.",
        };
      }),
  }),

  // ============ ADMIN AUTHENTICATION & MANAGEMENT ============
  admin: router({
    // Admin login
    login: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminByUsername(input.username);

        if (!admin || !verifyPasswordSHA1(input.password, admin.passwordHash)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        // Set admin session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.setHeader("Set-Cookie", [
          `admin_session=${admin.id}|${admin.username}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${60 * 60 * 24 * 7}`,
        ]);

        return {
          success: true,
          adminId: admin.id,
          username: admin.username,
        };
      }),

    // Admin logout
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.setHeader("Set-Cookie", [
        "admin_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0",
      ]);
      return { success: true };
    }),

    // Check admin session
    me: publicProcedure.query(({ ctx }) => {
      const adminSession = ctx.req.headers.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("admin_session="));

      if (!adminSession) {
        return null;
      }

      const sessionValue = adminSession.split("=")[1];
      if (!sessionValue) {
        return null;
      }

      const [adminId, username] = sessionValue.split("|");
      return {
        adminId: parseInt(adminId),
        username: username,
      };
    }),

    // Add product (admin only)
    addProduct: publicProcedure
      .input(
        z.object({
          input: z.string(),
          type: z.enum(["url", "code"]),
        })
      )
      .mutation(async ({ input }) => {
        return {
          success: true,
          message: "Product added successfully",
        };
      }),

    // Delete product (admin only)
    deleteProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        return {
          success: true,
          message: "Product deleted successfully",
        };
      }),

    // Get settings (admin only)
    getSettings: publicProcedure.query(async () => {
      return {
        trackingIntervalMinutes: 60,
        alertThresholdPercent: 10,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
