'use strict';
// Discord pull (Avenue A): a REST poller for one normal text channel. No
// gateway, no privileged intent. The bot needs View Channel + Read Message
// History on that channel, nothing else.
//
// Each new batch of posts (up to MAX_IMAGES pictures, with the text posted
// beside them) goes to the ingest-drop function, which has read-drop read it
// once and files the result as a drop_drafts row. Nothing is published: the
// owner loads a draft into the admin page's form, checks it and saves it.
//
//   node discord-pull.js          poll every DISCORD_PULL_INTERVAL_SEC
//   node discord-pull.js --once   one tick, then exit
//   node discord-pull.js --dry    show what would be read; spends no reads
//                                 (seeds the ledger on a first run)
//
// Needs Node 18+ (global fetch). Pictures are sent as base64: Discord's CDN
// links stop working after about a day. Settings: see .env.example.
const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch (_) {}

const API = 'https://discord.com/api/v10';
const LEDGER_PATH = path.join(__dirname, 'data', 'discord-pull.json');
// Mirrors supabase/functions/read-drop/extract.ts (MAX_IMAGES, MAX_IMAGE_BYTES).
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3700000;
const FETCH_LIMIT = 25;

const TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const CHANNEL_ID = (process.env.DISCORD_PULL_CHANNEL_ID || '').trim();
const OWNER_USER_ID = (process.env.DISCORD_PULL_OWNER_USER_ID || process.env.INGEST_USER_ID || process.env.DRO_OWNER_USER_ID || '').trim();
const BACKFILL = Math.max(0, Number(process.env.DISCORD_PULL_BACKFILL || 0) || 0);
const INTERVAL_SEC = Math.max(15, Number(process.env.DISCORD_PULL_INTERVAL_SEC || 60) || 60);
const IGNORE_BOTS = process.env.DISCORD_PULL_IGNORE_BOTS !== 'false';
const TZ = process.env.DISCORD_PULL_TZ || process.env.BOT_TZ || 'America/Chicago';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const ONCE = argv.includes('--once');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), '[discord-pull]', ...a);
const idCmp = (a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0);
const byIdAsc = (a, b) => idCmp(a.id, b.id);

function loadLedger() {
  try { return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')); } catch (_) { return {}; }
}
function saveLedger(ledger) {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify({ ...ledger, channel_id: CHANNEL_ID, updated_at: new Date().toISOString() }, null, 2) + '\n');
}

async function discord(pathname) {
  const opts = { headers: { Authorization: `Bot ${TOKEN}` }, signal: AbortSignal.timeout(15000) };
  let res = await fetch(`${API}${pathname}`, opts);
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    await sleep(((Number(j.retry_after) || 2) + 0.5) * 1000);
    res = await fetch(`${API}${pathname}`, { ...opts, signal: AbortSignal.timeout(15000) });
  }
  if (!res.ok) throw new Error(`Discord answered ${res.status} on ${pathname.split('?')[0]}`);
  return res.json();
}

