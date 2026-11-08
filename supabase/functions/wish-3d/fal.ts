// The provider seam: everything wish-3d knows about fal.ai's queue API and
// the Rodin models behind it, as pure functions with no I/O, so index.ts
// stays a thin proxy and this file is what a second provider (an
// open-weight model on rented GPUs) would replace.
//
// fal's queue, from its OpenAPI: POST queue.fal.run/<model> with the
// model's body answers { request_id, status_url, response_url, ... };
// GET .../requests/<id>/status answers IN_QUEUE | IN_PROGRESS | COMPLETED
// (a failed or cancelled job is COMPLETED too); GET .../requests/<id> then
// returns the model's own response, or the same error the model raised.

export const QUEUE_HOST = "https://queue.fal.run";
export const DEFAULT_MODEL = "fal-ai/hyper3d/rodin";

// Each model's body for a text-to-3D request. Quality stays medium and no
// HighPack add-on: it triples the bill for textures the room never shows.
export const MODELS: Record<string, (prompt: string) => Record<string, unknown>> = {
  "fal-ai/hyper3d/rodin": (prompt) => ({
    prompt,
    geometry_file_format: "glb",
    material: "PBR",
    quality: "medium",
    tier: "Regular",
  }),
  "fal-ai/hyper3d/rodin/v2": (prompt) => ({
    prompt,
    geometry_file_format: "glb",
    material: "PBR",
    quality_mesh_option: "20K Triangle",
  }),
};

export function normaliseKey(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.!?,;:]+$/, "");
}

export function cacheKey(prompt: string, model: string): string {
  return `${normaliseKey(prompt)}|${model}`;
}

export function bodyFor(model: string, prompt: string): Record<string, unknown> {
  const build = MODELS[model];
  if (!build) throw new Error(`Unknown model: ${model}`);
  return build(prompt);
}

export function urlsFor(model: string, id = ""): { submit: string; status: string; result: string } {
  const base = `${QUEUE_HOST}/${model}`;
  return {
    submit: base,
    status: `${base}/requests/${id}/status`,
    result: `${base}/requests/${id}`,
  };
}

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// fal's error bodies: { detail: string } or { detail: [{ msg }] } for a
// validation error, { error: string } from a runner.
export function failedMessage(json: Record<string, unknown>, fallback: string): string {
  const detail = json.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as Record<string, unknown>;
    if (first && typeof first.msg === "string") return first.msg;
  }
  if (typeof json.error === "string" && json.error) return json.error;
  return fallback;
}

export type JobState =
  | { state: "queued"; position?: number }
  | { state: "running" }
  | { state: "completed" }
  | { state: "failed"; message: string };

export function statusFrom(httpStatus: number, json: Record<string, unknown>): JobState {
  if (httpStatus === 200 || httpStatus === 202) {
    switch (json.status) {
      case "IN_QUEUE": {
        const out: JobState = { state: "queued" };
        if (typeof json.queue_position === "number") out.position = json.queue_position;
        return out;
      }
      case "IN_PROGRESS":
        return { state: "running" };
      case "COMPLETED":
        return { state: "completed" };
    }
  }
  if (httpStatus === 404) return { state: "failed", message: "fal has no such job (it may have expired)" };
  return { state: "failed", message: failedMessage(json, `fal status ${httpStatus}`) };
}

export type ResultState =
  | { state: "running" }
  | { state: "failed"; message: string }
  | { state: "done"; url: string; seed: number | null; textures: string[] };

export function resultFrom(httpStatus: number, json: Record<string, unknown>): ResultState {
  // 400 here means "not complete yet": the status said COMPLETED a moment
  // before the result was stored. Keep polling rather than fail.
  if (httpStatus === 400) return { state: "running" };
  if (httpStatus !== 200) return { state: "failed", message: failedMessage(json, `fal result ${httpStatus}`) };
  const mesh = json.model_mesh as Record<string, unknown> | undefined;
  const url = mesh && typeof mesh.url === "string" ? mesh.url : "";
  if (!url) return { state: "failed", message: "fal returned no mesh" };
  const textures = (Array.isArray(json.textures) ? json.textures : [])
    .map((t) => (t && typeof (t as Record<string, unknown>).url === "string") ? (t as Record<string, unknown>).url as string : "")
    .filter((u) => u);
  return { state: "done", url, seed: typeof json.seed === "number" ? json.seed : null, textures };
}

// Where a kept mesh lives in the bucket: the model's slug over the cache
// key's digest, so one prompt on one model is one object, overwritten in place.
export async function objectPath(model: string, key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${model.replace(/\//g, "-")}/${hex}.glb`;
}

// A fetch that cannot reach fal (DNS, reset, timeout) throws; the proxy
// answers 502 with a message rather than letting the exception escape as a
// bare 500 with no CORS headers.
export async function tryFetch(run: () => Promise<Response>): Promise<Response | { error: string }> {
  try {
    return await run();
  } catch (err) {
    return { error: `Could not reach fal: ${err instanceof Error ? err.message : String(err)}` };
  }
}
