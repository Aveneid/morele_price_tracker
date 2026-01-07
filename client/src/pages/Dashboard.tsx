import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AddProductDialog } from "@/components/AddProductDialog";
import ProductDetailModal from "@/components/ProductDetailModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );

  const { data: products, isLoading: productsLoading, refetch } =
    trpc.products.list.useQuery();
  const deleteProductMutation = trpc.products.delete.useMutation();

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await deleteProductMutation.mutateAsync({ id: productId });
      toast.success("Product deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "N/A";
    return `${(cents / 100).toFixed(2)} zł`;
  };

  const getPriceChangeColor = (percent: number | null) => {
    if (percent === null || percent === 0) return "text-gray-600";
    return percent < 0 ? "text-green-600" : "text-red-600";
  };

  const getPriceChangeIcon = (percent: number | null) => {
    if (percent === null || percent === 0) return null;
    return percent < 0 ? (
      <TrendingDown className="w-4 h-4" />
    ) : (
      <TrendingUp className="w-4 h-4" />
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Price Tracker</h1>
            <p className="text-gray-600 mt-1">
              Monitor and compare prices from morele.net
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="lg">
            + Add Product
          </Button>
        </div>

        {productsLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !products || products.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-4">
                  No products tracked yet. Add one to get started!
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  Add Your First Product
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tracked Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Product
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Current Price
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Previous Price
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Change
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Last Checked
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <button
                            onClick={() => setSelectedProductId(product.id)}
                            className="text-blue-600 hover:underline font-medium text-left max-w-xs truncate"
                            title={product.name}
                          >
                            {product.name}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold">
                          {formatPrice(product.currentPrice)}
                        </td>
                        <td className="py-4 px-4 text-right text-gray-600">
                          {formatPrice(product.previousPrice)}
                        </td>
                        <td
                          className={`py-4 px-4 text-right font-semibold flex items-center justify-end gap-2 ${getPriceChangeColor(
                            product.priceChangePercent
                          )}`}
                        >
                          {getPriceChangeIcon(product.priceChangePercent)}
                          {product.priceChangePercent === null
                            ? "N/A"
                            : `${(product.priceChangePercent / 100).toFixed(2)}%`}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {product.lastCheckedAt
                            ? new Date(product.lastCheckedAt).toLocaleString(
                                "pl-PL",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "Never"}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteProduct(product.id)
                              }
                              disabled={deleteProductMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isAddDialogOpen && (
        <AddProductDialog
          onClose={() => setIsAddDialogOpen(false)}
          onSuccess={() => {
            setIsAddDialogOpen(false);
            refetch();
          }}
        />
      )}

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          isOpen={selectedProductId !== null}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </DashboardLayout>
  );
}
