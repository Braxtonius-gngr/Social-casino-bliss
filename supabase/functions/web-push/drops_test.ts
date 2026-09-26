import { dropKeys, registrableDomain } from "./drops.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("drop keys come from the name and the root domain", () => {
  const keys = dropKeys("Chumba Casino", "www.chumbacasino.com", null);
  assert(keys.join() === "name:chumbacasino,site:chumbacasino.com", keys.join());
});

Deno.test("a missing root domain falls back to the claim link's host", () => {
  const keys = dropKeys("Stake.us", null, "https://promo.stake.us/claim?x=1");
  assert(keys.join() === "name:stakeus,site:stake.us", keys.join());
});

Deno.test("a pasted URL in the root domain field still yields the domain", () => {
  const keys = dropKeys("", "https://Modo.us/promo", null);
  assert(keys.join() === "site:modo.us", keys.join());
});

Deno.test("nothing usable gives no keys", () => {
  assert(dropKeys("  ", "", "not a url").length === 0, "expected no keys");
});

Deno.test("a site under a two-part country suffix keeps its own name", () => {
  assert(dropKeys("", "www.luckycasino.co.uk", null).join() === "site:luckycasino.co.uk", "co.uk");
  assert(registrableDomain("play.spins.com.au") === "spins.com.au", "com.au");
  assert(registrableDomain("promo.stake.us") === "stake.us", "plain two labels");
  assert(registrableDomain("co.uk") === "co.uk", "bare suffix stays as given");
});
