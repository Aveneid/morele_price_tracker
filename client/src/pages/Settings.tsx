import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const updateSettingsMutation = trpc.settings.update.useMutation();

  const [trackingInterval, setTrackingInterval] = useState("60");
  const [alertThreshold, setAlertThreshold] = useState("10");

  useEffect(() => {
    if (settings) {
      setTrackingInterval(settings.trackingIntervalMinutes.toString());
      setAlertThreshold(settings.priceDropAlertThreshold.toString());
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const interval = parseInt(trackingInterval);
      const threshold = parseInt(alertThreshold);

      if (isNaN(interval) || interval < 5 || interval > 1440) {
        toast.error("Tracking interval must be between 5 and 1440 minutes");
        return;
      }

      if (isNaN(threshold) || threshold < 1 || threshold > 100) {
        toast.error("Alert threshold must be between 1 and 100 percent");
        return;
      }

      await updateSettingsMutation.mutateAsync({
        trackingIntervalMinutes: interval,
        priceDropAlertThreshold: threshold,
      });

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure price tracking and alert preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Price Tracking Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="interval">
                  Tracking Interval (minutes)
                </Label>
                <Input
                  id="interval"
                  type="number"
                  min="5"
                  max="1440"
                  value={trackingInterval}
                  onChange={(e) => setTrackingInterval(e.target.value)}
                  disabled={updateSettingsMutation.isPending}
                />
                <p className="text-xs text-gray-500">
                  How often to check prices (5-1440 minutes)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">
                  Price Drop Alert Threshold (%)
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  disabled={updateSettingsMutation.isPending}
                />
                <p className="text-xs text-gray-500">
                  Alert when price drops by this percentage (1-100%)
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Price tracking will automatically run at the
                configured interval. You'll receive notifications when prices drop by
                the specified threshold or more.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              size="lg"
            >
              {updateSettingsMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-600">Name</Label>
              <p className="text-lg font-medium">{user?.name || "Not set"}</p>
            </div>
            <div>
              <Label className="text-gray-600">Email</Label>
              <p className="text-lg font-medium">{user?.email || "Not set"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
