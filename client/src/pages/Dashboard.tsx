import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ProductDetailModal from "@/components/ProductDetailModal";
import { exportProductsToCsv } from "@/lib/csvExport";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { CsvImportDialog } from "@/components/CsvImportDialog";

const Home = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const Filter = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16}}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const TrendingUp = ({ color }: any) => <svg viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" style={{width: 16, height: 16}}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const TrendingDown = ({ color }: any) => <svg viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" style={{width: 16, height: 16}}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const Download = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  usePriceAlerts((alert) => {
    showToast(`Price dropped for ${alert.productName}!`, "success");
  });

  const { data: products, isLoading } = trpc.products.list.useQuery();

  const addProductMutation = trpc.products.add.useMutation({
    onSuccess: () => {
      showToast("Product added successfully!", "success");
      setNewProductUrl("");
      setNewProductCode("");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to add product", "error");
    },
  });

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

  const categories = products ? Array.from(new Set(products.map((p: any) => p.category).filter(Boolean))) : [];
  const filteredProducts = selectedCategory ? products?.filter((p: any) => p.category === selectedCategory) : products;

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
          <button onClick={() => setLocation("/")} style={{backgroundColor: 'transparent', color: '#2563eb', border: '1px solid #2563eb', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Home />
            Back to Home
          </button>
        </div>
      </header>

      <div style={{maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem'}}>
        {/* Add Product Section */}
        <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '1.5rem', marginBottom: '2rem'}}>
          <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem'}}>Add a Product to Track</h2>
          <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
            {['url', 'code'].map(mode => (
              <button key={mode} onClick={() => setInputMode(mode as any)} style={{flex: 1, padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: inputMode === mode ? '#dbeafe' : '#f3f4f6', color: inputMode === mode ? '#1e40af' : '#374151'}}>
                By {mode === 'url' ? 'URL' : 'Product Code'}
              </button>
            ))}
          </div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <input type="text" placeholder={inputMode === "url" ? "https://www.morele.net/product-name-123456/" : "Enter product code"} value={inputMode === "url" ? newProductUrl : newProductCode} onChange={(e) => inputMode === "url" ? setNewProductUrl(e.target.value) : setNewProductCode(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleAddProduct()} style={{flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem'}} />
            <button onClick={handleAddProduct} disabled={addProductMutation.isPending} style={{backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: addProductMutation.isPending ? 0.7 : 1}}>
              {addProductMutation.isPending ? <Loader /> : <Plus />}
              Add Product
            </button>
            <CsvImportDialog />
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Filter />
                <span style={{fontWeight: 600, color: '#111827'}}>Filter by Category:</span>
              </div>
              {filteredProducts && filteredProducts.length > 0 && (
                <button onClick={() => exportProductsToCsv(filteredProducts, {})} style={{backgroundColor: 'transparent', color: '#2563eb', border: '1px solid #2563eb', padding: '0.25rem 0.75rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <Download />
                  Export CSV
                </button>
              )}
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
              <button onClick={() => setSelectedCategory(null)} style={{padding: '0.25rem 0.75rem', borderRadius: 9999, fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: selectedCategory === null ? '#2563eb' : '#f3f4f6', color: selectedCategory === null ? 'white' : '#374151'}}>
                All Products
              </button>
              {categories.map((category: any) => (
                <button key={category} onClick={() => setSelectedCategory(category)} style={{padding: '0.25rem 0.75rem', borderRadius: 9999, fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: selectedCategory === category ? '#2563eb' : '#f3f4f6', color: selectedCategory === category ? 'white' : '#374151'}}>
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products List */}
        <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden'}}>
          <div style={{padding: '1.5rem', borderBottom: '1px solid #e5e7eb'}}>
            <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0}}>
              Tracked Products ({filteredProducts?.length || 0})
            </h2>
          </div>

          {isLoading ? (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256}}>
              <Loader />
            </div>
          ) : !filteredProducts || filteredProducts.length === 0 ? (
            <div style={{padding: '3rem 1.5rem', textAlign: 'center', color: '#6b7280'}}>
              <p style={{fontSize: '1.125rem', fontWeight: 500, margin: 0}}>No products tracked yet.</p>
              <p style={{fontSize: '0.875rem', marginTop: '0.25rem', color: '#9ca3af'}}>Add one above to get started!</p>
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
                  <tr>
                    <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Product Name</th>
                    <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Category</th>
                    <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Current Price</th>
                    <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Change</th>
                    <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product: any) => {
                    const priceChange = getPriceChangeIndicator(product);
                    return (
                      <tr key={product.id} onClick={() => setSelectedProduct(product)} style={{borderBottom: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background-color 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#2563eb', fontWeight: 500}}>{product.name}</td>
                        <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563'}}>{product.category || "—"}</td>
                        <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#111827'}}>{product.currentPrice ? `${(product.currentPrice / 100).toFixed(2)} zł` : "—"}</td>
                        <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem'}}>
                          {priceChange ? (
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                              {priceChange.isDown ? (
                                <>
                                  <TrendingDown color="#16a34a" />
                                  <span style={{color: '#16a34a', fontWeight: 500}}>-{priceChange.percentage}%</span>
                                </>
                              ) : priceChange.isUp ? (
                                <>
                                  <TrendingUp color="#dc2626" />
                                  <span style={{color: '#dc2626', fontWeight: 500}}>+{priceChange.percentage}%</span>
                                </>
                              ) : (
                                <span style={{color: '#4b5563'}}>No change</span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563'}}>
                          {product.lastCheckedAt ? new Date(product.lastCheckedAt).toLocaleString("pl-PL") : "Never"}
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
