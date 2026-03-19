import axios from "axios";
import * as cheerio from "cheerio";

function parsePrice(priceText) {
  if (!priceText) return null;

  const cleaned = priceText
    .replace(/\b(max|od|od\s+\d+[.,]\d+\s*zł)\b/gi, "")
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!cleaned) return null;

  const normalized = cleaned.replace(",", ".");
  const price = parseFloat(normalized);
  if (isNaN(price) || price < 10 || price > 10000000) return null;

  return Math.round(price * 100);
}

async function scrapeProduct(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let name = $("h1").first().text().trim();
    if (!name) {
      const titleTag = $("title").text().trim();
      name = titleTag.split(" - ")[0]?.trim() || null;
    }

    let priceText = null;
    const productPriceDiv = $("#product_price");
    if (productPriceDiv.length > 0) {
      const dataPrice = productPriceDiv.attr("data-price");
      if (dataPrice) {
        priceText = dataPrice.replace(".", ",") + " zł";
      }
    }

    if (!priceText) {
      const priceContent = productPriceDiv.text().trim();
      if (priceContent) {
        priceText = priceContent;
      }
    }

    const price = parsePrice(priceText);
    
    console.log("Product Name:", name);
    console.log("Price Text:", priceText);
    console.log("Price (cents):", price);
    console.log("Price (PLN):", price ? (price / 100).toFixed(2) : null);
    
    return { name, price, priceText };
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}

console.log("Testing Kingston Fury Beast...");
await scrapeProduct("https://www.morele.net/pamiec-kingston-fury-beast-ddr5-32-gb-5600mhz-cl36-kf556c36bbek2-32-11892219/");
