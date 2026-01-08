import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminProducts() {
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const addProductMutation = trpc.admin.addProduct.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully");
      setNewProductUrl("");
      setNewProductCode("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add product");
    },
  });

  const deleteProductMutation = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
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
      type: inputMode,
    });
  };

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
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Tracked Products ({products?.length || 0})
          </h3>
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
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
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
                        onClick={() =>
                          deleteProductMutation.mutate({ productId: product.id })
                        }
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
