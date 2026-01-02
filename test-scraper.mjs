import { scrapeProduct } from './server/scraper.ts';

const url = 'https://www.morele.net/pamiec-corsair-vengeance-lpx-ddr4-16-gb-3000mhz-cl16-cmk16gx4m2d3000c16-1792417/';

console.log('Testing scraper with URL:', url);

try {
  const result = await scrapeProduct(url);
  console.log('Scraper result:', result);
} catch (error) {
  console.error('Scraper error:', error);
}
