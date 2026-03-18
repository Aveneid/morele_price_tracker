import crypto from "crypto";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getAllProducts,
  getProductById,
  getProductPriceHistoryByDate,
  getAdminByUsername,
  createProduct,
  recordPrice,
  updateProduct,
  getOrCreateSettings,
  getDb,
} from "./db";
import { products, priceHistory } from "../drizzle/schema";
import { scrapeProduct } from "./scraper";
import { scheduleProductPriceCheck, removeProductSchedule, updateProductSchedule } from "./priceTracker";
import { parseCsv, validateCsvImport } from "./csvImport";
import { debugLog, debugError, debugTable } from "./_core/debugLogger";
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getJobExecutions,
} from "./db";
import { scheduleJob, unscheduleJob, executeJob } from "./jobScheduler";
import { adminRouter } from "./_core/adminRouter";

// ============ PASSWORD UTILITIES ============

/**
 * Hash password using SHA1
 */
function hashPasswordSHA1(password: string): string {
  return crypto.createHash("sha1").update(password).digest("hex");
}

/**
 * Verify password against SHA1 hash
 */
function verifyPasswordSHA1(password: string, hash: string): boolean {
  return hashPasswordSHA1(password) === hash;
}

// ============ HELPER FUNCTIONS ============

/**
 * Check if enough time has passed since last price check
 */
function checkPriceCheckCooldown(lastCheckedAt: Date | null): number {
  const lastCheckTime = lastCheckedAt ? new Date(lastCheckedAt).getTime() : 0;
  const now = Date.now();
  return (now - lastCheckTime) / (1000 * 60); // Return minutes since last check
}

// ============ ROUTER ============

export const appRouter = router({
  // ============ ADMIN ============
  admin: adminRouter,

  // ============ PRODUCT TRACKING ============
  products: router({
    // Get all products (public access)
    list: publicProcedure.query(async () => {
      return getAllProducts();
    }),

    // Get single product (public access)
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
        return getProductPriceHistoryByDate(input.productId, 30);
      }),

    // Request manual price check (public access, with 15-minute cooldown)
    requestPriceCheck: publicProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        const product = await getProductById(input.productId);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Check cooldown
        const minutesSinceLastCheck = checkPriceCheckCooldown(product.lastCheckedAt);
        if (minutesSinceLastCheck < 15) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Please wait ${Math.ceil(15 - minutesSinceLastCheck)} minutes before requesting another price check.`,
          });
        }

        try {
          // Scrape current price
          const scrapedData = await scrapeProduct(product.url);

          if (!scrapedData || scrapedData.price === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not scrape current price",
            });
          }

          // Update product
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
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to check price: ${error.message}`,
          });
        }
      }),

    // Add product (public access with duplicate prevention)
    add: publicProcedure
      .input(z.object({ input: z.string() }))
      .mutation(async ({ input }) => {
        try {
          debugLog('ADD_PRODUCT', 'Starting product addition with input:', input.input);
          
          // Scrape product
          const scrapedData = await scrapeProduct(input.input);
          debugLog('ADD_PRODUCT', 'Scraped data:', scrapedData);

          if (!scrapedData) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Could not scrape product. Please check the URL or product code.",
            });
          }

          // Check for duplicates
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

          // Create product
          const productUrl = input.input.includes("morele.net")
            ? input.input
            : `https://www.morele.net/search/?q=${input.input}`;

          debugLog('ADD_PRODUCT', 'Creating product with URL:', productUrl);
          debugLog('ADD_PRODUCT', 'Product data:', {
            name: scrapedData.name || "Unknown Product",
            url: productUrl,
            productCode: scrapedData.productCode || "",
            category: scrapedData.category || null,
            imageUrl: scrapedData.imageUrl || null,
            currentPrice: scrapedData.price || 0,
            previousPrice: scrapedData.price || 0,
            lastCheckedAt: new Date(),
          });

          const newProduct = await createProduct({
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
            debugError('ADD_PRODUCT', 'Failed to create product - returned null');
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to save product to database",
            });
          }

          debugLog('ADD_PRODUCT', 'Product created successfully:', newProduct);

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
          debugError('ADD_PRODUCT', 'Error during product addition:', error);
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
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const product = await getProductById(input.productId);
          if (!product) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Product not found",
            });
          }

          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Delete product (cascade will delete price history)
          await db.delete(products).where(eq(products.id, input.productId));

          // Remove scheduled price check
          removeProductSchedule(input.productId);

          return {
            success: true,
            message: "Product deleted successfully",
          };
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete product",
          });
        }
      }),

    // Import products from CSV (public access)
    importFromCsv: publicProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const rows = parseCsv(input.csvContent);
          const errors = validateCsvImport(rows);

          if (errors.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `CSV validation failed: ${errors.map(e => e.error).join(", ")}`,
            });
          }

          const results = {
            successful: 0,
            failed: 0,
            errors: [] as string[],
          };

          for (const row of rows) {
            try {
              // For CSV import, scrape the product to get name, price, etc.
              const inputUrl = row.url || `https://www.morele.net/search/?q=${row.productCode}`;
              const scrapedData = await scrapeProduct(inputUrl);

              if (!scrapedData) {
                results.failed++;
                results.errors.push(`Could not scrape product from ${inputUrl}`);
                continue;
              }

              // Check for duplicates
              const allProducts = await getAllProducts();
              const exists = allProducts.some(
                (p) => p.productCode === scrapedData.productCode || p.url === inputUrl
              );

              if (exists) {
                results.failed++;
                results.errors.push(`Product ${scrapedData.name} already exists`);
                continue;
              }

              // Create product
              const product = await createProduct({
                name: scrapedData.name || "Unknown Product",
                url: inputUrl,
                productCode: scrapedData.productCode || row.productCode || "",
                category: scrapedData.category || null,
                imageUrl: scrapedData.imageUrl || null,
                currentPrice: scrapedData.price || 0,
                previousPrice: scrapedData.price || 0,
                lastCheckedAt: new Date(),
              });

              if (product) {
                results.successful++;
                // Record initial price
                if (scrapedData.price) {
                  await recordPrice(product.id, scrapedData.price);
                }
              } else {
                results.failed++;
                results.errors.push(`Failed to create product ${scrapedData.name}`);
              }
            } catch (error: any) {
              results.failed++;
              results.errors.push(`Error importing product: ${error.message}`);
            }
          }

          return results;
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to import CSV",
          });
        }
      }),
  }),

  // ============ SYSTEM ROUTER ============
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
