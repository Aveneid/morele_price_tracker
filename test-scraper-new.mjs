import { scrapeProduct, extractProductCode, parsePrice } from './server/scraper.ts';

const testUrl = 'https://www.morele.net/karta-sieciowa-tp-link-archer-tx3000e-6425391/';

console.log('Testing scraper with URL:', testUrl);
console.log('---');

try {
  const result = await scrapeProduct(testUrl, 'sigarencja@gmail.com');
  
  if (result) {
    console.log('✓ Scrape successful!');
    console.log('Product Name:', result.name);
    console.log('Price (cents):', result.price);
    console.log('Price (PLN):', result.price ? (result.price / 100).toFixed(2) : 'N/A');
    console.log('Product Code:', result.productCode);
    console.log('Image URL:', result.imageUrl);
    console.log('Category:', result.category);
  } else {
    console.log('✗ Scrape returned null');
  }
} catch (error) {
  console.error('✗ Error during scrape:', error);
}
