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
  getProductPriceHistoryInRange,
  getAllProductPriceHistory,
  getAdminByUsername,
  createProduct,
  recordPrice,
  updateProduct,
  getOrCreateSettings,
  getDb,
  createUserPriceAlert,
  getUserPriceAlerts,
  getProductUserAlerts,
  deleteUserPriceAlert,
  getWebsiteTemplateByUrl,
  getWebsiteTemplateById,
  getAllWebsiteTemplates,
  createWebsiteTemplate,
  updateWebsiteTemplate,
  deleteWebsiteTemplate,
} from "./db";
import { products, priceHistory } from "../drizzle/schema";

const historyDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must use YYYY-MM-DD format");
const historyRangeInput = z.object({
  productId: z.number(),
  startDate: historyDate.optional(),
  endDate: historyDate.optional(),
  trendWindowDays: z.number().int().min(1).max(3650).optional(),
}).refine(
  ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
  { message: "Start date must be on or before end date" },
);

type HistoryRangeInput = z.infer<typeof historyRangeInput>;

function getHistoryBounds(input: HistoryRangeInput): { startDate?: Date; endDateExclusive?: Date } {
  const startDate = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined;
  const endDateExclusive = input.endDate
    ? new Date(Date.parse(`${input.endDate}T00:00:00.000Z`) + 24 * 60 * 60 * 1000)
    : undefined;
  return { startDate, endDateExclusive };
}
import { scrapeProduct } from "./scraper";
import { checkProductPrice, calculateNextCheckTime } from "./priceTracker";
import { parseCsv, validateCsvImport } from "./csvImport";
import { debugLog, debugError, debugTable } from "./_core/debugLogger";
import { extractDomain, isSameDomain } from "./urlUtils";
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
import { calculatePricePatterns, buildPriceHistoryCsv, safeExportFilename } from "./priceAnalytics";

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
      .input(historyRangeInput)
      .query(async ({ input }) => {
        const { startDate, endDateExclusive } = getHistoryBounds(input);
        return getProductPriceHistoryInRange(input.productId, startDate, endDateExclusive);
      }),

    // Historical pattern metrics for a product. These metrics describe stored history only.
    pricePatterns: publicProcedure
      .input(historyRangeInput)
      .query(async ({ input }) => {
        const product = await getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

        const { startDate, endDateExclusive } = getHistoryBounds(input);
        const history = await getProductPriceHistoryInRange(input.productId, startDate, endDateExclusive);
        return {
          productId: product.id,
          patterns: calculatePricePatterns(history, undefined, input.trendWindowDays ?? 30),
        };
      }),

    // Downloadable history data for a single product, optionally limited to a date range.
    exportHistory: publicProcedure
      .input(historyRangeInput)
      .query(async ({ input }) => {
        const product = await getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

        const { startDate, endDateExclusive } = getHistoryBounds(input);
        const history = await getProductPriceHistoryInRange(input.productId, startDate, endDateExclusive);
        return {
          productId: product.id,
          filename: safeExportFilename(product.name),
          contentType: "text/csv;charset=utf-8",
          rowCount: history.length,
          csv: `\\ufeff${buildPriceHistoryCsv(product, history)}`,
        };
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

        const result = await checkProductPrice(product.id);
        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to check price: ${result.error}`,
          });
        }

        return {
          success: true,
          message: "Price updated successfully",
          newPrice: result.newPrice,
        };
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
            priceChangePercent: 0,
            checkIntervalMinutes: 60,
            priceAlertThreshold: 10,
            lastCheckedAt: new Date(),
            nextCheckTime: calculateNextCheckTime(60),
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

    // Update a product (manual price check)
    update: publicProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        const product = await getProductById(input.productId);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const result = await checkProductPrice(product.id);
        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update product: ${result.error}`,
          });
        }

        return {
          success: true,
          message: "Product updated successfully",
          newPrice: result.newPrice,
        };
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
                nextCheckTime: calculateNextCheckTime(60),
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

  // ============ PRICE ALERTS ROUTER ============
  priceAlerts: router({
    create: publicProcedure
      .input(
        z.object({
          userFingerprint: z.string(),
          productId: z.number(),
          alertType: z.enum(["price", "percent"]),
          threshold: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const alert = await createUserPriceAlert({
          userFingerprint: input.userFingerprint,
          productId: input.productId,
          alertType: input.alertType,
          threshold: input.threshold,
          isActive: true,
        });

        if (!alert) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create price alert",
          });
        }

        return alert;
      }),

    list: publicProcedure
      .input(z.object({ userFingerprint: z.string() }))
      .query(async ({ input }) => {
        return await getUserPriceAlerts(input.userFingerprint);
      }),

    getForProduct: publicProcedure
      .input(
        z.object({
          productId: z.number(),
          userFingerprint: z.string(),
        })
      )
      .query(async ({ input }) => {
        return await getProductUserAlerts(input.productId, input.userFingerprint);
      }),

    delete: publicProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteUserPriceAlert(input.alertId);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete price alert",
          });
        }
        return { success: true };
      }),
  }),

  // ============ WEBSITE TEMPLATES ROUTER ============
  templates: router({
    getByUrl: publicProcedure
      .input(z.object({ websiteUrl: z.string().url() }))
      .query(async ({ input }) => {
        return getWebsiteTemplateByUrl(input.websiteUrl);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getWebsiteTemplateById(input.id);
      }),

    getAll: publicProcedure.query(async () => {
      return getAllWebsiteTemplates();
    }),

    checkExists: publicProcedure
      .input(z.object({ productUrl: z.string().url() }))
      .query(async ({ input }) => {
        const allTemplates = await getAllWebsiteTemplates();
        
        // Find template that matches the product URL domain
        const matchingTemplate = allTemplates.find((template) => {
          return isSameDomain(template.websiteUrl, input.productUrl);
        });

        if (!matchingTemplate) {
          return { exists: false, template: null };
        }

        // Parse selectors from JSON string
        let selectors = {};
        try {
          selectors = JSON.parse(matchingTemplate.selectors);
        } catch (e) {
          debugError("Failed to parse template selectors", e);
        }

        return {
          exists: true,
          template: {
            id: matchingTemplate.id,
            websiteName: matchingTemplate.websiteName,
            selectors,
            defaultCategory: matchingTemplate.defaultCategory,
            defaultImageUrl: matchingTemplate.defaultImageUrl,
          },
        };
      }),

    create: publicProcedure
      .input(
        z.object({
          websiteUrl: z.string().url(),
          websiteName: z.string(),
          selectors: z.record(z.string(), z.string()),
          defaultCategory: z.string().optional(),
          defaultImageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const template = await createWebsiteTemplate({
          websiteUrl: input.websiteUrl,
          websiteName: input.websiteName,
          selectors: JSON.stringify(input.selectors),
          defaultCategory: input.defaultCategory,
          defaultImageUrl: input.defaultImageUrl,
          isActive: true,
        });

        if (!template) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create template",
          });
        }

        return template;
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          websiteName: z.string().optional(),
          selectors: z.record(z.string(), z.string()).optional(),
          defaultCategory: z.string().optional(),
          defaultImageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };

        if (data.selectors) {
          updateData.selectors = JSON.stringify(data.selectors);
        }

        const template = await updateWebsiteTemplate(id, updateData);

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        return template;
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteWebsiteTemplate(input.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete template",
          });
        }
        return { success: true };
      }),
  }),

  // ============ SYSTEM ROUTER ============
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
