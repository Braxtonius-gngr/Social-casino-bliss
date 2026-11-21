import { pingText } from "./publish.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("the ping names the platform and reason, never a link", () => {
  const text = pingText([
    { platform: "WOW Vegas", published: true, reasons: [], freebie_id: "x", announced: "alerted 3 of 4 device(s)" },
    { platform: "Stake.us", published: false, reasons: ["the link goes to https://bit.ly/x, not Stake.us's own site"], freebie_id: null },
  ]);
  assert(text.includes("Auto-published: **WOW Vegas**") && text.includes("Held for review: **Stake.us**"), text);
  assert(!/https?:\/\//.test(text), "link leaked");
  assert(text.includes("Pull Drafts"), "no pointer to the admin page");
});
