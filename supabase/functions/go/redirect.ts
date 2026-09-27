// The pure parts of the `go` function, kept apart so they can be tested
// without a network: reading the platform name off the request, the
// per-address rate limit, and the shape of the redirect.

export const MAX_NAME_LENGTH = 80;

// The platform name the request asks for, or null when it is missing,
// too long, or not a plain name. Names are matched case-insensitively
// against platform_links.name_key, so this only needs to be tidy.
export function platformNameFrom(url: URL): string | null {
  const raw = (url.searchParams.get("p") ?? "").trim();
  if (!raw || raw.length > MAX_NAME_LENGTH) return null;
  if (/[\u0000-\u001f<>]/.test(raw)) return null;
  return raw.toLowerCase();
}

// A small fixed-window limiter per client address: enough for a person
// clicking through their whole deck, not enough to harvest every link.
export class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      if (this.hits.size > 5000) this.sweep(now);
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) {
      if (now - entry.windowStart >= this.windowMs) this.hits.delete(key);
    }
  }
}

export function clientAddress(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0].trim();
  return first || req.headers.get("cf-connecting-ip") || "unknown";
}

// Only http(s) destinations are ever followed, whatever the table holds.
export function safeDestination(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function redirectResponse(destination: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": destination,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
    },
  });
}

export function plainResponse(status: number, text: string): Response {
  return new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
