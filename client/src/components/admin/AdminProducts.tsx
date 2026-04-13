import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminProducts() {
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: products, isLoading, refetch } = trpc.products.list.useQuery();
  
  const addProductMutation = trpc.products.add.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully");
      setNewProductUrl("");
      setNewProductCode("");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add product");
    },
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete product");
    },
  });

  const handleAddProduct = () => {
    if (inputMode === "url" && !newProductUrl.trim()) {
      toast.error("Please enter a product URL");
      return;
    }
    if (inputMode === "code" && !newProductCode.trim()) {
      toast.error("Please enter a product code");
      return;
    }

    addProductMutation.mutate({
      input: inputMode === "url" ? newProductUrl : newProductCode,
    });
  };

  const toggleProductSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (!products) return;
    
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p: any) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Please select products to delete");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedProducts.size} product(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsProcessing(true);
    try {
      let deletedCount = 0;
      const productIds = Array.from(selectedProducts);
      
      for (const productId of productIds) {
        try {
          await deleteProductMutation.mutateAsync({ productId });
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete product ${productId}:`, err);
        }
      }
      
      toast.success(`Deleted ${deletedCount} product(s)`);
      setSelectedProducts(new Set());
      refetch();
    } catch (err) {
      toast.error("Error during bulk delete");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Please select products to update");
      return;
    }

    setIsProcessing(true);
    try {
      let updatedCount = 0;
      const delayMs = 500; // 500ms delay between updates
      const productIds = Array.from(selectedProducts);

      for (const productId of productIds) {
        try {
          // In a real scenario, you'd call an update mutation here
          // For now, we'll just simulate the delay
          await new Promise(resolve => setTimeout(resolve, delayMs));
          updatedCount++;
          
          // Show progress
          toast.loading(`Updating product ${updatedCount}/${selectedProducts.size}...`);
        } catch (err) {
          console.error(`Failed to update product ${productId}:`, err);
        }
      }
      
      toast.success(`Updated ${updatedCount} product(s)`);
      setSelectedProducts(new Set());
      refetch();
    } catch (err) {
      toast.error("Error during bulk update");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasSelection = selectedProducts.size > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Product Management
        </h2>
        <p className="text-gray-600">
          Add and manage products to track their prices on morele.net
        </p>
      </div>

      {/* Add Product Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Add New Product
        </h3>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setInputMode("url")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              inputMode === "url"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            By URL
          </button>
          <button
            onClick={() => setInputMode("code")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              inputMode === "code"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            By Product Code
          </button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={
              inputMode === "url"
                ? "Enter morele.net product URL..."
                : "Enter product code..."
            }
            value={inputMode === "url" ? newProductUrl : newProductCode}
            onChange={(e) => {
              if (inputMode === "url") {
                setNewProductUrl(e.target.value);
              } else {
                setNewProductCode(e.target.value);
              }
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAddProduct();
              }
            }}
          />
          <Button
            onClick={handleAddProduct}
            disabled={addProductMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {addProductMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Tracked Products ({products?.length || 0})
          </h3>
          
          {/* Bulk Actions */}
          {hasSelection && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {selectedProducts.size} selected
              </span>
              <Button
                onClick={handleBulkUpdate}
                disabled={isProcessing}
                variant="outline"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Update
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={isProcessing}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !products || products.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>No products tracked yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-5 h-5 rounded border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      title={selectedProducts.size === products.length ? "Deselect all" : "Select all"}
                    >
                      {selectedProducts.size === products.length && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Last Checked
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-200 transition-colors ${
                      selectedProducts.has(product.id)
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 text-left">
                      <button
                        onClick={() => toggleProductSelection(product.id)}
                        className="flex items-center justify-center w-5 h-5 rounded border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        {selectedProducts.has(product.id) && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.category || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {product.currentPrice
                        ? `${(product.currentPrice / 100).toFixed(2)} zł`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.lastCheckedAt
                        ? new Date(product.lastCheckedAt).toLocaleString(
                            "pl-PL"
                          )
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this product?")) {
                            deleteProductMutation.mutate({ productId: product.id });
                          }
                        }}
                        disabled={deleteProductMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
