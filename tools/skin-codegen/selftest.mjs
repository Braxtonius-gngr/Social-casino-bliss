// Grader self-test, no API calls. For every fixture in fixtures/:
//   - the hand-written correct answer (<id>.oracle.json) must pass every rep,
//   - an empty answer must fail,
//   - the plausible-but-wrong answer (<id>.wrong.json) must fail.
// Grading runs several at once, like the runner does, so the frame budget is
// checked under the same contention a real run sees.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grade, closeBrowser } from './grade.mjs';

const DIR = fileURLToPath(new URL('./fixtures/', import.meta.url));
const REPS = Number(process.env.REPS || 3);
const ids = readdirSync(DIR).filter((f) => /^[\w-]+\.json$/.test(f)).map((f) => f.slice(0, -5)).sort();
const load = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

const jobs = [];
for (const id of ids) {
  const spec = load(`${id}.json`);
  for (let r = 0; r < REPS; r++) jobs.push({ id, kind: 'oracle', spec, out: load(`${id}.oracle.json`), want: 1 });
  jobs.push({ id, kind: 'null', spec, out: { html: '', css: '', js: '' }, want: 0 });
  jobs.push({ id, kind: 'wrong', spec, out: load(`${id}.wrong.json`), want: 0 });
}

let bad = 0;
const rows = [];
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++];
    const g = await grade(j.spec, j.out);
    const ok = g.grade.pass === j.want;
    if (!ok) bad++;
    rows.push({ ...j, g, ok });
  }
}));
await closeBrowser();

for (const kind of ['oracle', 'null', 'wrong']) {
  const rs = rows.filter((r) => r.kind === kind);
  const passed = rs.filter((r) => r.g.grade.pass).length;
  console.log(`${kind.padEnd(6)} pass ${passed}/${rs.length}`);
  for (const r of rs.filter((x) => !x.ok))
    console.log(`  UNEXPECTED ${r.id}: ${JSON.stringify(r.g.grade)} ${JSON.stringify(r.g.explanation)}`);
}
const p95 = rows.filter((r) => r.kind === 'oracle').map((r) => r.g.perf.frame_p95_ms);
console.log(`oracle frame p95 range ${Math.min(...p95)}-${Math.max(...p95)} ms (budget ${(1000 / 60 * 1.5).toFixed(1)})`);
for (const r of rows.filter((x) => x.kind === 'wrong' && x.ok))
  console.log(`wrong ${r.id} caught by: ${Object.entries(r.g.grade).filter(([k, v]) => k !== 'pass' && v < 1).map(([k]) => k).join(', ')}`);
process.exit(bad ? 1 : 0);
