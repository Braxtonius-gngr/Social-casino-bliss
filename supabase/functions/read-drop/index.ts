import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";
import {
  claudeErrorReply,
  cleanDrops,
  discordImageUrl,
  DROP_SCHEMA,
  type ImageType,
  isDiscordMessageLink,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_PLATFORMS,
  MAX_TEXT_CHARS,
  sniffImageType,
  SYSTEM_PROMPT,
} from "./extract.ts";

// POST { images: [{ url } | { data, media_type }], text?, platforms?, now?, tz? }
//   -> { drops, unreadable, usage }
// Reads drop screenshots (Discord image links, or photos the admin page
// uploads) with Claude and returns draft public_freebies rows for review.
// Admin only: nothing is published from here.
const allowedOrigins = new Set([
  "https://casino-almanac.app",
  "https://dailyrollover.com",
  "https://www.dailyrollover.com",
  "https://braxtonius-gngr.github.io",
  "http://localhost:8080",
  "http://localhost:5173",
]);
const ADMIN_EMAIL = "johndopamine210@gmail.com";
const MODEL = "claude-opus-5";
// Supabase answers 504 on its own when a function sends nothing for 150 s.
// The Claude call, retries and retry waits included, ends this long after
// the request arrived, so the admin gets a real message instead.
const REPLY_DEADLINE_MS = 135_000;

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

class InputError extends Error {}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// Reads at most MAX_IMAGE_BYTES of the body, so a huge file is refused
// without being held in memory.
async function readCapped(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_IMAGE_BYTES) {
    await response.body?.cancel();
    throw new InputError("too large");
  }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new InputError("too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function loadImage(item: unknown, index: number): Promise<{ media_type: ImageType; data: string }> {
  const label = `Image ${index + 1}`;
  if (!item || typeof item !== "object") throw new InputError(`${label} is empty.`);
  const { url, data } = item as { url?: unknown; data?: unknown };
  if (typeof url === "string") {
    if (isDiscordMessageLink(url)) {
      throw new InputError(`${label} is a link to a Discord message, not to its image. Open the image in Discord, copy its link (or save it), and use that.`);
    }
    const target = discordImageUrl(url);
    if (!target) throw new InputError(`${label} isn't a Discord image link (cdn.discordapp.com or media.discordapp.net). Upload it as a photo instead.`);
    let response: Response;
    try {
      response = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(15000) });
    } catch {
      throw new InputError(`${label} couldn't be downloaded.`);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new InputError(`${label} couldn't be downloaded (${response.status}). Discord image links expire after about a day; copy a fresh one or upload the image.`);
    }
    let bytes: Uint8Array;
    try {
      bytes = await readCapped(response);
    } catch (err) {
      if (err instanceof InputError) throw new InputError(`${label} is over 3.7 MB. Upload it as a photo instead; the page shrinks it first.`);
      throw err;
    }
    const type = sniffImageType(bytes);
    if (!type) throw new InputError(`${label} isn't a PNG, JPEG, GIF or WebP image.`);
    return { media_type: type, data: encodeBase64(bytes) };
  }
  if (typeof data === "string") {
    if (data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new InputError(`${label} is over 3.7 MB.`);
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    } catch {
      throw new InputError(`${label} isn't valid base64.`);
    }
    const type = sniffImageType(bytes);
    if (!type) throw new InputError(`${label} isn't a PNG, JPEG, GIF or WebP image.`);
    return { media_type: type, data };
  }
  throw new InputError(`${label} needs a url or data.`);
}

