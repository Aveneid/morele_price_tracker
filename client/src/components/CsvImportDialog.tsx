import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";

const Upload = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const Download = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;

export function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const importMutation = trpc.products.importFromCsv.useMutation({
    onSuccess: (result) => {
      showToast(result.message, "success");
      if (result.errors.length > 0) {
        showToast(
          `${result.errors.length} rows failed: ${result.errors.map((e: any) => `Row ${e.row}: ${e.error}`).join("; ")}`,
          "error"
        );
      }
      setCsvContent("");
      setOpen(false);
      trpc.useUtils().products.list.invalidate();
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to import CSV", "error");
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      showToast("Please paste CSV content or select a file", "error");
      return;
    }

    setIsLoading(true);
    try {
      await importMutation.mutateAsync({ csvContent });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSample = () => {
    const csv = `url,productCode,checkIntervalMinutes,priceAlertThreshold
https://morele.net/product/,10751839,60,10
https://morele.net/another-product/,10751840,120,15
,10751841,60,10
https://morele.net/third-product/,,90,5`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-products.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Toasts */}
      <div style={{position: 'fixed', bottom: 20, right: 20, zIndex: 9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{backgroundColor: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12}}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Trigger Button */}
      <button onClick={() => setOpen(true)} style={{backgroundColor: 'transparent', border: '1px solid #d1d5db', color: '#374151', padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        <Upload />
        Import CSV
      </button>

      {/* Modal */}
      {open && (
        <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50}}>
          <div style={{backgroundColor: 'white', borderRadius: 8, maxWidth: 640, width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative'}}>
            <button onClick={() => setOpen(false)} style={{position: 'absolute', top: 16, right: 16, backgroundColor: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280'}}>×</button>

            <h2 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem'}}>Import Products from CSV</h2>
            <p style={{color: '#4b5563', fontSize: '0.875rem', marginBottom: '1.5rem'}}>Upload a CSV file with product URLs or codes. Format: url,productCode,checkIntervalMinutes,priceAlertThreshold</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {/* File Upload */}
              <div>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem'}}>Select CSV File</label>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{display: 'none'}} />
                <button onClick={() => fileInputRef.current?.click()} style={{width: '100%', backgroundColor: 'transparent', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                  <Upload />
                  Choose File
                </button>
              </div>

              {/* Or paste CSV */}
              <div>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem'}}>Or Paste CSV Content</label>
                <textarea value={csvContent} onChange={(e: any) => setCsvContent(e.target.value)} placeholder="url,productCode,checkIntervalMinutes,priceAlertThreshold&#10;https://morele.net/product/,10751839,60,10&#10;,10751840,120,15" style={{width: '100%', height: 128, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical'}} />
              </div>

              {/* Sample Download */}
              <button onClick={downloadSample} style={{backgroundColor: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: 0}}>
                <Download />
                Download Sample CSV
              </button>

              {/* Import Button */}
              <button onClick={handleImport} disabled={isLoading || !csvContent.trim()} style={{width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLoading || !csvContent.trim() ? 0.7 : 1}}>
                {isLoading && <Loader />}
                {isLoading ? "Importing..." : "Import Products"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
