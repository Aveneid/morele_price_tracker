import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { AddProductDialog } from "@/components/AddProductDialog";
import { TrendingDown, TrendingUp, Minus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: products, isLoading, refetch } = trpc.products.list.useQuery();
  const updatePriceMutation = trpc.products.updatePrice.useMutation();
  const deleteProductMutation = trpc.products.delete.useMutation();

  const handleUpdatePrice = async (productId: number) => {
    try {
      await updatePriceMutation.mutateAsync({ id: productId });
      await refetch();
      toast.success("Price updated successfully");
    } catch (error) {
      toast.error("Failed to update price");
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await deleteProductMutation.mutateAsync({ id: productId });
      await refetch();
      toast.success("Product removed");
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
    if (percent < 0) return "text-green-600";
    return "text-red-600";
  };

  const getPriceChangeIcon = (percent: number | null) => {
    if (percent === null || percent === 0) return <Minus className="w-4 h-4" />;
    if (percent < 0) return <TrendingDown className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  const formatPriceChange = (percent: number | null) => {
    if (percent === null || percent === 0) return "No change";
    const actualPercent = (percent / 100).toFixed(2);
    return `${percent < 0 ? "" : "+"}${actualPercent}%`;
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
          <Button onClick={() => setShowAddDialog(true)} size="lg">
            + Add Product
          </Button>
        </div>

        {showAddDialog && (
          <AddProductDialog
            onClose={() => setShowAddDialog(false)}
            onSuccess={() => {
              setShowAddDialog(false);
              refetch();
            }}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tracked Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : !products || products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No products tracked yet. Add one to get started!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Previous Price</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {product.name}
                          </a>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatPrice(product.currentPrice)}
                        </TableCell>
                        <TableCell>{formatPrice(product.previousPrice)}</TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1 ${getPriceChangeColor(
                              product.priceChangePercent
                            )}`}
                          >
                            {getPriceChangeIcon(product.priceChangePercent)}
                            <span className="text-sm font-medium">
                              {formatPriceChange(product.priceChangePercent)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {product.lastCheckedAt
                            ? new Date(product.lastCheckedAt).toLocaleString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdatePrice(product.id)}
                            disabled={updatePriceMutation.isPending}
                          >
                            {updatePriceMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Check"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deleteProductMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
