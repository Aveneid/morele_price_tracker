/**
 * Admin session storage utility
 * Stores admin session token in memory and sessionStorage for persistence
 */

const ADMIN_SESSION_KEY = "admin_session_token";
let sessionToken: string | null = null;

/**
 * Initialize session from sessionStorage on page load
 */
export function initializeAdminSession(): void {
  if (typeof window !== "undefined") {
    sessionToken = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (sessionToken) {
      console.log("[AdminSessionStorage] Restored session from storage");
    }
  }
}

/**
 * Set admin session token
 */
export function setAdminSessionToken(token: string): void {
  sessionToken = token;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(ADMIN_SESSION_KEY, token);
    console.log("[AdminSessionStorage] Session token stored");
  }
}

/**
 * Get admin session token
 */
export function getAdminSessionToken(): string | null {
  return sessionToken;
}

/**
 * Clear admin session token
 */
export function clearAdminSessionToken(): void {
  sessionToken = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    console.log("[AdminSessionStorage] Session token cleared");
  }
}

/**
 * Check if admin has a session
 */
export function hasAdminSession(): boolean {
  return !!sessionToken;
}
