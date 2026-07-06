#!/usr/bin/env bash
# React Doctor scan → triage → validate loop helper.
# Drives the canonical playbook: https://www.react.doctor/prompts/react-doctor-agent.md
#
# Usage:
#   ./scripts/react-doctor-loop.sh              # full scan + summary
#   ./scripts/react-doctor-loop.sh --fix-ready  # print error diagnostics with fix-prompt URLs
#   ./scripts/react-doctor-loop.sh --validate   # run tsc + eslint after fixes
#   ./scripts/react-doctor-loop.sh --watch      # re-scan until score is 100 or --max N hit
#   ./scripts/react-doctor-loop.sh --diff HEAD  # scope to uncommitted changes
#   ./scripts/react-doctor-loop.sh src/routes   # narrow scan path
#
# Environment:
#   MAX_ITERATIONS=20   cap for --watch (default 20)
#   DIAGNOSTICS=/tmp/diagnostics.json
#   RULE_CACHE=/tmp/rule

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DIAGNOSTICS="${DIAGNOSTICS:-/tmp/diagnostics.json}"
RULE_CACHE="${RULE_CACHE:-/tmp/rule}"
MAX_ITERATIONS="${MAX_ITERATIONS:-20}"

SCOPE_ARGS=()
SCAN_PATH="."
MODE="scan"
VALIDATE_ONLY=false
WATCH=false

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --fix-ready) MODE="fix-ready"; shift ;;
    --validate) VALIDATE_ONLY=true; shift ;;
    --watch) WATCH=true; shift ;;
    --diff)
      shift
      SCOPE_ARGS+=(--diff "${1:-}")
      shift
      ;;
    --max)
      shift
      MAX_ITERATIONS="${1:?--max requires a number}"
      shift
      ;;
    --) shift; SCAN_PATH="$1"; shift; break ;;
    -*) echo "Unknown flag: $1" >&2; usage 1 ;;
    *) SCAN_PATH="$1"; shift ;;
  esac
done

run_validate() {
  echo "── validate: TypeScript ──"
  npx tsc --noEmit
  echo "── validate: ESLint ──"
  npm run lint
  echo "✓ validate passed"
}

