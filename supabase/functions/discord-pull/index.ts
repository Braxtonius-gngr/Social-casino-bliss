import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { timingSafeEqual } from "../web-push/vapid.ts";
import { MAX_IMAGE_BYTES } from "../read-drop/extract.ts";
import { byIdAscending, type DiscordMessage } from "./discord.ts";
import { type Batch, batchRef, buildBatches, type Held } from "./batches.ts";

// The Discord pull, in the cloud. pg_cron POSTs here every few minutes
// (x-cron-secret = PUSH_CRON_SECRET); the owner can also run it by hand with
// x-ingest-token = INGEST_TOKEN. For each source channel it reads the new
// posts with the bot (REST only: no gateway, no privileged intent), groups
// them into batches (no picture, no read; at most 4 pictures each) and hands
// each batch to ingest-drop, which reads it once and files a drop_drafts row.
// Nothing is published: the owner checks each draft on the admin page.
//
// Where each channel was read up to lives in drop_pull_state (last_message_id,
// plus text-only posts waiting for a picture in `held`). A channel's first run
// only bookmarks its newest post, so old posts are never read.
//
// Settings (Supabase secrets): DISCORD_BOT_TOKEN, DISCORD_PULL_CHANNEL_IDS
// (comma-separated), OWNER_USER_ID, INGEST_TOKEN, PUSH_CRON_SECRET.
// Deploy with JWT verification off; the secrets above are the gate.

const DISCORD_API = "https://discord.com/api/v10";
// Supabase stops a function at 150 s: start a read only while there is room.
const START_READ_BEFORE_MS = 70_000;
// Reads per run across all channels; the rest wait for the next run.
const READS_PER_RUN = 2;
const PAGE = 50;
const TZ = "America/Chicago";

type Supa = SupabaseClient;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function env(name: string) {
  return (Deno.env.get(name) ?? "").trim();
}

async function discord(path: string, token: string): Promise<Response> {
  let res = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) {
    const wait = Number((await res.json().catch(() => ({})))?.retry_after ?? 2);
    await new Promise((r) => setTimeout(r, Math.min(wait + 0.5, 10) * 1000));
    res = await fetch(`${DISCORD_API}${path}`, { headers: { Authorization: `Bot ${token}` }, signal: AbortSignal.timeout(15_000) });
  }
  return res;
}

function discordError(status: number) {
  return status === 401
    ? "Discord rejected the bot token (set DISCORD_BOT_TOKEN to the current one)"
    : status === 403 || status === 404
    ? "the bot can't see this channel (add it to the server; it needs View Channel + Read Message History)"
    : `Discord answered ${status}`;
}

async function toBase64(url: string): Promise<{ data: string } | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_IMAGE_BYTES) return null;
  return { data: encodeBase64(buf) };
}

// One read. True once ingest-drop has filed the batch (or had it already).
async function ingest(channelId: string, b: Batch): Promise<{ ok: boolean; note: string }> {
  const images = (await Promise.all(b.images.map(toBase64))).filter((i): i is { data: string } => !!i);
  if (!images.length) return { ok: true, note: "pictures unreadable or too large; passed over" };
  const res = await fetch(`${env("SUPABASE_URL")}/functions/v1/ingest-drop`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ingest-token": env("INGEST_TOKEN") },
    body: JSON.stringify({
      user_id: env("OWNER_USER_ID"),
      source: "discord",
      source_ref: batchRef(channelId, b),
      channel_id: channelId,
      message_ids: b.ids,
      image_urls: b.images,
      text: b.texts.join("\n"),
      images,
      now: b.postedAt ?? new Date().toISOString(),
      tz: TZ,
    }),
    signal: AbortSignal.timeout(140_000),
  }).catch(() => null);
  if (!res) return { ok: false, note: "ingest-drop unreachable" };
  const out = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) return { ok: false, note: `ingest-drop ${res.status}: ${String(out.error ?? "")}`.slice(0, 200) };
  const drafts = Array.isArray(out.drops) ? out.drops.length : 0;
  return { ok: true, note: out.deduped ? "already filed" : out.skipped ? "filed as skipped" : `${drafts} draft(s)` };
}

