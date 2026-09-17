# CLAUDE.md

**[AGENTS.md](AGENTS.md) is the source of truth for project conventions.** Read it
before making changes; it covers file ownership, theme work, cloud sync, the email
gate, and change hygiene in detail. This file is only a summary.

## Non-negotiables

- **Build-free static PWA.** Deployed as-is, including under GitHub Pages subpaths -
  keep local URLs relative. No build step, nothing to `npm install` for the app itself.
- **No frameworks or bundlers.** The only runtime dependency is `supabase-js` via CDN
  `<script src>`. Don't add more without discussion.
- **Classic scripts.** Preserve global functions, inline `onclick` handlers, and the
  current script-loading order.
- **Two-space indentation**, semicolons, and existing naming patterns.
- **Run `npm run check` before finishing.** It runs the syntax, reference, and catalog
  checks; use the narrowest one first while iterating.
