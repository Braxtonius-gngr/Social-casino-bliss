import {
  ALLOWED_PUSH_HOST,
  b64uDecode,
  b64uEncode,
  importVapidKey,
  nextScheduleAt,
  timingSafeEqual,
  vapidAuthHeader,
} from "./vapid.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function newVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publicKey = b64uEncode(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  const privateKey = (await crypto.subtle.exportKey("jwk", pair.privateKey)).d as string;
  return { pair, publicKey, privateKey };
}

Deno.test("base64url round-trips arbitrary bytes", () => {
  const bytes = crypto.getRandomValues(new Uint8Array(67));
  assert(b64uDecode(b64uEncode(bytes)).join() === bytes.join(), "round trip changed the bytes");
});

Deno.test("vapid header carries a JWT the public key verifies", async () => {
  const { pair, publicKey, privateKey } = await newVapidKeys();
  const key = await importVapidKey(publicKey, privateKey);
  const endpoint = "https://fcm.googleapis.com/fcm/send/abc123";
  const header = await vapidAuthHeader(key, publicKey, endpoint, "mailto:ops@example.com", 1_000_000);

  const match = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert(match, `unexpected header shape: ${header}`);
  const [token, k] = [match[1], match[2]];
  assert(k === publicKey, "k= must be the public key");

  const [h, c, s] = token.split(".");
  const claims = JSON.parse(new TextDecoder().decode(b64uDecode(c)));
  assert(claims.aud === "https://fcm.googleapis.com", `aud was ${claims.aud}`);
  assert(claims.exp === 1_000_000 + 12 * 3600, "exp must be 12h out");
  assert(claims.sub === "mailto:ops@example.com", "sub mismatch");
  assert(JSON.parse(new TextDecoder().decode(b64uDecode(h))).alg === "ES256", "alg must be ES256");

  const signature = new Uint8Array(b64uDecode(s));
  assert(signature.length === 64, "ES256 signature must be raw r||s (64 bytes)");
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    pair.publicKey,
    signature,
    new TextEncoder().encode(`${h}.${c}`),
  );
  assert(ok, "signature did not verify against the public key");
});

Deno.test("importVapidKey rejects a malformed public key", async () => {
  const { privateKey } = await newVapidKeys();
  let threw = false;
  try { await importVapidKey(b64uEncode(new Uint8Array(33)), privateKey); } catch { threw = true; }
  assert(threw, "a compressed or short key must be rejected");
});

Deno.test("nextScheduleAt picks the soonest future entry", () => {
  const schedule = [{ at: 500, count: 1 }, { at: 3000, count: 3 }, { at: 2000, count: 2 }, { at: "bad" }];
  assert(nextScheduleAt(schedule, 1000) === 2000, "expected 2000");
  assert(nextScheduleAt(schedule, 5000) === null, "expected null once all are past");
  assert(nextScheduleAt("nope", 0) === null, "non-arrays yield null");
});

Deno.test("only real push services are allowed", () => {
  for (const host of ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns2-by3p.notify.windows.com"]) {
    assert(ALLOWED_PUSH_HOST.test(host), `${host} should be allowed`);
  }
  for (const host of ["evil.com", "fcm.googleapis.com.evil.com", "localhost", "169.254.169.254"]) {
    assert(!ALLOWED_PUSH_HOST.test(host), `${host} must be refused`);
  }
});

Deno.test("timingSafeEqual compares exactly", () => {
  assert(timingSafeEqual("secret", "secret"), "equal strings");
  assert(!timingSafeEqual("secret", "secreT"), "different strings");
  assert(!timingSafeEqual("secret", "secret-longer"), "different lengths");
});