async function toBase64(attachment) {
  const res = await fetch(attachment.url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`attachment ${attachment.id} answered ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error(`attachment ${attachment.id} is over ${MAX_IMAGE_BYTES} bytes`);
  return { data: bytes.toString('base64'), media_type: attachment.content_type };
}

// Text-only posts waiting for a picture, kept in the ledger between ticks (so
// a --once run or a restart keeps them too): at most HELD_MAX, none older
// than HELD_MAX_AGE_MS, the oldest dropped first with a log line.
const HELD_MAX = 20;
const HELD_MAX_AGE_MS = 6 * 3600 * 1000;

function trimHeld(held, now = Date.now()) {
  const fresh = held.filter((h) => !h.timestamp || now - Date.parse(h.timestamp) <= HELD_MAX_AGE_MS);
  if (fresh.length !== held.length) log('dropped held text older than 6h:', held.filter((h) => !fresh.includes(h)).map((h) => h.id).join(', '));
  if (fresh.length > HELD_MAX) {
    log('held text over', HELD_MAX, '- dropped the oldest:', fresh.slice(0, fresh.length - HELD_MAX).map((h) => h.id).join(', '));
    return fresh.slice(fresh.length - HELD_MAX);
  }
  return fresh;
}

// Groups a page of messages into batches, oldest first. No image, no read:
// a text-only post rides along as context with the next batch that has a
// picture, on this page or a later tick (`held` carries it over). Posts with
// nothing readable (bots', empty ones, oversize pictures only) are passed over.
// Each batch notes how many of its messages are held text (`heldCount`).
function buildBatches(messages, heldIn = []) {
  const sorted = [...messages].sort(byIdAsc);
  const batches = [];
  let held = [...heldIn];
  let cur = null;
  const flush = () => { if (cur) { batches.push(cur); cur = null; } };
  for (const m of sorted) {
    if (IGNORE_BOTS && m.author && m.author.bot) continue;
    const pictures = (m.attachments || []).filter((a) => (a.content_type || '').startsWith('image/'));
    const imgs = pictures.filter((a) => !a.size || a.size <= MAX_IMAGE_BYTES);
    if (imgs.length !== pictures.length) log('passed over oversize picture(s) in', m.id);
    const text = (m.content || '').trim();
    if (!imgs.length) {
      if (!text) continue;
      if (cur) { cur.messages.push(m); cur.texts.push(text); } else held.push({ id: m.id, content: text, timestamp: m.timestamp || null });
      continue;
    }
    if (cur && cur.images.length + Math.min(imgs.length, MAX_IMAGES) > MAX_IMAGES) flush();
    if (!cur) {
      held = trimHeld(held);
      cur = { messages: [...held], images: [], texts: held.map((h) => h.content), heldCount: held.length };
      held = [];
    }
    cur.messages.push(m);
    cur.images.push(...imgs.slice(0, MAX_IMAGES - cur.images.length));
    if (text) cur.texts.push(text);
    if (cur.images.length >= MAX_IMAGES) flush();
  }
  flush();
  return { batches, held: trimHeld(held) };
}

function batchRef(batch) {
  const ids = batch.messages.map((m) => m.id);
  return `${CHANNEL_ID}/${ids[0]}..${ids[ids.length - 1]}#${ids.length}`;
}

// One read. True once ingest-drop has filed it (or had it already).
async function sendBatch(batch) {
  let images;
  try {
    images = [];
    for (const a of batch.images) images.push(await toBase64(a));
  } catch (err) {
    log('could not fetch a picture:', err.message);
    return false;
  }
  const last = [...batch.messages].reverse().find((m) => m.timestamp);
  const payload = {
    user_id: OWNER_USER_ID,
    source: 'discord',
    source_ref: batchRef(batch),
    channel_id: CHANNEL_ID,
    message_ids: batch.messages.map((m) => m.id),
    image_urls: batch.images.map((a) => a.url),
    text: batch.texts.join('\n'),
    images,
    // Classify against the post time, so "ends tonight" means that night.
    now: last ? last.timestamp : new Date().toISOString(),
    tz: TZ
  };
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ingest-token': INGEST_TOKEN },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(170000)
    });
  } catch (err) {
    log('ingest-drop unreachable:', err.message);
    return false;
  }
  const out = await res.json().catch(() => ({}));
  if (!res.ok) { log('ingest failed', res.status, out.error || ''); return false; }
  if (out.deduped) log('already filed', payload.source_ref);
  else if (out.skipped) log('filed as skipped', payload.source_ref, '-', out.reason || '');
  else log('filed', payload.source_ref, `${(out.drops || []).length} draft(s)`, 'usage', JSON.stringify(out.usage || {}));
  return true;
}

