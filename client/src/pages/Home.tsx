import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { TrendingDown, Eye, BarChart3, Bell } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Price Tracker</h1>
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            View Prices
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center space-y-6">
          <h2 className="text-5xl font-bold text-gray-900">
            Monitor Morele.net Prices in Real-Time
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track product prices from morele.net, get alerts when prices drop,
            and make smarter purchasing decisions with historical price data.
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Start Tracking Now
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Eye className="w-12 h-12 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Real-Time Tracking
              </h4>
              <p className="text-gray-600">
                Monitor prices from morele.net products automatically and get
                updated data regularly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <TrendingDown className="w-12 h-12 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Price Alerts
              </h4>
              <p className="text-gray-600">
                Get notified when prices drop significantly on products you're
                watching.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <BarChart3 className="w-12 h-12 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Price History
              </h4>
              <p className="text-gray-600">
                View detailed price history charts to analyze trends and find
                the best time to buy.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Bell className="w-12 h-12 text-orange-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                Notifications
              </h4>
              <p className="text-gray-600">
                Receive instant notifications when your tracked products have
                significant price changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Start Saving?
          </h3>
          <p className="text-blue-100 mb-8 text-lg">
            Browse our tracked products and find the best deals on morele.net
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-semibold"
          >
            View All Products
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2026 Price Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
