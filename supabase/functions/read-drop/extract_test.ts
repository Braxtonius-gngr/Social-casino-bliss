import { cleanDrops, discordImageUrl, isDiscordMessageLink, sniffImageType } from "./extract.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("only Discord image hosts are fetched", () => {
  assert(discordImageUrl("https://cdn.discordapp.com/attachments/1/2/shot.png?ex=1&hm=2"), "cdn refused");
  assert(discordImageUrl("https://media.discordapp.net/attachments/1/2/shot.png"), "media refused");
  assert(!discordImageUrl("http://cdn.discordapp.com/attachments/1/2/shot.png"), "plain http allowed");
  assert(!discordImageUrl("https://cdn.discordapp.com.evil.test/x.png"), "look-alike host allowed");
  assert(!discordImageUrl("https://user:pw@cdn.discordapp.com/x.png"), "credentials allowed");
  assert(!discordImageUrl("https://cdn.discordapp.com:8443/x.png"), "odd port allowed");
  assert(!discordImageUrl("https://169.254.169.254/latest"), "metadata address allowed");
  assert(!discordImageUrl("not a url"), "garbage accepted");
});

Deno.test("a Discord message link is told apart from an image link", () => {
  assert(isDiscordMessageLink("https://discord.com/channels/1/2/3"), "message link missed");
  assert(isDiscordMessageLink("https://ptb.discord.com/channels/1/2/3"), "ptb message link missed");
  assert(!isDiscordMessageLink("https://cdn.discordapp.com/attachments/1/2/a.png"), "image link flagged");
});

Deno.test("image types come from the bytes", () => {
  assert(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) === "image/png", "png");
  assert(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])) === "image/jpeg", "jpeg");
  assert(sniffImageType(new TextEncoder().encode("GIF89a")) === "image/gif", "gif");
  assert(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")) === "image/webp", "webp");
  assert(sniffImageType(new TextEncoder().encode("<html>")) === null, "html accepted");
});

Deno.test("answers are cleaned before the admin sees them", () => {
  const { drops, unreadable } = cleanDrops({
    drops: [
      {
        platform_name: "  Chumba   Casino ",
        catalog_match: "Chumba Casino",
        bucket: "B_claim",
        code: null,
        claim_url: "javascript:alert(1)",
        root_domain: "https://www.ChumbaCasino.com/promo",
        reward: "2 SC",
        expires_at: "2026-09-27T23:59:00-04:00",
        terms: null,
        is_account_tied: false,
        confidence: "high",
        evidence: "Claim 2 free SC today",
      },
      {
        platform_name: "Made Up",
        catalog_match: "Not In The List",
        bucket: "Z_other",
        code: "WIN20",
        claim_url: "https://madeup.test/claim",
        root_domain: null,
        reward: null,
        expires_at: "tonight",
        terms: null,
        is_account_tied: "yes",
        confidence: "certain",
        evidence: "",
      },
      { platform_name: "   " },
    ],
    unreadable: null,
  }, ["Chumba Casino"]);
  assert(drops.length === 2, `expected 2 drops, got ${drops.length}`);
  const [a, b] = drops;
  assert(a.platform_name === "Chumba Casino", a.platform_name);
  assert(a.catalog_match === "Chumba Casino", "catalog match dropped");
  assert(a.claim_url === null, "non-web link kept");
  assert(a.root_domain === "chumbacasino.com", String(a.root_domain));
  assert(a.expires_at === "2026-09-28T03:59:00.000Z", String(a.expires_at));
  assert(b.catalog_match === null, "invented catalog match kept");
  assert(b.bucket === "B_claim", b.bucket);
  assert(b.root_domain === "madeup.test", String(b.root_domain));
  assert(b.expires_at === null, "unparseable date kept");
  assert(b.is_account_tied === false, "non-boolean account-tied kept");
  assert(b.confidence === "low", b.confidence);
  assert(unreadable === null, "unreadable invented");
});
