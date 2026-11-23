import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  Home,
  Filter,
  Download,
  List,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { ProductGrid, ProductThumbnail, PriceChange, formatPrice } from "@/components/ProductCards";
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  sortProducts,
  sortToValue,
  type ProductSort,
  type ProductSortKey,
} from "@/lib/productSort";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ProductDetailModal from "@/components/ProductDetailModal";
import { exportProductsToCsv } from "@/lib/csvExport";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { CsvImportDialog } from "@/components/CsvImportDialog";

type ViewMode = "list" | "grid";
const VIEW_STORAGE_KEY = "dashboard.viewMode";
const SORT_STORAGE_KEY = "dashboard.sort";

function loadViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function loadSort(): ProductSort {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    const option = SORT_OPTIONS.find(o => o.value === stored);
    return option ? option.sort : DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: ProductSortKey;
  sort: ProductSort;
  onSort: (key: ProductSortKey) => void;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className="px-6 py-3 text-left text-sm font-semibold text-gray-700"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-blue-600 transition-colors ${
          active ? "text-blue-600" : ""
        }`}
      >
        {label}
        <Icon className="w-3.5 h-3.5" />
      </button>
    </th>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [sort, setSort] = useState<ProductSort>(loadSort);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
      localStorage.setItem(SORT_STORAGE_KEY, sortToValue(sort));
    } catch {
      // storage unavailable (private mode) - preferences just won't persist
    }
  }, [viewMode, sort]);

  // Clicking a column header: first click picks the most useful direction
  // (biggest drop / cheapest first), the next click reverses it.
  const handleHeaderSort = (key: ProductSortKey) => {
    setSort(current =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "added" ? "desc" : "asc" }
    );
  };

  // Initialize push notifications for price alerts
  usePriceAlerts();

  const { data: products, isLoading } = trpc.products.list.useQuery();

  const utils = trpc.useUtils();
  const addProductMutation = trpc.products.add.useMutation({
    onSuccess: (data) => {
      toast.success(data?.message || "Product added successfully!");
      utils.products.list.invalidate();
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
  const filteredProducts = useMemo(() => {
    if (!products) return products;
    const visible = selectedCategory
      ? products.filter(p => p.category === selectedCategory)
      : products;
    return sortProducts(visible, sort);
  }, [products, selectedCategory, sort]);

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
                  ? "Product or category link (filters and sorting are kept)"
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
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              Tracked Products ({filteredProducts?.length || 0})
            </h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="hidden sm:inline">Sort by</span>
                <select
                  value={sortToValue(sort)}
                  onChange={e => {
                    const option = SORT_OPTIONS.find(o => o.value === e.target.value);
                    if (option) setSort(option.sort);
                  }}
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex rounded-md border border-gray-200 p-0.5 bg-gray-50" role="group" aria-label="View">
                {([
                  { mode: "list", label: "List view", Icon: List },
                  { mode: "grid", label: "Grid view", Icon: LayoutGrid },
                ] as const).map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    aria-pressed={viewMode === mode}
                    title={label}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === mode
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="sr-only">{label}</span>
                  </button>
                ))}
              </div>
            </div>
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
          ) : viewMode === "grid" ? (
            <ProductGrid products={filteredProducts} onSelect={setSelectedProduct} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortableHeader label="Product Name" sortKey="name" sort={sort} onSort={handleHeaderSort} />
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Category
                    </th>
                    <SortableHeader label="Current Price" sortKey="price" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader label="Change" sortKey="change" sort={sort} onSort={handleHeaderSort} />
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Last Checked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3 text-sm text-blue-600 font-medium">
                        <div className="flex items-center gap-3">
                          <ProductThumbnail
                            src={product.imageUrl}
                            alt=""
                            className="w-10 h-10 shrink-0 rounded border border-gray-100 p-0.5"
                            iconClassName="w-4 h-4"
                          />
                          <span className="hover:underline">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {product.category || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatPrice(product.currentPrice)}
                      </td>
                      <td className="px-6 py-3 text-sm whitespace-nowrap">
                        <PriceChange product={product} />
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {product.lastCheckedAt
                          ? new Date(product.lastCheckedAt).toLocaleString("pl-PL")
                          : "Never"}
                      </td>
                    </tr>
                  ))}
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
