import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { DEFAULT_MODEL, bodyFor, cacheKey, isUuid, normaliseKey, objectPath, resultFrom, statusFrom, urlsFor } from "./fal.ts";

Deno.test("normaliseKey lowercases, trims, collapses spaces and drops trailing punctuation", () => {
  assertEquals(normaliseKey("  A  Birthday   CAKE!! "), "a birthday cake");
  assertEquals(normaliseKey("🍩 donuts"), "🍩 donuts");
  assertEquals(cacheKey("Pizza", DEFAULT_MODEL), "pizza|fal-ai/hyper3d/rodin");
});

Deno.test("bodyFor builds each model's body and refuses unknown models", () => {
  assertEquals(bodyFor("fal-ai/hyper3d/rodin", "a trophy"), { prompt: "a trophy", geometry_file_format: "glb", material: "PBR", quality: "medium", tier: "Regular" });
  assertEquals(bodyFor("fal-ai/hyper3d/rodin/v2", "a trophy"), { prompt: "a trophy", geometry_file_format: "glb", material: "PBR", quality_mesh_option: "20K Triangle" });
  assertThrows(() => bodyFor("fal-ai/nope", "x"), Error, "Unknown model");
});

Deno.test("urlsFor and isUuid", () => {
  const id = "019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b";
  assertEquals(urlsFor(DEFAULT_MODEL, id), {
    submit: "https://queue.fal.run/fal-ai/hyper3d/rodin",
    status: `https://queue.fal.run/fal-ai/hyper3d/rodin/requests/${id}/status`,
    result: `https://queue.fal.run/fal-ai/hyper3d/rodin/requests/${id}`,
  });
  assertEquals(isUuid(id), true);
  assertEquals(isUuid("../other"), false);
});

Deno.test("statusFrom maps fal's queue states", () => {
  assertEquals(statusFrom(202, { status: "IN_QUEUE", queue_position: 3 }), { state: "queued", position: 3 });
  assertEquals(statusFrom(202, { status: "IN_PROGRESS" }), { state: "running" });
  assertEquals(statusFrom(200, { status: "COMPLETED" }), { state: "completed" });
  assertEquals(statusFrom(404, { detail: "Request not found" }).state, "failed");
  assertEquals(statusFrom(500, { detail: "boom" }), { state: "failed", message: "boom" });
});

Deno.test("resultFrom maps the result endpoint", () => {
  assertEquals(resultFrom(400, { detail: "Request is still in progress" }), { state: "running" });
  assertEquals(resultFrom(200, { model_mesh: { url: "https://v3.fal.media/files/x.glb" }, seed: 7, textures: [{ url: "https://v3.fal.media/t.png" }] }),
    { state: "done", url: "https://v3.fal.media/files/x.glb", seed: 7, textures: ["https://v3.fal.media/t.png"] });
  assertEquals(resultFrom(200, { textures: [] }), { state: "failed", message: "fal returned no mesh" });
  assertEquals(resultFrom(422, { detail: [{ msg: "prompt too long" }] }), { state: "failed", message: "prompt too long" });
  assertEquals(resultFrom(500, { error: "runner died" }), { state: "failed", message: "runner died" });
  assertEquals(resultFrom(499, {}), { state: "failed", message: "fal result 499" });
});

Deno.test("objectPath is the model slug over the key's sha256", async () => {
  const key = "pizza|fal-ai/hyper3d/rodin";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  assertEquals(await objectPath(DEFAULT_MODEL, key), `fal-ai-hyper3d-rodin/${hex}.glb`);
});

Deno.test("tryFetch turns a thrown network error into a 502-shaped failure", async () => {
  const { tryFetch } = await import("./fal.ts");
  const ok = await tryFetch(() => Promise.resolve(new Response("{}", { status: 200 })));
  assertEquals(ok instanceof Response, true);
  const bad = await tryFetch(() => Promise.reject(new TypeError("error sending request")));
  assertEquals(bad, { error: "Could not reach fal: error sending request" });
});
