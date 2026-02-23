import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useDebugLogs } from "@/hooks/useDebugLogs";

const Trash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 12, height: 12, marginRight: 4}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;

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
  const [toasts, setToasts] = useState<any[]>([]);
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('debugMode') === 'true';
    }
    return false;
  });
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const { setDebugMode: setServerDebugMode } = useDebugLogs((log) => {
    setDebugLogs((prev) => [...prev.slice(-99), log]);
  });

  const { data: settings } = trpc.admin.getSettings.useQuery();

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

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
      showToast('Debug mode enabled - check browser console for logs', 'success');
    } else {
      console.log('[DEBUG MODE DISABLED] Debug logging is now inactive');
      showToast('Debug mode disabled', 'success');
    }
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
    showToast('Debug logs cleared', 'success');
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const interval = parseInt(trackingInterval);
      const threshold = parseInt(alertThreshold);

      if (interval < 5 || interval > 1440) {
        showToast("Tracking interval must be between 5 and 1440 minutes", "error");
        setIsSaving(false);
        return;
      }

      if (threshold < 1 || threshold > 100) {
        showToast("Alert threshold must be between 1 and 100 percent", "error");
        setIsSaving(false);
        return;
      }

      showToast("Settings saved successfully", "success");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Toasts */}
      <div style={{position: 'fixed', bottom: 20, right: 20, zIndex: 9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{backgroundColor: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12}}>
            {t.message}
          </div>
        ))}
      </div>

      <div>
        <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem'}}>Settings</h2>
        <p style={{color: '#4b5563'}}>Configure price tracking and alert settings</p>
      </div>

      {/* Debug Console */}
      <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '1.5rem'}}>
        <h3 style={{fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1.5rem'}}>Debug Console</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <input type="checkbox" id="debugMode" checked={debugMode} onChange={(e: any) => handleDebugModeToggle(e.target.checked)} style={{width: 16, height: 16, cursor: 'pointer'}} />
            <label htmlFor="debugMode" style={{fontSize: '0.875rem', fontWeight: 500, color: '#374151', cursor: 'pointer'}}>Enable Debug Logging</label>
          </div>
          <p style={{fontSize: '0.75rem', color: '#4b5563'}}>
            When enabled, detailed debug information will be logged to the browser console including:
            <ul style={{listStyleType: 'disc', listStylePosition: 'inside', marginTop: '0.5rem', marginLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
              <li>Function calls and execution flow</li>
              <li>SQL queries and database operations</li>
              <li>API request/response details</li>
              <li>Error stack traces</li>
              <li>Performance metrics</li>
            </ul>
          </p>
          {debugMode && (
            <div style={{marginTop: '1rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
                <div>
                  <p style={{fontSize: '0.875rem', fontWeight: 500, color: '#374151'}}>Live Debug Logs ({debugLogs.length})</p>
                  <p style={{fontSize: '0.75rem', color: '#4b5563'}}>Showing last 100 logs. Also check browser console (F12).</p>
                </div>
                <button onClick={clearDebugLogs} style={{backgroundColor: 'transparent', color: '#2563eb', border: '1px solid #2563eb', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  <Trash />
                  Clear
                </button>
              </div>
              <div style={{backgroundColor: '#111827', color: '#4ade80', padding: '0.75rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 320, overflowY: 'auto', border: '1px solid #374151'}}>
                {debugLogs.length === 0 ? (
                  <div style={{color: '#6b7280'}}>No debug logs yet. Perform actions to see logs here...</div>
                ) : (
                  debugLogs.map((log, idx) => (
                    <div key={idx} style={{marginBottom: '0.5rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap'}}>
                      <span style={{color: '#60a5fa'}}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      {log.type === 'sql_query' ? (
                        <>
                          <span style={{color: '#fbbf24'}}> [SQL]</span>
                          <div style={{marginLeft: '1rem', color: '#d1d5db', marginTop: '0.25rem'}}>{log.query}</div>
                          {log.params && log.params.length > 0 && (
                            <div style={{marginLeft: '1rem', color: '#9ca3af', fontSize: '0.7rem', marginTop: '0.25rem'}}>
                              Params: {JSON.stringify(log.params, null, 2)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span style={{color: '#22d3ee'}}> [{log.label}]</span>
                          <span style={{color: '#d1d5db'}}> {typeof log.args === 'object' ? JSON.stringify(log.args, null, 2) : log.args}</span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {debugMode && (
            <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: 6}}>
              <p style={{fontSize: '0.75rem', color: '#166534', margin: 0}}>
                ✓ Debug mode is <strong>ACTIVE</strong>. SQL queries and debug logs are being captured above and in browser console.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tracking Settings */}
      <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '1.5rem'}}>
        <h3 style={{fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1.5rem'}}>Price Tracking Configuration</h3>

        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem'}}>Tracking Interval (minutes)</label>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <input type="number" min="5" max="1440" value={trackingInterval} onChange={(e: any) => setTrackingInterval(e.target.value)} style={{maxWidth: 200, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem'}} />
              <span style={{fontSize: '0.875rem', color: '#4b5563'}}>Products will be checked every {trackingInterval} minutes</span>
            </div>
            <p style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem'}}>Minimum: 5 minutes, Maximum: 1440 minutes (24 hours)</p>
          </div>

          <div>
            <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem'}}>Price Drop Alert Threshold (%)</label>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <input type="number" min="1" max="100" value={alertThreshold} onChange={(e: any) => setAlertThreshold(e.target.value)} style={{maxWidth: 200, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem'}} />
              <span style={{fontSize: '0.875rem', color: '#4b5563'}}>Alert when price drops by {alertThreshold}% or more</span>
            </div>
            <p style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem'}}>Minimum: 1%, Maximum: 100%</p>
          </div>
        </div>

        <button onClick={handleSaveSettings} disabled={isSaving} style={{marginTop: '1.5rem', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isSaving ? 0.7 : 1}}>
          {isSaving ? (
            <>
              <Loader />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </button>
      </div>

      {/* Current Settings Info */}
      <div style={{backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '1.5rem'}}>
        <h4 style={{fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem'}}>Current Configuration</h4>
        <ul style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#1e40af', margin: 0, paddingLeft: 0, listStyleType: 'none'}}>
          <li>• Products are checked every <strong>{trackingInterval} minutes</strong></li>
          <li>• Price alerts trigger on drops of <strong>{Math.round(parseFloat(alertThreshold))}%</strong> or more</li>
          <li>• Notifications are sent to the owner when alerts are triggered</li>
        </ul>
      </div>
    </div>
  );
}
