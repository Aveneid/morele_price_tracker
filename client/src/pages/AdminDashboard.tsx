import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Package, BarChart3, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminUsers from "@/components/admin/AdminUsers";
import { toast } from "sonner";

type TabType = "products" | "settings" | "logs" | "users";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [, setLocation] = useLocation();

  const logoutMutation = trpc.admin.logout.useMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      setLocation("/admin/login");
    },
  });

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "products", label: "Products", icon: <Package className="w-5 h-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
    { id: "logs", label: "Logs", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "users", label: "Users", icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-600 mt-1">Price Tracker</p>
        </div>

        <nav className="p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-gray-200 bg-white">
          <Button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            variant="outline"
            className="w-full justify-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-24">
        <div className="p-8">
          {activeTab === "products" && <AdminProducts />}
          {activeTab === "settings" && <AdminSettings />}
          {activeTab === "logs" && <AdminLogs />}
          {activeTab === "users" && <AdminUsers />}
        </div>
      </div>
    </div>
  );
}
