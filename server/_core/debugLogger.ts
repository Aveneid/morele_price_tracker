/**
 * Debug logging utility for server-side debugging
 * Logs are only emitted when DEBUG_MODE environment variable is set to 'true'
 * Stores logs in memory for retrieval via tRPC
 */

import { addDebugLog } from "../debugLogStore";

export function isDebugMode(): boolean {
  return process.env.DEBUG_MODE === 'true';
}

export function debugLog(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    addDebugLog(label, ...args);
  }
}

export function debugError(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    addDebugLog(`ERROR_${label}`, ...args);
  }
}

export function debugWarn(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    addDebugLog(`WARN_${label}`, ...args);
  }
}

export function debugTable(label: string, data: any): void {
  if (isDebugMode()) {
    addDebugLog(`TABLE_${label}`, data);
  }
}

export function debugTime(label: string): () => void {
  if (isDebugMode()) {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      addDebugLog(`TIMER_${label}`, `${duration}ms`);
    };
  }
  return () => {};
}
