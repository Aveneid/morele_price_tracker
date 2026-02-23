import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";

const Eye = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 48, height: 48}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const TrendingDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 48, height: 48}}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const BarChart = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 48, height: 48}}><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 8h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4"></path><path d="M3 12h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3"></path></svg>;
const Bell = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 48, height: 48}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;

export default function Home() {
  const [, setLocation] = useLocation();
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");
  const [toasts, setToasts] = useState<any[]>([]);

  const addProductMutation = trpc.products.add.useMutation({
    onSuccess: () => {
      showToast("Product added successfully!", "success");
      setNewProductUrl("");
      setNewProductCode("");
      setTimeout(() => setLocation("/dashboard"), 1000);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to add product", "error");
    },
  });

  const showToast = (message: string, type: "success" | "error" | "info" | "warning") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleAddProduct = () => {
    if (inputMode === "url" && !newProductUrl.trim()) {
      showToast("Please enter a product URL", "error");
      return;
    }
    if (inputMode === "code" && !newProductCode.trim()) {
      showToast("Please enter a product code", "error");
      return;
    }
    addProductMutation.mutate({
      input: inputMode === "url" ? newProductUrl : newProductCode,
    });
  };

  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)'}}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      
      {/* Toasts */}
      <div style={{position: 'fixed', bottom: 20, right: 20, zIndex: 9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{backgroundColor: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12}}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header style={{backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 50}}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#111827'}}>Price Tracker</h1>
          <button onClick={() => setLocation("/dashboard")} style={{backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500}}>
            View Prices
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{background: 'linear-gradient(to right, #2563eb, #1e40af)', color: 'white', padding: '5rem 0'}}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', textAlign: 'center'}}>
          <h2 style={{fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem'}}>Monitor Morele.net Prices in Real-Time</h2>
          <p style={{fontSize: '1.25rem', color: '#dbeafe', marginBottom: '2rem'}}>
            Track product prices from morele.net, get alerts when prices drop, and make smarter purchasing decisions with historical price data.
          </p>
          <button onClick={() => document.getElementById("add-product")?.scrollIntoView({behavior: 'smooth'})} style={{backgroundColor: 'white', color: '#2563eb', padding: '0.75rem 2rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '1.125rem'}}>
            Start Tracking Now
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section style={{padding: '4rem 0', backgroundColor: 'white'}}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem'}}>
          <h2 style={{fontSize: '2.25rem', fontWeight: 'bold', textAlign: 'center', color: '#111827', marginBottom: '3rem'}}>Features</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'}}>
            {[
              {icon: Eye, title: 'Real-Time Tracking', desc: 'Monitor prices from morele.net products automatically', color: '#2563eb'},
              {icon: TrendingDown, title: 'Price Alerts', desc: 'Get notified when prices drop by your configured threshold', color: '#16a34a'},
              {icon: BarChart, title: 'Price History', desc: 'View detailed price history charts to visualize trends', color: '#9333ea'},
              {icon: Bell, title: 'Notifications', desc: 'Receive instant notifications when your tracked products change', color: '#ea580c'},
            ].map((f, i) => (
              <div key={i} style={{textAlign: 'center'}}>
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: f.color}}>
                  <f.icon />
                </div>
                <h3 style={{fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem'}}>{f.title}</h3>
                <p style={{color: '#4b5563'}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add Product Section */}
      <section id="add-product" style={{padding: '4rem 0', backgroundColor: '#f9fafb'}}>
        <div style={{maxWidth: '42rem', margin: '0 auto', padding: '0 1rem'}}>
          <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center'}}>Add a Product to Track</h2>
          <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '2rem'}}>
            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
              {['url', 'code'].map(mode => (
                <button key={mode} onClick={() => setInputMode(mode as any)} style={{flex: 1, padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: inputMode === mode ? '#dbeafe' : '#f3f4f6', color: inputMode === mode ? '#1e40af' : '#374151', transition: 'all 0.2s'}}>
                  By {mode === 'url' ? 'URL' : 'Product Code'}
                </button>
              ))}
            </div>
            <div style={{display: 'flex', gap: '0.5rem'}}>
              <input type="text" placeholder={inputMode === "url" ? "https://www.morele.net/product-name-123456/" : "Enter product code (e.g., 1792417)"} value={inputMode === "url" ? newProductUrl : newProductCode} onChange={(e) => inputMode === "url" ? setNewProductUrl(e.target.value) : setNewProductCode(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleAddProduct()} style={{flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem'}} />
              <button onClick={handleAddProduct} disabled={addProductMutation.isPending} style={{backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: addProductMutation.isPending ? 0.7 : 1}}>
                {addProductMutation.isPending ? <Loader /> : <Plus />}
                Add
              </button>
            </div>
            <p style={{fontSize: '0.875rem', color: '#4b5563', marginTop: '1rem'}}>
              {inputMode === "url" ? "Paste a full morele.net product URL" : "Enter the product code from the morele.net URL"}
            </p>
          </div>
          <div style={{marginTop: '2rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '1.5rem'}}>
            <h3 style={{fontWeight: 600, color: '#0c2d6b', marginBottom: '0.5rem'}}>Example URLs:</h3>
            <p style={{fontSize: '0.875rem', color: '#0c4a6e', fontFamily: 'monospace', wordBreak: 'break-all'}}>
              https://www.morele.net/pamiec-corsair-vengeance-lpx-ddr4-16-gb-3000mhz-cl16-cmk16gx4m2d3000c16-1792417/
            </p>
            <p style={{fontSize: '0.875rem', color: '#0c5a8e', marginTop: '0.5rem'}}>Product Code: <strong>1792417</strong></p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{padding: '4rem 0', backgroundColor: 'white'}}>
        <div style={{maxWidth: '56rem', margin: '0 auto', padding: '0 1rem', textAlign: 'center'}}>
          <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem'}}>Ready to Start Tracking?</h2>
          <p style={{fontSize: '1.125rem', color: '#4b5563', marginBottom: '2rem'}}>
            Add your first product above and start monitoring prices from morele.net
          </p>
          <button onClick={() => setLocation("/dashboard")} style={{backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 2rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '1.125rem'}}>
            View Dashboard
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{backgroundColor: '#111827', color: '#d1d5db', padding: '2rem 0'}}>
        <div style={{maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', textAlign: 'center'}}>
          <p>&copy; 2026 Price Tracker. Monitor morele.net prices with ease.</p>
        </div>
      </footer>
    </div>
  );
}
