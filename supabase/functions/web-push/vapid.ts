// VAPID (RFC 8292) signing for payload-free Web Push, on WebCrypto alone.
// Payload-free pushes need no per-subscription encryption (RFC 8291), so the
// only cryptography is an ES256 JWT proving the push came from this server.

// Real browser push services only; the dispatcher POSTs to the endpoint, so
// anything else would make it a request relay. Mirrors the table CHECK.
export const ALLOWED_PUSH_HOST =
  /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;

export function b64uEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64uDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// publicKey: base64url of the 65-byte uncompressed P-256 point (0x04||x||y),
// the same string the browser takes as applicationServerKey.
// privateKey: base64url of the 32-byte private scalar d.
export async function importVapidKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const point = b64uDecode(publicKey);
  if (point.length !== 65 || point[0] !== 4) throw new Error("VAPID_PUBLIC_KEY must be an uncompressed P-256 point");
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: b64uEncode(point.slice(1, 33)),
      y: b64uEncode(point.slice(33, 65)),
      d: privateKey,
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

export async function vapidAuthHeader(
  key: CryptoKey,
  publicKey: string,
  endpoint: string,
  subject: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const encoder = new TextEncoder();
  const header = b64uEncode(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(encoder.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: nowSeconds + 12 * 3600,
    sub: subject,
  })));
  const unsigned = `${header}.${claims}`;
  // WebCrypto's ECDSA signature is already the raw r||s form JWS ES256 wants.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(unsigned)),
  );
  return `vapid t=${unsigned}.${b64uEncode(signature)}, k=${publicKey}`;
}

// The soonest scheduled alert strictly after nowMs, or null when none is left.
export function nextScheduleAt(schedule: unknown, nowMs: number): number | null {
  if (!Array.isArray(schedule)) return null;
  let next: number | null = null;
  for (const entry of schedule) {
    const at = Number((entry as { at?: unknown })?.at);
    if (Number.isFinite(at) && at > nowMs && (next === null || at < next)) next = at;
  }
  return next;
}

export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
