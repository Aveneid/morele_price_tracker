import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import crypto from "crypto";
import { getAdminByUsername, getDb, createAdminSession, getAdminSessionByToken, deleteAdminSession, cleanupExpiredAdminSessions } from "../db";
import { adminUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { APP_CONFIG } from "../../shared/config";

const ADMIN_SESSION_COOKIE = "admin_session";

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

/**
 * Create admin session token
 */
function createAdminSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get admin session from cookie
 */
function getAdminSessionFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(ADMIN_SESSION_COOKIE + "=")) {
      return cookie.substring(ADMIN_SESSION_COOKIE.length + 1);
    }
  }
  return null;
}

export const adminRouter = router({
  // Check if admin is authenticated
  checkAuth: publicProcedure.query(async ({ ctx }) => {
    const sessionToken = getAdminSessionFromCookie(ctx.req?.headers.cookie);
    
    if (!sessionToken) {
      return {
        isAuthenticated: false,
      };
    }

    // Validate session token against database
    const session = await getAdminSessionByToken(sessionToken);
    
    if (!session) {
      return {
        isAuthenticated: false,
      };
    }

    return {
      isAuthenticated: true,
      adminId: session.adminId,
    };
  }),

  // Admin login with database credentials
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Get admin from database
      const admin = await getAdminByUsername(input.username);

      if (!admin || !verifyPasswordSHA1(input.password, admin.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Create session token and store in database
      const token = createAdminSessionToken();
      const expiresAt = new Date(Date.now() + APP_CONFIG.admin.sessionExpirationMs);
      
      const session = await createAdminSession(admin.id, token, expiresAt);
      
      if (!session) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create session",
        });
      }

      // Set admin session cookie
      const maxAge = Math.floor(APP_CONFIG.admin.sessionExpirationMs / 1000);
      const cookieValue = `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
      ctx.res?.setHeader("Set-Cookie", cookieValue);

      return {
        success: true,
        message: "Login successful",
        admin: {
          id: admin.id,
          username: admin.username,
        },
      };
    }),

  // Admin logout
  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Get session token from cookie
    const sessionToken = getAdminSessionFromCookie(ctx.req?.headers.cookie);
    
    if (sessionToken) {
      // Delete session from database
      await deleteAdminSession(sessionToken);
    }

    // Clear admin session cookie
    ctx.res?.setHeader(
      "Set-Cookie",
      `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
    );

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

  // Create initial admin user (for setup only)
  createInitialAdmin: publicProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Check if any admin exists
      const existingAdmins = await db.select().from(adminUsers).limit(1);
      if (existingAdmins.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin user already exists. No registration available.",
        });
      }

      // Create admin with hashed password
      const passwordHash = hashPasswordSHA1(input.password);
      
      try {
        await db.insert(adminUsers).values({
          username: input.username,
          passwordHash,
        });

        return {
          success: true,
          message: "Admin user created successfully",
        };
      } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already exists",
          });
        }
        throw error;
      }
    }),

  // Cleanup expired sessions (can be called periodically)
  cleanupExpiredSessions: publicProcedure.mutation(async () => {
    await cleanupExpiredAdminSessions();
    return {
      success: true,
      message: "Expired sessions cleaned up",
    };
  }),

  // Get session configuration
  getSessionConfig: publicProcedure.query(() => {
    return {
      expirationMs: APP_CONFIG.admin.sessionExpirationMs,
      expirationDays: Math.floor(APP_CONFIG.admin.sessionExpirationMs / (24 * 60 * 60 * 1000)),
      refreshIntervalMs: APP_CONFIG.admin.sessionRefreshIntervalMs,
    };
  }),
});
