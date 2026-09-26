import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ALLOWED_PUSH_HOST, importVapidKey, nextScheduleAt, timingSafeEqual, vapidAuthHeader } from "./vapid.ts";

// GET  -> { publicKey }: what the browser subscribes with (public by design).
// POST -> dispatch due alerts; called by pg_cron with the x-cron-secret header.
// POST without that header -> a signed-in user's test push to their own devices.
const allowedOrigins = new Set([
  "https://casino-almanac.app",
  "https://dailyrollover.com",
  "https://www.dailyrollover.com",
  "https://braxtonius-gngr.github.io",
  "http://localhost:8080",
  "http://localhost:5173",
]);
const BATCH_SIZE = 20;

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type DueRow = { id: string; endpoint: string; schedule: unknown; updated_at: string };
type SendResult = { status: number; removed: boolean };

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  if (req.method === "GET") return jsonResponse({ publicKey: publicKey || null }, 200, cors);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, cors);

  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "";
  if (!publicKey || !privateKey || !subject) {
    return jsonResponse({ error: "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set." }, 500, cors);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const key = await importVapidKey(publicKey, privateKey);

  // One payload-free push. 404/410 mean the browser dropped this
  // subscription for good, so the row goes; the push service's reason is
  // logged because that is the only record of why an alert stopped.
  async function send(row: { id: string; endpoint: string }): Promise<SendResult> {
    let url: URL | null = null;
    try { url = new URL(row.endpoint); } catch { url = null; }
    if (!url || url.protocol !== "https:" || !ALLOWED_PUSH_HOST.test(url.hostname)) {
      await supabase.from("push_subscriptions").delete().eq("id", row.id);
      return { status: 0, removed: true };
    }
    let status = 0;
    let detail = "";
    try {
      const response = await fetch(row.endpoint, {
        method: "POST",
        headers: {
          Authorization: await vapidAuthHeader(key, publicKey, row.endpoint, subject),
          TTL: "3600",
          Urgency: "normal",
        },
        body: new Uint8Array(0),
      });
      status = response.status;
      if (status >= 300) detail = (await response.text()).slice(0, 300);
      else await response.body?.cancel();
    } catch (err) {
      console.warn("push: network error", row.id, (err as Error).message);
    }
    if (status === 404 || status === 410) {
      console.warn("push: subscription gone, removing", row.id, url.hostname, status, detail);
      await supabase.from("push_subscriptions").delete().eq("id", row.id);
      return { status, removed: true };
    }
    if (status < 200 || status >= 300) console.warn("push: push service refused", row.id, url.hostname, status, detail);
    return { status, removed: false };
  }

  const cronSecret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader === null) {
    // A signed-in user testing their own devices: pushes only to the
    // caller's subscriptions and reports what each push service answered.
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return jsonResponse({ error: "Not authenticated." }, 401, cors);
    const { data: own, error: ownError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, last_sent_at")
      .eq("user_id", user.id)
      .limit(10);
    if (ownError) return jsonResponse({ error: "Lookup failed." }, 500, cors);
    const results = [];
    for (const row of own ?? []) {
      // At most one test per device every 20 seconds.
      if (row.last_sent_at && Date.now() - Date.parse(row.last_sent_at) < 20000) {
        results.push({ endpointHost: new URL(row.endpoint).hostname, status: 429, removed: false });
        continue;
      }
      const result = await send(row);
      if (!result.removed) {
        await supabase.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("id", row.id);
      }
      results.push({ endpointHost: new URL(row.endpoint).hostname, ...result });
    }
    return jsonResponse({ results }, 200, cors);
  }
  if (!cronSecret || !timingSafeEqual(cronHeader, cronSecret)) {
    return jsonResponse({ error: "Forbidden." }, 403, cors);
  }

  const now = Date.now();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, schedule, updated_at")
    .lte("next_notify_at", new Date(now).toISOString())
    .order("next_notify_at", { ascending: true })
    .limit(500);
  if (error) {
    console.error("push dispatch: due query failed", error);
    return jsonResponse({ error: "Due query failed." }, 500, cors);
  }

  const rows = (data ?? []) as DueRow[];
  const tally = { due: rows.length, sent: 0, removed: 0, failed: 0 };

  async function dispatch(row: DueRow) {
    const { status, removed } = await send(row);
    if (removed) {
      tally.removed++;
      return;
    }
    if (status >= 200 && status < 300) tally.sent++;
    else tally.failed++;
    // Alerts are best-effort: advance past this entry either way. Matching on
    // updated_at leaves a schedule the app rewrote mid-run untouched.
    const next = nextScheduleAt(row.schedule, now);
    await supabase
      .from("push_subscriptions")
      .update({
        last_sent_at: new Date(now).toISOString(),
        next_notify_at: next === null ? null : new Date(next).toISOString(),
      })
      .eq("id", row.id)
      .eq("updated_at", row.updated_at);
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await Promise.all(rows.slice(i, i + BATCH_SIZE).map(dispatch));
  }
  console.log("push dispatch", tally);
  return jsonResponse(tally, 200, cors);
});
