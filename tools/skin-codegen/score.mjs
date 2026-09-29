#!/usr/bin/env node
// PESR score and keep rule for skin-codegen. Reads results.jsonl for each
// variant under the flow directory; makes no API calls.
//
//   node tools/skin-codegen/score.mjs --flow .claude/hillclimb/skin-codegen baseline
//   node tools/skin-codegen/score.mjs --flow .claude/hillclimb/skin-codegen baseline v1
//
// With one variant it prints the score. With two it also applies the keep
// rule to the second against the first: kept only if it breaks no component
// that passed every rep before AND its score is higher. A human still
// approves anything that ships.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Score = pass rate (%) - latency penalty - cost penalty. Weights are set
// here, not in _state.json, so they're covered by the harness sha.
export const WEIGHTS = {
  latency_target_s: 30,     // median seconds per component before any penalty
  latency_pts_per_s: 0.5,   // points lost per second over the target
  cost_pts_per_cent: 1,     // points lost per US cent per component
};
// USD per million tokens. Cache writes 1.25x input, cache reads 0.1x.
export const PRICES = { 'claude-opus-5-5': { in: 4, out: 20 } };

function costUsd(row) {
  const u = row.usage ?? {};
  const p = PRICES[row.model] ?? PRICES[String(row.model).replace(/-\d{8}$/, '')];
  if (!p) return NaN;
  const inTok = (u.input_tokens ?? 0) + 1.25 * (u.cache_creation_input_tokens ?? 0) + 0.1 * (u.cache_read_input_tokens ?? 0);
  return (inTok * p.in + (u.output_tokens ?? 0) * p.out) / 1e6;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };

export function load(flow, variant) {
  const p = join(flow, variant, 'results.jsonl');
  if (!existsSync(p)) throw new Error(`no results at ${p}`);
  const rows = readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const ep = join(flow, variant, 'errors.jsonl');
  const errors = existsSync(ep) ? readFileSync(ep, 'utf8').split('\n').filter(Boolean).length : 0;
  return { rows, errors };
}

export function score({ rows, errors }) {
  const pass_rate = 100 * mean(rows.map((r) => r.grade.pass));
  const latency = median(rows.map((r) => r.latency_s));
  const cents = 100 * mean(rows.map(costUsd));
  const latency_penalty = WEIGHTS.latency_pts_per_s * Math.max(0, latency - WEIGHTS.latency_target_s);
  const cost_penalty = WEIGHTS.cost_pts_per_cent * cents;
  const byCase = {};
  for (const r of rows) (byCase[r.prompt_id] ??= []).push(r.grade.pass);
  return {
    n: rows.length, cases: Object.keys(byCase).length, errors,
    score: pass_rate - latency_penalty - cost_penalty,
    pass_rate, latency_penalty, cost_penalty,
    median_latency_s: latency, cents_per_component: cents,
    mean_out_tokens: mean(rows.map((r) => r.usage?.output_tokens ?? 0)),
    means: Object.fromEntries(['syntax', 'fidelity', 'timing', 'no_clip', 'frame_ok'].map((k) => [k, mean(rows.map((r) => r.grade[k]))])),
    // Half-width of a 95% interval on the pass rate, in points: differences
    // smaller than this are noise at this sample size.
    noise_pts: 100 * 1.96 * Math.sqrt(Math.max(pass_rate / 100 * (1 - pass_rate / 100), 0.25 / rows.length) / rows.length),
    byCase,
  };
}

export function keep(before, after) {
  const broken = Object.entries(before.byCase)
    .filter(([id, ps]) => ps.every(Boolean) && after.byCase[id] && !after.byCase[id].every(Boolean))
    .map(([id]) => id);
  const missing = Object.keys(before.byCase).filter((id) => !after.byCase[id]);
  const better = after.score > before.score;
  return { kept: !broken.length && !missing.length && !after.errors && better, broken, missing, better };
}

function fmt(s) {
  const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : 'n/a');
  return [
    `  score ${f(s.score)}  =  pass ${f(s.pass_rate)}%  -  latency ${f(s.latency_penalty)}  -  cost ${f(s.cost_penalty)}`,
    `  ${s.n} graded runs over ${s.cases} components, ${s.errors} unscored errors; pass-rate noise about +/-${f(s.noise_pts)} pts`,
    `  median ${f(s.median_latency_s)} s, ${f(s.cents_per_component, 2)} cents and ${f(s.mean_out_tokens, 0)} output tokens per component`,
    `  checks: ${Object.entries(s.means).map(([k, v]) => `${k} ${f(100 * v, 0)}%`).join(', ')}`,
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const fi = argv.indexOf('--flow');
  if (fi < 0 || !argv[fi + 1]) { console.error('usage: score.mjs --flow DIR VARIANT [CANDIDATE]'); process.exit(2); }
  const flow = argv[fi + 1];
  const vs = argv.filter((_, i) => i !== fi && i !== fi + 1);
  const scored = vs.map((v) => ({ v, s: score(load(flow, v)) }));
  for (const { v, s } of scored) console.log(`${v}\n${fmt(s)}`);
  if (scored.length === 2) {
    const k = keep(scored[0].s, scored[1].s);
    console.log(`\nkeep ${scored[1].v} over ${scored[0].v}: ${k.kept ? 'YES' : 'NO'}`
      + (k.broken.length ? `; breaks ${k.broken.join(', ')}` : '')
      + (k.missing.length ? `; missing ${k.missing.join(', ')}` : '')
      + (scored[1].s.errors ? `; ${scored[1].s.errors} unscored errors to resolve first` : '')
      + (k.better ? '' : '; score not higher'));
  }
}
