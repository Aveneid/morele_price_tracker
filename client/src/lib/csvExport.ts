/**
 * Utility functions for exporting data to CSV format
 */

export function exportProductsToCsv(products: any[], priceHistories: Record<number, any[]>) {
  const rows: string[] = [];
  
  // Header row
  rows.push("Product Name,Category,Current Price (PLN),Previous Price (PLN),Change %,Last Checked,URL");
  
  // Data rows
  products.forEach((product) => {
    const currentPrice = product.currentPrice ? (product.currentPrice / 100).toFixed(2) : "—";
    const previousPrice = product.previousPrice ? (product.previousPrice / 100).toFixed(2) : "—";
    const changePercent = product.priceChangePercent ? (product.priceChangePercent / 100).toFixed(2) : "—";
    const lastChecked = product.lastCheckedAt 
      ? new Date(product.lastCheckedAt).toLocaleString("pl-PL")
      : "Never";
    
    // Escape quotes in product name and URL
    const name = `"${product.name.replace(/"/g, '""')}"`;
    const url = `"${product.url.replace(/"/g, '""')}"`;
    
    rows.push(`${name},${product.category || "—"},${currentPrice},${previousPrice},${changePercent},${lastChecked},${url}`);
  });
  
  const csv = rows.join("\n");
  downloadCsv(csv, "price-tracker-products.csv");
}

export function exportPriceHistoryCsv(productName: string, history: any[]) {
  const rows: string[] = [];
  
  // Header row
  rows.push("Date,Price (PLN)");
  
  // Data rows (sorted by date ascending)
  history
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .forEach((entry) => {
      const date = new Date(entry.recordedAt).toLocaleString("pl-PL");
      const price = (entry.price / 100).toFixed(2);
      rows.push(`${date},${price}`);
    });
  
  const csv = rows.join("\n");
  downloadCsv(csv, `price-history-${productName.replace(/\s+/g, "-").toLowerCase()}.csv`);
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
