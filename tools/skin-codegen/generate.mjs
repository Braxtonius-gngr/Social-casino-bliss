// Rung 1 generator: one structured-output call turns a case spec into
// { html, css, js, notes }. The system prompt for each variant lives in
// prompts/<variant>.md, so a hillclimb round edits a prompt file, not code.
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    html: { type: 'string' },
    css: { type: 'string' },
    js: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['html', 'css', 'js', 'notes'],
  additionalProperties: false,
};

let client = null;

export function systemPrompt(variant) {
  return readFileSync(join(HERE, 'prompts', `${variant}.md`), 'utf8');
}

// The model sees the design, not the bookkeeping: id, tags and source stay
// out so a case can't be recognised by name.
export function specForModel(spec) {
  const { canvas, tokens, component, animations, assets } = spec;
  return { canvas, tokens, component, animations, ...(assets?.length ? { assets } : {}) };
}

// SKIN_FAKE=oracle|wrong answers from <SKIN_CASES>/<id>.<kind>.json with no
// API call, so the runner and report can be checked end to end for free.
function fake(spec, model, kind) {
  const dir = process.env.SKIN_CASES || join(HERE, 'fixtures');
  const output = JSON.parse(readFileSync(join(dir, `${spec.id}.${kind}.json`), 'utf8'));
  const res = { model, stop_reason: 'end_turn', content: [], usage: { input_tokens: 0, output_tokens: 0 } };
  return { res, output, text: JSON.stringify(output) };
}

export async function generate(spec, { model, variant, effort = 'medium', maxTokens = 16000 }) {
  if (process.env.SKIN_FAKE) return fake(spec, model, process.env.SKIN_FAKE);
  client ??= new Anthropic({ maxRetries: 0 }); // the runner owns retries
  const stream = client.beta.messages.stream({
    model,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: [{ type: 'text', text: systemPrompt(variant), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Design spec:\n\n${JSON.stringify(specForModel(spec), null, 2)}` }],
  });
  const res = await stream.finalMessage();
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let output = null;
  if (res.stop_reason === 'end_turn') {
    try { output = JSON.parse(text); } catch { output = null; }
  }
  return { res, output, text };
}
