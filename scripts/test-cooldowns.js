#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils', 'cooldowns.js'), 'utf8');
const engine = new vm.Script(`${source}\nCooldownEngine`).runInNewContext({}, { timeout: 5000 });
const cooldownSource = fs.readFileSync(path.join(root, 'data', 'cooldowns.js'), 'utf8');
const cooldownData = new vm.Script(`${cooldownSource}\nCURATED_COOLDOWN_DATA`).runInNewContext({}, { timeout: 5000 });
const catalogSource = fs.readFileSync(path.join(root, 'data', 'catalog.js'), 'utf8');
const catalog = new vm.Script(`${catalogSource}\nCATALOG_DATA`).runInNewContext({}, { timeout: 5000 });
const at = (iso) => new Date(iso).getTime();

const interval = [{ id: 'Daily', type: 'interval', minutes: 1440 }];
let state = engine.getState(interval, {}, at('2026-09-08T12:00:00Z'), at('2026-09-09T11:59:00Z'));
assert.strictEqual(state.isReady, false);
assert.strictEqual(state.remainingMs, 60000);
state = engine.getState(interval, {}, at('2026-09-08T12:00:00Z'), at('2026-09-09T12:00:00Z'));
assert.strictEqual(state.isReady, true);

const fixed = [{ id: 'Daily', type: 'fixedUtc', times: ['10:00'] }];
state = engine.getState(fixed, {}, at('2026-09-09T09:55:00Z'), at('2026-09-09T09:59:00Z'));
assert.strictEqual(state.remainingMs, 60000);
state = engine.getState(fixed, {}, at('2026-09-09T10:01:00Z'), at('2026-09-10T10:00:00Z'));
assert.strictEqual(state.isReady, true);

const fixedMulti = [{ id: '4hr', type: 'fixedUtc', times: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'] }];
state = engine.getState(fixedMulti, {}, at('2026-09-09T23:30:00Z'), at('2026-09-09T23:59:00Z'));
assert.strictEqual(state.isReady, false);
assert.strictEqual(state.remainingMs, 60000);
state = engine.getState(fixedMulti, {}, at('2026-09-09T23:30:00Z'), at('2026-09-10T00:00:00Z'));
assert.strictEqual(state.isReady, true);
assert.strictEqual(engine.label(fixedMulti), '6x UTC');

const multi = [
  { id: 'Daily', type: 'interval', minutes: 1440 },
  { id: 'Refill', type: 'interval', minutes: 360 },
];
state = engine.getState(multi, { Daily: at('2026-09-09T00:00:00Z'), Refill: at('2026-09-09T06:00:00Z') }, 0, at('2026-09-09T12:00:00Z'));
assert.strictEqual(state.isReady, true);
assert.strictEqual(state.id, 'Refill');
assert.strictEqual(engine.label(fixed), '10:00Z');
assert.strictEqual(engine.label(multi), '24h+6h');
assert.strictEqual(engine.label([
  { id: 'Daily', type: 'fixedUtc', times: ['05:00'] },
  { id: 'Refill', type: 'interval', minutes: 180 },
]), '3h+1x UTC');
state = engine.getState(multi, { Daily: at('2026-09-09T00:00:00Z') }, at('2026-09-09T06:00:00Z'), at('2026-09-09T07:00:00Z'));
assert.strictEqual(state.streams.find(stream => stream.id === 'Refill').remainingMs, 5 * 3600000);
state = engine.getState(multi, { Daily: at('2026-09-09T00:00:00Z') }, 0, at('2026-09-09T07:00:00Z'));
assert.strictEqual(state.streams.find(stream => stream.id === 'Refill').isReady, true);
assert.strictEqual(engine.label([
  { id: 'Short', type: 'interval', minutes: 20 },
  { id: 'Long', type: 'interval', minutes: 90 },
]), '0.3h+1.5h');

const definitions = cooldownData.definitions;
// Keep this floor aligned with MIN_MATCHES_TO_WRITE in sync-cooldowns.js.
assert.ok(Object.keys(definitions).length >= 100, 'expected broad catalog coverage');
assert.deepStrictEqual(Array.from(definitions['Crown Coins'].streams[0].times), ['10:00']);
assert.strictEqual(definitions.Stake.streams[0].minutes, 1440);
assert.strictEqual(definitions.High5.streams.length, 2);
const catalogNames = new Set(catalog.map((item) => item.name));
for (const [name, definition] of Object.entries(definitions)) {
  assert.ok(catalogNames.has(name), `unknown catalog name: ${name}`);
  assert.ok(definition.streams.length > 0, `missing streams: ${name}`);
  definition.streams.forEach((stream) => {
    assert.ok(stream.id && ['interval', 'fixedUtc'].includes(stream.type), `invalid stream: ${name}`);
    if (stream.type === 'interval') assert.ok(stream.minutes > 0, `invalid interval: ${name}`);
    if (stream.type === 'fixedUtc') {
      assert.ok(stream.times.length > 0, `invalid fixed times: ${name}`);
      assert.ok(stream.times.every((time) => {
        const match = /^(\d{2}):(\d{2})$/.exec(time);
        return match && Number(match[1]) <= 23 && Number(match[2]) <= 59;
      }), `out-of-range fixed time: ${name}`);
    }
  });
}

console.log('Cooldown tests passed.');
