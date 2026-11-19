import { cleanDrops, type Drop } from "./extract.ts";
import { type CatalogPlatform, decide, isDuplicate, normalizeLink } from "./gate.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const NOW = Date.parse("2026-11-19T12:00:00Z");
const CATALOG: CatalogPlatform[] = [
  { name: "WOW Vegas", url: "https://www.wowvegas.com/promotions/daily-coin-reward" },
  { name: "Baba", url: "https://www.babacasino.com" },
  { name: "Stake", url: "https://stake.us" },
];
const PLATFORMS = CATALOG.map((p) => p.name);

// A clean answer for one drop, with overrides.
function read(over: Record<string, unknown>): Drop {
  const { drops } = cleanDrops({
    drops: [{
      platform_name: "WOW Vegas", catalog_match: "WOW Vegas", bucket: "B_claim", code: null,
      claim_url: "https://www.wowvegas.com/promo/free-sc", root_domain: "wowvegas.com", reward: "1 SC",
      expires_at: "2026-11-20T05:00:00Z", terms: null, is_account_tied: false, confidence: "high",
      evidence: "Free 1 SC at WOW Vegas, claim before midnight", ...over,
    }],
    unreadable: null,
  }, PLATFORMS, NOW);
  assert(drops.length === 1, "drop not read");
  return drops[0];
}

Deno.test("a clean claim on the casino's own site publishes", () => {
  const d = decide(read({}), CATALOG, [], NOW);
  assert(d.publish, `held: ${d.reasons.join("; ")}`);
  assert(d.platform?.name === "WOW Vegas", "platform not matched");
});

Deno.test("a clean code drop publishes", () => {
  const d = decide(read({ platform_name: "Stake", catalog_match: "Stake", bucket: "A_code", code: "DAILYDROP25", claim_url: null, root_domain: "stake.us" }), CATALOG, [], NOW);
  assert(d.publish, `held: ${d.reasons.join("; ")}`);
});

Deno.test("each failing check holds the drop with a reason", () => {
  const cases: [string, Record<string, unknown>, RegExp][] = [
    ["unknown platform", { platform_name: "Nowhere Casino", catalog_match: "Nowhere Casino" }, /isn't a platform in the catalogue/],
    ["medium confidence", { confidence: "medium" }, /medium-confidence/],
    ["account-tied", { is_account_tied: true }, /only works for the account/],
    ["purchase", { bucket: "C_purchase" }, /needs a purchase/],
    ["link to another site", { claim_url: "https://www.othercasino.com/promo", root_domain: "wowvegas.com" }, /different site|not WOW Vegas's own site/],
    ["referral link", { claim_url: "https://www.wowvegas.com/signup?ref=ABC123" }, /referral code/],
    ["redirect link", { platform_name: "Baba", catalog_match: "Baba", claim_url: "https://d10xl.com/babacasino/C8tcAlVby2611", root_domain: "babacasino.com" }, /shortener or tracking redirect/],
    ["code drop without code", { bucket: "A_code", code: null, claim_url: null }, /code offer with no code/],
    ["word in the code slot", { bucket: "A_code", code: "CLAIM", claim_url: null }, /doesn't look like a real code/],
    ["code with spaces", { bucket: "A_code", code: "FREE SC", claim_url: null }, /doesn't look like a real code/],
    ["claim with a code too", { code: "EXTRA10" }, /which one is it/],
    ["already ended", { expires_at: "2026-11-19T11:00:00Z" }, /already ended/],
    ["ends too soon", { expires_at: "2026-11-19T12:05:00Z" }, /within 15 minutes/],
    ["far-off end", { expires_at: "2027-03-01T00:00:00Z" }, /60 days away/],
    ["unknown bucket", { bucket: "Z_other" }, /what kind of offer/],
    ["claim with no link", { claim_url: null }, /no link/],
  ];
  for (const [label, over, expect] of cases) {
    const d = decide(read(over), CATALOG, [], NOW);
    assert(!d.publish, `${label}: published`);
    assert(d.reasons.some((r) => expect.test(r)), `${label}: reasons were ${JSON.stringify(d.reasons)}`);
  }
});

Deno.test("Claude's named domain never overrides where the link goes", () => {
  const drop = read({ claim_url: "https://www.othercasino.com/promo", root_domain: "wowvegas.com" });
  assert(drop.root_domain === "othercasino.com", `root_domain was ${drop.root_domain}`);
  assert(drop.issues.includes("domain_mismatch"), "mismatch not flagged");
});

Deno.test("an account-tied link is removed along with its link flags", () => {
  const drop = read({ claim_url: "https://www.wowvegas.com/c?uid=99&ref=AB" });
  assert(drop.claim_url === null && drop.is_account_tied, "personal link kept");
  assert(!drop.issues.includes("referral_link"), "flag kept for a removed link");
});

Deno.test("a drop already live is held as a duplicate", () => {
  const live = [{ platform_name: "WOW Vegas", code: null, claim_url: "https://wowvegas.com/promo/free-sc/?utm_source=x", created_at: "2026-11-19T08:00:00Z" }];
  const d = decide(read({}), CATALOG, live, NOW);
  assert(!d.publish && d.reasons.some((r) => /already live/.test(r)), "duplicate published");
  const old = [{ ...live[0], created_at: "2026-11-10T08:00:00Z" }];
  assert(!isDuplicate(read({}), old, NOW), "a week-old drop counted as a duplicate");
});

Deno.test("links compare without tracking noise", () => {
  assert(normalizeLink("https://www.WowVegas.com/promo/?utm_source=a&b=1#x") === normalizeLink("https://wowvegas.com/promo?b=1"), "not equal");
  assert(normalizeLink("https://wowvegas.com/promo?b=1") !== normalizeLink("https://wowvegas.com/promo?b=2"), "different params equal");
});
