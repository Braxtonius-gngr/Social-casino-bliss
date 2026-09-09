# The Casino Almanac

Daily bonus tracker for sweepstakes and social casino platforms. A single
static `index.html` (plus a handful of small `assets/`/`utils/` scripts and
stylesheets) - no build step, deployed as-is via GitHub Pages.

## Quality checks

Two dependency-free Node scripts catch the most common ways this kind of
build-free static site breaks silently: a JS typo that never gets compiled
out, or a renamed/moved file that `index.html`, `manifest.json`, or `sw.js`
still points at the old name for.

```bash
npm run check          # both checks below
npm run check:syntax   # syntax-checks every .js file plus index.html's inline <script>
npm run check:refs     # confirms every local href/src/precache reference resolves to a real file
```

No `npm install` needed - both scripts use only Node's standard library.
They also run automatically on every push and pull request via
[`.github/workflows/checks.yml`](.github/workflows/checks.yml).

**Why not ESLint?** This app has no build step: 130+ inline `onclick="..."`
handlers in `index.html` call plain global functions defined in a classic
(non-module) `<script>` block. ESLint only gives meaningful coverage of that
inline script once it's extracted to its own file - and `check:syntax`
already does that extraction internally just to run `node --check` on it.
Doing the same extraction purely for linting, without changing how the app
actually loads its code, would add a dependency and a build step for little
real safety gain beyond what syntax checking already catches today.
