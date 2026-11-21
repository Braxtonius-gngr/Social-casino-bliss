// What happens to a batch's drafts once ingest-drop has filed them: each drop
// that passes every check in read-drop/gate.ts is published and announced to
// the users who track that platform; the rest wait for the owner on the admin
// page, and the owner is pinged in a private Discord channel (webhook) with
// the platform and the reason only, never a link or code. Each auto-publish
// is pinged too, so it can be undone from the admin page.

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { type Drop } from "../read-drop/extract.ts";
import { type CatalogPlatform, decide, type LiveFreebie } from "../read-drop/gate.ts";

type Supa = SupabaseClient;
export type Outcome = { platform: string; published: boolean; reasons: string[]; freebie_id: string | null; announced?: string };

export async function loadCatalog(supa: Supa): Promise<CatalogPlatform[]> {
  const { data } = await supa.from("catalog_releases").select("payload").order("id", { ascending: false }).limit(1).maybeSingle();
  const payload = data?.payload as unknown;
  const list = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === "object" && Array.isArray((payload as { platforms?: unknown }).platforms))
    ? (payload as { platforms: unknown[] }).platforms
    : [];
  return list
    .filter((p): p is { name: string; url: string } =>
      !!p && typeof (p as { name?: unknown }).name === "string" && typeof (p as { url?: unknown }).url === "string")
    .map((p) => ({ name: p.name, url: p.url }));
}

export async function loadLive(supa: Supa): Promise<LiveFreebie[]> {
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
  await supa.from("freebie_notes").insert({ freebie_id: data.id, note: "Published automatically from the Discord pull", source: "discord", source_ref: sourceRef });
  return data.id as string;
}

// The same new-drop push the admin page's NOTIFY sends (web-push, announce).
async function announce(freebieId: string): Promise<string> {
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/web-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ingest-token": Deno.env.get("INGEST_TOKEN") ?? "" },
    body: JSON.stringify({ announce: freebieId }),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null);
  if (!res) return "alert not sent (web-push unreachable)";
  const out = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) return `alert not sent (${String(out.error ?? res.status)})`;
  return `alerted ${out.sent ?? 0} of ${out.matched ?? 0} device(s)`;
}

export async function settleDrafts(
  supa: Supa,
  draftId: number,
  drops: Drop[],
  sourceRef: string,
  ctx: { catalog: CatalogPlatform[]; live: LiveFreebie[] },
): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  const annotated = [];
  for (const drop of drops) {
    const decision = decide(drop, ctx.catalog, ctx.live);
    const platform = drop.catalog_match ?? drop.platform_name;
    const outcome: Outcome = { platform, published: false, reasons: decision.reasons, freebie_id: null };
    if (decision.publish) {
      try {
        outcome.freebie_id = await publish(supa, drop, sourceRef);
        outcome.published = true;
        ctx.live.push({ platform_name: platform, code: drop.code, claim_url: drop.claim_url, created_at: new Date().toISOString() });
        outcome.announced = await announce(outcome.freebie_id);
      } catch (err) {
        outcome.reasons = [...decision.reasons, err instanceof Error ? err.message : "publish failed"];
      }
    }
    outcomes.push(outcome);
    annotated.push({
      ...drop,
      outcome: outcome.published ? "published" : "held",
      freebie_id: outcome.freebie_id,
      held_reasons: outcome.published ? [] : outcome.reasons,
    });
  }
  const allPublished = outcomes.length > 0 && outcomes.every((o) => o.published);
  const now = new Date().toISOString();
  await supa.from("drop_drafts").update({
    drops: annotated,
    status: allPublished ? "published" : "pending",
    published_at: outcomes.some((o) => o.published) ? now : null,
    updated_at: now,
  }).eq("id", draftId);
  return outcomes;
}

// The owner's ping: platform and reasons only (no links, no codes), so the
// message can't be used to claim anything.
export function pingText(outcomes: Outcome[]): string {
  const lines: string[] = [];
  for (const o of outcomes) {
    const name = o.platform.replace(/[*_`~|>@]/g, "").slice(0, 80);
    if (o.published) {
      lines.push(`Auto-published: **${name}** (${o.announced ?? "no alert"}). Undo from the admin page if it's wrong.`);
    } else {
      const why = o.reasons.slice(0, 3).join("; ").replace(/https?:\/\/\S+/g, "[link]").slice(0, 300);
      lines.push(`Held for review: **${name}**\nWhy: ${why}`);
    }
  }
  if (outcomes.some((o) => !o.published)) lines.push("Open the admin page > Pull Drafts to check the held ones.");
  return lines.join("\n").slice(0, 1900);
}

export async function ping(outcomes: Outcome[]): Promise<void> {
  const hook = (Deno.env.get("DISCORD_REVIEW_WEBHOOK_URL") ?? "").trim();
  if (!hook || !outcomes.length) return;
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(hook)) {
    console.warn("discord-pull: DISCORD_REVIEW_WEBHOOK_URL isn't a Discord webhook");
    return;
  }
  const res = await fetch(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: pingText(outcomes), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res || !res.ok) console.warn("discord-pull: review ping failed", res?.status);
}
