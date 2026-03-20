import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getBrowserFingerprint } from "@/lib/fingerprint";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface PriceAlertManagerProps {
  productId: number;
  currentPrice: number; // in cents
}

export function PriceAlertManager({ productId, currentPrice }: PriceAlertManagerProps) {
  const [userFingerprint, setUserFingerprint] = useState<string>("");
  const [alertType, setAlertType] = useState<"price" | "percent">("percent");
  const [threshold, setThreshold] = useState<string>("10");
  const [isLoading, setIsLoading] = useState(false);

  const { data: alerts, refetch: refetchAlerts } = trpc.priceAlerts.getForProduct.useQuery(
    {
      productId,
      userFingerprint: userFingerprint || "",
    },
    {
      enabled: !!userFingerprint,
    }
  );

  const createAlertMutation = trpc.priceAlerts.create.useMutation({
    onSuccess: () => {
      toast.success("Price alert created!");
      setThreshold("10");
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create alert");
    },
  });

  const deleteAlertMutation = trpc.priceAlerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert removed");
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete alert");
    },
  });

  useEffect(() => {
    const fingerprint = getBrowserFingerprint();
    setUserFingerprint(fingerprint);
  }, []);

  const handleCreateAlert = async () => {
    if (!threshold || isNaN(Number(threshold))) {
      toast.error("Please enter a valid threshold");
      return;
    }

    setIsLoading(true);
    try {
      const thresholdValue = alertType === "percent" 
        ? Math.round(Number(threshold) * 100) // Convert percentage to * 100
        : Math.round(Number(threshold) * 100); // Convert price to cents

      await createAlertMutation.mutateAsync({
        userFingerprint,
        productId,
        alertType,
        threshold: thresholdValue,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAlert = (alertId: number) => {
    deleteAlertMutation.mutate({ alertId });
  };

  const formatThreshold = (value: number, type: "price" | "percent") => {
    if (type === "percent") {
      return `${(value / 100).toFixed(2)}%`;
    } else {
      return `${(value / 100).toFixed(2)} PLN`;
    }
  };

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)} PLN`;
  };

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Price Alerts</h3>
        <p className="text-sm text-gray-600 mb-4">
          Get notified when the price reaches your threshold
        </p>

        {/* Create Alert Form */}
        <Card className="p-4 mb-4 bg-gray-50">
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setAlertType("percent")}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition ${
                  alertType === "percent"
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                By Percentage
              </button>
              <button
                onClick={() => setAlertType("price")}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition ${
                  alertType === "price"
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                By Price
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={alertType === "percent" ? "e.g., 10" : "e.g., 1500"}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                step={alertType === "percent" ? "0.1" : "1"}
                min="0"
                className="flex-1"
              />
              <Button
                onClick={handleCreateAlert}
                disabled={isLoading || createAlertMutation.isPending}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Alert
              </Button>
            </div>

            {alertType === "percent" && (
              <p className="text-xs text-gray-500">
                You'll be notified when price drops by {threshold}% or more
              </p>
            )}
            {alertType === "price" && (
              <p className="text-xs text-gray-500">
                You'll be notified when price reaches {formatPrice(Math.round(Number(threshold) * 100))} or lower
              </p>
            )}
          </div>
        </Card>

        {/* Active Alerts List */}
        {alerts && alerts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Active Alerts ({alerts.length})</p>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded"
              >
                <div>
                  <p className="text-sm font-medium">
                    {alert.alertType === "percent"
                      ? `Price drops by ${formatThreshold(alert.threshold, "percent")}`
                      : `Price reaches ${formatThreshold(alert.threshold, "price")}`}
                  </p>
                  <p className="text-xs text-gray-600">
                    Current: {formatPrice(currentPrice)}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  disabled={deleteAlertMutation.isPending}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No active alerts. Create one to get started!
          </p>
        )}
      </div>
    </div>
  );
}
