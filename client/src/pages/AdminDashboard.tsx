import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminUsers from "@/components/admin/AdminUsers";

const LogOut = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const Settings = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20}}><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m5.08-5.08l4.24-4.24"></path></svg>;
const Package = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20}}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const BarChart = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20}}><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 8h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4"></path><path d="M3 12h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3"></path></svg>;
const Users = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;

type TabType = "products" | "settings" | "logs" | "users";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [, setLocation] = useLocation();
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const logoutMutation = trpc.admin.logout.useMutation({
    onSuccess: () => {
      showToast("Logged out successfully", "success");
      setLocation("/admin/login");
    },
    onError: () => {
      showToast("Logout failed", "error");
    },
  });

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "products", label: "Products", icon: <Package /> },
    { id: "settings", label: "Settings", icon: <Settings /> },
    { id: "logs", label: "Logs", icon: <BarChart /> },
    { id: "users", label: "Users", icon: <Users /> },
  ];

  return (
    <div style={{minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex'}}>
      {/* Toasts */}
      <div style={{position: 'fixed', bottom: 20, right: 20, zIndex: 9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{backgroundColor: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12}}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <div style={{width: 256, backgroundColor: 'white', borderRight: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
        <div style={{padding: '1.5rem', borderBottom: '1px solid #e5e7eb'}}>
          <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0}}>Admin Panel</h1>
          <p style={{fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem'}}>Price Tracker</p>
        </div>

        <nav style={{padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent', color: activeTab === tab.id ? '#2563eb' : '#374151', fontWeight: activeTab === tab.id ? 600 : 400}}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, width: 256, padding: '1rem', borderTop: '1px solid #e5e7eb', backgroundColor: 'white'}}>
          <button onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending} style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', color: '#2563eb', border: '1px solid #2563eb', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontWeight: 500, opacity: logoutMutation.isPending ? 0.7 : 1}}>
            <LogOut />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{flex: 1, overflowY: 'auto', paddingBottom: '6rem'}}>
        <div style={{padding: '2rem'}}>
          {activeTab === "products" && <AdminProducts />}
          {activeTab === "settings" && <AdminSettings />}
          {activeTab === "logs" && <AdminLogs />}
          {activeTab === "users" && <AdminUsers />}
        </div>
      </div>
    </div>
  );
}
