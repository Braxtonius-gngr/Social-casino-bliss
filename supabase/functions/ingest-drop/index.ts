import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { timingSafeEqual } from "../web-push/vapid.ts";
import { MAX_IMAGES, MAX_PLATFORMS, MAX_TEXT_CHARS } from "../read-drop/extract.ts";

// POST { user_id, source, source_ref, channel_id?, message_ids?, image_urls?,
//        text?, images: [{ data, media_type? }], now?, tz?, platforms? }
//   -> { ok, id, drops, usage } | { ok, deduped, id } | { ok, skipped, id, reason }
//
// The Discord poller (automation-service/discord-pull.js) posts one batch of
// messages here with x-ingest-token = INGEST_TOKEN. This function asks
// read-drop to read it (forwarding the same token) and files the result as
// one drop_drafts row: one row per read, because the read is the unit of
// cost. It publishes nothing; the owner loads a draft into the admin form,
// checks it and saves it by hand.
//
// The admin's own JWT is accepted too, for a manual post from a signed-in page.
//
// Settings (Supabase secrets): INGEST_TOKEN (shared with read-drop and the
// poller), OWNER_USER_ID (optional: the only user_id a token caller may file
// for). Deploy with JWT verification off; the token is the gate.

const ADMIN_EMAIL = "johndopamine210@gmail.com";
const SOURCES = new Set(["discord", "manual", "email", "rss", "app"]);
// read-drop answers these when the batch itself can't be read (a bad image,
// a refusal, an answer cut off or unparseable). Retrying spends again for the
// same result, so the batch is filed as skipped and the poller moves on.
const FINAL_STATUSES = new Set([400, 422, 502]);

type Supa = SupabaseClient;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function strings(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 500).slice(0, max) : [];
}

// The caller's user id: the body's user_id for a token caller, the admin's own
// id for a signed-in admin, otherwise null.
async function callerOwner(supa: Supa, req: Request, body: Record<string, unknown>): Promise<{ owner: string | null; viaToken: boolean; error?: string }> {
  const expected = Deno.env.get("INGEST_TOKEN") ?? "";
  if (expected && timingSafeEqual(req.headers.get("x-ingest-token") ?? "", expected)) {
    const owner = typeof body.user_id === "string" && /^[0-9a-f-]{36}$/i.test(body.user_id) ? body.user_id : null;
    if (!owner) return { owner: null, viaToken: true, error: "user_id (the owner's uuid) is required." };
    const pinned = (Deno.env.get("OWNER_USER_ID") ?? "").trim();
    if (pinned && owner !== pinned) return { owner: null, viaToken: true, error: "A token caller may only file drafts for the owner." };
    return { owner, viaToken: true };
  }
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!jwt) return { owner: null, viaToken: false };
  const { data: { user } } = await supa.auth.getUser(jwt);
  if (!user || user.is_anonymous || (user.email ?? "").toLowerCase() !== ADMIN_EMAIL) return { owner: null, viaToken: false };
  return { owner: user.id, viaToken: false };
}

