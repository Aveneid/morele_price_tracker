import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, TrendingDown, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc";

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
        <p className="text-blue-600 font-bold">{data.price} zł</p>
        <p className="text-xs text-gray-500">
          {new Date(data.timestamp).toLocaleTimeString("pl-PL")}
        </p>
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
  const { data: product, isLoading: productLoading } =
    trpc.products.get.useQuery({ id: productId }, { enabled: isOpen });
  const { data: priceHistory, isLoading: historyLoading } =
    trpc.priceHistory.get.useQuery(
      { productId, daysBack: 30 },
      { enabled: isOpen }
    );
  const updatePriceMutation = trpc.products.updatePrice.useMutation();

  const handleUpdatePrice = async () => {
    try {
      await updatePriceMutation.mutateAsync({ id: productId });
    } catch (error) {
      console.error("Failed to update price:", error);
    }
  };

  if (!product && productLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return null;
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
    }));

  const priceChangePercent = product.priceChangePercent
    ? product.priceChangePercent / 100
    : 0;
  const isPriceDown = priceChangePercent < 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <p className="text-xs text-gray-600 font-semibold uppercase flex items-center gap-1">
                    Change
                    {isPriceDown ? (
                      <TrendingDown className="w-3 h-3 text-green-600" />
                    ) : priceChangePercent > 0 ? (
                      <TrendingUp className="w-3 h-3 text-red-600" />
                    ) : null}
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

              <Button
                onClick={handleUpdatePrice}
                disabled={updatePriceMutation.isPending}
                className="w-full mt-4"
              >
                {updatePriceMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Check Price Now
              </Button>

              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm text-center"
              >
                View on morele.net →
              </a>
            </div>
          </div>

          {/* Price History Chart */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Price History (Last 30 Days)</h3>
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
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
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
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Price (zł)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

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
              <span>{new Date(product.createdAt).toLocaleString("pl-PL")}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
