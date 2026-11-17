#!/usr/bin/env bash
# Build dist/agi-agent-kit-<version>.zip from `git archive HEAD`: only committed files, so no
# node_modules, no bench/out, no local metrics. Refuses a dirty tree unless --allow-dirty.
# Usage: scripts/package.sh [--allow-dirty]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALLOW_DIRTY=0
for a in "$@"; do
  case "$a" in
    --allow-dirty) ALLOW_DIRTY=1 ;;
    -h|--help) sed -n '2,4p' "$0"; exit 0 ;;
    *) echo "package: unknown argument: $a" >&2; exit 2 ;;
  esac
done

command -v git >/dev/null || { echo "package: git is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "package: jq is required" >&2; exit 2; }
command -v zip >/dev/null || { echo "package: zip is required" >&2; exit 2; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "package: not a git repository" >&2; exit 2; }
git rev-parse --verify HEAD >/dev/null 2>&1 || { echo "package: no commit yet (git archive needs HEAD)" >&2; exit 2; }

if [ "$ALLOW_DIRTY" -ne 1 ] && [ -n "$(git status --porcelain)" ]; then
  echo "package: the working tree is dirty; commit or stash, or pass --allow-dirty" >&2
  echo "         (uncommitted changes are NOT included either way: the archive is HEAD)" >&2
  exit 1
fi

MANIFEST="$ROOT/plugin/.claude-plugin/plugin.json"
[ -f "$MANIFEST" ] || { echo "package: not found: plugin/.claude-plugin/plugin.json" >&2; exit 2; }
VERSION="$(jq -r '.version // empty' "$MANIFEST")"
case "$VERSION" in
  ""|*[!0-9A-Za-z._+-]*) echo "package: missing or invalid version in plugin.json: '$VERSION'" >&2; exit 2 ;;
esac

NAME="agi-agent-kit-$VERSION"
OUT="$ROOT/dist/$NAME.zip"
mkdir -p "$ROOT/dist"
rm -f "$OUT"
git archive --format=zip --prefix="$NAME/" -o "$OUT" HEAD

SIZE="$(wc -c < "$OUT" | tr -d ' ')"
echo "$OUT"
echo "size: $SIZE bytes (version $VERSION, commit $(git rev-parse --short HEAD))"
