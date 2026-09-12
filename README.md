# The Casino Almanac

Daily bonus tracker for sweepstakes and social casino platforms. A single
static `index.html` (plus a handful of small `assets/`/`utils/` scripts and
stylesheets) - no build step, deployed as-is via GitHub Pages.

Everything is local-first by default: no account, nothing sent anywhere.
Settings → **Enable Cloud Sync** turns on an optional, opt-in mirror of your
collection history (the ledger behind streaks/stats - the one thing the
manual JSON backup doesn't cover) to a Supabase project, under an anonymous
account created on-device with no email or password. It's an outbox-and-
replay design: local changes queue up and push when online; pulling replays
whatever changed elsewhere back in, matched by each entry's own id.
Everything else in the app - platforms, timers, settings - stays local-only
either way.

## Quality checks

Three dependency-free Node scripts catch the most common ways this kind of
build-free static site breaks silently: a JS typo that never gets compiled
out, a renamed/moved file that `index.html`, `manifest.json`, or `sw.js`
still points at the old name for, or a malformed record in the platform
catalog.

```bash
npm run check           # all three checks below
npm run check:syntax    # syntax-checks every .js file (assets/, utils/, scripts/, data/) plus index.html's inline <script>
npm run check:refs      # confirms every local href/src/precache reference resolves to a real file
npm run check:catalog   # validates data/catalog.js's records (see below)
```

`check:catalog` requires every entry to have a non-empty `name` and a valid
`http(s)` URL, and validates numeric fields when present (finite values;
`reliability` between 0-100; positive `cooldown`/`speedHours`). It also
warns - without failing the check - about duplicate names or duplicate
normalized domains, since this catalog legitimately has a few (e.g. two
entries tracking different cooldowns on the same underlying platform under
different names); those are printed for a human to judge, never edited
automatically.

Each entry also takes an optional `lastVerified: "YYYY-MM-DD"` field: the
date someone last actually re-checked that its URL, cooldown, and reset
window are still correct. `check:catalog` validates the format and prints
a review queue of the entries most overdue for a re-check (missing the
field, or older than 90 days), oldest/never-verified first - the same
ordering the in-app Catalogue's "Needs Review First" sort and "Needs
Review" filter use. Re-checking a platform and bumping its date is a
manual, human step; nothing here fabricates or auto-updates the field.

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
