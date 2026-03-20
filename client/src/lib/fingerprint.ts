/**
 * Browser Fingerprinting Utility
 * Generates a unique identifier for anonymous users based on browser characteristics
 */

import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard UUID namespace

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
  
  // Generate a UUID v5 from the fingerprint string
  const fingerprint = uuidv5(fingerprintString, NAMESPACE);
  
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
