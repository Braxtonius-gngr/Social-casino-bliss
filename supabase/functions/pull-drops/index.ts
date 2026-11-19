import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { timingSafeEqual } from "../web-push/vapid.ts";
import { type Drop } from "../read-drop/extract.ts";
import { type CatalogPlatform, decide, type LiveFreebie } from "../read-drop/gate.ts";
import { fetchDiscordImage, ReadError, readDrops } from "../read-drop/reader.ts";
import { byIdAscending, type DiscordMessage, messageImages, messageText, newerId, reviewPing } from "./discord.ts";

// POST from pg_cron (x-cron-secret = PUSH_CRON_SECRET), every few minutes:
// 1. reads new posts from the owner's Discord channels (DISCORD_CHANNEL_IDS),
//    which follow casinos' official announcement channels;
// 2. files each in drop_inbox;
// 3. reads a few with Claude, publishes the drops that pass every check in
//    read-drop/gate.ts, and holds the rest for the owner, pinging
//    DISCORD_REVIEW_CHANNEL_ID with the platform and reason (never a link).
//
// Settings (Supabase secrets): DISCORD_BOT_TOKEN, DISCORD_CHANNEL_IDS
// (comma-separated), DISCORD_REVIEW_CHANNEL_ID (optional), ANTHROPIC_API_KEY,
// PUSH_CRON_SECRET. Deploy with JWT verification off; the secret is the gate.

const DISCORD_API = "https://discord.com/api/v10";
// Supabase stops a function at 150 s; leave room to save state.
const RUN_BUDGET_MS = 120_000;
// Posts read with Claude per run; the rest wait for the next run.
const READS_PER_RUN = 4;
// A post that keeps failing to read is given up on.
const MAX_ATTEMPTS = 3;
const TZ = "America/Chicago";

type Supa = SupabaseClient;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function discord(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
}

// --- Pulling ------------------------------------------------------------------

async function pullChannel(supa: Supa, token: string, channelId: string): Promise<{ filed: number; error?: string }> {
  const { data: state } = await supa.from("drop_pull_state").select("last_message_id").eq("channel_id", channelId).maybeSingle();

  // First run on a channel: bookmark its newest post and file nothing, so old
  // posts never flood the Freebies tab.
  if (!state) {
    const res = await discord(`/channels/${channelId}/messages?limit=1`, token);
    if (!res.ok) return { filed: 0, error: `channel ${channelId}: Discord answered ${res.status}` };
    const [latest] = (await res.json()) as DiscordMessage[];
    await supa.from("drop_pull_state").upsert({ channel_id: channelId, last_message_id: latest?.id ?? "0", updated_at: new Date().toISOString() });
    return { filed: 0 };
  }

  const res = await discord(`/channels/${channelId}/messages?after=${state.last_message_id}&limit=50`, token);
  if (!res.ok) return { filed: 0, error: `channel ${channelId}: Discord answered ${res.status}` };
  const messages = byIdAscending((await res.json()) as DiscordMessage[]);
  if (!messages.length) return { filed: 0 };

  let newest = state.last_message_id;
  const rows = [];
  for (const message of messages) {
    newest = newerId(newest, message.id);
    const content = messageText(message);
    const images = messageImages(message);
    rows.push({
      source: "discord",
      source_ref: `${channelId}/${message.id}`,
      posted_at: message.timestamp ?? null,
      content,
      image_urls: images,
      status: content || images.length ? "new" : "skipped",
    });
  }
  const { error } = await supa.from("drop_inbox").upsert(rows, { onConflict: "source,source_ref", ignoreDuplicates: true });
  if (error) return { filed: 0, error: `channel ${channelId}: ${error.message}` };
  await supa.from("drop_pull_state").update({ last_message_id: newest, updated_at: new Date().toISOString() }).eq("channel_id", channelId);
  return { filed: rows.length };
}

// --- Reading and publishing ---------------------------------------------------

async function loadCatalog(supa: Supa): Promise<CatalogPlatform[]> {
  const { data } = await supa.from("catalog_releases").select("payload").order("id", { ascending: false }).limit(1).maybeSingle();
  const payload = data?.payload as unknown;
  const list = Array.isArray(payload) ? payload : (payload && typeof payload === "object" && Array.isArray((payload as { platforms?: unknown }).platforms))
    ? (payload as { platforms: unknown[] }).platforms
    : [];
  return list
    .filter((p): p is { name: string; url: string } => !!p && typeof (p as { name?: unknown }).name === "string" && typeof (p as { url?: unknown }).url === "string")
    .map((p) => ({ name: p.name, url: p.url }));
}

async function loadLive(supa: Supa): Promise<LiveFreebie[]> {
  const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const { data } = await supa.from("public_freebies").select("platform_name, code, claim_url, created_at").eq("active", true).gte("created_at", since);
  return (data ?? []) as LiveFreebie[];
}

