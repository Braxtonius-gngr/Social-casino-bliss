import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { buildEmbed, CATEGORIES, cleanErrors, type Report, validate } from "./report.ts";

// POST { category, text, meta?: { userAgent, appBuild, catalogVersion, theme, trackedCount, recentErrors } }
//   -> { ok: true, id, discord: 'sent' | 'failed' | 'skipped' }
//
// The in-app feedback form. The report is written to public.bug_reports
// first, so nothing is lost if Discord is down, and then the same embed
// the form used to post itself is forwarded to the channel from the
// DISCORD_BUG_WEBHOOK secret. The webhook URL never reaches the browser.
const allowedOrigins = new Set([
  "https://casino-almanac.app",
  "https://dailyrollover.com",
  "https://www.dailyrollover.com",
  "https://braxtonius-gngr.github.io",
  "http://localhost:8080",
  "http://localhost:5173",
]);
// One device gets this many reports per hour before being asked to wait.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
// Discord gets this long before the report is recorded as 'failed' and the
// tester still sees a thank-you: the row is already saved.
const DISCORD_TIMEOUT_MS = 8_000;

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// The caller's address is only ever stored hashed with a per-project salt,
// and only so one device cannot flood the channel.
async function hashAddress(req: Request): Promise<string | null> {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const address = forwarded.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
  if (!address) return null;
  const salt = Deno.env.get("BUG_REPORT_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bytes = new TextEncoder().encode(`${salt}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function forwardToDiscord(report: Report, id: number): Promise<"sent" | "failed" | "skipped"> {
  const webhook = Deno.env.get("DISCORD_BUG_WEBHOOK") ?? "";
  if (!webhook) return "skipped";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCORD_TIMEOUT_MS);
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildEmbed(report, id)),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("Discord refused the bug report", id, response.status, await response.text().catch(() => ""));
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Discord forward failed", id, error);
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "POST only." }, 405, cors);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Expected a JSON body." }, 400, cors);
  }

  const checked = validate(body);
  if ("error" in checked) return jsonResponse({ error: checked.error }, 400, cors);
  const report = checked.report;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // The account is recorded when there is one (the device's anonymous
  // account counts); a report from a page with no session is still taken.
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  let userId: string | null = null;
  if (token) {
    const { data } = await supabase.auth.getUser(token).catch(() => ({ data: { user: null } }));
    userId = data?.user?.id ?? null;
  }

  const ipHash = await hashAddress(req);
  if (ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error } = await supabase
      .from("bug_reports")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if (!error && (count ?? 0) >= RATE_LIMIT) {
      return jsonResponse({ error: "That's plenty for one hour - thank you. Try again a little later." }, 429, cors);
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bug_reports")
    .insert({
      category: report.category,
      body: report.text,
      user_agent: report.meta.userAgent,
      app_build: report.meta.appBuild,
      catalog_version: report.meta.catalogVersion,
      theme: report.meta.theme,
      tracked_count: report.meta.trackedCount,
      recent_errors: cleanErrors(report.meta.recentErrors),
      user_id: userId,
      ip_hash: ipHash,
      origin: req.headers.get("Origin"),
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    console.error("bug_reports insert failed", insertError);
    return jsonResponse({ error: "Couldn't save the report. Try again in a bit." }, 500, cors);
  }

  const discord = await forwardToDiscord(report, inserted.id);
  await supabase.from("bug_reports").update({ discord_status: discord }).eq("id", inserted.id);

  return jsonResponse({ ok: true, id: inserted.id, discord }, 200, cors);
});

export { CATEGORIES };
