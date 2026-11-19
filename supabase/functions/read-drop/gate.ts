// The publish gate: whether a drop Claude read can go live on its own, or
// must wait for the owner. Claude's own "confidence" is only one input; every
// other check is something this code verifies itself. Pure (no network), so
// it can be tested.

import { codeProblem, type Drop, rootDomain } from "./extract.ts";

// A catalog platform: its exact name and its own site (data/catalog.json).
export type CatalogPlatform = { name: string; url: string };

// A live freebie, for the duplicate check.
export type LiveFreebie = {
  platform_name: string;
  code: string | null;
  claim_url: string | null;
  created_at: string;
};

export type GateDecision = {
  publish: boolean;
  // Why it was held, in words the owner reads in the review list (empty when
  // it publishes).
  reasons: string[];
  // The catalog platform it was matched to, when it was.
  platform: CatalogPlatform | null;
};

// How far out an end time may be before it reads as a misread date, and how
// soon it may end and still be worth posting.
const MIN_REMAINING_MS = 15 * 60 * 1000;
const MAX_REMAINING_MS = 30 * 24 * 3600 * 1000;
// A drop matching a live one posted in this window is a duplicate.
const DUPLICATE_WINDOW_MS = 72 * 3600 * 1000;

const ISSUE_TEXT: Record<string, string> = {
  bucket_unknown: "couldn't tell what kind of offer it is",
  code_missing: "a code offer with no code",
  code_invalid: "the code doesn't look like a real code",
  code_too_long: "the code is unusually long (probably misread)",
  code_on_claim: "it has both a claim link and a code; which one is it?",
  domain_mismatch: "the link goes to a different site than the one named",
  referral_link: "the link carries someone's referral code",
  redirect_link: "the link is a shortener or tracking redirect, not the casino",
  expired: "it has already ended",
  expiry_far: "its end date is over 60 days away (probably misread)",
};

export function catalogDomain(platform: CatalogPlatform): string | null {
  try {
    return rootDomain(new URL(platform.url).hostname);
  } catch {
    return null;
  }
}

// The link without tracking noise, for comparing two links.
export function normalizeLink(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${path}${url.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function isDuplicate(drop: Drop, live: LiveFreebie[], now: number): boolean {
  const platform = (drop.catalog_match ?? drop.platform_name).toLowerCase();
  return live.some((f) => {
    if (f.platform_name.toLowerCase() !== platform) return false;
    if (now - Date.parse(f.created_at) > DUPLICATE_WINDOW_MS) return false;
    if (drop.code && f.code && drop.code.toLowerCase() === f.code.toLowerCase()) return true;
    if (drop.claim_url && f.claim_url && normalizeLink(drop.claim_url) === normalizeLink(f.claim_url)) return true;
    return false;
  });
}

export function decide(
  drop: Drop,
  catalog: CatalogPlatform[],
  live: LiveFreebie[],
  now: number = Date.now(),
): GateDecision {
  const reasons: string[] = [];
  const platform = drop.catalog_match ? catalog.find((p) => p.name === drop.catalog_match) ?? null : null;

  if (!platform) reasons.push(`"${drop.platform_name}" isn't a platform in the catalogue`);
  if (drop.confidence !== "high") reasons.push(`Claude was only ${drop.confidence}-confidence reading it`);
  if (drop.is_account_tied) reasons.push("it only works for the account it was sent to");
  for (const issue of drop.issues) reasons.push(ISSUE_TEXT[issue] ?? issue);
  if (!drop.evidence) reasons.push("no offer text to check it against");

  if (drop.bucket === "C_purchase") {
    reasons.push("it needs a purchase");
  } else if (drop.bucket === "A_code") {
    if (!drop.code || codeProblem(drop.code)) {
      if (!drop.issues.includes("code_missing") && !drop.issues.includes("code_invalid")) reasons.push("no usable code");
    }
  } else {
    // A claim: it needs a link, and the link must be the casino's own site.
    if (!drop.claim_url) {
      reasons.push("a claim offer with no link (in-app claims are checked by hand)");
    } else if (platform) {
      const home = catalogDomain(platform);
      let linkRoot: string | null = null;
      try {
        linkRoot = rootDomain(new URL(drop.claim_url).hostname);
      } catch { /* checked in cleanDrops */ }
      if (!home || !linkRoot || linkRoot !== home) {
        reasons.push(`the link goes to ${linkRoot ?? "an unknown site"}, not ${platform.name}'s own site (${home ?? "unknown"})`);
      }
    }
  }

  if (drop.expires_at) {
    const remaining = Date.parse(drop.expires_at) - now;
    if (remaining > 0 && remaining < MIN_REMAINING_MS) reasons.push("it ends within 15 minutes");
    if (remaining > MAX_REMAINING_MS && !drop.issues.includes("expiry_far")) reasons.push("its end date is over 30 days away");
  }

  if (isDuplicate(drop, live, now)) reasons.push("the same drop is already live");

  // One reason per line, no repeats.
  const unique = [...new Set(reasons)];
  return { publish: unique.length === 0, reasons: unique, platform };
}
