import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";

// Custom tooltip to show detailed price information
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold text-gray-800">{data.date}</p>
        <p className="text-blue-600 font-bold">{data.price} zł</p>
        <p className="text-xs text-gray-500">
          {new Date(data.timestamp).toLocaleTimeString("pl-PL")}
        </p>
      </div>
    );
  }
  return null;
};

export default function ProductDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const productId = parseInt(id || "0");

  const { data: product, isLoading: productLoading } =
    trpc.products.get.useQuery({ id: productId });
  const { data: priceHistory, isLoading: historyLoading } =
    trpc.priceHistory.get.useQuery({ productId, daysBack: 30 });
  const updatePriceMutation = trpc.products.updatePrice.useMutation();

  const handleUpdatePrice = async () => {
    try {
      await updatePriceMutation.mutateAsync({ id: productId });
      toast.success("Price updated successfully");
    } catch (error) {
      toast.error("Failed to update price");
    }
  };

  if (productLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Product not found</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "N/A";
    return `${(cents / 100).toFixed(2)} zł`;
  };

  const chartData = (priceHistory || [])
    .slice()
    .reverse()
    .map((entry) => ({
      date: new Date(entry.recordedAt).toLocaleDateString("pl-PL"),
      price: parseFloat((entry.price / 100).toFixed(2)),
      timestamp: entry.recordedAt,
      fullDate: new Date(entry.recordedAt).toLocaleString("pl-PL"),
    }));

  // Calculate price statistics
  const prices = chartData.map((d) => d.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const avgPrice =
    prices.length > 0
      ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
      : null;

  const priceChangePercent = product.priceChangePercent
    ? product.priceChangePercent / 100
    : 0;
  const isPriceDown = priceChangePercent < 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Product Header with Name and Price Graph */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{product.name}</CardTitle>
                <p className="text-sm text-gray-600">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View on morele.net →
                  </a>
                </p>
              </div>
              <Button
                onClick={handleUpdatePrice}
                disabled={updatePriceMutation.isPending}
                className="whitespace-nowrap"
              >
                {updatePriceMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Check Price Now
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Price Graph */}
            <div className="mb-6">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No price history available yet
                </div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{ value: "Price (zł)", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                        dot={{ fill: "#3b82f6", r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Price (zł)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Price Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase">
                  Current Price
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatPrice(product.currentPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase">
                  Highest Price
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {maxPrice ? `${maxPrice.toFixed(2)} zł` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase">
                  Lowest Price
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {minPrice ? `${minPrice.toFixed(2)} zł` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase">
                  Average Price
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {avgPrice ? `${avgPrice} zł` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Change Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Current Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatPrice(product.currentPrice)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Previous Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatPrice(product.previousPrice)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                Price Change
                {isPriceDown ? (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                ) : priceChangePercent > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold flex items-center gap-2 ${
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <strong>Product Code:</strong>
                </span>
                <span className="font-medium">{product.productCode || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <strong>Last Checked:</strong>
                </span>
                <span className="font-medium">
                  {product.lastCheckedAt
                    ? new Date(product.lastCheckedAt).toLocaleString("pl-PL")
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <strong>Added:</strong>
                </span>
                <span className="font-medium">
                  {new Date(product.createdAt).toLocaleString("pl-PL")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <strong>Price History Records:</strong>
                </span>
                <span className="font-medium">{chartData.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
