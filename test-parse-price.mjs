function parsePrice(priceText) {
  if (!priceText) return null;

  // Remove currency symbol, "max" text, "od" text, and extra whitespace
  const cleaned = priceText
    .replace(/\b(max|od|od\s+\d+[.,]\d+\s*zł)\b/gi, "")
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!cleaned) return null;

  // Replace comma with dot for decimal point
  const normalized = cleaned.replace(",", ".");

  const price = parseFloat(normalized);
  // Reject prices that are too small (likely installment rates) or too large
  if (isNaN(price) || price < 10 || price > 10000000) return null;

  // Convert to cents (multiply by 100 and round)
  return Math.round(price * 100);
}

// Test cases
console.log("Test 1 - Kingston (1849 zł):", parsePrice("1849 zł"), "expected: 184900");
console.log("Test 2 - Corsair (599,00 zł):", parsePrice("599,00 zł"), "expected: 59900");
console.log("Test 3 - TP-Link (162,99 zł):", parsePrice("162,99 zł"), "expected: 16299");
console.log("Test 4 - With max:", parsePrice("1849 zł max"), "expected: 184900");
console.log("Test 5 - Installment (od 46,93 zł):", parsePrice("od 46,93 zł"), "expected: null or 4693");