// Platform names from the live catalogue. get_catalog() needs a signed-in
// caller, so this reads the newest release directly, as pull-drops did.
async function catalogNames(supa: Supa): Promise<string[]> {
  const { data } = await supa.from("catalog_releases").select("payload").order("id", { ascending: false }).limit(1).maybeSingle();
  const payload = data?.payload as unknown;
  const list = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === "object" && Array.isArray((payload as { platforms?: unknown }).platforms))
    ? (payload as { platforms: unknown[] }).platforms
    : [];
  return list
    .map((p) => (p && typeof (p as { name?: unknown }).name === "string" ? (p as { name: string }).name : ""))
    .filter((name) => name.length > 0 && name.length <= 80)
    .slice(0, MAX_PLATFORMS);
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Expected a JSON body." }, 400);

  const supa = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  const caller = await callerOwner(supa, req, body);
  if (caller.error) return json({ error: caller.error }, 403);
  if (!caller.owner) return json({ error: "Not authenticated." }, 401);
  const owner = caller.owner;

  const source = typeof body.source === "string" && SOURCES.has(body.source) ? body.source : "manual";
  const sourceRef = typeof body.source_ref === "string" && body.source_ref ? body.source_ref.slice(0, 500) : null;
  const text = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT_CHARS) : "";
  // Base64 only: Discord's CDN links stop working after about a day, and the
  // row keeps image_urls for reference, not for reading again.
  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((i): i is { data: string; media_type?: string } => !!i && typeof (i as { data?: unknown }).data === "string");
  if (!images.length) return json({ error: "At least one image (base64 data) is needed; no image, no read." }, 400);
  if (images.length > MAX_IMAGES) return json({ error: `At most ${MAX_IMAGES} images per batch.` }, 400);

  // Dedupe BEFORE the read, so a retried batch never pays for a second read.
  if (sourceRef) {
    const { data: seen } = await supa.from("drop_drafts").select("id")
      .eq("user_id", owner).eq("source", source).eq("source_ref", sourceRef).maybeSingle();
    if (seen) return json({ ok: true, deduped: true, id: seen.id });
  }

  const given = strings(body.platforms, MAX_PLATFORMS);
  const platforms = given.length ? given : await catalogNames(supa);

  // Token callers forward the token; a signed-in admin forwards their JWT.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (caller.viaToken) headers["x-ingest-token"] = Deno.env.get("INGEST_TOKEN") ?? "";
  else headers.Authorization = req.headers.get("Authorization") ?? "";

  let res: Response;
  try {
    res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/read-drop`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        images: images.map((i) => ({ data: i.data })),
        text,
        platforms,
        now: typeof body.now === "string" ? body.now : new Date().toISOString(),
        tz: typeof body.tz === "string" ? body.tz : "UTC",
      }),
      signal: AbortSignal.timeout(145_000),
    });
  } catch (err) {
    console.error("ingest-drop: read-drop unreachable", err);
    return json({ error: "read-drop couldn't be reached; try again." }, 502);
  }
  const out = await res.json().catch(() => null) as Record<string, unknown> | null;

  const row = {
    user_id: owner,
    source,
    source_ref: sourceRef,
    channel_id: typeof body.channel_id === "string" ? body.channel_id : null,
    message_ids: strings(body.message_ids, 100),
    image_urls: strings(body.image_urls, MAX_IMAGES),
    text,
    usage: out?.usage ?? null,
  };

  if (!res.ok) {
    const reason = typeof out?.error === "string" ? out.error : `read-drop answered ${res.status}`;
    if (!FINAL_STATUSES.has(res.status)) {
      // A setup problem or a passing one (key, credit, overload, timeout):
      // nothing is filed and the poller keeps the batch for its next tick.
      console.warn("ingest-drop: read-drop failed", res.status, reason);
      return json({ error: reason, status: res.status }, 502);
    }
    const { data: skipped, error } = await supa.from("drop_drafts")
      .insert({ ...row, drops: [], unreadable: reason, status: "skipped" }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    console.log("ingest-drop: skipped", { id: skipped.id, status: res.status });
    return json({ ok: true, skipped: true, id: skipped.id, reason, usage: row.usage });
  }

  const drops = Array.isArray(out?.drops) ? out!.drops : [];
  const { data: filed, error } = await supa.from("drop_drafts").insert({
    ...row,
    drops,
    unreadable: typeof out?.unreadable === "string" ? out.unreadable : null,
    status: drops.length ? "pending" : "skipped",
  }).select("id").single();
  if (error) {
    // Two posts of the same batch at once: the other one filed it.
    if (error.code === "23505") return json({ ok: true, deduped: true });
    return json({ error: error.message }, 500);
  }
  console.log("ingest-drop", { id: filed.id, drops: drops.length, usage: row.usage });
  return json({ ok: true, id: filed.id, drops, usage: row.usage });
});
