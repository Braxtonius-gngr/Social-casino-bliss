#!/usr/bin/env node
/*
 * Makes one Wish Room prop end to end: generate it through fal.ai's hosted
 * Rodin (or start from a GLB already in hand), measure its tessellation,
 * decimate only if the measure says the triangles are not working, lint it
 * against its row and the sheet, and install it where the room loads it.
 *
 *   npm run gen:prop -- cookie                 generate cookie.glb from the row's prompt
 *   npm run gen:prop -- cookie-one             the single, from the row's promptOne
 *   npm run gen:prop -- cookie --from=a.glb    skip generation: measure, decimate, lint a.glb
 *   --decimate=auto|always|never               auto (default) follows the metric's verdict
 *   --install                                  copy a clean result into assets/intro3d/rare/wish/
 *   --quality=medium                           Rodin quality: high, medium, low, extra-low
 *   --out=<dir>                                the work folder (default: the system temp dir)
 *
 * The decimation gate (scripts/lib/glb-metrics.js): a file at or under its
 * triangle budget is never touched. One over budget is decimated only when
 * at least a quarter of its triangles do no visual work - flat (its three
 * edges turn under 3 degrees, invisible with smooth normals) or sub-pixel
 * at the room's closest zoom - and only as far as that waste reaches, to
 * the budget at best. One over budget whose triangles are all working is
 * left alone and reported: decimating it would lose shape, so the answer
 * is a lower generation quality or a bigger budget on its row.
 *
 * Generation needs FAL_KEY in the environment (a fal.ai API key; in a cloud
 * session whose proxy injects the key, any placeholder value). Network
 * calls go through curl so the session's proxy settings apply. Decimation
 * runs gltf-transform (weld, then meshoptimizer's simplify) through npx,
 * pinned; nothing is added to the app.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const metrics = require('./lib/glb-metrics.js');
const linter = require('./check-wish-glb.js');

const ROOT = path.resolve(__dirname, '..');
const MODEL = 'fal-ai/hyper3d/rodin';
const QUEUE = `https://queue.fal.run/${MODEL}`;
const GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1';
const SIMPLIFY_ERROR = 0.002;   // meshoptimizer's error bound, a share of the mesh's extent

const args = process.argv.slice(2);
const name = args.find(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FROM = opt('from', null);
const DECIMATE = opt('decimate', 'auto');
const QUALITY = opt('quality', 'medium');
const INSTALL = args.includes('--install');

const log = m => console.log(m);
const fail = m => { console.error(`gen:prop: ${m}`); process.exit(1); };
const curl = (urlArgs, label) => {
  const r = spawnSync('curl', ['-sS', '-m', '120', ...urlArgs], { encoding: 'buffer', maxBuffer: 1 << 28 });
  if (r.status !== 0) fail(`${label}: curl failed: ${r.stderr.toString().trim()}`);
  return r.stdout;
};
const curlJson = (urlArgs, label) => {
  const out = curl(urlArgs, label).toString('utf8');
  try { return JSON.parse(out); } catch (e) { fail(`${label}: not JSON: ${out.slice(0, 300)}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Rodin's bbox_condition: integer proportions as Length (X), Width (Y),
// Height (Z) in its Z-up frame; the row's box is [w, h, d] with y up.
const bboxFor = ([w, h, d]) => [Math.round(w * 100), Math.round(d * 100), Math.round(h * 100)];

async function generate(hit, work) {
  const key = process.env.FAL_KEY;
  if (!key) fail('FAL_KEY is not set (a fal.ai API key; in a session whose proxy injects it, any placeholder)');
  const prompt = hit.single ? hit.row.promptOne : hit.row.prompt;
  if (!prompt) fail(`the "${hit.file}" row has no ${hit.single ? 'promptOne' : 'prompt'} in lab/wish-props.mjs; write one to the sheet's notes for it`);
  const box = hit.single ? hit.row.single : hit.row.size;
  const body = { prompt, geometry_file_format: 'glb', material: 'PBR', quality: QUALITY, tier: 'Regular', use_hyper: false, bbox_condition: bboxFor(box), seed: hit.row.seed != null ? hit.row.seed + (hit.single ? 1 : 0) : undefined };
  fs.writeFileSync(path.join(work, 'request.json'), JSON.stringify(body, null, 2));
  log(`submitting "${hit.stem}" to ${MODEL} at ${QUALITY} quality, bbox ${body.bbox_condition.join(' x ')}`);
  const auth = ['-H', `Authorization: Key ${key}`, '-H', 'Content-Type: application/json'];
  const queued = curlJson(['-X', 'POST', QUEUE, ...auth, '--data-binary', `@${path.join(work, 'request.json')}`], 'submit');
  if (!queued.request_id) fail(`submit refused: ${JSON.stringify(queued).slice(0, 300)}`);
  log(`queued as ${queued.request_id}`);
  const t0 = Date.now();
  for (;;) {
    const st = curlJson([`${QUEUE}/requests/${queued.request_id}/status`, ...auth], 'status');
    const status = st.status || JSON.stringify(st).slice(0, 120);
    log(`  ${Math.round((Date.now() - t0) / 1000)}s ${status}${st.queue_position != null ? ` (queue position ${st.queue_position})` : ''}`);
    if (status === 'COMPLETED') break;
    if (status === 'FAILED' || st.detail) fail(`generation failed: ${JSON.stringify(st).slice(0, 400)}`);
    if (Date.now() - t0 > 20 * 60 * 1000) fail('generation did not finish in 20 minutes');
    await sleep(10000);
  }
  const result = curlJson([`${QUEUE}/requests/${queued.request_id}`, ...auth], 'result');
  fs.writeFileSync(path.join(work, 'result.json'), JSON.stringify(result, null, 2));
  const url = result.model_mesh && result.model_mesh.url;
  if (!url) fail(`no model_mesh in the result: ${JSON.stringify(result).slice(0, 300)}`);
  log(`mesh ready: ${url}`);
  const raw = path.join(work, 'raw.glb');
  fs.writeFileSync(raw, curl(['-L', url], 'download'));
  return raw;
}

function measure(file) {
  const { json, bin } = metrics.readGlb(fs.readFileSync(file));
  return metrics.tessellationWaste(json, bin);
}

function decimate(src, dst, target, tris) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const welded = dst.replace(/\.glb$/, '.welded.glb');
  const ratio = Math.min(1, Math.max(0.01, target / tris)).toFixed(4);
  log(`decimating: weld, then simplify to ratio ${ratio} (error bound ${SIMPLIFY_ERROR})`);
  execFileSync(npx, ['-y', GLTF_TRANSFORM, 'weld', src, welded], { stdio: 'inherit' });
  execFileSync(npx, ['-y', GLTF_TRANSFORM, 'simplify', welded, dst, '--ratio', ratio, '--error', String(SIMPLIFY_ERROR)], { stdio: 'inherit' });
  fs.unlinkSync(welded);
}

async function main() {
  if (!name) fail('usage: node scripts/generate-wish-prop.js <file|file-one> [--from=<glb>] [--decimate=auto|always|never] [--install] [--quality=medium]');
  const { rows, WISH_GLB_DIR } = await linter.loadRows();
  const hit = linter.rowFor(rows, name);
  if (!hit) fail(`no row in lab/wish-props.mjs is called "${name}"`);
  if (hit.single && !hit.row.single) fail(`"${hit.file}" is one thing, not one or many: it has no -one file`);
  const work = path.resolve(opt('out', path.join(os.tmpdir(), 'wish-gen')), hit.stem);
  fs.mkdirSync(work, { recursive: true });

  const raw = FROM ? path.resolve(FROM) : await generate(hit, work);
  if (!fs.existsSync(raw)) fail(`${raw} does not exist`);
  const budget = linter.triangleBudget(hit.single);
  const before = measure(raw);
  const decision = metrics.verdict(before, budget);
  log(`measured: ${before.tris.toLocaleString()} tris, ${metrics.describe(before)}`);
  log(`verdict:  ${decision.action} - ${decision.reason}`);

  let final = raw;
  const wants = DECIMATE === 'always' ? before.tris > budget : DECIMATE === 'auto' ? decision.action === 'decimate' : false;
  if (DECIMATE === 'always' && before.tris <= budget) log('--decimate=always, but the file is within budget: nothing to take');
  if (DECIMATE === 'never' && decision.action === 'decimate') log('--decimate=never: left as generated');
  if (wants) {
    const target = DECIMATE === 'always' ? budget : decision.target;
    final = path.join(work, `${hit.stem}.glb`);
    decimate(raw, final, target, before.tris);
    const after = measure(final);
    log(`after:    ${after.tris.toLocaleString()} tris, ${metrics.describe(after)} (${Math.round((1 - after.tris / before.tris) * 100)}% taken, ${(fs.statSync(final).size / 1024).toFixed(0)} KB)`);
    if (after.tris > budget) log(`still ${(after.tris - budget).toLocaleString()} over budget: the error bound stopped the simplifier before the target`);
  } else if (final !== path.join(work, `${hit.stem}.glb`)) {
    fs.copyFileSync(final, path.join(work, `${hit.stem}.glb`));
    final = path.join(work, `${hit.stem}.glb`);
  }

  const result = linter.checkFile(hit.file, hit.row, hit.single, fs.readFileSync(final));
  log(`\nlint ${hit.stem}.glb: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  result.errors.forEach(m => log(`  error: ${m}`));
  result.warnings.forEach(m => log(`  warn:  ${m}`));
  log(`\nresult: ${final}`);

  if (INSTALL) {
    if (result.errors.length) fail('not installed: the file has errors');
    const dest = path.join(ROOT, WISH_GLB_DIR, `${hit.stem}.glb`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(final, dest);
    log(`installed: ${path.relative(ROOT, dest)}`);
  }
}

main().catch(e => fail(e.message));
