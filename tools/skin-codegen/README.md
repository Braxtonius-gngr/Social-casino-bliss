# skin-codegen

Dev-only tooling, not part of the shipped site (the site build skips
`tools/`). It turns a component design spec, exported from Figma or Canva,
into HTML, CSS and optional JavaScript, and measures how well that works.
This is Rung 1 of the PESR ladder: one structured-output call per
component, no tools, no retries on quality.

| File | What it is |
|---|---|
| `SPEC.md` | Case format, output contract, what each check means |
| `prompts/<variant>.md` | System prompt per variant; `baseline.md` is Rung 1 |
| `generate.mjs` | One Claude call per case: `{ html, css, js, notes }` |
| `grade.mjs` | Renders the output in headless Chromium and checks it against the spec |
| `run-eval.mjs` | Runner (from the build-eval scaffold): resume, retries, harness gate |
| `score.mjs` | PESR score and the keep rule |
| `cases/` | The eval set: `<id>.json` per component state, plus `<id>.oracle.json`, a hand-written correct answer the model never sees |
| `seed/build-seed.mjs` | Builds the 30 seed cases and their answers |
| `fixtures/` | Three synthetic specs with correct and wrong answers, for `selftest.mjs` |

Results live in `.claude/hillclimb/skin-codegen/<variant>/`.

## Setup

```sh
cd tools/skin-codegen && npm install
```

Chromium comes from `CHROME_PATH` (default: the cloud container's
Playwright build). `ANTHROPIC_API_KEY` must be set in the environment for
real runs.

## Commands

```sh
npm run selftest   # grader check, free: correct answers pass, wrong ones fail
SKIN_CASES=cases npm run selftest   # same check over the 30 real cases
npm run eval -- --reps 2   # paid: every case in cases/, twice
npm run score      # PESR score for the baseline
node tools/skin-codegen/score.mjs --flow .claude/hillclimb/skin-codegen baseline v1   # keep rule, from the repo root
```

`SKIN_FAKE=oracle SKIN_CASES=tools/skin-codegen/fixtures` makes the runner
answer from the fixture files with no API call, to check the pipeline end
to end for free.

The runner refuses to start until a person has reviewed the harness
(`generate.mjs`, `grade.mjs`, `score.mjs`, `package.json` and the runner
itself) and run it once with `--approve-harness`. Any later edit to those
files needs the same approval again. Prompt files are the thing being
improved, so they aren't part of the harness.

## Checks

A case passes only if every check passes:

- **syntax**: no script errors, the CSS parses to rules, every named part is present.
- **fidelity**: every box (within 0.5 px) and style value in the spec matches exactly, tokens resolved.
- **timing**: every spec animation is found on its part with the right duration, delay, iterations, direction, easing and properties.
- **no_clip**: at 0, 25, 50, 75 and 99% of every animation, nothing leaves the stage or a clipping container, and no text overflows its box.
- **frame_ok**: only `transform` and `opacity` animate, and under a 4x CPU slowdown the p95 frame interval stays within 1.5 frames (25 ms).

## PESR score

```
score = pass rate (%) - latency penalty - cost penalty
latency penalty = 0.5 x (median seconds per component - 30), if positive
cost penalty    = 1 x cents per component
```

A change is kept only if it breaks no component that passed every rep
before, has no unscored errors, and raises the score. The weights are in
`score.mjs` and are provisional until the baseline has been reviewed. A
person approves anything that ships.

## The seed set

30 cases, built by `seed/build-seed.mjs`:

- 12 from the "Daily Roll Over System" Canva deck: tokens, type, tracker
  card states, header, sort bar, and the buttons, pills, badges and toggle
  boards. The deck gives no pixel sizes or timings, so those were set when
  the cases were written (tag `derived`).
- 18 from the app's own `assets/app.css`: tier and type badges, the card
  frame, the modal, the update pill and track, the loader, and the Western
  and Prism effects. Where the app animates box-shadow or
  background-position, the case restates it as a layer whose opacity or
  transform moves (tag `adapted`).

Every case has an answer key, and `SKIN_CASES=cases npm run selftest`
must show all of them passing and empty answers failing before a paid run.

## Adding cases

Each case is `cases/<id>.json` in the format in `SPEC.md`. When a
generated component fails in real use, add its spec here with the tag
`regression` so it stays in the eval from then on.
