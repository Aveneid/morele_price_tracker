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
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getJobExecutions,
} from "./db";
import { scheduleJob, unscheduleJob, executeJob } from "./jobScheduler";

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
            message: `Please wait ${Math.ceil(15 - minutesSinceLastCheck)} more minutes before requesting another price check.`,
          });
        }

        // Perform price check
        try {
          const scrapedData = await scrapeProduct(product.url);

          if (!scrapedData) {
            throw new Error("Failed to scrape product price");
          }

          // Record new price
          if (scrapedData.price) {
            await recordPrice(product.id, scrapedData.price);
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
          // Scrape product
          const scrapedData = await scrapeProduct(input.input);

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

          // Remove from scheduler
          removeProductSchedule(input.productId);

          // Delete price history first, then product
          await db.delete(priceHistory).where(eq(priceHistory.productId, input.productId));
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

    // Update product check interval
    updateCheckInterval: publicProcedure
      .input(
        z.object({
          productId: z.number(),
          checkIntervalMinutes: z.number().min(1).max(1440),
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

          await updateProduct(input.productId, {
            checkIntervalMinutes: input.checkIntervalMinutes,
          });

          const updatedProduct = await getProductById(input.productId);
          if (updatedProduct) {
            updateProductSchedule(updatedProduct);
          }

          return {
            success: true,
            message: "Check interval updated successfully",
          };
        } catch (error: any) {
          if (error.code) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to update check interval",
          });
        }
      }),

    // Update product price alert threshold
    updateAlertThreshold: publicProcedure
      .input(
        z.object({
          productId: z.number(),
          priceAlertThreshold: z.number().min(0).max(100),
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

          await updateProduct(input.productId, {
            priceAlertThreshold: input.priceAlertThreshold,
          });

          return {
            success: true,
            message: "Alert threshold updated successfully",
          };
        } catch (error: any) {
          if (error.code) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to update alert threshold",
          });
        }
      }),

    // Import products from CSV
    importFromCsv: publicProcedure
      .input(
        z.object({
          csvContent: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Parse CSV
          const rows = parseCsv(input.csvContent);

          if (rows.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "CSV file is empty or has no valid product rows",
            });
          }

          // Validate all rows
          const validationErrors = validateCsvImport(rows);
          if (validationErrors.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `CSV validation failed: ${validationErrors.map((e) => `Row ${e.row}: ${e.error}`).join("; ")}`,
            });
          }

          // Import products
          let successful = 0;
          let failed = 0;
          const errors: Array<{ row: number; error: string }> = [];

          for (let i = 0; i < rows.length; i++) {
            try {
              const row = rows[i];
              const input = row.url || row.productCode || "";

              // Use existing add product logic
              const result = await createProduct(
                0, // userId: Public product
                {
                  url: row.url || "",
                  productCode: row.productCode,
                  checkIntervalMinutes: row.checkIntervalMinutes || 60,
                  priceAlertThreshold: row.priceAlertThreshold || 10,
                  name: row.url || row.productCode || "Imported Product",
                }
              );

              if (result) {
                // Schedule price check
                scheduleProductPriceCheck(result);
                successful++;
              } else {
                failed++;
                errors.push({ row: i + 1, error: "Failed to create product" });
              }
            } catch (error: any) {
              failed++;
              errors.push({
                row: i + 1,
                error: error.message || "Unknown error",
              });
            }
          }

          return {
            total: rows.length,
            successful,
            failed,
            errors,
            message: `Imported ${successful} of ${rows.length} products successfully`,
          };
        } catch (error: any) {
          if (error.code) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to import CSV",
          });
        }
      }),
  }),

  // ============ ADMIN AUTHENTICATION ============
  admin: router({
    // Get admin settings
    getSettings: publicProcedure.query(async () => {
      return getOrCreateSettings(0);
    }),

    // Admin login
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
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

    // List all jobs
    jobs: publicProcedure.query(async () => {
      return getAllJobs();
    }),

    // Get job details with execution history
    jobDetails: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        const job = await getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job not found",
          });
        }

        const executions = await getJobExecutions(input.jobId, 50);
        return { job, executions };
      }),

    // Create job
    createJob: publicProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          jobType: z.enum(["price_check", "cleanup", "report", "custom"]),
          cronExpression: z.string(),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const job = await createJob(input);
          if (job) {
            scheduleJob(job);
          }
          return job;
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to create job",
          });
        }
      }),

    // Update job
    updateJob: publicProcedure
      .input(
        z.object({
          jobId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          cronExpression: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const { jobId, ...updates } = input;
          const job = await updateJob(jobId, updates);

          if (job) {
            if (updates.isActive === false) {
              unscheduleJob(jobId);
            } else if (updates.isActive === true || updates.cronExpression) {
              scheduleJob(job);
            }
          }

          return job;
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to update job",
          });
        }
      }),

    // Delete job
    deleteJob: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          unscheduleJob(input.jobId);
          const success = await deleteJob(input.jobId);
          return { success };
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to delete job",
          });
        }
      }),

    // Execute job manually
    executeJob: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const job = await getJobById(input.jobId);
          if (!job) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Job not found",
            });
          }

          await executeJob(job);
          return { success: true, message: "Job executed" };
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to execute job",
          });
        }
      })
  }),

  // ============ AUTHENTICATION ============
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ SYSTEM ROUTER ============
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