run_scan() {
  local target="${1:-.}"
  echo "── react-doctor scan (${target}) ──"
  # Exit 1 when findings exist — expected; still write JSON.
  if ((${#SCOPE_ARGS[@]} > 0)); then
    npx react-doctor@latest --json --yes "${SCOPE_ARGS[@]}" "$target" >"$DIAGNOSTICS" 2>/dev/null || true
  else
    npx react-doctor@latest --json --yes "$target" >"$DIAGNOSTICS" 2>/dev/null || true
  fi

  if ! node -e "JSON.parse(require('fs').readFileSync('$DIAGNOSTICS','utf8'))" 2>/dev/null; then
    echo "✗ Unparseable diagnostics at $DIAGNOSTICS" >&2
    return 1
  fi

  node <<'NODE'
const fs = require("fs");
const path = require("path");

const raw = JSON.parse(fs.readFileSync(process.env.DIAGNOSTICS, "utf8"));
const diags = raw.diagnostics ?? raw.projects?.[0]?.diagnostics ?? [];
const score = raw.summary?.score ?? raw.projects?.[0]?.score ?? "?";

const bySeverity = { error: [], warning: [] };
const byRule = new Map();

for (const d of diags) {
  const bucket = bySeverity[d.severity] ?? bySeverity.warning;
  bucket.push(d);
  const key = `${d.plugin}/${d.rule}`;
  if (!byRule.has(key)) byRule.set(key, { error: 0, warning: 0, samples: [] });
  const entry = byRule.get(key);
  entry[d.severity]++;
  if (entry.samples.length < 3) entry.samples.push(`${d.filePath}:${d.line}`);
}

const fpFile = path.join(process.cwd(), ".react-doctor/false-positives.md");
const hasFpDoc = fs.existsSync(fpFile);

console.log("");
console.log(`Score: ${score} / 100`);
console.log(`Findings: ${diags.length} (${bySeverity.error.length} errors, ${bySeverity.warning.length} warnings)`);
if (hasFpDoc) console.log(`False-positive doc: ${fpFile}`);
console.log("");

if (bySeverity.error.length > 0) {
  console.log("ERRORS (fix first):");
  for (const d of bySeverity.error) {
    console.log(`  [error] ${d.plugin}/${d.rule}`);
    console.log(`          ${d.filePath}:${d.line} — ${d.title ?? d.message.split("\n")[0]}`);
  }
  console.log("");
}

const sortedRules = [...byRule.entries()].sort(
  (a, b) => b[1].error - a[1].error || b[1].warning + b[1].error - (a[1].warning + a[1].error),
);

console.log("Top rules:");
for (const [rule, counts] of sortedRules.slice(0, 15)) {
  const sample = counts.samples.join(", ");
  console.log(`  ${rule}  (e:${counts.error} w:${counts.warning})  ${sample}`);
}

console.log("");
console.log(`Full JSON: ${process.env.DIAGNOSTICS}`);

const share = raw.summary?.shareUrl ?? raw.shareUrl;
if (share) console.log(`Share:   ${share}`);

process.exitCode = bySeverity.error.length > 0 ? 1 : diags.length > 0 ? 1 : 0;
NODE
  return $?
}

fetch_rule_prompts() {
  echo "── fetching rule fix prompts for errors ──"
  node <<'NODE'
const fs = require("fs");
const { execSync } = require("child_process");

const raw = JSON.parse(fs.readFileSync(process.env.DIAGNOSTICS, "utf8"));
const diags = (raw.diagnostics ?? raw.projects?.[0]?.diagnostics ?? []).filter(
  (d) => d.severity === "error",
);

const seen = new Set();
for (const d of diags) {
  const key = `${d.plugin}/${d.rule}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const out = `${process.env.RULE_CACHE}/${d.plugin}/${d.rule}.md`;
  fs.mkdirSync(`${process.env.RULE_CACHE}/${d.plugin}`, { recursive: true });
  const url = `https://www.react.doctor/prompts/rules/${d.plugin}/${d.rule}.md`;

  try {
    execSync(`curl --silent --fail --create-dirs --output "${out}" "${url}"`, { stdio: "pipe" });
    console.log(`  ✓ ${key} → ${out}`);
  } catch {
    console.log(`  · ${key} (no canonical prompt — use ${d.help ?? "rule docs"})`);
  }
}

for (const d of diags) {
  console.log(`\n── ${d.filePath}:${d.line} [${d.plugin}/${d.rule}] ──`);
  console.log(d.message);
  const prompt = `${process.env.RULE_CACHE}/${d.plugin}/${d.rule}.md`;
  if (fs.existsSync(prompt)) {
    const text = fs.readFileSync(prompt, "utf8");
    const fix = text.split("## Fix prompt")[1]?.trim();
    if (fix) console.log("\nFix prompt:\n" + fix.slice(0, 1200) + (fix.length > 1200 ? "…" : ""));
  }
  console.log(`Docs: https://react.doctor/docs/rules/${d.plugin}/${d.rule}`);
}
NODE
}

export DIAGNOSTICS RULE_CACHE

if $VALIDATE_ONLY; then
  run_validate
  exit 0
fi

iteration=0
while true; do
  iteration=$((iteration + 1))
  echo "════════════════════════════════════════════════════════════"
  echo " React Doctor loop  iteration $iteration / $MAX_ITERATIONS"
  echo "════════════════════════════════════════════════════════════"

  run_scan "$SCAN_PATH"
  scan_exit=$?

  case "$MODE" in
    fix-ready) fetch_rule_prompts ;;
  esac

  if ! $WATCH; then
    exit "$scan_exit"
  fi

  if [[ "$scan_exit" -eq 0 ]]; then
    echo ""
    echo "✓ Clean — score 100, no findings."
    run_validate
    exit 0
  fi

  if [[ "$iteration" -ge "$MAX_ITERATIONS" ]]; then
    echo ""
    echo "✗ Reached MAX_ITERATIONS=$MAX_ITERATIONS with findings still present."
    echo "  Fix errors manually, run --validate, then re-run with --watch."
    exit 1
  fi

  echo ""
  echo "Findings remain. Agent/human should fix errors, then:"
  echo "  ./scripts/react-doctor-loop.sh --validate"
  echo "  ./scripts/react-doctor-loop.sh --watch"
  echo ""
  echo "Tip: ./scripts/react-doctor-loop.sh --fix-ready  # error recipes"
  exit 1
done
