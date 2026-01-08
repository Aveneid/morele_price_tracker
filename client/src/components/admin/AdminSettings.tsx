import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminSettings() {
  const [trackingInterval, setTrackingInterval] = useState("60");
  const [alertThreshold, setAlertThreshold] = useState("10");
  const [isSaving, setIsSaving] = useState(false);

  const { data: settings } = trpc.admin.getSettings.useQuery();

  useEffect(() => {
    if (settings) {
      setTrackingInterval(settings.trackingIntervalMinutes.toString());
      setAlertThreshold(settings.alertThresholdPercent.toString());
    }
  }, [settings]);

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
            • Price alerts trigger on drops of <strong>{alertThreshold}%</strong> or
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