// Reads one page after the ledger. The ledger only moves past a batch once it
// is filed, so a failed batch is tried again next tick (ingest-drop dedupes,
// so a batch that was filed but whose reply was lost is never read twice).
async function tick(ledger, page, budget) {
  const sorted = [...page].sort(byIdAsc);
  if (!sorted.length) return { ledger, reads: 0, more: false };
  const { batches, held } = buildBatches(sorted, ledger.held || []);
  // A backfill budget goes to the newest batches on the page.
  const passOver = Number.isFinite(budget) ? Math.max(0, batches.length - budget) : 0;
  let reads = 0;
  for (const [index, batch] of batches.entries()) {
    if (DRY || index < passOver) {
      log(DRY ? 'would read' : 'passed over (backfill budget)', batchRef(batch), `${batch.images.length} picture(s)`);
      continue;
    }
    if (!(await sendBatch(batch))) {
      // Hold just before the batch's first post from this page, and keep its
      // held text waiting, so the next tick rebuilds the same batch.
      const fromPage = batch.messages.slice(batch.heldCount);
      const first = fromPage[0].id;
      const done = sorted.filter((m) => idCmp(m.id, first) < 0).pop();
      if (done && idCmp(done.id, ledger.last_message_id) > 0) ledger.last_message_id = done.id;
      ledger.held = batch.messages.slice(0, batch.heldCount)
        .map((m) => ({ id: m.id, content: m.content.trim(), timestamp: m.timestamp || null }));
      saveLedger(ledger);
      log('holding at', ledger.last_message_id, '- this batch is tried again next tick');
      return { ledger, reads, more: false, held: true };
    }
    reads++;
  }
  if (!DRY) {
    ledger.last_message_id = sorted[sorted.length - 1].id;
    ledger.held = held;
    if (held.length) log('holding', held.length, 'text-only post(s) for the next picture:', held.map((h) => h.id).join(', '));
    saveLedger(ledger);
  }
  return { ledger, reads, more: page.length >= FETCH_LIMIT };
}

async function main() {
  const missing = [
    ['DISCORD_BOT_TOKEN', TOKEN], ['DISCORD_PULL_CHANNEL_ID', CHANNEL_ID],
    ['DISCORD_PULL_OWNER_USER_ID (or INGEST_USER_ID, or DRO_OWNER_USER_ID)', OWNER_USER_ID],
    ['SUPABASE_URL', SUPABASE_URL], ['INGEST_TOKEN', INGEST_TOKEN]
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`missing in .env: ${missing.join(', ')}`);

  let ledger = loadLedger();
  if (ledger.channel_id && ledger.channel_id !== CHANNEL_ID) {
    log('ledger was for channel', ledger.channel_id, '- starting over for', CHANNEL_ID);
    ledger = {};
  }

  // First run: bookmark the newest post so history is never read by accident.
  // DISCORD_PULL_BACKFILL=n spends at most n reads on the newest history.
  if (!ledger.last_message_id) {
    const [top] = await discord(`/channels/${CHANNEL_ID}/messages?limit=1`);
    if (!top) { log('channel is empty; nothing to seed'); return; }
    if (BACKFILL > 0 && !DRY) {
      const hist = await discord(`/channels/${CHANNEL_ID}/messages?limit=${FETCH_LIMIT}`);
      const oldest = [...hist].sort(byIdAsc)[0];
      ledger = { last_message_id: String(BigInt(oldest.id) - 1n) };
      const r = await tick(ledger, hist, BACKFILL);
      ledger = r.ledger;
      log(`backfill spent ${r.reads} read(s); older history passed over`);
    } else {
      ledger = { last_message_id: top.id, seeded_at: new Date().toISOString() };
      saveLedger(ledger);
      log('ledger seeded at newest post', top.id, DRY ? '(dry run: no reads spent)' : '');
      if (DRY) return;
    }
    if (ONCE) return;
  }

  for (;;) {
    try {
      let more = true;
      while (more) {
        const page = await discord(`/channels/${CHANNEL_ID}/messages?limit=${FETCH_LIMIT}&after=${ledger.last_message_id}`);
        const r = await tick(ledger, page, Infinity);
        ledger = r.ledger;
        more = r.more && !DRY;
      }
    } catch (err) {
      log('tick failed:', err.message);
      if (ONCE || DRY) process.exitCode = 1;
    }
    if (ONCE || DRY) return;
    await sleep(INTERVAL_SEC * 1000);
  }
}

if (require.main === module) {
  main().catch((err) => { log('fatal:', err.message); process.exit(1); });
}

module.exports = { buildBatches, batchRef, trimHeld, tick };
