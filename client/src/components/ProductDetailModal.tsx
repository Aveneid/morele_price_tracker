import { trpc } from "@/lib/trpc";

const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 24, height: 24, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;
const ExternalLink = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;
const RefreshCw = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path></svg>;

interface ProductDetailModalProps {
  productId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDetailModal({
  productId,
  isOpen,
  onClose,
}: ProductDetailModalProps) {
  const { data: product, isLoading: productLoading } =
    trpc.products.get.useQuery({ id: productId }, { enabled: isOpen });
  const { data: priceHistory, isLoading: historyLoading } =
    trpc.products.priceHistory.useQuery(
      { productId },
      { enabled: isOpen && !!product }
    );

  const priceCheckMutation = trpc.products.requestPriceCheck.useMutation({
    onSuccess: () => {
      // Toast handled by parent component
    },
    onError: (err) => {
      // Error handled by parent component
    },
  });

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "N/A";
    return `${(cents / 100).toFixed(2)} zł`;
  };

  const canRequestPriceCheck = () => {
    if (!product?.lastCheckedAt) return true;
    const lastCheckTime = new Date(product.lastCheckedAt).getTime();
    const now = Date.now();
    const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);
    return minutesSinceLastCheck >= 15;
  };

  const getMinutesUntilNextCheck = () => {
    if (!product?.lastCheckedAt) return 0;
    const lastCheckTime = new Date(product.lastCheckedAt).getTime();
    const now = Date.now();
    const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);
    return Math.ceil(15 - minutesSinceLastCheck);
  };

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50}}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{backgroundColor: 'white', borderRadius: 8, maxWidth: 768, maxHeight: '90vh', overflowY: 'auto', position: 'relative', width: '90%'}}>
        <button onClick={onClose} style={{position: 'absolute', top: 16, right: 16, backgroundColor: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280'}}>×</button>

        {productLoading ? (
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256}}>
            <Loader />
          </div>
        ) : product ? (
          <div style={{padding: '2rem'}}>
            <h2 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem'}}>{product.name}</h2>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              {/* Product Image and Price Section */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
                {/* Product Image */}
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: '1rem', minHeight: 300}}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{maxWidth: '100%', maxHeight: 300, objectFit: 'contain'}} onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }} />
                  ) : (
                    <div style={{textAlign: 'center', color: '#9ca3af'}}>
                      <p>No image available</p>
                    </div>
                  )}
                </div>

                {/* Price Information */}
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem'}}>
                  <div>
                    <p style={{fontSize: '0.75rem', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase'}}>Current Price</p>
                    <p style={{fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', marginTop: '0.5rem'}}>{formatPrice(product.currentPrice)}</p>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div>
                      <p style={{fontSize: '0.75rem', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase'}}>Previous Price</p>
                      <p style={{fontSize: '1.125rem', fontWeight: 'bold', color: '#374151', marginTop: '0.25rem'}}>{formatPrice(product.previousPrice)}</p>
                    </div>
                    <div>
                      <p style={{fontSize: '0.75rem', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase'}}>Change</p>
                      <p style={{fontSize: '1.125rem', fontWeight: 'bold', marginTop: '0.25rem', color: product.priceChangePercent === null || product.priceChangePercent === 0 ? '#4b5563' : product.priceChangePercent < 0 ? '#16a34a' : '#dc2626'}}>
                        {product.priceChangePercent === null ? "N/A" : `${(product.priceChangePercent / 100).toFixed(2)}%`}
                      </p>
                    </div>
                  </div>

                  {product.category && (
                    <div>
                      <p style={{fontSize: '0.75rem', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase'}}>Category</p>
                      <p style={{fontSize: '1.125rem', fontWeight: 'bold', color: '#374151', marginTop: '0.25rem'}}>{product.category}</p>
                    </div>
                  )}

                  {canRequestPriceCheck() ? (
                    <button onClick={() => priceCheckMutation.mutate({ productId })} disabled={priceCheckMutation.isPending} style={{width: '100%', marginTop: '1rem', backgroundColor: '#16a34a', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: priceCheckMutation.isPending ? 0.7 : 1}}>
                      {priceCheckMutation.isPending ? (
                        <>
                          <Loader />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw />
                          Request Price Check
                        </>
                      )}
                    </button>
                  ) : (
                    <div style={{width: '100%', marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: 6, fontSize: '0.875rem', color: '#4b5563', textAlign: 'center'}}>
                      Next check available in {getMinutesUntilNextCheck()} min
                    </div>
                  )}

                  <button onClick={() => window.open(product.url, "_blank")} style={{width: '100%', marginTop: '0.5rem', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <ExternalLink />
                    View on morele.net
                  </button>
                </div>
              </div>

              {/* Price History */}
              <div style={{borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem'}}>
                <h3 style={{fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem'}}>Price History (Last 30 Days)</h3>
                {historyLoading ? (
                  <div style={{display: 'flex', justifyContent: 'center', padding: '2rem'}}>
                    <Loader />
                  </div>
                ) : !priceHistory || priceHistory.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>
                    No price history available yet
                  </div>
                ) : (
                  <svg viewBox="0 0 600 250" style={{width: '100%', height: 'auto'}}>
                    {/* Simple line chart */}
                    {priceHistory.map((entry: any, idx: number) => {
                      const nextEntry = priceHistory[idx + 1];
                      if (!nextEntry) return null;
                      const x1 = (idx / priceHistory.length) * 600;
                      const x2 = ((idx + 1) / priceHistory.length) * 600;
                      const minPrice = Math.min(...priceHistory.map((e: any) => e.price));
                      const maxPrice = Math.max(...priceHistory.map((e: any) => e.price));
                      const range = maxPrice - minPrice || 1;
                      const y1 = 250 - ((entry.price - minPrice) / range) * 200;
                      const y2 = 250 - ((nextEntry.price - minPrice) / range) * 200;
                      return <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth="2" />;
                    })}
                  </svg>
                )}
              </div>

              {/* Product Details */}
              <div style={{borderTop: '1px solid #e5e7eb', paddingTop: '1rem', fontSize: '0.875rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span><strong>Product Code:</strong></span>
                  <span>{product.productCode || "N/A"}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span><strong>Last Checked:</strong></span>
                  <span>{product.lastCheckedAt ? new Date(product.lastCheckedAt).toLocaleString("pl-PL") : "Never"}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span><strong>Added:</strong></span>
                  <span>{new Date(product.createdAt).toLocaleString("pl-PL")}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
