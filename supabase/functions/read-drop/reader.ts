// Reading drops with Claude, for callers other than read-drop's own admin
// endpoint (pull-drops). Same model, prompt, schema and clean-up as
// read-drop/index.ts, so a drop read from a Discord channel and one read from
// a pasted screenshot are judged alike.

import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";
import {
  apiErrorMessage,
  claudeErrorReply,
  cleanDrops,
  discordImageUrl,
  type Drop,
  DROP_SCHEMA,
  type ImageType,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_TEXT_CHARS,
  sniffImageType,
  SYSTEM_PROMPT,
} from "./extract.ts";

export const MODEL = "claude-opus-5";

export class ReadError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function readCapped(response: Response): Promise<Uint8Array | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// A Discord-hosted image, or null if it isn't one, can't be fetched, or isn't
// a picture. Only Discord's own image hosts are ever fetched.
export async function fetchDiscordImage(raw: string): Promise<{ media_type: ImageType; data: string } | null> {
  const url = discordImageUrl(raw);
  if (!url) return null;
  let response: Response;
  try {
    response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch {
    return null;
  }
  if (!response.ok) {
    await response.body?.cancel();
    return null;
  }
  const bytes = await readCapped(response);
  if (!bytes) return null;
  const type = sniffImageType(bytes);
  return type ? { media_type: type, data: encodeBase64(bytes) } : null;
}

export type ReadResult = { drops: Drop[]; unreadable: string | null; usage: { input_tokens: number; output_tokens: number } };

export async function readDrops(opts: {
  apiKey: string;
  images: { media_type: ImageType; data: string }[];
  text: string;
  platforms: string[];
  reference: string;
  tz: string;
  deadlineMs: number;
}): Promise<ReadResult> {
  const images = opts.images.slice(0, MAX_IMAGES);
  const text = opts.text.slice(0, MAX_TEXT_CHARS);
  const content = [
    ...images.map((image) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: image.media_type, data: image.data },
    })),
    {
      type: "text" as const,
      text: [
        `Reference time: ${opts.reference} (the curator's time zone is ${opts.tz}).`,
        `Known platform names: ${opts.platforms.length ? opts.platforms.join(" | ") : "(none given)"}`,
        `Message text (may be empty):\n<message>\n${text}\n</message>`,
        images.length ? "List the offers these screenshots and this message show." : "List the offers this message shows.",
      ].join("\n\n"),
    },
  ];

  const anthropic = new Anthropic({ apiKey: opts.apiKey, maxRetries: 1 });
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: { type: "json_schema", schema: DROP_SCHEMA } },
      messages: [{ role: "user", content }],
    }, { signal: AbortSignal.timeout(Math.max(1_000, opts.deadlineMs)) });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const reply = claudeErrorReply(err.status, err.type, apiErrorMessage(err.error, err.message));
      // Setup problems (key, billing, access) won't fix themselves; the rest may.
      throw new ReadError(reply.error, reply.status !== 500);
    }
    throw new ReadError("Claude couldn't be reached.", true);
  }

  const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
  if (response.stop_reason === "refusal") throw new ReadError("Claude declined to read this message.", false);
  if (response.stop_reason === "max_tokens") throw new ReadError("Claude's answer was cut off.", true);

  let parsed: unknown = null;
  for (const block of response.content) {
    if (block.type === "text") {
      try {
        parsed = JSON.parse(block.text);
      } catch { /* keep looking */ }
      if (parsed) break;
    }
  }
  if (!parsed) throw new ReadError("Claude's answer couldn't be read.", true);

  const { drops, unreadable } = cleanDrops(parsed, opts.platforms, opts.reference);
  return { drops, unreadable, usage };
}
