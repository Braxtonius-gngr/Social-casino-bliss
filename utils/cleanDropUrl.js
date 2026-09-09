/**
 * Set of known tracking parameters to strip from URLs.
 * @type {Set<string>}
 */
const TRACKING_PARAMS = new Set([
  'gclid', 'fbclid', 'r', 'ref', 'aff', 'affiliate'
]);

/**
 * Parses any web address, strips known tracking parameters, normalizes the hostname,
 * and returns the clean protocol + host + clean path + remaining query parameters.
 *
 * @param {string} rawUrl - The raw URL string to be sanitized.
 * @returns {string} The cleaned and normalized URL.
 * @throws {TypeError} If the rawUrl cannot be parsed as a valid URL.
 */
export function cleanDropUrl(rawUrl) {
  const url = new URL(rawUrl);

  // 1. Normalize the hostname (Browsers usually do this, but enforcing ensures consistency)
  url.hostname = url.hostname.toLowerCase();

  // 2. Strip tracking parameters
  const paramsToDelete = [];

  // Search parameters iterator
  for (const [key] of url.searchParams.entries()) {
    const lowerKey = key.toLowerCase();

    // Check for exact matches in our known set, or if it has the "utm_" prefix
    if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
      paramsToDelete.push(key);
    }
  }

  // Delete the collected marketing parameters
  for (const param of paramsToDelete) {
    url.searchParams.delete(param);
  }

  // 3. Return the sanitized string
  return url.toString();
}
