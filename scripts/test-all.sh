#!/usr/bin/env bash
# Run every tests/*/*.sh suite. One line per suite and a total; exit 1 when any suite fails.
# Usage: scripts/test-all.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

total=0; failed=0
for t in "$ROOT"/tests/*/*.sh; do
  [ -f "$t" ] || continue
  name="${t#"$ROOT"/}"
  total=$((total + 1))
  out="$(mktemp "${TMPDIR:-/tmp}/sa-suite.XXXXXX")"
  if bash "$t" >"$out" 2>&1; then
    echo "PASS  $name"
  else
    rc=$?
    failed=$((failed + 1))
    echo "FAIL  $name (exit $rc)"
    tail -n 15 "$out" | sed 's/^/      | /'
  fi
  rm -f "$out"
done

if [ "$total" -eq 0 ]; then
  echo "test-all: no suites found under tests/*/*.sh" >&2
  exit 1
fi
echo "total: $((total - failed)) passed, $failed failed, $total suites"
[ "$failed" -eq 0 ]
