/**
 * Debug logging utility for server-side debugging
 * Logs are only emitted when DEBUG_MODE environment variable is set to 'true'
 * Also broadcasts to connected browser clients
 */

import { broadcastDebugLog } from "../debugBroadcaster";

export function isDebugMode(): boolean {
  return process.env.DEBUG_MODE === 'true';
}

export function debugLog(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    console.log(`[DEBUG ${label}]`, ...args);
    try {
      broadcastDebugLog(label, ...args);
    } catch (error) {
      // Silently fail if broadcaster is not available
    }
  }
}

export function debugError(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    console.error(`[DEBUG ERROR ${label}]`, ...args);
    try {
      broadcastDebugLog(`ERROR_${label}`, ...args);
    } catch (error) {
      // Silently fail if broadcaster is not available
    }
  }
}

export function debugWarn(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    console.warn(`[DEBUG WARN ${label}]`, ...args);
    try {
      broadcastDebugLog(`WARN_${label}`, ...args);
    } catch (error) {
      // Silently fail if broadcaster is not available
    }
  }
}

export function debugTable(label: string, data: any): void {
  if (isDebugMode()) {
    console.log(`[DEBUG ${label}]`);
    console.table(data);
    try {
      broadcastDebugLog(`TABLE_${label}`, data);
    } catch (error) {
      // Silently fail if broadcaster is not available
    }
  }
}

export function debugTime(label: string): () => void {
  if (isDebugMode()) {
    console.time(`[DEBUG ${label}]`);
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      console.timeEnd(`[DEBUG ${label}]`);
      try {
        broadcastDebugLog(`TIMER_${label}`, `${duration}ms`);
      } catch (error) {
        // Silently fail if broadcaster is not available
      }
    };
  }
  return () => {};
}
