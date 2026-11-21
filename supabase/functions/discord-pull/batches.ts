// Groups new posts into reads for discord-pull, kept free of the network so
// it can be tested. Rule: no picture, no read. A text-only post rides along as
// context with the next batch that has a picture, on this run or a later one
// (the leftovers are kept in drop_pull_state.held). One batch = one read.

import { MAX_IMAGES } from "../read-drop/extract.ts";
import { byIdAscending, type DiscordMessage, messageImages, messageText } from "./discord.ts";

export type Held = { id: string; text: string; timestamp?: string | null };
export type Batch = {
  ids: string[];          // every post in the batch, oldest first (held text included)
  heldCount: number;      // how many of `ids` came from earlier text-only posts
  images: string[];       // Discord image URLs, at most MAX_IMAGES
  texts: string[];
  postedAt: string | null; // the newest post's time
};

export const HELD_MAX = 20;
export const HELD_MAX_AGE_MS = 6 * 3600 * 1000;

export function trimHeld(held: Held[], now = Date.now()): Held[] {
  const fresh = held.filter((h) => !h.timestamp || now - Date.parse(h.timestamp) <= HELD_MAX_AGE_MS);
  return fresh.slice(Math.max(0, fresh.length - HELD_MAX));
}

export function buildBatches(messages: DiscordMessage[], heldIn: Held[], ignoreBots = true, now = Date.now()) {
  const batches: Batch[] = [];
  let held = [...heldIn];
  let cur: Batch | null = null;
  const flush = () => {
    if (cur) batches.push(cur);
    cur = null;
  };
  for (const m of byIdAscending(messages)) {
    if (ignoreBots && m.author?.bot) continue;
    const images = messageImages(m);
    const text = messageText(m);
    if (!images.length) {
      if (!text) continue;
      if (cur) {
        (cur as Batch).ids.push(m.id);
        (cur as Batch).texts.push(text);
        (cur as Batch).postedAt = m.timestamp ?? (cur as Batch).postedAt;
      } else {
        held.push({ id: m.id, text, timestamp: m.timestamp ?? null });
      }
      continue;
    }
    if (cur && (cur as Batch).images.length + Math.min(images.length, MAX_IMAGES) > MAX_IMAGES) flush();
    if (!cur) {
      held = trimHeld(held, now);
      cur = { ids: held.map((h) => h.id), heldCount: held.length, images: [], texts: held.map((h) => h.text), postedAt: null };
      held = [];
    }
    const c = cur as Batch;
    c.ids.push(m.id);
    c.images.push(...images.slice(0, MAX_IMAGES - c.images.length));
    if (text) c.texts.push(text);
    c.postedAt = m.timestamp ?? c.postedAt;
    if (c.images.length >= MAX_IMAGES) flush();
  }
  flush();
  return { batches, held: trimHeld(held, now) };
}

export function batchRef(channelId: string, b: Batch): string {
  return `${channelId}/${b.ids[0]}..${b.ids[b.ids.length - 1]}#${b.ids.length}`;
}
