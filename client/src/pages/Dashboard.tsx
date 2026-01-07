"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import ProductDetailModal from "@/components/ProductDetailModal";

export default function Dashboard() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products, isLoading: productsLoading } =
    trpc.products.list.useQuery();

  // Extract unique categories from products
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set<string>();
    products.forEach((product) => {
      if (product.category) {
        cats.add(product.category);
      }
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!selectedCategory) return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Price Tracker</h1>
            <p className="text-gray-600 mt-2">
              Monitor and compare prices from morele.net
            </p>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Filter by Category:
              </label>
              <Select
                value={selectedCategory || "all"}
                onValueChange={(value) =>
                  setSelectedCategory(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {productsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !products || products.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">
                    No products tracked yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">
                    No products in this category
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  Tracked Products ({filteredProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">
                          Product
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Category
                        </th>
                        <th className="text-right py-3 px-4 font-semibold">
                          Current Price
                        </th>
                        <th className="text-right py-3 px-4 font-semibold">
                          Previous Price
                        </th>
                        <th className="text-right py-3 px-4 font-semibold">
                          Change
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Last Checked
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="border-b hover:bg-gray-50 transition"
                        >
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedProductId(product.id)}
                              className="text-blue-600 hover:underline text-left max-w-xs truncate"
                              title={product.name}
                            >
                              {product.name}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {product.category || "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {formatPrice(product.currentPrice)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {formatPrice(product.previousPrice)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${getPriceChangeColor(
                              product.priceChangePercent
                            )}`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {getPriceChangeIcon(product.priceChangePercent)}
                              {product.priceChangePercent !== null
                                ? `${(product.priceChangePercent / 100).toFixed(2)}%`
                                : "—"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {product.lastCheckedAt
                              ? new Date(product.lastCheckedAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedProductId && (
            <ProductDetailModal
              productId={selectedProductId}
              isOpen={true}
              onClose={() => setSelectedProductId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
