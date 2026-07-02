#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
status=$(echo "$input" | jq -r '.status // "completed"')

if [[ "$status" != "completed" ]]; then
  echo '{}'
  exit 0
fi

if ! lint_output=$(npm run lint 2>&1); then
  jq -n --arg msg "ESLint failed. Fix these errors and re-run \`npm run lint\`:

$lint_output" \
    '{followup_message: $msg}'
  exit 0
fi

echo '{}'
