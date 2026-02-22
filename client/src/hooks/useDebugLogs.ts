import { useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export interface DebugLogMessage {
  type: 'debug_log' | 'sql_query';
  label?: string;
  args?: any[];
  query?: string;
  params?: unknown[];
  timestamp: string;
}

export function useDebugLogs(onLog?: (log: DebugLogMessage) => void) {
  const lastTimestampRef = useRef<string | null>(null);

  const debugModeEnabled = typeof window !== 'undefined' && localStorage.getItem('debugMode') === 'true';
  
  const { data: logs } = trpc.debug.getLogs.useQuery(
    { since: lastTimestampRef.current || undefined },
    {
      enabled: debugModeEnabled,
      refetchInterval: 1000, // Poll every 1 second
    }
  );

  const clearLogsMutation = trpc.debug.clearLogs.useMutation();

  const setDebugMode = useCallback((enabled: boolean) => {
    if (enabled) {
      lastTimestampRef.current = null;
      // Reset polling when debug mode is enabled
    }
  }, []);

  useEffect(() => {
    if (logs && logs.length > 0) {
      logs.forEach((log) => {
        if (onLog) {
          onLog(log);
        }

        // Log to browser console
        if (log.type === 'debug_log') {
          console.log(`[${log.label}]`, ...(log.args || []));
        } else if (log.type === 'sql_query') {
          console.group(`[SQL] ${log.query}`);
          if (log.params && log.params.length > 0) {
            console.log('Parameters:', log.params);
          }
          console.groupEnd();
        }

        // Update last timestamp
        lastTimestampRef.current = log.timestamp;
      });
    }
  }, [logs, onLog]);

  return {
    setDebugMode,
    clearLogs: () => clearLogsMutation.mutate(),
    isLoading: false,
  };
}
