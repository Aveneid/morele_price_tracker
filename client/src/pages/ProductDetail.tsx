import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, RefreshCw, Home, Copy, Check } from "lucide-react";
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

export default function ProductDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/product/:id");
  const [copied, setCopied] = useState(false);

  const productId = params?.id ? parseInt(params.id) : null;

  const { data: product, isLoading: productLoading } = trpc.products.get.useQuery(
    { id: productId || 0 },
    { enabled: !!productId }
  );

  const { data: priceHistory, isLoading: historyLoading } =
    trpc.products.priceHistory.useQuery(
      { productId: productId || 0 },
      { enabled: !!productId && !!product }
    );

  const priceCheckMutation = trpc.products.requestPriceCheck.useMutation({
    onSuccess: () => {
      toast.success("Price check requested!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request price check");
    },
  });

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

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/product/${productId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const chartData = (priceHistory || [])
    .slice()
    .reverse()
    .map((entry: any) => ({
      date: new Date(entry.recordedAt).toLocaleDateString("pl-PL"),
      price: entry.price / 100,
      timestamp: entry.recordedAt,
    }));

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Price Tracker</h1>
            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-600 text-lg">Product not found. Please check the link.</p>
          <Button
            onClick={() => setLocation("/dashboard")}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Price Tracker</h1>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {productLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !product ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 text-lg">Product not found.</p>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Product Header */}
            <div className="border-b border-gray-200 p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600">{product.category || "Uncategorized"}</p>
            </div>

            {/* Main Content */}
            <div className="p-6 space-y-6">
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

                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase">
                      Last Checked
                    </p>
                    <p className="text-lg font-bold text-gray-700 mt-1">
                      {product.lastCheckedAt
                        ? new Date(product.lastCheckedAt).toLocaleString("pl-PL")
                        : "Never"}
                    </p>
                  </div>

                  {canRequestPriceCheck() ? (
                    <Button
                      onClick={() => priceCheckMutation.mutate({ productId: product.id })}
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

                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(product.url, "_blank")}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on morele.net
                    </Button>
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="flex-1"
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
                  <ResponsiveContainer width="100%" height={300}>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
