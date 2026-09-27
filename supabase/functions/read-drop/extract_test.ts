import { apiErrorMessage, claudeErrorReply, cleanDrops, discordImageUrl, isDiscordMessageLink, redactPersonal, sniffImageType } from "./extract.ts";

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

Deno.test("personal details are cut from free text, amounts and codes are kept", () => {
  const cases: [string, string | null][] = [
    ["Claim 5,000 GC + 2 SC today", "Claim 5,000 GC + 2 SC today"],
    ["Sent to jane.doe@example.com: 2 SC", "Sent to [removed]: 2 SC"],
    ["thanks @LuckyLarry for the tip", "thanks [removed] for the tip"],
    ["Player ID: 88231940 gets 5 SC", "[removed] gets 5 SC"],
    ["from 123456789012345678", "from [removed]"],
    ["call (555) 123-4567 now", "call [removed] now"],
    ["jane@example.com", null],
  ];
  for (const [input, expected] of cases) {
    const got = redactPersonal(input);
    assert(got === expected, `${input} -> ${got}`);
  }
  const { drops } = cleanDrops({
    drops: [{
      platform_name: "Stake", catalog_match: null, bucket: "A_code", code: "WIN20", claim_url: null,
      root_domain: null, reward: "5 SC", expires_at: null, terms: "user: bigwinner99 only",
      is_account_tied: false, confidence: "high", evidence: "@bigwinner99 posted WIN20",
    }],
    unreadable: null,
  }, []);
  assert(drops[0].code === "WIN20", "code kept");
  assert(drops[0].terms === "[removed] only", String(drops[0].terms));
  assert(drops[0].evidence === "[removed] posted WIN20", drops[0].evidence);
});

Deno.test("an account-tied offer never carries its link", () => {
  const { drops } = cleanDrops({
    drops: [{
      platform_name: "Pulsz", catalog_match: null, bucket: "B_claim", code: null,
      claim_url: "https://www.pulsz.com/claim?token=abc123", root_domain: null, reward: "3 SC",
      expires_at: null, terms: null, is_account_tied: true, confidence: "high", evidence: "Your bonus is ready",
    }],
    unreadable: null,
  }, []);
  assert(drops[0].claim_url === null, String(drops[0].claim_url));
  assert(drops[0].is_account_tied === true, "flag kept");
});

Deno.test("root domains keep two-part country suffixes whole", () => {
  const { drops } = cleanDrops({
    drops: [{
      platform_name: "Lucky", catalog_match: null, bucket: "A_code", code: "UK5", claim_url: null,
      root_domain: "https://www.luckycasino.co.uk/promo", reward: null, expires_at: null, terms: null,
      is_account_tied: false, confidence: "high", evidence: "UK5",
    }],
    unreadable: null,
  }, []);
  assert(drops[0].root_domain === "luckycasino.co.uk", String(drops[0].root_domain));
});

Deno.test("a link with account parameters is account-tied whatever the model said", () => {
  const { drops } = cleanDrops({
    drops: [{
      platform_name: "Pulsz", catalog_match: null, bucket: "B_claim", code: null,
      claim_url: "https://www.pulsz.com/bonus?fuid=8812&utm_source=mail", root_domain: null, reward: "3 SC",
      expires_at: null, terms: null, is_account_tied: false, confidence: "high", evidence: "Claim your bonus",
    }],
    unreadable: null,
  }, []);
  assert(drops[0].claim_url === null, String(drops[0].claim_url));
  assert(drops[0].is_account_tied === true, "flagged");
  assert(drops[0].root_domain === "pulsz.com", String(drops[0].root_domain));
});

Deno.test("a failed Claude call is explained, not just retried", () => {
  const key = claudeErrorReply(401, "authentication_error", "401 invalid x-api-key");
  assert(key.status === 500 && /ANTHROPIC_API_KEY/.test(key.error) && !/try again/i.test(key.error), "bad key not named");
  assert(claudeErrorReply(undefined, "authentication_error", "").status === 500, "type alone not enough");
  assert(/billing/.test(claudeErrorReply(402, "billing_error", "").error), "billing not named");
  assert(/access/.test(claudeErrorReply(403, "permission_error", "").error), "access not named");
  assert(/model/.test(claudeErrorReply(404, "not_found_error", "").error), "model not named");
  const bad = claudeErrorReply(400, "invalid_request_error", "400 image exceeds 5 MB maximum: 6000000 bytes");
  assert(bad.status === 502 && /rejected the request: image exceeds 5 MB maximum/.test(bad.error), "400 detail dropped");
  assert(claudeErrorReply(400, "invalid_request_error", "x".repeat(400)).error.length < 350, "400 detail not trimmed");
  assert(claudeErrorReply(429, "rate_limit_error", "").status === 503, "429 not retryable");
  assert(claudeErrorReply(529, "overloaded_error", "").status === 503, "529 not retryable");
  assert(claudeErrorReply(500, "api_error", "").status === 503, "500 not retryable");
  assert(/didn't answer/.test(claudeErrorReply(undefined, null, "Connection error.").error), "network not named");
  assert(claudeErrorReply(undefined, undefined, "Request was aborted.").status === 503, "deadline abort not retryable");
  const other = claudeErrorReply(418, null, "");
  assert(other.status === 502 && /\(418\)/.test(other.error), "unknown status not passed through");
});

Deno.test("a key or workspace problem reads as setup, with the API's own sentence", () => {
  // The body Anthropic sent for a key linked to a person rather than a workspace.
  const body = {
    type: "error",
    error: {
      type: "invalid_request_error",
      message: "This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header with the ID of the workspace to use.",
    },
  };
  const sentence = apiErrorMessage(body, JSON.stringify(body));
  assert(sentence.startsWith("This API key is not scoped"), "inner message not extracted");
  assert(apiErrorMessage(null, "fallback") === "fallback", "missing body not handled");
  assert(apiErrorMessage({ error: { message: "  " } }, "fallback") === "fallback", "blank message not handled");
  const reply = claudeErrorReply(400, "invalid_request_error", sentence);
  assert(reply.status === 500 && /ANTHROPIC_API_KEY as it is set up/.test(reply.error), "workspace error not treated as setup");
  assert(/workspace to use\. Fix the key/.test(reply.error), "API sentence not kept whole");
  assert(!/screenshots/.test(reply.error) && !/\{/.test(reply.error), "screenshot hint or raw JSON shown");
  const plain = claudeErrorReply(400, "invalid_request_error", "max_tokens: must be at most 128000.");
  assert(plain.status === 502 && !/screenshots/.test(plain.error) && !/\.\./.test(plain.error), "non-image 400 misworded");
});
