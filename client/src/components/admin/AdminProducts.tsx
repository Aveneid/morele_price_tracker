import { useState } from "react";
import { trpc } from "@/lib/trpc";

const Trash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;

export default function AdminProducts() {
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "code">("url");
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const { data: products, isLoading } = trpc.products.list.useQuery();
  const addProductMutation = trpc.products.add.useMutation({
    onSuccess: () => {
      showToast("Product added successfully", "success");
      setNewProductUrl("");
      setNewProductCode("");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to add product", "error");
    },
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      showToast("Product deleted successfully", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete product", "error");
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

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Toasts */}
      <div style={{position: 'fixed', bottom: 20, right: 20, zIndex: 9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{backgroundColor: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12}}>
            {t.message}
          </div>
        ))}
      </div>

      <div>
        <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem'}}>Product Management</h2>
        <p style={{color: '#4b5563'}}>Add and manage products to track their prices on morele.net</p>
      </div>

      {/* Add Product Form */}
      <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '1.5rem'}}>
        <h3 style={{fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem'}}>Add New Product</h3>

        <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
          <button onClick={() => setInputMode("url")} style={{padding: '0.5rem 1rem', borderRadius: 8, fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: inputMode === "url" ? '#dbeafe' : '#f3f4f6', color: inputMode === "url" ? '#1e40af' : '#374151', transition: 'all 0.2s'}}>
            By URL
          </button>
          <button onClick={() => setInputMode("code")} style={{padding: '0.5rem 1rem', borderRadius: 8, fontWeight: 500, border: 'none', cursor: 'pointer', backgroundColor: inputMode === "code" ? '#dbeafe' : '#f3f4f6', color: inputMode === "code" ? '#1e40af' : '#374151', transition: 'all 0.2s'}}>
            By Product Code
          </button>
        </div>

        <div style={{display: 'flex', gap: '0.5rem'}}>
          <input type="text" placeholder={inputMode === "url" ? "Enter morele.net product URL..." : "Enter product code..."} value={inputMode === "url" ? newProductUrl : newProductCode} onChange={(e: any) => inputMode === "url" ? setNewProductUrl(e.target.value) : setNewProductCode(e.target.value)} onKeyPress={(e: any) => e.key === "Enter" && handleAddProduct()} style={{flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem'}} />
          <button onClick={handleAddProduct} disabled={addProductMutation.isPending} style={{backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: addProductMutation.isPending ? 0.7 : 1}}>
            {addProductMutation.isPending ? (
              <Loader />
            ) : (
              <>
                <Plus />
                Add Product
              </>
            )}
          </button>
        </div>
      </div>

      {/* Products List */}
      <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden'}}>
        <div style={{padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb'}}>
          <h3 style={{fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0}}>Tracked Products ({products?.length || 0})</h3>
        </div>

        {isLoading ? (
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256}}>
            <Loader />
          </div>
        ) : !products || products.length === 0 ? (
          <div style={{padding: '3rem 1.5rem', textAlign: 'center', color: '#6b7280'}}>
            <p style={{fontSize: '1rem', margin: 0}}>No products tracked yet. Add one to get started!</p>
          </div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
                <tr>
                  <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Product Name</th>
                  <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Category</th>
                  <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Current Price</th>
                  <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Last Checked</th>
                  <th style={{padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr key={product.id} style={{borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#111827'}}>{product.name}</td>
                    <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563'}}>{product.category || "—"}</td>
                    <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#111827'}}>{product.currentPrice ? `${(product.currentPrice / 100).toFixed(2)} zł` : "—"}</td>
                    <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563'}}>{product.lastCheckedAt ? new Date(product.lastCheckedAt).toLocaleString("pl-PL") : "Never"}</td>
                    <td style={{padding: '1rem 1.5rem', textAlign: 'right'}}>
                      <button onClick={() => {
                        if (confirm("Are you sure you want to delete this product?")) {
                          deleteProductMutation.mutate({ productId: product.id });
                        }
                      }} disabled={deleteProductMutation.isPending} style={{backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', opacity: deleteProductMutation.isPending ? 0.5 : 1}}>
                        <Trash />
                      </button>
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
