import { batchRef, buildBatches } from "./batches.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const pic = (name: string) => ({ url: `https://cdn.discordapp.com/attachments/1/2/${name}.png`, content_type: "image/png" });
const now = Date.parse("2026-11-21T10:00:00Z");
const t = "2026-11-21T09:59:00Z";

Deno.test("text-only posts wait for the next picture, even on a later run", () => {
  const first = buildBatches([{ id: "101", content: "code drops tonight", timestamp: t }], [], true, now);
  assert(first.batches.length === 0 && first.held.length === 1, "text should be held, not read");
  const second = buildBatches([{ id: "102", attachments: [pic("a")], timestamp: t }], first.held, true, now);
  assert(second.batches.length === 1, "one read");
  const b = second.batches[0];
  assert(b.heldCount === 1 && b.texts[0] === "code drops tonight", "held text rides along");
  assert(batchRef("9", b) === "9/101..102#2", batchRef("9", b));
});

Deno.test("a batch holds at most 4 pictures; bots and empty posts are passed over", () => {
  const msgs = [
    { id: "1", attachments: [pic("a"), pic("b"), pic("c")], timestamp: t },
    { id: "2", attachments: [pic("d"), pic("e")], timestamp: t },
    { id: "3", content: "bot spam", author: { bot: true }, attachments: [pic("x")] },
    { id: "4", content: "" },
  ];
  const { batches } = buildBatches(msgs, [], true, now);
  assert(batches.length === 2, `got ${batches.length}`);
  assert(batches[0].images.length === 3 && batches[1].images.length === 2, "split wrong");
  assert(!batches.some((b) => b.ids.includes("3") || b.ids.includes("4")), "bot or empty post read");
});

Deno.test("embed pictures and words count (followed announcement channels)", () => {
  const { batches } = buildBatches([{
    id: "5",
    embeds: [{ title: "Daily drop", description: "Use code GOLD25", image: { url: "https://x.example/b.png", proxy_url: "https://media.discordapp.net/external/abc/b.png" } }],
    timestamp: t,
  }], [], true, now);
  assert(batches.length === 1 && batches[0].images.length === 1, "embed image missed");
  assert(batches[0].texts.join(" ").includes("GOLD25"), "embed text missed");
});

Deno.test("held text older than 6 hours is dropped", () => {
  const old = [{ id: "50", text: "yesterday", timestamp: "2026-11-20T09:00:00Z" }];
  const { batches } = buildBatches([{ id: "51", attachments: [pic("a")], timestamp: t }], old, true, now);
  assert(batches[0].heldCount === 0, "stale text rode along");
});