serve(async (req) => {
  const started = Date.now();
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
    return jsonResponse({ error: "Only the admin can read drops." }, 403, cors);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!apiKey) return jsonResponse({ error: "ANTHROPIC_API_KEY isn't set for this project's edge functions." }, 500, cors);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Expected a JSON body." }, 400, cors);
  }
  const images = Array.isArray(body.images) ? body.images : [];
  if (!images.length) return jsonResponse({ error: "Add at least one screenshot." }, 400, cors);
  if (images.length > MAX_IMAGES) return jsonResponse({ error: `At most ${MAX_IMAGES} screenshots at a time.` }, 400, cors);
  const pasted = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT_CHARS) : "";
  const platforms = (Array.isArray(body.platforms) ? body.platforms : [])
    .filter((p): p is string => typeof p === "string" && p.length > 0 && p.length <= 80)
    .slice(0, MAX_PLATFORMS);
  // The admin's own clock and time zone, for "ends tonight".
  const reference = typeof body.now === "string" && !Number.isNaN(Date.parse(body.now)) ? body.now : new Date().toISOString();
  const tz = typeof body.tz === "string" && /^[A-Za-z0-9_+\-/]{1,64}$/.test(body.tz) ? body.tz : "UTC";

  let loaded: { media_type: ImageType; data: string }[];
  try {
    loaded = await Promise.all(images.map(loadImage));
  } catch (err) {
    if (err instanceof InputError) return jsonResponse({ error: err.message }, 400, cors);
    console.error("read-drop: image load failed", err);
    return jsonResponse({ error: "Couldn't load the screenshots." }, 500, cors);
  }

  const content = [
    ...loaded.map((image) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: image.media_type, data: image.data },
    })),
    {
      type: "text" as const,
      text: [
        `Reference time: ${reference} (the curator's time zone is ${tz}).`,
        `Known platform names: ${platforms.length ? platforms.join(" | ") : "(none given)"}`,
        `Pasted message text (may be empty):\n<message>\n${pasted}\n</message>`,
        "List the offers these screenshots show.",
      ].join("\n\n"),
    },
  ];

  // A quick failure (an overload, a dropped connection) is retried once.
  // The deadline signal bounds every attempt and every wait between them.
  const anthropic = new Anthropic({ apiKey, maxRetries: 1 });
  const budget = Math.max(1_000, REPLY_DEADLINE_MS - (Date.now() - started));
  // The SDK's defaults (ten minutes, two retries) outlast the edge runtime's
  // own limit, which would end a stalled read as a bare gateway timeout.
  const anthropic = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 0 });
  let response: Anthropic.Beta.BetaMessage;
  try {
    // fallbacks: "default" re-runs a request a safety classifier declines on
    // Anthropic's recommended fallback model, inside the same call. The
    // system prompt never changes, so it is a cache breakpoint: a batch of
    // reads within a few minutes pays for it once. max_tokens caps thinking
    // and the answer together; the cap costs nothing unless used.
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: { type: "json_schema", schema: DROP_SCHEMA } },
      messages: [{ role: "user", content }],
    }, { signal: AbortSignal.timeout(budget) });
  } catch (err) {
    // A connection failure is an APIError with no status; claudeErrorReply
    // sorts every case, from a rejected key to an overload.
    if (err instanceof Anthropic.APIError) {
      console.error("read-drop: Claude API error", err.status, err.type, err.message);
      const reply = claudeErrorReply(err.status, err.type, err.message);
      return jsonResponse({ error: reply.error }, reply.status, cors);
    }
    throw err;
  }

  const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
  if (response.stop_reason === "refusal") {
    console.warn("read-drop: refusal", response.stop_details?.category, response.stop_details?.explanation);
    return jsonResponse({ error: "Claude declined to read these screenshots.", usage }, 422, cors);
  }
  if (response.stop_reason === "max_tokens") {
    return jsonResponse({ error: "The answer was cut off. Try fewer screenshots at once.", usage }, 502, cors);
  }
  const textBlock = response.content.find((block) => block.type === "text");
  let parsed: unknown = null;
  try {
    parsed = textBlock && textBlock.type === "text" ? JSON.parse(textBlock.text) : null;
  } catch {
    parsed = null;
  }
  if (!parsed) return jsonResponse({ error: "Claude's answer couldn't be read. Try again.", usage }, 502, cors);

  const { drops, unreadable } = cleanDrops(parsed, platforms);
  console.log("read-drop", { images: loaded.length, drops: drops.length, model: response.model, ...usage });
  return jsonResponse({ drops, unreadable, usage, model: response.model }, 200, cors);
});
