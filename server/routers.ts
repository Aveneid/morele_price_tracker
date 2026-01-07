import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import {
  createProduct,
  getUserProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductPriceHistory,
  getProductPriceHistoryByDate,
  getOrCreateSettings,
  updateSettings,
  getSettings,
  recordPrice,
} from "./db";
import {
  scrapeProduct,
  isValidMoreleUrl,
  buildMoreleUrl,
  parsePrice,
} from "./scraper";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
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

  // ============ PRODUCTS ROUTER ============
  products: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserProducts(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const product = await getProductById(input.id);
        if (!product || product.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return product;
      }),

    create: protectedProcedure
      .input(
        z.object({
          url: z.string().optional(),
          productCode: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Validate input
        if (!input.url && !input.productCode) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either URL or product code is required",
          });
        }

        let url = input.url;
        let productCode = input.productCode;

        // If only product code is provided, build the URL
        if (!url && productCode) {
          url = buildMoreleUrl(productCode);
        }

        // Validate URL
        if (!url || !isValidMoreleUrl(url)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid morele.net URL",
          });
        }

        // Scrape product information
        const scraped = await scrapeProduct(url, ctx.user.email || undefined);
        if (!scraped || !scraped.price) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to scrape product information from the URL",
          });
        }

        // Create product in database
        const product = await createProduct(ctx.user.id, {
          name: scraped.name || "Unknown Product",
          url,
          productCode: scraped.productCode || productCode,
          currentPrice: scraped.price,
          previousPrice: scraped.price,
          priceChangePercent: 0,
          lastCheckedAt: new Date(),
        });

        if (!product) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create product",
          });
        }

        // Record initial price in history
        await recordPrice(product.id, scraped.price);

        return product;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const product = await getProductById(input.id);
        if (!product || product.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await deleteProduct(input.id);
        return { success: true };
      }),

    updatePrice: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const product = await getProductById(input.id);
        if (!product || product.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Scrape current price
        const scraped = await scrapeProduct(product.url);
        if (!scraped || scraped.price === null) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to scrape current price",
          });
        }

        const newPrice = scraped.price;
        const oldPrice = product.currentPrice || newPrice;

        // Calculate price change percentage
        let priceChangePercent = 0;
        if (oldPrice > 0) {
          priceChangePercent = Math.round(
            ((newPrice - oldPrice) / oldPrice) * 10000
          ); // Store as percentage * 100
        }

        // Update product
        const updated = await updateProduct(input.id, {
          previousPrice: oldPrice,
          currentPrice: newPrice,
          priceChangePercent,
          lastCheckedAt: new Date(),
        });

        // Record price in history
        await recordPrice(input.id, newPrice);

        return updated;
      }),
  }),

  // ============ PRICE HISTORY ROUTER ============
  priceHistory: router({
    get: protectedProcedure
      .input(z.object({ productId: z.number(), daysBack: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const product = await getProductById(input.productId);
        if (!product || product.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (input.daysBack) {
          return getProductPriceHistoryByDate(input.productId, input.daysBack);
        }

        return getProductPriceHistory(input.productId);
      }),
  }),

  // ============ SETTINGS ROUTER ============
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateSettings(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          trackingIntervalMinutes: z.number().min(5).max(1440).optional(),
          priceDropAlertThreshold: z.number().min(1).max(100).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const updated = await updateSettings(ctx.user.id, input);
        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update settings",
          });
        }
        return updated;
      }),
  }),

  scheduler: router({
    startTracking: protectedProcedure.mutation(async ({ ctx }) => {
      const { startUserTracking } = await import("./scheduler");
      await startUserTracking(ctx.user.id);
      return { success: true, message: "Price tracking started" };
    }),

    stopTracking: protectedProcedure.mutation(async ({ ctx }) => {
      const { stopUserTracking } = await import("./scheduler");
      stopUserTracking(ctx.user.id);
      return { success: true, message: "Price tracking stopped" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
