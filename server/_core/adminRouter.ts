import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { ENV } from "./env";


const ADMIN_SESSION_COOKIE = "admin_session";

/**
 * Create admin session token
 */
function createAdminSessionToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Validate admin credentials
 */
function validateAdminCredentials(username: string, password: string): boolean {
  return username === ENV.adminUsername && password === ENV.adminPassword;
}

export const adminRouter = router({
  // Admin login
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!validateAdminCredentials(input.username, input.password)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Set admin session cookie
      const token = createAdminSessionToken();
      ctx.res?.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict`);

      return {
        success: true,
        message: "Login successful",
      };
    }),

  // Admin logout
  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Clear admin session cookie
    ctx.res?.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);

    return {
      success: true,
      message: "Logout successful",
    };
  }),

  // Get admin settings
  getSettings: publicProcedure.query(async () => {
    // Return default global settings (not user-specific)
    return {
      trackingIntervalMinutes: 60,
      priceDropAlertThreshold: 10,
    };
  }),

  // Update admin settings
  updateSettings: publicProcedure
    .input(
      z.object({
        trackingIntervalMinutes: z.number().optional(),
        priceDropAlertThreshold: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // For now, return success - in a real app, you'd update settings in the database
      return {
        success: true,
        message: "Settings updated successfully",
        settings: {
          trackingIntervalMinutes: input.trackingIntervalMinutes ?? 60,
          priceDropAlertThreshold: input.priceDropAlertThreshold ?? 10,
        },
      };
    }),
});
