import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Loader2, ExternalLink, RefreshCw, Copy, Check, Download, TrendingUp, TrendingDown } from "lucide-react";
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
import {
  filterPriceHistoryByRange,
  getPriceHistoryRange,
  getPriceHistoryRangeLabel,
  getPriceHistoryTrendWindowDays,
  type PriceHistoryRangePreset,
} from "@/lib/priceHistoryRange";

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
  const [rangePreset, setRangePreset] = useState<PriceHistoryRangePreset>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const rangeInput = useMemo(
    () => getPriceHistoryRange(rangePreset, customStartDate, customEndDate),
    [rangePreset, customStartDate, customEndDate],
  );
  const rangeLabel = getPriceHistoryRangeLabel(rangePreset, customStartDate, customEndDate);
  const trendWindowDays = getPriceHistoryTrendWindowDays(rangePreset, customStartDate, customEndDate);
  const historyQueryInput = useMemo(
    () => ({ productId, ...rangeInput, trendWindowDays }),
    [productId, rangeInput, trendWindowDays],
  );
  const customRangeInvalid = Boolean(
    rangePreset === "custom" && customStartDate && customEndDate && customStartDate > customEndDate,
  );

  const { data: product, isLoading: productLoading } =
    trpc.products.get.useQuery({ id: productId }, { enabled: isOpen });
  const { data: priceHistory, isLoading: historyLoading } =
    trpc.products.priceHistory.useQuery(
      historyQueryInput,
      { enabled: isOpen && !!product && !customRangeInvalid }
    );
  const { data: patternResponse, isLoading: patternsLoading } =
    trpc.products.pricePatterns.useQuery(
      historyQueryInput,
      { enabled: isOpen && !!product && !customRangeInvalid }
    );
  const exportHistoryQuery = trpc.products.exportHistory.useQuery(
    historyQueryInput,
    { enabled: false }
  );
  const visiblePriceHistory = useMemo(
    () => filterPriceHistoryByRange(priceHistory ?? [], rangeInput),
    [priceHistory, rangeInput],
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

  const handleDownloadHistory = async () => {
    try {
      const result = await exportHistoryQuery.refetch();
      const exportData = result.data;
      if (!exportData) {
        toast.error("No price history is available for export.");
        return;
      }

      const blob = new Blob([exportData.csv], { type: exportData.contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportData.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${exportData.rowCount} price records.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export price history.");
    }
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

  const chartData = visiblePriceHistory
    .slice()
    .reverse()
    .map((entry: any) => ({
      date: new Date(entry.recordedAt).toLocaleDateString("pl-PL"),
      price: entry.price / 100,
      timestamp: entry.recordedAt,
    }));

  // Calculate a summary for the currently selected stored-history range.
  const calculatePriceAnalytics = () => {
    if (visiblePriceHistory.length === 0) {
      return { average: null, change: null };
    }

    const ordered = visiblePriceHistory.slice().sort(
      (a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    const average = ordered.reduce((sum: number, entry: any) => sum + entry.price / 100, 0) / ordered.length;
    const firstPrice = ordered[0].price / 100;
    const lastPrice = ordered[ordered.length - 1].price / 100;
    const change = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;

    return { average, change };
  };

  const analytics = calculatePriceAnalytics();
  const patterns = patternResponse?.patterns;
  const trendLabel = patterns?.trendDirection === "up" ? "Rising" : patterns?.trendDirection === "down" ? "Falling" : patterns?.trendDirection === "stable" ? "Stable" : "Not enough data";
  const trendColor = patterns?.trendDirection === "up" ? "text-red-600" : patterns?.trendDirection === "down" ? "text-green-600" : "text-gray-600";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <DialogHeader className={product ? undefined : "sr-only"}>
          <DialogTitle className={product ? "text-xl" : undefined}>
            {product?.name ?? "Product details"}
          </DialogTitle>
        </DialogHeader>

        {productLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : product ? (
          <>
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

              {/* Price History Range */}
              <div className="border-t pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Analysis range</h3>
                    <p className="text-sm text-gray-500">{rangeLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Price history range">
                    {(["all", "7d", "30d", "90d", "1y", "custom"] as PriceHistoryRangePreset[]).map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant={rangePreset === preset ? "default" : "outline"}
                        aria-pressed={rangePreset === preset}
                        onClick={() => setRangePreset(preset)}
                      >
                        {{ all: "All", "7d": "7d", "30d": "30d", "90d": "90d", "1y": "1 year", custom: "Custom" }[preset]}
                      </Button>
                    ))}
                  </div>
                </div>
                {rangePreset === "custom" && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-sm text-gray-600">
                      From
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(event) => setCustomStartDate(event.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-gray-600">
                      To
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                )}
                {customRangeInvalid && (
                  <p className="mt-2 text-sm text-red-600">The start date must be on or before the end date.</p>
                )}
                {!customRangeInvalid && (
                  <p className="mt-2 text-xs text-gray-500">
                    {historyLoading ? "Loading stored records…" : `${visiblePriceHistory.length} stored price records in this range.`}
                  </p>
                )}
              </div>

              {/* Selected Range Summary */}
              {analytics.average !== null ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">Average in selected range</h3>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{analytics.average.toFixed(2)} zł</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">First-to-last change</h3>
                      {analytics.change !== null && (
                        <div className={`flex items-center gap-1 text-sm font-semibold ${analytics.change > 0 ? "text-red-600" : "text-green-600"}`}>
                          {analytics.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {Math.abs(analytics.change).toFixed(2)}%
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Compared with the earliest record in this range.</p>
                  </div>
                </div>
              ) : null}

              {/* Historical Pattern Analytics */}
              <div className="border-t pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Historical Price Patterns</h3>
                    <p className="text-sm text-gray-500">Based on stored prices only; this is not a forecast.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadHistory}
                    disabled={exportHistoryQuery.isFetching || patternsLoading || !patterns?.sampleCount}
                    className="whitespace-nowrap"
                  >
                    {exportHistoryQuery.isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download Price History
                  </Button>
                </div>
                {patternsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : patterns?.sampleCount ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">Lowest price</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">{formatPrice(patterns.minimum?.price ?? null)}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">Highest price</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">{formatPrice(patterns.maximum?.price ?? null)}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">Volatility</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">{patterns.volatilityPercent == null ? "N/A" : `${patterns.volatilityPercent.toFixed(2)}%`}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">{trendWindowDays}-day trend</p>
                      <p className={`mt-1 text-xl font-bold ${trendColor}`}>{trendLabel}</p>
                      <p className={`text-xs ${trendColor}`}>{patterns.trendPercent == null ? "N/A" : `${patterns.trendPercent >= 0 ? "+" : ""}${patterns.trendPercent.toFixed(2)}%`}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">No historical prices available yet.</div>
                )}
              </div>

              {/* Price History Chart */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Price History ({rangeLabel})
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
