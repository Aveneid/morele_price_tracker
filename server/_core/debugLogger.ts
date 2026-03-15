/**
 * Debug logging utility for server-side debugging
 * Logs are only emitted when DEBUG_MODE environment variable is set to 'true'
 */

export function isDebugMode(): boolean {
  return process.env.DEBUG_MODE === 'true';
}

export function debugLog(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    console.log(`[DEBUG ${label}]`, ...args);
  }
}

export function debugError(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    console.error(`[DEBUG ERROR ${label}]`, ...args);
  }
}

export function debugWarn(label: string, ...args: any[]): void {
  if (isDebugMode()) {
    console.warn(`[DEBUG WARN ${label}]`, ...args);
  }
}

export function debugTable(label: string, data: any): void {
  if (isDebugMode()) {
    console.log(`[DEBUG ${label}]`);
    console.table(data);
  }
}

export function debugTime(label: string): () => void {
  if (isDebugMode()) {
    console.time(`[DEBUG ${label}]`);
    return () => console.timeEnd(`[DEBUG ${label}]`);
  }
  return () => {};
}
