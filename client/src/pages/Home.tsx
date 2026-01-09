import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Eye, TrendingDown, BarChart3, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");

  const addProductMutation = trpc.products.add.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully!");
      setNewProductUrl("");
      setNewProductCode("");
      // Redirect to dashboard after a short delay
      setTimeout(() => setLocation("/dashboard"), 1000);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Price Tracker</h1>
          <Button
            onClick={() => setLocation("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            View Prices
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold mb-4">Monitor Morele.net Prices in Real-Time</h2>
          <p className="text-xl text-blue-100 mb-8">
            Track product prices from morele.net, get alerts when prices drop, and make smarter
            purchasing decisions with historical price data.
          </p>
          <Button
            onClick={() => {
              const element = document.getElementById("add-product");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-3 text-lg"
          >
            Start Tracking Now
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Eye className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600">Monitor prices from morele.net products automatically</p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <TrendingDown className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Price Alerts</h3>
              <p className="text-gray-600">Get notified when prices drop by your configured threshold</p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <BarChart3 className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Price History</h3>
              <p className="text-gray-600">View detailed price history charts to visualize trends</p>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Bell className="w-12 h-12 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Notifications</h3>
              <p className="text-gray-600">Receive instant notifications when your tracked products change</p>
            </div>
          </div>
        </div>
      </section>

      {/* Add Product Section */}
      <section id="add-product" className="py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Add a Product to Track</h2>

          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setInputMode("url")}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  inputMode === "url"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                By URL
              </button>
              <button
                onClick={() => setInputMode("code")}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
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
                    : "Enter product code (e.g., 1792417)"
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
                className="flex-1"
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
                    Add
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              {inputMode === "url"
                ? "Paste a full morele.net product URL"
                : "Enter the product code from the morele.net URL"}
            </p>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Example URLs:</h3>
            <p className="text-sm text-blue-800 font-mono break-all">
              https://www.morele.net/pamiec-corsair-vengeance-lpx-ddr4-16-gb-3000mhz-cl16-cmk16gx4m2d3000c16-1792417/
            </p>
            <p className="text-sm text-blue-700 mt-2">Product Code: <strong>1792417</strong></p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Tracking?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Add your first product above and start monitoring prices from morele.net
          </p>
          <Button
            onClick={() => setLocation("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
          >
            View Dashboard
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2026 Price Tracker. Monitor morele.net prices with ease.</p>
        </div>
      </footer>
    </div>
  );
}
