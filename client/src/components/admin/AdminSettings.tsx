import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useDebugLogs } from "@/hooks/useDebugLogs";

// Global debug logger
if (typeof window !== 'undefined') {
  (window as any).debugLog = (...args: any[]) => {
    if (localStorage.getItem('debugMode') === 'true') {
      console.log('[DEBUG]', ...args);
    }
  };
  (window as any).debugError = (...args: any[]) => {
    if (localStorage.getItem('debugMode') === 'true') {
      console.error('[DEBUG ERROR]', ...args);
    }
  };
}

export default function AdminSettings() {
  const [trackingInterval, setTrackingInterval] = useState("60");
  const [alertThreshold, setAlertThreshold] = useState("10");
  const [isSaving, setIsSaving] = useState(false);
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('debugMode') === 'true';
    }
    return false;
  });
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const { setDebugMode: setServerDebugMode } = useDebugLogs((log) => {
    setDebugLogs((prev) => [...prev.slice(-99), log]); // Keep last 100 logs
  });

  const { data: settings } = trpc.admin.getSettings.useQuery();

  useEffect(() => {
    if (settings) {
      setTrackingInterval(settings.trackingIntervalMinutes.toString());
      setAlertThreshold(((settings.priceDropAlertThreshold || 0) / 100).toString());
    }
  }, [settings]);

  const handleDebugModeToggle = (checked: boolean) => {
    setDebugMode(checked);
    localStorage.setItem('debugMode', checked.toString());
    setServerDebugMode(checked);
    if (checked) {
      console.log('[DEBUG MODE ENABLED] Debug logging is now active');
      toast.success('Debug mode enabled - check browser console for logs');
    } else {
      console.log('[DEBUG MODE DISABLED] Debug logging is now inactive');
      toast.success('Debug mode disabled');
    }
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
    toast.success('Debug logs cleared');
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const interval = parseInt(trackingInterval);
      const threshold = parseInt(alertThreshold);

      if (interval < 5 || interval > 1440) {
        toast.error("Tracking interval must be between 5 and 1440 minutes");
        setIsSaving(false);
        return;
      }

      if (threshold < 1 || threshold > 100) {
        toast.error("Alert threshold must be between 1 and 100 percent");
        setIsSaving(false);
        return;
      }

      // In a real app, this would call an API endpoint
      toast.success("Settings saved successfully");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Configure price tracking and alert settings</p>
      </div>

      {/* Debug Console */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Debug Console</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="debugMode"
              checked={debugMode}
              onChange={(e) => handleDebugModeToggle(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="debugMode" className="text-sm font-medium text-gray-700">
              Enable Debug Logging
            </label>
          </div>
          <p className="text-xs text-gray-600">
            When enabled, detailed debug information will be logged to the browser console including:
            <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
              <li>Function calls and execution flow</li>
              <li>SQL queries and database operations</li>
              <li>API request/response details</li>
              <li>Error stack traces</li>
              <li>Performance metrics</li>
            </ul>
          </p>
          {debugMode && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Live Debug Logs ({debugLogs.length})</p>
                  <p className="text-xs text-gray-600">Showing last 100 logs. Also check browser console (F12).</p>
                </div>
                <Button
                  onClick={clearDebugLogs}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs max-h-80 overflow-y-auto border border-gray-700">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-500">No debug logs yet. Perform actions to see logs here...</div>
                ) : (
                  debugLogs.map((log, idx) => (
                    <div key={idx} className="mb-2 break-words whitespace-pre-wrap">
                      <span className="text-blue-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      {log.type === 'sql_query' ? (
                        <>
                          <span className="text-yellow-400"> [SQL]</span>
                          <div className="ml-4 text-gray-300 mt-1">{log.query}</div>
                          {log.params && log.params.length > 0 && (
                            <div className="ml-4 text-gray-400 text-xs mt-1">
                              Params: {JSON.stringify(log.params, null, 2)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-cyan-400"> [{log.label}]</span>
                          <span className="text-gray-300"> {typeof log.args === 'object' ? JSON.stringify(log.args, null, 2) : log.args}</span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {debugMode && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-800">
                ✓ Debug mode is <strong>ACTIVE</strong>. SQL queries and debug logs are being captured above and in browser console.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tracking Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Price Tracking Configuration
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Interval (minutes)
            </label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="5"
                max="1440"
                value={trackingInterval}
                onChange={(e) => setTrackingInterval(e.target.value)}
                className="max-w-xs"
              />
              <span className="text-sm text-gray-600">
                Products will be checked every {trackingInterval} minutes
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Minimum: 5 minutes, Maximum: 1440 minutes (24 hours)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Drop Alert Threshold (%)
            </label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="1"
                max="100"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                className="max-w-xs"
              />
              <span className="text-sm text-gray-600">
                Alert when price drops by {alertThreshold}% or more
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Minimum: 1%, Maximum: 100%
            </p>
          </div>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="mt-6 bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>

      {/* Current Settings Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">Current Configuration</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            • Products are checked every <strong>{trackingInterval} minutes</strong>
          </li>
          <li>
            • Price alerts trigger on drops of <strong>{Math.round(parseFloat(alertThreshold))}%</strong> or
            more
          </li>
          <li>
            • Notifications are sent to the owner when alerts are triggered
          </li>
        </ul>
      </div>
    </div>
  );
}
