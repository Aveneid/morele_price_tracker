/**
 * Simple in-memory debug log store
 * Stores debug logs and SQL queries for retrieval via tRPC
 */

export interface DebugLogEntry {
  type: 'debug_log' | 'sql_query';
  label?: string;
  args?: any[];
  query?: string;
  params?: unknown[];
  timestamp: string;
}

const MAX_LOGS = 100;
let debugLogs: DebugLogEntry[] = [];

export function addDebugLog(label: string, ...args: any[]): void {
  const entry: DebugLogEntry = {
    type: 'debug_log',
    label,
    args,
    timestamp: new Date().toISOString(),
  };

  debugLogs.push(entry);
  if (debugLogs.length > MAX_LOGS) {
    debugLogs = debugLogs.slice(-MAX_LOGS);
  }
}

export function addSqlQuery(query: string, params: unknown[]): void {
  const entry: DebugLogEntry = {
    type: 'sql_query',
    query,
    params,
    timestamp: new Date().toISOString(),
  };

  debugLogs.push(entry);
  if (debugLogs.length > MAX_LOGS) {
    debugLogs = debugLogs.slice(-MAX_LOGS);
  }
}

export function getDebugLogs(since?: string): DebugLogEntry[] {
  if (!since) {
    return debugLogs;
  }

  const sinceTime = new Date(since).getTime();
  return debugLogs.filter(log => new Date(log.timestamp).getTime() > sinceTime);
}

export function clearDebugLogs(): void {
  debugLogs = [];
}

export function getDebugLogsCount(): number {
  return debugLogs.length;
}
