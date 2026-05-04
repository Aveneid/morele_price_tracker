/**
 * Browser Fingerprinting Utility
 * Generates a unique identifier for anonymous users based on browser characteristics
 */

/**
 * Simple hash function to generate a unique ID from a string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex string and pad with zeros
  const hex = Math.abs(hash).toString(16);
  return 'fp-' + hex.padStart(8, '0');
}

/**
 * Generate a browser fingerprint by combining various browser characteristics
 */
function generateFingerprint(): string {
  const components = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    screenWidth: screen.width,
    screenHeight: screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    plugins: Array.from(navigator.plugins || [])
      .map(p => p.name)
      .join(','),
  };

  // Create a fingerprint string from all components
  const fingerprintString = JSON.stringify(components);
  
  // Generate a hash from the fingerprint string
  const fingerprint = simpleHash(fingerprintString);
  
  return fingerprint;
}

/**
 * Get or create a browser fingerprint UUID
 * Stores it in localStorage for consistency across sessions
 */
export function getBrowserFingerprint(): string {
  const STORAGE_KEY = 'morele_browser_fingerprint';
  
  // Try to get existing fingerprint from localStorage
  let fingerprint = localStorage.getItem(STORAGE_KEY);
  
  if (!fingerprint) {
    // Generate new fingerprint if not found
    fingerprint = generateFingerprint();
    localStorage.setItem(STORAGE_KEY, fingerprint);
  }
  
  return fingerprint;
}

/**
 * Reset the browser fingerprint (useful for testing or user preference)
 */
export function resetBrowserFingerprint(): void {
  const STORAGE_KEY = 'morele_browser_fingerprint';
  localStorage.removeItem(STORAGE_KEY);
}
