// Matching a drop to the devices that asked to hear about it. Kept apart
// from index.ts (which starts the server on import) so it can be tested.

// Second-level labels that belong to the public suffix under a two-letter
// country code (example.co.uk): there the site is the last three labels.
// Mirrors MULTI_LABEL_SLDS in utils/classifyDropText.js and sw.js.
const MULTI_LABEL_SLDS = new Set(["co", "com", "net", "org", "gov", "edu", "ac", "ltd", "plc"]);

export function registrableDomain(host: string): string | null {
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  const take = parts.length >= 3 && parts[parts.length - 1].length === 2 && MULTI_LABEL_SLDS.has(parts[parts.length - 2]) ? 3 : 2;
  return parts.slice(-take).join(".");
}

// The keys a device uploads for what it tracks (dropKeysFor() in
// index.html): the platform name's letters and digits, and its root domain.
export function dropKeys(platformName: string | null, rootDomain: string | null, claimUrl: string | null): string[] {
  const keys = new Set<string>();
  const name = (platformName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (name) keys.add(`name:${name}`);
  let host = (rootDomain ?? "").trim().toLowerCase();
  if (!host && claimUrl) {
    try { host = new URL(claimUrl).hostname.toLowerCase(); } catch { host = ""; }
  }
  host = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const site = registrableDomain(host);
  if (site) keys.add(`site:${site}`);
  return [...keys];
}
