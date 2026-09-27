import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { RateLimiter, addressKey, clientAddress, launchTokenFrom, platformNameFrom, redirectResponse, safeDestination } from "./redirect.ts";

Deno.test("platformNameFrom reads, trims and lowercases the name", () => {
  assertEquals(platformNameFrom(new URL("https://x/go?p=McLuck")), "mcluck");
  assertEquals(platformNameFrom(new URL("https://x/go?p=%20Bang%20Coins%20")), "bang coins");
});

Deno.test("platformNameFrom refuses missing, oversized and control-character names", () => {
  assertEquals(platformNameFrom(new URL("https://x/go")), null);
  assertEquals(platformNameFrom(new URL("https://x/go?p=")), null);
  assertEquals(platformNameFrom(new URL("https://x/go?p=" + "a".repeat(81))), null);
  assertEquals(platformNameFrom(new URL("https://x/go?p=%3Cscript%3E")), null);
});

Deno.test("RateLimiter allows the limit per window, then refuses, then resets", () => {
  const limiter = new RateLimiter(3, 1000);
  assertEquals([limiter.allow("a", 0), limiter.allow("a", 10), limiter.allow("a", 20)], [true, true, true]);
  assertEquals(limiter.allow("a", 30), false);
  assertEquals(limiter.allow("b", 30), true, "another address is separate");
  assertEquals(limiter.allow("a", 1000), true, "a new window starts");
});

Deno.test("clientAddress trusts Cloudflare's header, then the proxy-appended forwarded entry", () => {
  const both = new Request("https://x/go", { headers: { "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4, 203.0.113.9" } });
  assertEquals(clientAddress(both), "198.51.100.7");
  const forwarded = new Request("https://x/go", { headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.9" } });
  assertEquals(clientAddress(forwarded), "203.0.113.9", "the client-supplied first entry is ignored");
  assertEquals(clientAddress(new Request("https://x/go")), "unknown");
});

Deno.test("addressKey is a stable hash, not the address", async () => {
  const key = await addressKey("203.0.113.9");
  assertEquals(key.length, 64);
  assertEquals(key.includes("203"), false);
  assertEquals(await addressKey("203.0.113.9"), key);
});

Deno.test("safeDestination follows only http(s)", () => {
  assertEquals(safeDestination("https://example.com/?ref=r_x"), "https://example.com/?ref=r_x");
  assertEquals(safeDestination("javascript:alert(1)"), null);
  assertEquals(safeDestination("not a url"), null);
  assertEquals(safeDestination(null), null);
});

Deno.test("redirectResponse is an uncached 302 with no referrer", () => {
  const res = redirectResponse("https://example.com/");
  assertEquals(res.status, 302);
  assertEquals(res.headers.get("Location"), "https://example.com/");
  assertEquals(res.headers.get("Cache-Control"), "no-store");
  assertEquals(res.headers.get("Referrer-Policy"), "no-referrer");
});

Deno.test("launchTokenFrom accepts only a 48-hex token", () => {
  const good = "a".repeat(48);
  assertEquals(launchTokenFrom(new URL(`https://x/go?p=McLuck&via=${good}`)), good);
  assertEquals(launchTokenFrom(new URL("https://x/go?p=McLuck")), null);
  assertEquals(launchTokenFrom(new URL("https://x/go?p=McLuck&via=short")), null);
  assertEquals(launchTokenFrom(new URL("https://x/go?p=McLuck&via=" + "Z".repeat(48))), null);
});
