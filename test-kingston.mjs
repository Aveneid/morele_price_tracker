import axios from "axios";
import * as cheerio from "cheerio";

async function scrapeProduct(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 15000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract product name
    let name = $("h1").first().text().trim();
    if (!name) {
      const titleTag = $("title").text().trim();
      name = titleTag.split(" - ")[0]?.trim() || null;
    }

    // Get price from #product_price div
    const productPriceDiv = $("#product_price");
    console.log("Product price div found:", productPriceDiv.length > 0);
    
    if (productPriceDiv.length > 0) {
      console.log("data-price:", productPriceDiv.attr("data-price"));
      console.log("text content:", productPriceDiv.text().trim());
    }

    // Get all text that looks like a price
    const priceMatches = [];
    $("span, div, p, strong, b").each((_, el) => {
      const text = $(el).text().trim();
      const priceMatch = text.match(/(\d+[.,]\d+)\s*zł\s*(max)?/);
      if (priceMatch && text.length < 50) {
        priceMatches.push(text);
      }
    });

    console.log("Found price patterns:", priceMatches.slice(0, 5));
    console.log("Product name:", name);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

scrapeProduct("https://www.morele.net/pamiec-kingston-fury-beast-ddr5-32-gb-5600mhz-cl36-kf556c36bbek2-32-11892219/");
