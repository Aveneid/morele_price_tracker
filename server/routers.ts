import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getAllProducts,
  getProductById,
  getProductPriceHistory,
  getAdminByUsername,
  createProduct,
  recordPrice,
  updateProduct,
  getProductPriceHistoryByDate,
  getOrCreateSettings,
  getDb,
} from "./db";
import { eq } from "drizzle-orm";
import { products, priceHistory } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import crypto from "crypto";
import { scrapeProduct } from "./scraper";

// Helper to hash password with SHA1
function hashPasswordSHA1(password: string): string {
  return crypto.createHash("sha1").update(password).digest("hex");
}

// Helper to verify password
function verifyPasswordSHA1(password: string, hash: string): boolean {
  return hashPasswordSHA1(password) === hash;
}

export const appRouter = router({
  // ============ PRODUCT TRACKING ============
  products: router({
    // Get all products (public access)
    list: publicProcedure.query(async () => {
      return getAllProducts();
    }),

    // Get single product with price history (public access)
    get: publicProcedure
      .input(
        z.object({ id: z.number() })
      )
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
        return getProductPriceHistoryByDate(input.productId, 30);
      }),

    // Request manual price check (public access, with cooldown)
    requestPriceCheck: publicProcedure
      .input(
        z.object({ productId: z.number() })
      )
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

        // Perform immediate price check
        try {
          const scrapedData = await scrapeProduct(product.url, product.userId === 1 ? "sigarencja@gmail.com" : undefined);
          
          if (scrapedData) {
            // Record the new price
            if (scrapedData.price) {
              await recordPrice(product.id, scrapedData.price);
            }
            
            // Update product with new price and check time
            const previousPrice = product.currentPrice;
            await updateProduct(product.id, {
              currentPrice: scrapedData.price || previousPrice,
              previousPrice: previousPrice || scrapedData.price,
              lastCheckedAt: new Date(),
            });

            return {
              success: true,
              message: "Price updated successfully",
              newPrice: scrapedData.price || 0,
            };
          } else {
            throw new Error("Failed to scrape product price");
          }
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to check price: ${error.message}`,
          });
        }
      }),

    // Add product (public access with duplicate prevention)
    add: publicProcedure
      .input(
        z.object({
          input: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Scrape the product - handle both URL and product code
          const scrapedData = await scrapeProduct(input.input, undefined);

          if (!scrapedData) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Could not scrape product. Please check the URL or product code.",
            });
          }

          // Check if product already exists
          const allProducts = await getAllProducts();
          const exists = allProducts.some(
            (p) => p.productCode === scrapedData.productCode || p.url === input.input
          );

          if (exists) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This product is already being tracked.",
            });
          }

          // Create product with userId = 0 for public products
          // Use the scraped URL if available, otherwise build one from product code
          const productUrl = input.input.includes("morele.net") ? input.input : `https://www.morele.net/search/?q=${input.input}`;
          const newProduct = await createProduct(0, {
            name: scrapedData.name || "Unknown Product",
            url: productUrl,
            productCode: scrapedData.productCode || "",
            category: scrapedData.category || null,
            imageUrl: scrapedData.imageUrl || null,
            currentPrice: scrapedData.price || 0,
            previousPrice: scrapedData.price || 0,
            lastCheckedAt: new Date(),
          });

          if (!newProduct) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to save product to database",
            });
          }

          // Record initial price
          if (scrapedData.price) {
            await recordPrice(newProduct.id, scrapedData.price);
          }

          return {
            success: true,
            message: "Product added successfully",
            product: newProduct,
          };
        } catch (error: any) {
          if (error.code) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to add product",
          });
        }
      }),

    // Delete a product
    delete: publicProcedure
      .input(
        z.object({
          productId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const product = await getProductById(input.productId);
          if (!product) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Product not found",
            });
          }

          // Delete product from database
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Delete price history first
          await db.delete(priceHistory).where(eq(priceHistory.productId, input.productId));
          // Delete product
          await db.delete(products).where(eq(products.id, input.productId));

          return {
            success: true,
            message: "Product deleted successfully",
          };
        } catch (error: any) {
          if (error.code) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete product",
          });
        }
      }),
  }),

  // ============ ADMIN AUTHENTICATION & MANAGEMENT ============
  admin: router({
    // Get admin settings
    getSettings: publicProcedure.query(async () => {
      return getOrCreateSettings(0);
    }),

    // Admin login
    login: publicProcedure
      .input(
        z.object({ username: z.string(), password: z.string() })
      )
      .mutation(async ({ input, ctx }) => {
        const admin = await getAdminByUsername(input.username);

        if (!admin || !verifyPasswordSHA1(input.password, admin.passwordHash)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, JSON.stringify({ adminId: admin.id }), {
          ...cookieOptions,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        return {
          success: true,
          admin: {
            id: admin.id,
            username: admin.username,
          },
        };
      }),

    // Admin logout
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // ============ AUTHENTICATION ============
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