async function pullChannel(supa: Supa, token: string, channelId: string, budget: { reads: number; started: number }) {
  const report: Record<string, unknown> = { channel: channelId, reads: 0, notes: [] as string[] };
  const notes = report.notes as string[];
  const { data: st } = await supa.from("drop_pull_state").select("last_message_id, held").eq("channel_id", channelId).single();
  const save = (last: string, held: Held[]) =>
    supa.from("drop_pull_state").update({ last_message_id: last, held, updated_at: new Date().toISOString() }).eq("channel_id", channelId);

  // First run: bookmark the newest post; nothing is read.
  if (!st?.last_message_id) {
    const res = await discord(`/channels/${channelId}/messages?limit=1`, token);
    if (!res.ok) return { ...report, error: discordError(res.status) };
    const [top] = (await res.json()) as DiscordMessage[];
    await save(top?.id ?? "0", []);
    return { ...report, seeded: top?.id ?? "empty channel" };
  }

  let last: string = st.last_message_id;
  let held: Held[] = Array.isArray(st.held) ? st.held : [];
  for (;;) {
    const res = await discord(`/channels/${channelId}/messages?after=${last}&limit=${PAGE}`, token);
    if (!res.ok) return { ...report, error: discordError(res.status) };
    const page = byIdAscending((await res.json()) as DiscordMessage[]);
    if (!page.length) break;
    const built = buildBatches(page, held);
    let stopAt: Batch | null = null;
    for (const b of built.batches) {
      if (budget.reads >= READS_PER_RUN || Date.now() - budget.started > START_READ_BEFORE_MS) {
        stopAt = b;
        notes.push("read limit for this run reached; the rest wait for the next run");
        break;
      }
      const r = await ingest(channelId, b);
      notes.push(`${batchRef(channelId, b)}: ${r.note}`);
      if (!r.ok) {
        stopAt = b;
        break;
      }
      budget.reads++;
      (report.reads as number)++;
    }
    if (stopAt) {
      // Hold just before the batch's first post from this page, and keep its
      // waiting text, so the next run rebuilds the same batch.
      const firstFromPage = stopAt.ids[stopAt.heldCount];
      const done = page.filter((m) => BigInt(m.id) < BigInt(firstFromPage)).pop();
      if (done && BigInt(done.id) > BigInt(last)) last = done.id;
      held = stopAt.ids.slice(0, stopAt.heldCount).map((id, i) => ({ id, text: stopAt!.texts[i] ?? "", timestamp: null }));
      await save(last, held);
      return report;
    }
    last = page[page.length - 1].id;
    held = built.held;
    await save(last, held);
    if (page.length < PAGE) break;
  }
  if (held.length) notes.push(`${held.length} text-only post(s) waiting for a picture`);
  return report;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const cron = env("PUSH_CRON_SECRET");
  const ingestToken = env("INGEST_TOKEN");
  const allowed = (cron && timingSafeEqual(req.headers.get("x-cron-secret") ?? "", cron)) ||
    (ingestToken && timingSafeEqual(req.headers.get("x-ingest-token") ?? "", ingestToken));
  if (!allowed) return json({ error: "Not authenticated." }, 401);

  const token = env("DISCORD_BOT_TOKEN");
  const channels = env("DISCORD_PULL_CHANNEL_IDS").split(/[\s,]+/).filter(Boolean);
  const missing = [["DISCORD_BOT_TOKEN", token], ["DISCORD_PULL_CHANNEL_IDS", channels.join("")], ["OWNER_USER_ID", env("OWNER_USER_ID")], ["INGEST_TOKEN", ingestToken]]
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return json({ error: `Not set up yet: missing secret(s) ${missing.join(", ")}.` }, 503);
  if (!channels.every((c) => /^\d{17,20}$/.test(c))) return json({ error: "DISCORD_PULL_CHANNEL_IDS must be numeric channel ids." }, 503);
  if (/^\d+$/.test(token) || /\s/.test(token)) return json({ error: "DISCORD_BOT_TOKEN doesn't look like a bot token." }, 503);

  const supa = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const budget = { reads: 0, started: Date.now() };
  const results: Record<string, unknown>[] = [];
  for (const channelId of channels) {
    // One run per channel at a time, even if cron fires while a run is busy.
    const { data: claimed, error } = await supa.rpc("discord_pull_claim", { p_channel: channelId, p_seconds: 160 });
    if (error) {
      results.push({ channel: channelId, error: error.message });
      continue;
    }
    if (!claimed) {
      results.push({ channel: channelId, skipped: "another run is busy with this channel" });
      continue;
    }
    try {
      results.push(await pullChannel(supa, token, channelId, budget));
    } catch (err) {
      results.push({ channel: channelId, error: String(err).slice(0, 200) });
    } finally {
      await supa.from("drop_pull_state").update({ running_until: null }).eq("channel_id", channelId);
    }
  }
  console.log("discord-pull", JSON.stringify(results));
  return json({ ok: true, reads: budget.reads, channels: results });
});