function stripTracking(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^gclid$|^fbclid$/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

async function publish(supa: Supa, drop: Drop, sourceRef: string): Promise<string> {
  const { data, error } = await supa.from("public_freebies").insert({
    platform_name: drop.catalog_match ?? drop.platform_name,
    bucket: drop.bucket,
    code: drop.code,
    claim_url: drop.is_account_tied ? null : stripTracking(drop.claim_url),
    root_domain: drop.root_domain,
    is_account_tied: drop.is_account_tied,
    terms: [drop.reward, drop.terms].filter(Boolean).join(" · ") || null,
    expires_at: drop.expires_at,
    active: true,
  }).select("id").single();
  if (error) throw new Error(`publish failed: ${error.message}`);
  await supa.from("freebie_notes").insert({ freebie_id: data.id, note: "Published automatically from the drop inbox", source: "discord", source_ref: sourceRef });
  return data.id as string;
}

type InboxRow = { id: string; source_ref: string; posted_at: string | null; content: string; image_urls: string[]; attempts: number };

async function processEntry(
  supa: Supa,
  row: InboxRow,
  ctx: { apiKey: string; catalog: CatalogPlatform[]; live: LiveFreebie[]; deadline: number; token: string; reviewChannel: string | null },
) {
  const images = (await Promise.all(row.image_urls.map(fetchDiscordImage))).filter((x): x is NonNullable<typeof x> => !!x);
  if (!row.content && !images.length) {
    await supa.from("drop_inbox").update({ status: "skipped", error: "no text, and its pictures couldn't be loaded", updated_at: new Date().toISOString() }).eq("id", row.id);
    return;
  }

  let result;
  try {
    result = await readDrops({
      apiKey: ctx.apiKey,
      images,
      text: row.content,
      platforms: ctx.catalog.map((p) => p.name),
      reference: row.posted_at ?? new Date().toISOString(),
      tz: TZ,
      deadlineMs: ctx.deadline - Date.now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retry = err instanceof ReadError && err.retryable && row.attempts + 1 < MAX_ATTEMPTS;
    await supa.from("drop_inbox").update({
      status: retry ? "new" : "error",
      attempts: row.attempts + 1,
      error: message,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (err instanceof ReadError && !err.retryable) throw err; // setup problem: stop this run
    return;
  }

  const drafts = [];
  const held: { platform: string; reasons: string[] }[] = [];
  for (const drop of result.drops) {
    const decision = decide(drop, ctx.catalog, ctx.live);
    let freebieId: string | null = null;
    let outcome = "held";
    if (decision.publish) {
      try {
        freebieId = await publish(supa, drop, row.source_ref);
        outcome = "published";
        ctx.live.push({ platform_name: drop.catalog_match ?? drop.platform_name, code: drop.code, claim_url: drop.claim_url, created_at: new Date().toISOString() });
      } catch (err) {
        decision.reasons.push(err instanceof Error ? err.message : "publish failed");
      }
    }
    if (outcome === "held") held.push({ platform: drop.catalog_match ?? drop.platform_name, reasons: decision.reasons });
    drafts.push({ drop, publish: decision.publish, reasons: decision.reasons, outcome, freebie_id: freebieId });
  }

  const status = !drafts.length ? "skipped" : held.length ? "review" : "published";
  await supa.from("drop_inbox").update({
    status,
    drafts,
    unreadable: result.unreadable,
    error: null,
    attempts: row.attempts + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);

  if (held.length && ctx.reviewChannel) {
    const ping = reviewPing(held[0].platform, held[0].reasons, held.length);
    const res = await discord(`/channels/${ctx.reviewChannel}/messages`, ctx.token, {
      method: "POST",
      body: JSON.stringify({ content: ping, allowed_mentions: { parse: [] } }),
    }).catch(() => null);
    if (res && !res.ok) console.warn("pull-drops: review ping failed", res.status);
  }
}

serve(async (req) => {
  const started = Date.now();
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const secret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
  if (!secret || !timingSafeEqual(req.headers.get("x-cron-secret") ?? "", secret)) return json({ error: "Forbidden." }, 403);

  const token = Deno.env.get("DISCORD_BOT_TOKEN") ?? "";
  const channels = (Deno.env.get("DISCORD_CHANNEL_IDS") ?? "").split(",").map((s) => s.trim()).filter((s) => /^\d{5,25}$/.test(s));
  const reviewChannel = (Deno.env.get("DISCORD_REVIEW_CHANNEL_ID") ?? "").trim() || null;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!token || !channels.length) return json({ skipped: "DISCORD_BOT_TOKEN or DISCORD_CHANNEL_IDS not set" });
  if (!apiKey) return json({ skipped: "ANTHROPIC_API_KEY not set" });

  const supa = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  const pulled = [];
  for (const channel of channels) pulled.push({ channel, ...(await pullChannel(supa, token, channel)) });

  const { data: queue } = await supa.from("drop_inbox")
    .select("id, source_ref, posted_at, content, image_urls, attempts")
    .eq("status", "new").order("created_at", { ascending: true }).limit(READS_PER_RUN);

  let read = 0;
  let stopped: string | null = null;
  if (queue?.length) {
    const ctx = {
      apiKey,
      catalog: await loadCatalog(supa),
      live: await loadLive(supa),
      deadline: started + RUN_BUDGET_MS,
      token,
      reviewChannel,
    };
    for (const row of queue as InboxRow[]) {
      if (Date.now() > ctx.deadline - 30_000) break;
      try {
        await processEntry(supa, row, ctx);
        read++;
      } catch (err) {
        stopped = err instanceof Error ? err.message : String(err);
        break;
      }
    }
  }

  const summary = { pulled, read, stopped, ms: Date.now() - started };
  console.log("pull-drops", summary);
  return json(summary);
});
