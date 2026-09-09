# The Casino Almanac

Daily bonus tracker for sweepstakes and social casino platforms. A single
static `index.html` (plus a handful of small `assets/`/`utils/` scripts and
stylesheets) - no build step, deployed as-is via GitHub Pages.

## Quality checks

Four dependency-free Node checks catch the most common ways this kind of
build-free static site breaks silently: a JS typo that never gets compiled
out, a renamed/moved file that `index.html`, `manifest.json`, or `sw.js`
still points at the old name for, or a malformed record in the platform
catalog.

```bash
npm run check           # all four checks below
npm run check:syntax    # syntax-checks every .js file (assets/, utils/, scripts/, data/) plus index.html's inline <script>
npm run check:refs      # confirms every local href/src/precache reference resolves to a real file
npm run check:catalog   # validates data/catalog.js's records (see below)
npm run test:cooldowns  # checks interval, UTC-reset, and multi-bonus timer math
```

## Cooldown schedules

The deployed app reads a reviewed, offline snapshot from `data/cooldowns.js`.
That snapshot supports rolling intervals, exact UTC reset times, and multiple
independent bonuses on one platform. When a platform is not in the snapshot,
the app falls back to its legacy `cooldown`/`resetHour` catalog fields. A timer
changed manually in the UI is also kept as a local override.

Bonus Farmer currently publishes these schedules inside its public Next.js
client bundle rather than through a supported API. Refresh the snapshot with:

```bash
npm run sync:cooldowns             # inspect coverage without changing files
npm run sync:cooldowns -- --write  # regenerate data/cooldowns.js
```

The sync command parses data literals without executing downloaded JavaScript,
matches conservatively by site name/domain, and reports unmatched entries for
manual review. The remote site is never scraped by end users' browsers, so the
PWA remains deterministic and fully usable offline.

`check:catalog` requires every entry to have a non-empty `name` and a valid
`http(s)` URL, and validates numeric fields when present (finite values;
`reliability` between 0-100; positive `cooldown`/`speedHours`). It also
warns - without failing the check - about duplicate names or duplicate
normalized domains, since this catalog legitimately has a few (e.g. two
entries tracking different cooldowns on the same underlying platform under
different names); those are printed for a human to judge, never edited
automatically.

No `npm install` needed - all four checks use only Node's standard library.
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
