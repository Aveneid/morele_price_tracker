/**
 * Extract domain from a full URL
 * @example extractDomain("https://www.morele.net/product/123") => "morele.net"
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove www. prefix if present
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Extract base domain (without subdomain)
 * @example getBaseDomain("www.morele.net") => "morele.net"
 */
export function getBaseDomain(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

/**
 * Check if two URLs belong to the same domain
 */
export function isSameDomain(url1: string, url2: string): boolean {
  const domain1 = extractDomain(url1);
  const domain2 = extractDomain(url2);
  return domain1 === domain2 && domain1 !== "";
}

/**
 * Normalize URL for comparison
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Return protocol + hostname for consistent comparison
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return url.toLowerCase();
  }
}
