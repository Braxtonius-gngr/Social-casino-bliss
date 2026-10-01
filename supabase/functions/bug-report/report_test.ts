import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { addressKey, buildEmbed, cleanErrors, clientAddress, MAX_TEXT, validate } from "./report.ts";

Deno.test("validate takes a plain report and trims it", () => {
  const out = validate({ category: "Timer bug", text: "  Zula timer stuck at 0:00  " });
  assert("report" in out, "refused");
  assertEquals(out.report.category, "Timer bug");
  assertEquals(out.report.text, "Zula timer stuck at 0:00");
  assertEquals(out.report.meta.recentErrors, []);
  assertEquals(out.report.meta.trackedCount, null);
});

Deno.test("validate refuses JSON that is not an object", () => {
  for (const body of [null, undefined, "a string", 7, true, ["Timer bug"]]) {
    assert("error" in validate(body), `${JSON.stringify(body)} taken`);
  }
  // meta given as an array is ignored, not dereferenced
  const out = validate({ category: "Other", text: "x", meta: ["glitch"] });
  assert("report" in out, "array meta refused the report");
  assertEquals(out.report.meta.theme, null);
});

Deno.test("validate refuses an unknown category and an empty or oversized body", () => {
  assert("error" in validate({ category: "Rant", text: "x" }), "unknown category taken");
  assert("error" in validate({ category: "Other", text: "   " }), "blank body taken");
  assert("error" in validate({ category: "Other", text: "a".repeat(MAX_TEXT + 1) }), "oversized body taken");
  assert("error" in validate({ text: "no category" }), "missing category taken");
});

Deno.test("validate caps and types the diagnostics", () => {
  const out = validate({
    category: "Feature idea",
    text: "Edge light for Dead Channel",
    meta: {
      userAgent: "u".repeat(2000),
      appBuild: "almanac-v85",
      catalogVersion: "cat-2026-09-30",
      theme: "glitch",
      trackedCount: "7",
      recentErrors: ["a", "", 3, "b"],
    },
  });
  assert("report" in out, "refused");
  assertEquals(out.report.meta.userAgent?.length, 1024);
  assertEquals(out.report.meta.trackedCount, 7);
  assertEquals(out.report.meta.theme, "glitch");
  assertEquals(out.report.meta.recentErrors, ["a", "b"]);
});

Deno.test("cleanErrors keeps the last ten strings only", () => {
  const many = Array.from({ length: 14 }, (_, i) => `e${i}`);
  const kept = cleanErrors(many);
  assertEquals(kept.length, 10);
  assertEquals(kept[0], "e4");
  assertEquals(cleanErrors("nope"), []);
});

Deno.test("buildEmbed carries the row id and the category colour", () => {
  const out = validate({ category: "Catalogue/rule correction", text: "Crown Coins resets at 6", meta: { recentErrors: ["boom"] } });
  assert("report" in out, "refused");
  const embed = buildEmbed(out.report, 42).embeds[0];
  assertEquals(embed.title, "[Catalogue/rule correction]");
  assertEquals(embed.color, 0xffcc00);
  assertEquals(embed.footer.text, "bug_reports #42");
  assert(embed.fields.some((f) => f.name === "Recent app errors" && f.value === "boom"), "errors field missing");
});

Deno.test("clientAddress trusts Cloudflare's header, then the proxy-appended forwarded entry", () => {
  const both = new Request("https://x/bug-report", { headers: { "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "1.2.3.4, 203.0.113.9" } });
  assertEquals(clientAddress(both), "198.51.100.7");
  const forwarded = new Request("https://x/bug-report", { headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.9" } });
  assertEquals(clientAddress(forwarded), "203.0.113.9", "the client-supplied first entry is ignored");
  assertEquals(clientAddress(new Request("https://x/bug-report")), "unknown");
});

Deno.test("addressKey is a salted hash, not the address", async () => {
  const a = await addressKey("203.0.113.9", "salt");
  assertEquals(a.length, 64);
  assert(!a.includes("203.0.113.9"), "address leaked");
  assertEquals(a, await addressKey("203.0.113.9", "salt"), "not stable");
  assert(a !== await addressKey("203.0.113.9", "other-salt"), "salt ignored");
});
