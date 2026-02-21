import { useEffect, useRef, useCallback } from 'react';

export interface DebugLogMessage {
  type: 'debug_log' | 'sql_query' | 'connected' | 'error';
  label?: string;
  args?: any[];
  query?: string;
  params?: unknown[];
  timestamp: string;
  message?: string;
}

export function useDebugLogs(onLog?: (log: DebugLogMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/debug-logs`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[Debug Logs] Connected to debug log server');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: DebugLogMessage = JSON.parse(event.data);
          
          // Log to browser console
          if (message.type === 'debug_log') {
            console.log(`[${message.label}]`, ...(message.args || []));
          } else if (message.type === 'sql_query') {
            console.group(`[SQL] ${message.query}`);
            if (message.params && message.params.length > 0) {
              console.log('Parameters:', message.params);
            }
            console.groupEnd();
          } else if (message.type === 'connected') {
            console.log('[Debug Logs] Server connection established');
          }

          // Call callback if provided
          if (onLog) {
            onLog(message);
          }
        } catch (error) {
          console.error('[Debug Logs] Error parsing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[Debug Logs] WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('[Debug Logs] Disconnected from debug log server');
      };
    } catch (error) {
      console.error('[Debug Logs] Failed to connect:', error);
    }
  }, [onLog]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const setDebugMode = useCallback((enabled: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'set_debug_mode',
        enabled,
      }));
    }
  }, []);

  useEffect(() => {
    // Only connect if debug mode is enabled in localStorage
    const debugMode = localStorage.getItem('debugMode') === 'true';
    if (debugMode) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    setDebugMode,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
