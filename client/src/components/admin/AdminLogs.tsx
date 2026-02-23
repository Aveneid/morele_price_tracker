const CheckCircle = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, color: '#16a34a'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const AlertCircle = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, color: '#dc2626'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

export default function AdminLogs() {
  const logs = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 3600000),
      productId: 1,
      productName: "Pamięć Corsair Vengeance LPX",
      status: "success",
      message: "Price updated: 1559.00 zł",
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 7200000),
      productId: 2,
      productName: "Unknown Product",
      status: "error",
      message: "Failed to scrape: Product page not found",
    },
  ];

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div>
        <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem'}}>Scraping Logs</h2>
        <p style={{color: '#4b5563'}}>View price scraping history and error details</p>
      </div>

      <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden'}}>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
              <tr>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Timestamp</th>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Product</th>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Status</th>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563'}}>{log.timestamp.toLocaleString("pl-PL")}</td>
                  <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#111827'}}>{log.productName}</td>
                  <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      {log.status === "success" ? (
                        <>
                          <CheckCircle />
                          <span style={{color: '#16a34a', fontWeight: 500}}>Success</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle />
                          <span style={{color: '#dc2626', fontWeight: 500}}>Error</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563'}}>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem'}}>
        <p style={{fontSize: '0.875rem', color: '#92400e', margin: 0}}>
          <strong>Note:</strong> Detailed logs are available for debugging purposes. For the admin user sigarencja@gmail.com, full error details are logged to the browser console.
        </p>
      </div>
    </div>
  );
}
