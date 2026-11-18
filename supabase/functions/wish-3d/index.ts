import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  bodyFor,
  cacheKey,
  DEFAULT_MODEL,
  failedMessage,
  isUuid,
  MODELS,
  objectPath,
  resultFrom,
  statusFrom,
  tryFetch,
  urlsFor,
} from "./fal.ts";

// POST { action: "submit", prompt }        -> { state: "done", url, cached: true }
//                                           | { state: "queued", id }
// POST { action: "status", id, prompt }    -> { state: "queued", position? }
//                                           | { state: "running" }
//                                           | { state: "done", url, cached: false }
//                                           | { state: "failed", message }
// The Wish Room's generator (lab/wish-generator.mjs): a thin proxy over
// fal.ai's queue for one text-to-3D model, for the owner alone. The fal key
// never leaves here. A finished mesh is copied into the wish-models bucket
// and remembered in wish_models, so the same wish never bills twice.
const allowedOrigins = new Set([
  "https://casino-almanac.app",
  "https://dailyrollover.com",
  "https://www.dailyrollover.com",
  "https://braxtonius-gngr.github.io",
  "http://localhost:8080",
  "http://localhost:5173",
]);
const ADMIN_EMAIL = "johndopamine210@gmail.com";
const BUCKET = "wish-models";
const MAX_PROMPT_CHARS = 200;

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  // Cloudflare previews (<hash>.social-casino-bliss.pages.dev) host the lab too.
  const preview = /^https:\/\/[a-z0-9-]+\.social-casino-bliss\.pages\.dev$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) || preview ? origin : "null",
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

async function readJson(r: Response): Promise<Record<string, unknown>> {
  try {
    const j = await r.json();
    return j && typeof j === "object" ? j as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function promptFrom(body: Record<string, unknown>): string | null {
  const p = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!p || p.length > MAX_PROMPT_CHARS) return null;
  return p;
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, cors);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  if (!user) return jsonResponse({ error: "Not authenticated." }, 401, cors);
  if (user.is_anonymous || (user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
    return jsonResponse({ error: "Only the owner can wish for real." }, 403, cors);
  }

  const falKey = Deno.env.get("FAL_KEY") ?? "";
  if (!falKey) return jsonResponse({ error: "FAL_KEY isn't set for this project's edge functions." }, 500, cors);
  const model = Deno.env.get("WISH_3D_MODEL") || DEFAULT_MODEL;
  if (!MODELS[model]) return jsonResponse({ error: "WISH_3D_MODEL names a model this function doesn't know." }, 500, cors);
  const falHeaders = { Authorization: `Key ${falKey}`, "Content-Type": "application/json" };

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Expected a JSON body." }, 400, cors);
  }
  const prompt = promptFrom(body);
  if (!prompt) return jsonResponse({ error: `A wish is 1 to ${MAX_PROMPT_CHARS} characters.` }, 400, cors);
  const key = cacheKey(prompt, model);

  if (body.action === "submit") {
    const { data: hit } = await supabase.from("wish_models").select("url").eq("key", key).maybeSingle();
    if (hit && typeof hit.url === "string") return jsonResponse({ state: "done", url: hit.url, cached: true }, 200, cors);

    const r = await tryFetch(() => fetch(urlsFor(model).submit, { method: "POST", headers: falHeaders, body: JSON.stringify(bodyFor(model, prompt)) }));
    if (!(r instanceof Response)) return jsonResponse(r, 502, cors);
    const json = await readJson(r);
    if (r.status === 401) return jsonResponse({ error: "fal refused the key." }, 502, cors);
    if (!r.ok) return jsonResponse({ error: failedMessage(json, `fal submit ${r.status}`) }, 502, cors);
    if (typeof json.request_id !== "string") return jsonResponse({ error: "fal answered without a request id." }, 502, cors);
    return jsonResponse({ state: "queued", id: json.request_id }, 200, cors);
  }

  if (body.action === "status") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!isUuid(id)) return jsonResponse({ error: "A job id is a UUID." }, 400, cors);
    const urls = urlsFor(model, id);

    const s = await tryFetch(() => fetch(urls.status, { headers: falHeaders }));
    if (!(s instanceof Response)) return jsonResponse(s, 502, cors);
    const status = statusFrom(s.status, await readJson(s));
    if (status.state !== "completed") return jsonResponse(status, 200, cors);

    const res = await tryFetch(() => fetch(urls.result, { headers: falHeaders }));
    if (!(res instanceof Response)) return jsonResponse(res, 502, cors);
    const result = resultFrom(res.status, await readJson(res));
    if (result.state !== "done") return jsonResponse(result, 200, cors);

    // Keep it: fal holds the file for an hour at most.
    const mesh = await tryFetch(() => fetch(result.url));
    if (!(mesh instanceof Response)) return jsonResponse(mesh, 502, cors);
    if (!mesh.ok) return jsonResponse({ state: "failed", message: "could not fetch the mesh from fal" }, 200, cors);
    const bytes = new Uint8Array(await mesh.arrayBuffer());
    const path = await objectPath(model, key);
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "model/gltf-binary", upsert: true });
    if (upErr) return jsonResponse({ state: "failed", message: `storage: ${upErr.message}` }, 200, cors);
    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { error: rowErr } = await supabase.from("wish_models").upsert({ key, prompt, model, path, url, bytes: bytes.byteLength, seed: result.seed });
    if (rowErr) console.error("wish_models upsert failed", rowErr.message);
    return jsonResponse({ state: "done", url, cached: false }, 200, cors);
  }

  return jsonResponse({ error: "Unknown action." }, 400, cors);
});
