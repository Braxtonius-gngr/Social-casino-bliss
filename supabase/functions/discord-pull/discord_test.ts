import { byIdAscending, messageImages, messageText, newerId } from "./discord.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("ids compare as numbers, not strings", () => {
  assert(newerId("999", "1000") === "1000", "string comparison used");
  assert(newerId("1305000000000000001", "1305000000000000000") === "1305000000000000001", "big ids wrong");
  const sorted = byIdAscending([{ id: "1000" }, { id: "999" }, { id: "1001" }]).map((m) => m.id);
  assert(sorted.join(",") === "999,1000,1001", `sorted ${sorted}`);
});

Deno.test("a post's text includes its embeds but not its author", () => {
  const text = messageText({
    id: "1",
    content: "Free 1 SC today!",
    author: { username: "SomePerson" },
    embeds: [{ title: "Daily drop", description: "Use code GOLD25", fields: [{ name: "Ends", value: "midnight ET" }], footer: { text: "WOW Vegas" } }],
  });
  for (const part of ["Free 1 SC today!", "Daily drop", "Use code GOLD25", "Ends: midnight ET", "WOW Vegas"]) {
    assert(text.includes(part), `missing ${part}`);
  }
  assert(!text.includes("SomePerson"), "author leaked");
});

Deno.test("only Discord-hosted pictures are taken", () => {
  const images = messageImages({
    id: "1",
    attachments: [
      { url: "https://cdn.discordapp.com/attachments/1/2/promo.png", content_type: "image/png" },
      { url: "https://cdn.discordapp.com/attachments/1/2/terms.pdf", content_type: "application/pdf" },
      { url: "https://cdn.discordapp.com/attachments/1/2/shot.JPG" },
    ],
    embeds: [
      { image: { url: "https://casino.example/banner.png", proxy_url: "https://media.discordapp.net/external/abc/banner.png" } },
      { thumbnail: { url: "https://evil.example/x.png" } },
    ],
  });
  assert(images.length === 3, `got ${JSON.stringify(images)}`);
  assert(!images.some((u) => u.includes("pdf") || u.includes("evil.example") || u.startsWith("https://casino.example")), "non-Discord or non-image taken");
});
