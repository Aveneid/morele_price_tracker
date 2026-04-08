/**
 * Application Configuration
 * Centralized configuration for the application
 */

export const APP_CONFIG = {
  // Admin session configuration (in milliseconds)
  admin: {
    // Session expiration time (7 days by default)
    sessionExpirationMs: 7 * 24 * 60 * 60 * 1000,
    
    // Session refresh interval (5 minutes)
    sessionRefreshIntervalMs: 5 * 60 * 1000,
    
    // Auth check retry attempts
    authCheckRetries: 1,
  },

  // Price tracking configuration
  tracking: {
    // Default tracking interval in minutes
    defaultIntervalMinutes: 60,
    
    // Price drop alert threshold percentage
    priceDropThresholdPercent: 10,
  },

  // UI configuration
  ui: {
    // Toast notification duration in milliseconds
    toastDurationMs: 3000,
    
    // Loading spinner animation
    spinnerAnimationMs: 500,
  },
};

/**
 * Get session expiration time in days
 */
export function getSessionExpirationDays(): number {
  return APP_CONFIG.admin.sessionExpirationMs / (24 * 60 * 60 * 1000);
}

/**
 * Get session expiration time in hours
 */
export function getSessionExpirationHours(): number {
  return APP_CONFIG.admin.sessionExpirationMs / (60 * 60 * 1000);
}
