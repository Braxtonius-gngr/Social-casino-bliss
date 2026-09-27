#!/bin/bash
# Claude Code PostToolUse hook: after a Write or Edit to a page or script,
# run the repo's syntax check so a broken edit is reported at once. Files
# that aren't .html or .js are ignored. Node is the only tool needed, the
# same as for the checks themselves.
set -uo pipefail

file=$(node -e '
  let input = "";
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    try {
      const hook = JSON.parse(input);
      const path = (hook.tool_input && hook.tool_input.file_path) ||
        (hook.tool_response && hook.tool_response.filePath) || "";
      process.stdout.write(String(path));
    } catch (e) {}
  });
') || { echo "syntax-check hook: could not read the hook input." >&2; exit 2; }

case "$file" in
  *.html|*.js) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 2
# Captured in a variable, not a shared temp file, so parallel sessions never
# read each other's output.
if output=$(npm run --silent check:syntax 2>&1); then
  exit 0
fi
echo "npm run check:syntax failed after editing $file:" >&2
printf '%s\n' "$output" | grep -v '^OK ' | tail -n 40 >&2
exit 2
