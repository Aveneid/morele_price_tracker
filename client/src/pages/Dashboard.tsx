import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Home, Filter, TrendingUp, TrendingDown, Download } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ProductDetailModal from "@/components/ProductDetailModal";
import { exportProductsToCsv } from "@/lib/csvExport";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { CsvImportDialog } from "@/components/CsvImportDialog";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");

  // Listen for price alerts
  usePriceAlerts((alert) => {
    toast.success(`Price dropped for ${alert.productName}!`);
  });

  const { data: products, isLoading } = trpc.products.list.useQuery();

  const addProductMutation = trpc.products.add.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully!");
      setNewProductUrl("");
      setNewProductCode("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add product");
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

  // Get unique categories
  const categories = products
    ? Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))
    : [];

  // Filter products by category
  const filteredProducts = selectedCategory
    ? products?.filter((p: any) => p.category === selectedCategory)
    : products;

  const getPriceChangeIndicator = (product: any) => {
    if (!product.previousPrice || !product.currentPrice) return null;
    const change = ((product.currentPrice - product.previousPrice) / product.previousPrice) * 100;
    return {
      percentage: Math.abs(change).toFixed(1),
      isUp: change > 0,
      isDown: change < 0,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Price Tracker</h1>
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Product Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Add a Product to Track</h2>

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
                  ? "https://www.morele.net/product-name-123456/"
                  : "Enter product code"
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
            <CsvImportDialog />
          </div>
        </div>

        {/* Category Filter and Export */}
        {categories.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-gray-900">Filter by Category:</span>
              </div>
              {filteredProducts && filteredProducts.length > 0 && (
                <Button
                  onClick={() => exportProductsToCsv(filteredProducts, {})}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Products
              </button>
              {categories.map((category: any) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Tracked Products ({filteredProducts?.length || 0})
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !filteredProducts || filteredProducts.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="text-lg font-medium">No products tracked yet.</p>
              <p className="text-sm mt-1">Add one above to get started!</p>
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
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Last Checked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product: any) => {
                    const priceChange = getPriceChangeIndicator(product);
                    return (
                      <tr
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm text-blue-600 font-medium hover:underline">
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
                        <td className="px-6 py-4 text-sm">
                          {priceChange ? (
                            <div className="flex items-center gap-1">
                              {priceChange.isDown ? (
                                <>
                                  <TrendingDown className="w-4 h-4 text-green-600" />
                                  <span className="text-green-600 font-medium">
                                    -{priceChange.percentage}%
                                  </span>
                                </>
                              ) : priceChange.isUp ? (
                                <>
                                  <TrendingUp className="w-4 h-4 text-red-600" />
                                  <span className="text-red-600 font-medium">
                                    +{priceChange.percentage}%
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-600">No change</span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {product.lastCheckedAt
                            ? new Date(product.lastCheckedAt).toLocaleString("pl-PL")
                            : "Never"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          productId={selectedProduct.id}
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
