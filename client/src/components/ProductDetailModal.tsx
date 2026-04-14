import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, ExternalLink, RefreshCw, Copy, Check, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PriceAlertManager } from "./PriceAlertManager";

interface ProductDetailModalProps {
  productId: number;
  isOpen: boolean;
  onClose: () => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold text-gray-800">{data.date}</p>
        <p className="text-blue-600 font-bold">{data.price.toFixed(2)} zł</p>
      </div>
    );
  }
  return null;
};

export default function ProductDetailModal({
  productId,
  isOpen,
  onClose,
}: ProductDetailModalProps) {
  const [copied, setCopied] = useState(false);
  
  const { data: product, isLoading: productLoading } =
    trpc.products.get.useQuery({ id: productId }, { enabled: isOpen });
  const { data: priceHistory, isLoading: historyLoading } =
    trpc.products.priceHistory.useQuery(
      { productId },
      { enabled: isOpen && !!product }
    );

  const priceCheckMutation = trpc.products.requestPriceCheck.useMutation({
    onSuccess: () => {
      toast.success("Price check requested!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request price check");
    },
  });

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/product/${productId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "N/A";
    return `${(cents / 100).toFixed(2)} zł`;
  };

  const canRequestPriceCheck = () => {
    if (!product?.lastCheckedAt) return true;
    const lastCheckTime = new Date(product.lastCheckedAt).getTime();
    const now = Date.now();
    const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);
    return minutesSinceLastCheck >= 15;
  };

  const getMinutesUntilNextCheck = () => {
    if (!product?.lastCheckedAt) return 0;
    const lastCheckTime = new Date(product.lastCheckedAt).getTime();
    const now = Date.now();
    const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);
    return Math.ceil(15 - minutesSinceLastCheck);
  };

  const chartData = (priceHistory || [])
    .slice()
    .reverse()
    .map((entry: any) => ({
      date: new Date(entry.recordedAt).toLocaleDateString("pl-PL"),
      price: entry.price / 100,
      timestamp: entry.recordedAt,
    }));

  // Calculate price analytics
  const calculatePriceAnalytics = () => {
    if (!priceHistory || priceHistory.length === 0) {
      return { sevenDayAvg: null, thirtyDayAvg: null, sevenDayChange: null, thirtyDayChange: null };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sevenDayPrices = priceHistory.filter(
      (entry: any) => new Date(entry.recordedAt) >= sevenDaysAgo
    );
    const thirtyDayPrices = priceHistory.filter(
      (entry: any) => new Date(entry.recordedAt) >= thirtyDaysAgo
    );

    const sevenDayAvg =
      sevenDayPrices.length > 0
        ? sevenDayPrices.reduce((sum: number, entry: any) => sum + entry.price / 100, 0) /
          sevenDayPrices.length
        : null;

    const thirtyDayAvg =
      thirtyDayPrices.length > 0
        ? thirtyDayPrices.reduce((sum: number, entry: any) => sum + entry.price / 100, 0) /
          thirtyDayPrices.length
        : null;

    const currentPrice = product?.currentPrice ? product.currentPrice / 100 : 0;
    const sevenDayChange = sevenDayAvg ? ((currentPrice - sevenDayAvg) / sevenDayAvg) * 100 : null;
    const thirtyDayChange = thirtyDayAvg ? ((currentPrice - thirtyDayAvg) / thirtyDayAvg) * 100 : null;

    return { sevenDayAvg, thirtyDayAvg, sevenDayChange, thirtyDayChange };
  };

  const analytics = calculatePriceAnalytics();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {productLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : product ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{product.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Product Image and Price Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4 min-h-[300px]">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="max-w-full max-h-[300px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <p>No image available</p>
                    </div>
                  )}
                </div>

                {/* Price Information */}
                <div className="flex flex-col justify-center space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold uppercase">
                      Current Price
                    </p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">
                      {formatPrice(product.currentPrice)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">
                        Previous Price
                      </p>
                      <p className="text-lg font-bold text-gray-700 mt-1">
                        {formatPrice(product.previousPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">
                        Change
                      </p>
                      <p
                        className={`text-lg font-bold mt-1 ${
                          product.priceChangePercent === null ||
                          product.priceChangePercent === 0
                            ? "text-gray-600"
                            : product.priceChangePercent < 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {product.priceChangePercent === null
                          ? "N/A"
                          : `${(product.priceChangePercent / 100).toFixed(2)}%`}
                      </p>
                    </div>
                  </div>

                  {product.category && (
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">
                        Category
                      </p>
                      <p className="text-lg font-bold text-gray-700 mt-1">
                        {product.category}
                      </p>
                    </div>
                  )}

                  {canRequestPriceCheck() ? (
                    <Button
                      onClick={() =>
                        priceCheckMutation.mutate({ productId })
                      }
                      disabled={priceCheckMutation.isPending}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    >
                      {priceCheckMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Request Price Check
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="w-full mt-4 p-3 bg-gray-100 rounded text-sm text-gray-600 text-center">
                      Next check available in {getMinutesUntilNextCheck()} min
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-2">
                    <Button
                      onClick={() => window.open(product.url, "_blank")}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on morele.net
                    </Button>
                    <Button
                      onClick={handleCopyShareLink}
                      variant="outline"
                      className="w-full whitespace-nowrap"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Share
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Price Analytics */}
              {analytics.sevenDayAvg !== null || analytics.thirtyDayAvg !== null ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  {analytics.sevenDayAvg !== null && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">7-Day Average</h3>
                        {analytics.sevenDayChange !== null && (
                          <div
                            className={`flex items-center gap-1 text-sm font-semibold ${
                              analytics.sevenDayChange > 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {analytics.sevenDayChange > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {Math.abs(analytics.sevenDayChange).toFixed(2)}%
                          </div>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.sevenDayAvg.toFixed(2)} zł
                      </p>
                    </div>
                  )}
                  {analytics.thirtyDayAvg !== null && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">30-Day Average</h3>
                        {analytics.thirtyDayChange !== null && (
                          <div
                            className={`flex items-center gap-1 text-sm font-semibold ${
                              analytics.thirtyDayChange > 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {analytics.thirtyDayChange > 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {Math.abs(analytics.thirtyDayChange).toFixed(2)}%
                          </div>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.thirtyDayAvg.toFixed(2)} zł
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Price History Chart */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Price History (Last 30 Days)
                </h3>
                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No price history available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Price (zł)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Price Alerts Manager */}
              <PriceAlertManager productId={productId} currentPrice={product.currentPrice || 0} />

              {/* Product Details */}
              <div className="border-t pt-4 text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>
                    <strong>Product Code:</strong>
                  </span>
                  <span>{product.productCode || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    <strong>Last Checked:</strong>
                  </span>
                  <span>
                    {product.lastCheckedAt
                      ? new Date(product.lastCheckedAt).toLocaleString("pl-PL")
                      : "Never"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    <strong>Added:</strong>
                  </span>
                  <span>
                    {new Date(product.createdAt).toLocaleString("pl-PL")}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
