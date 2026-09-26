// Matching a drop to the devices that asked to hear about it. Kept apart
// from index.ts (which starts the server on import) so it can be tested.

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
  const parts = host.split(".").filter(Boolean);
  if (parts.length >= 2) keys.add(`site:${parts.slice(-2).join(".")}`);
  return [...keys];
}
