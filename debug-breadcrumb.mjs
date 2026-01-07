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

  const breadcrumbInfo = await page.evaluate(() => {
    const result = {
      main_breadcrumb_a: [],
      breadcrumb_elements: [],
      all_nav_links: [],
      class_breadcrumb: []
    };

    // Try different selectors
    result.main_breadcrumb_a = Array.from(document.querySelectorAll('.main-breadcrumb a')).map(el => ({
      text: el.textContent?.trim(),
      href: el.href
    }));

    result.breadcrumb_elements = Array.from(document.querySelectorAll('[class*="breadcrumb"] a')).map(el => ({
      text: el.textContent?.trim(),
      href: el.href,
      class: el.className
    }));

    result.all_nav_links = Array.from(document.querySelectorAll('nav a')).slice(0, 10).map(el => ({
      text: el.textContent?.trim(),
      href: el.href,
      class: el.className
    }));

    result.class_breadcrumb = Array.from(document.querySelectorAll('.breadcrumb a')).map(el => ({
      text: el.textContent?.trim(),
      href: el.href
    }));

    return result;
  });

  console.log('Breadcrumb Info:', JSON.stringify(breadcrumbInfo, null, 2));

  await browser.close();
})();
