#!/bin/bash
# Claude Code SessionStart hook: gets a Claude Code on the web session ready
# to run this repo's checks and tests. Local sessions are left alone.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# terser, for `npm run build:site` and the dist smoke run. `npm install`
# rather than `npm ci` so a cached node_modules is reused, not wiped.
npm install --no-audit --no-fund

# Deno runs the edge functions' tests (supabase/functions/**/*_test.ts),
# the same way CI's setup-deno step does.
if ! command -v deno >/dev/null 2>&1; then
  npm install -g --no-audit --no-fund deno
fi

echo "session-start: node $(node --version), deno $(deno --version | head -n 1)"
