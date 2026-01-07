import puppeteer from "puppeteer";

const url = "https://www.morele.net/pamiec-corsair-vengeance-lpx-ddr4-16-gb-3000mhz-cl16-cmk16gx4m2d3000c16-1792417/";

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const categoryInfo = await page.evaluate(() => {
    const breadcrumbs = document.querySelectorAll('.breadcrumb a');
    const result = [];
    
    breadcrumbs.forEach((el, idx) => {
      const href = el.getAttribute('href');
      result.push({
        index: idx,
        text: el.textContent?.trim(),
        href: href,
        hasKategoria: href?.includes('/kategoria/')
      });
    });
    
    return result;
  });

  console.log('All breadcrumbs:');
  categoryInfo.forEach(b => console.log(`  [${b.index}] ${b.text} - kategoria: ${b.hasKategoria}`));
  
  // Find the last one with /kategoria/
  const lastCategory = categoryInfo.filter(b => b.hasKategoria).pop();
  console.log('\nLast category breadcrumb:', lastCategory);

  await browser.close();
})();
